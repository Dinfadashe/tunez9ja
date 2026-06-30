// ════════════════════════════════════════════════════════════════
// TUNEZ9JA SYNC QUEUE — durable offline mutation queue
//
// Wraps Supabase mutations (likes, comments, favorites, playlist
// updates, downloads, analytics) so that if they fail due to being
// offline, they're persisted to IndexedDB and retried automatically:
//   - immediately on 'online' event
//   - via the Background Sync API where supported (survives tab close)
//   - via a 5-minute setInterval fallback everywhere else (Safari/iOS,
//     Firefox without the API, or any browser with it disabled)
//
// Usage from app code:
//   import { queuedMutation } from '../lib/syncQueue.js'
//   await queuedMutation({
//     id: 'like:' + trackId + ':' + userId,      // dedupe key
//     table: 'reactions',
//     op: 'upsert',
//     payload: { track_id: trackId, user_id: userId, type: 'like' },
//   })
// ════════════════════════════════════════════════════════════════

const DB_NAME = 't9j-sync-queue'
const DB_VERSION = 1
const STORE = 'pending'
const SYNC_TAG = 'tunez9ja-flush-queue'
const PERIODIC_TAG = 'tunez9ja-sync-queue'
const FALLBACK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes, per spec

let dbPromise = null
let supabaseRef = null      // lazily injected to avoid a circular import at module load
let flushInFlight = false
let fallbackTimer = null
let listenersBound = false

// ── IndexedDB plumbing ──────────────────────────────────────────────
function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unsupported')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function dbGetAll() {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}
async function dbPut(item) {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(item)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return false
  }
}
async function dbDelete(id) {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return false
  }
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Register the Supabase client once, at app start. Required because
 * this module replays queued mutations against the live client.
 */
export function initSyncQueue(supabase) {
  supabaseRef = supabase
  bindLifecycleListeners()
  // Replay anything left over from a previous session/offline period
  flushQueue().catch(() => {})
}

/**
 * Attempt a mutation immediately. If it fails because the device is
 * offline (or the request itself fails), the mutation is durably
 * queued and retried automatically — the caller does not need to do
 * anything else. Returns { ok, queued, error, data }.
 *
 * `id` should be a stable, deterministic dedupe key — e.g.
 * `like:${trackId}:${userId}` — so a duplicate call before the first
 * one has synced overwrites the pending entry instead of double-queuing.
 */
export async function queuedMutation({ id, table, op = 'insert', payload, match }) {
  if (!id || !table || !payload) {
    return { ok: false, queued: false, error: new Error('queuedMutation: id, table and payload are required') }
  }

  // Online: try immediately so the UI gets instant feedback in the common case.
  if (navigator.onLine) {
    const result = await attemptMutation({ table, op, payload, match })
    if (result.ok) {
      // In case an older queued copy of this same id exists, clear it —
      // this fresh attempt supersedes it (last-write-wins conflict policy).
      dbDelete(id).catch(() => {})
      return { ok: true, queued: false, data: result.data }
    }
    // Fell through to network/server failure — queue it.
  }

  const item = {
    id,
    table,
    op,
    payload,
    match: match || null,
    createdAt: Date.now(),
    attempts: 0,
  }
  await dbPut(item)
  requestBackgroundSync()
  return { ok: false, queued: true }
}

/**
 * Force-flush the queue now (called on 'online', on the 5-min fallback
 * timer, and when the SW asks the page to flush via postMessage).
 * Safe to call concurrently — re-entrant calls are no-ops.
 */
export async function flushQueue() {
  if (flushInFlight) return
  if (!navigator.onLine) return
  if (!supabaseRef) return
  flushInFlight = true

  try {
    const items = await dbGetAll()
    if (!items.length) return

    // Oldest first — preserves user-intended ordering (e.g. comment edits)
    items.sort((a, b) => a.createdAt - b.createdAt)

    for (const item of items) {
      try {
        const result = await attemptMutation(item)
        if (result.ok) {
          await dbDelete(item.id)
        } else {
          // Failed again — bump attempt count; after 10 failed attempts
          // (≈50 min at the 5-min cadence) drop it so a permanently
          // invalid mutation (e.g. referencing deleted content) can't
          // wedge the queue forever.
          item.attempts = (item.attempts || 0) + 1
          if (item.attempts >= 10) {
            await dbDelete(item.id)
          } else {
            await dbPut(item)
          }
        }
      } catch {
        // Network dropped mid-flush — stop here, remainder retried next cycle
        break
      }
    }
  } finally {
    flushInFlight = false
  }
}

/** Number of mutations currently waiting to sync — for a UI badge. */
export async function getPendingCount() {
  const items = await dbGetAll()
  return items.length
}

// ── Internals ────────────────────────────────────────────────────────

async function attemptMutation({ table, op, payload, match }) {
  if (!supabaseRef) return { ok: false, error: new Error('Supabase client not initialised') }
  try {
    let query = supabaseRef.from(table)
    let res
    if (op === 'insert') {
      res = await query.insert(payload)
    } else if (op === 'upsert') {
      res = await query.upsert(payload)
    } else if (op === 'update') {
      let q = query.update(payload)
      if (match) Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v) })
      res = await q
    } else if (op === 'delete') {
      let q = query.delete()
      if (match) Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v) })
      res = await q
    } else {
      return { ok: false, error: new Error('Unknown op: ' + op) }
    }
    if (res.error) return { ok: false, error: res.error }
    return { ok: true, data: res.data }
  } catch (error) {
    return { ok: false, error }
  }
}

function requestBackgroundSync() {
  // Prefer the real Background Sync API — survives the tab closing.
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => reg.sync.register(SYNC_TAG))
      .catch(() => { /* permission denied or unsupported at runtime — fallback timer covers it */ })
  }
  // Also try Periodic Background Sync for installed PWAs (Chrome/Edge Android)
  if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' })
        if (status.state === 'granted') {
          await reg.periodicSync.register(PERIODIC_TAG, { minInterval: FALLBACK_INTERVAL_MS })
        }
      } catch { /* not supported / not installed as PWA — fine, fallback timer covers it */ }
    })
  }
  // The setInterval fallback (bound once in bindLifecycleListeners) covers
  // every browser unconditionally, so correctness never depends on the
  // APIs above actually being available.
}

function bindLifecycleListeners() {
  if (listenersBound) return
  listenersBound = true

  window.addEventListener('online', () => { flushQueue().catch(() => {}) })

  // SW asks the page to flush (from the 'sync' or 'periodicsync' handlers,
  // since the actual Supabase calls must run on the page, not in the SW).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'FLUSH_SYNC_QUEUE') flushQueue().catch(() => {})
    })
  }

  // Universal fallback: every 5 minutes, regardless of Background Sync
  // API support. This is what guarantees the "5-minute Background Sync"
  // requirement holds on Safari/iOS and any browser without the API.
  if (!fallbackTimer) {
    fallbackTimer = setInterval(() => { flushQueue().catch(() => {}) }, FALLBACK_INTERVAL_MS)
  }

  // Also flush on tab visibility regain — catches the case where a user
  // backgrounds the app, regains connectivity, then returns before the
  // 5-minute timer fires.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushQueue().catch(() => {})
  })
}
