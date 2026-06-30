// ════════════════════════════════════════════════════════════════
// TUNEZ9JA SERVICE WORKER — production offline support
// Versioned, multi-cache, range-request audio, LRU eviction,
// background-sync-aware. Safe lifecycle: no forced reload loops.
// ════════════════════════════════════════════════════════════════

const SW_VERSION = 'v3'

// ── Cache names — bump SW_VERSION to invalidate everything at once ──
const CACHE_SHELL  = `t9j-shell-${SW_VERSION}`
const CACHE_STATIC = `t9j-static-${SW_VERSION}`   // CSS / fonts / icons / long-term static
const CACHE_JS     = `t9j-js-${SW_VERSION}`        // JS bundles (stale-while-revalidate)
const CACHE_API    = `t9j-api-${SW_VERSION}`       // GET API responses (stale-while-revalidate)
const CACHE_IMAGES = `t9j-images-${SW_VERSION}`    // covers / avatars / thumbnails
const CACHE_AUDIO  = `t9j-audio-${SW_VERSION}`     // music files — the important one

const ALL_CACHES = [CACHE_SHELL, CACHE_STATIC, CACHE_JS, CACHE_API, CACHE_IMAGES, CACHE_AUDIO]

const APP_SHELL = ['/', '/index.html', '/manifest.json', '/offline.html']
const OFFLINE_FALLBACK = '/offline.html'

// ── Storage budgets (bytes) — exceeding these triggers LRU eviction ──
const AUDIO_MAX_BYTES  = 300 * 1024 * 1024   // ~300MB of music, generous for a phone
const IMAGE_MAX_ENTRIES = 200
const API_MAX_ENTRIES   = 80

// ── Domains the SW should never intercept (auth, payments, 3rd-party APIs
//    with their own caching/CORS semantics, or where caching is unsafe) ──
const NEVER_CACHE_DOMAINS = [
  'paystack.com', 'paystack.co', 'js.paystack.co',
  'youtube.com', 'youtu.be', 'ytimg.com',
  'google-analytics.com', 'googletagmanager.com',
  'posthog.com',
]

// Supabase auth/storage-sensitive paths — never cache tokens or session data
const NEVER_CACHE_PATH_PATTERNS = [
  '/auth/v1/', '/auth/v1', 'grant_type=', 'access_token', 'refresh_token',
]

// ════════════════════════════════════════════════════════════════
// INSTALL — pre-cache the app shell. skipWaiting() is intentional:
// paired with the controllerchange guard in swRegister.js, the client
// shows an "update available" banner instead of force-reloading, so
// skipWaiting here never causes a surprise refresh loop.
// ════════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => { /* offline during install — non-fatal, shell fills in lazily */ })
  )
  self.skipWaiting()
})

// ════════════════════════════════════════════════════════════════
// ACTIVATE — delete any cache not matching the current SW_VERSION,
// claim clients immediately so the new worker takes over without
// requiring a navigation.
// ════════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      )
      await self.clients.claim()
      // Opportunistic cleanup pass on activate — cheap, non-blocking for the page
      enforceAudioQuota().catch(() => {})
      enforceEntryLimit(CACHE_IMAGES, IMAGE_MAX_ENTRIES).catch(() => {})
      enforceEntryLimit(CACHE_API, API_MAX_ENTRIES).catch(() => {})
    })()
  )
})

// ════════════════════════════════════════════════════════════════
// FETCH — route by resource type to the right strategy.
// Every branch is wrapped so a single failure can never throw past
// the SW and become an unhandled rejection (which Chrome surfaces as
// a hard network error / blank page).
// ════════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return // never intercept mutations — those go through syncQueue.js on the client

  let url
  try { url = new URL(req.url) } catch { return }

  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return
  if (NEVER_CACHE_DOMAINS.some((d) => url.hostname.includes(d))) return
  if (NEVER_CACHE_PATH_PATTERNS.some((p) => req.url.includes(p))) return

  // ── Audio: cache-first with range support + background revalidation ──
  if (isAudioRequest(req, url)) {
    event.respondWith(handleAudio(req))
    return
  }

  // ── Images (covers, avatars, thumbnails): cache-first ──
  if (isImageRequest(req, url)) {
    event.respondWith(cacheFirst(req, CACHE_IMAGES, IMAGE_MAX_ENTRIES))
    return
  }

  // ── Fonts: cache-first, effectively permanent ──
  if (req.destination === 'font' || /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, CACHE_STATIC))
    return
  }

  // ── CSS: cache-first (hashed filenames in prod = safe to cache hard) ──
  if (req.destination === 'style' || url.pathname.endsWith('.css')) {
    event.respondWith(cacheFirst(req, CACHE_STATIC))
    return
  }

  // ── JS bundles: stale-while-revalidate (hashed filenames, but we still
  //    want the freshest possible code without blocking render) ──
  if (req.destination === 'script' || url.pathname.endsWith('.js')) {
    event.respondWith(staleWhileRevalidate(req, CACHE_JS))
    return
  }

  // ── Icons / manifest / small static assets ──
  if (/\.(png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname) && !isImageRequest(req, url)) {
    event.respondWith(cacheFirst(req, CACHE_STATIC))
    return
  }

  // ── Supabase REST GET (API data) — stale-while-revalidate ──
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(staleWhileRevalidate(req, CACHE_API, API_MAX_ENTRIES))
    return
  }

  // ── Navigations (HTML/route changes): network-first, offline.html fallback ──
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(req))
    return
  }

  // ── Everything else: network-first with cache fallback ──
  event.respondWith(networkFirst(req, CACHE_SHELL))
})

// ════════════════════════════════════════════════════════════════
// Resource classifiers
// ════════════════════════════════════════════════════════════════
function isAudioRequest(req, url) {
  return req.destination === 'audio' ||
    url.pathname.includes('/music-audio/') ||
    /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(url.pathname)
}
function isImageRequest(req, url) {
  if (req.destination !== 'image') {
    if (!/\.(png|jpg|jpeg|webp|gif)$/i.test(url.pathname)) return false
  }
  return url.pathname.includes('/music-covers/') ||
    url.pathname.includes('/post-images/') ||
    url.pathname.includes('/avatars/') ||
    url.pathname.includes('/video-thumbnails/') ||
    req.destination === 'image'
}

// ════════════════════════════════════════════════════════════════
// STRATEGY: Cache First (images, fonts, CSS, static)
// ════════════════════════════════════════════════════════════════
async function cacheFirst(req, cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(req)
    if (cached) return cached

    const res = await fetch(req)
    if (res && res.ok) {
      cache.put(req, res.clone()).then(() => {
        if (maxEntries) enforceEntryLimit(cacheName, maxEntries).catch(() => {})
      })
    }
    return res
  } catch {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(req)
    if (cached) return cached
    return placeholderResponse(req)
  }
}

// ════════════════════════════════════════════════════════════════
// STRATEGY: Stale While Revalidate (JS, API)
// ════════════════════════════════════════════════════════════════
async function staleWhileRevalidate(req, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)

  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) {
        cache.put(req, res.clone()).then(() => {
          if (maxEntries) enforceEntryLimit(cacheName, maxEntries).catch(() => {})
        })
      }
      return res
    })
    .catch(() => null)

  if (cached) {
    // Don't block the response on the network — update happens silently in background
    networkPromise.catch(() => {})
    return cached
  }

  const fresh = await networkPromise
  if (fresh) return fresh
  return placeholderResponse(req)
}

// ════════════════════════════════════════════════════════════════
// STRATEGY: Network First (app shell, misc HTML)
// ════════════════════════════════════════════════════════════════
async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req)
    if (res && res.ok) {
      const clone = res.clone()
      caches.open(cacheName).then((c) => c.put(req, clone)).catch(() => {})
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    return placeholderResponse(req)
  }
}

// Navigations specifically: same as networkFirst but falls back to offline.html
async function networkFirstNavigate(req) {
  try {
    const res = await fetch(req)
    if (res && res.ok) {
      const clone = res.clone()
      caches.open(CACHE_SHELL).then((c) => c.put(req, clone)).catch(() => {})
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    const shellIndex = await caches.match('/index.html')
    if (shellIndex) return shellIndex
    const offline = await caches.match(OFFLINE_FALLBACK)
    if (offline) return offline
    return new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } })
  }
}

// ════════════════════════════════════════════════════════════════
// STRATEGY: Audio — cache-first with full Range Request support.
//
// Browsers issue Range: bytes=N- requests when a user seeks. A plain
// cache-first lookup against the cached (un-ranged) response either
// fails to match or returns the whole file with a 200 instead of a
// 206, which breaks seeking and can stall playback. We therefore:
//   1. Always cache the FULL response body on first successful fetch.
//   2. On a ranged request, read the cached full body and slice it
//      ourselves into a proper 206 Partial Content response.
//   3. Revalidate in the background without blocking playback.
// ════════════════════════════════════════════════════════════════
async function handleAudio(req) {
  const cache = await caches.open(CACHE_AUDIO)
  const rangeHeader = req.headers.get('range')

  // Look up the FULL cached entry by URL (ignoring this request's Range header)
  const fullCached = await cache.match(req.url, { ignoreVary: true })

  if (fullCached) {
    touchAudioEntry(req.url)
    // Background revalidation — don't await, never blocks playback
    revalidateAudio(req, cache)

    if (rangeHeader) {
      return await sliceRangeResponse(fullCached, rangeHeader)
    }
    return fullCached
  }

  // Not cached yet — fetch from network.
  try {
    // Request the FULL file (strip Range) so we cache one canonical copy
    const fullReq = new Request(req.url, { headers: stripRangeHeader(req.headers) })
    const networkRes = await fetch(fullReq)

    if (networkRes && networkRes.ok) {
      // Never cache a failed/partial/corrupted download
      const contentLength = networkRes.headers.get('content-length')
      const clone = networkRes.clone()
      if (!contentLength || Number(contentLength) > 0) {
        cache.put(req.url, clone).then(() => {
          touchAudioEntry(req.url)
          enforceAudioQuota().catch(() => {})
        }).catch(() => { /* quota or storage error — fail silently, playback still works from network */ })
      }

      if (rangeHeader) {
        return await sliceRangeResponse(networkRes.clone(), rangeHeader)
      }
      return networkRes
    }
    // Non-OK response — don't cache, just pass through
    return networkRes
  } catch {
    // Truly offline and never cached — friendly response, app must handle this
    // gracefully (see useOfflineAudioSync / FloatingPlayer error handling)
    return new Response(JSON.stringify({ error: 'audio_unavailable_offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function stripRangeHeader(headers) {
  const h = new Headers(headers)
  h.delete('range')
  return h
}

async function revalidateAudio(req, cache) {
  try {
    const fullReq = new Request(req.url, { headers: stripRangeHeader(req.headers) })
    const res = await fetch(fullReq)
    if (res && res.ok) {
      const len = res.headers.get('content-length')
      if (!len || Number(len) > 0) {
        await cache.put(req.url, res)
      }
    }
  } catch { /* offline — keep serving the existing cached copy */ }
}

// Slice a cached full-body Response into a 206 Partial Content response
// matching the requested Range header, the way a real HTTP server would.
async function sliceRangeResponse(fullResponse, rangeHeader) {
  try {
    const buffer = await fullResponse.clone().arrayBuffer()
    const total = buffer.byteLength
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
    if (!match) return fullResponse

    let start = match[1] ? parseInt(match[1], 10) : 0
    let end = match[2] ? parseInt(match[2], 10) : total - 1
    if (Number.isNaN(start)) start = 0
    if (Number.isNaN(end) || end >= total) end = total - 1
    if (start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${total}` },
      })
    }

    const sliced = buffer.slice(start, end + 1)
    const headers = new Headers(fullResponse.headers)
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`)
    headers.set('Content-Length', String(sliced.byteLength))
    headers.set('Accept-Ranges', 'bytes')

    return new Response(sliced, { status: 206, statusText: 'Partial Content', headers })
  } catch {
    return fullResponse
  }
}

// ════════════════════════════════════════════════════════════════
// LRU metadata for audio — tracked in a tiny side-cache as JSON
// "responses" since Cache Storage has no native metadata API.
// Frequently-played tracks (recently touched) survive eviction;
// stale ones are removed first when the quota is exceeded.
// ════════════════════════════════════════════════════════════════
const LRU_META_KEY = 'https://t9j-internal/audio-lru-meta'

async function getLruMeta() {
  try {
    const cache = await caches.open(CACHE_AUDIO)
    const res = await cache.match(LRU_META_KEY)
    if (!res) return {}
    return await res.json()
  } catch {
    return {}
  }
}
async function setLruMeta(meta) {
  try {
    const cache = await caches.open(CACHE_AUDIO)
    await cache.put(LRU_META_KEY, new Response(JSON.stringify(meta), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch { /* non-fatal — worst case, eviction falls back to insertion order */ }
}
async function touchAudioEntry(url) {
  const meta = await getLruMeta()
  meta[url] = Date.now()
  await setLruMeta(meta)
}

// Evict least-recently-used audio entries until total cache size is
// back under AUDIO_MAX_BYTES. Runs after every successful audio cache
// write and once on activate — cheap relative to audio file sizes,
// and never runs on the main thread.
async function enforceAudioQuota() {
  const cache = await caches.open(CACHE_AUDIO)
  const keys = await cache.keys()
  const audioKeys = keys.filter((k) => k.url !== LRU_META_KEY)
  if (audioKeys.length === 0) return

  // Measure total size
  let total = 0
  const sized = []
  for (const req of audioKeys) {
    const res = await cache.match(req)
    const len = res ? Number(res.headers.get('content-length') || 0) : 0
    sized.push({ req, len })
    total += len
  }
  if (total <= AUDIO_MAX_BYTES) return

  const meta = await getLruMeta()
  // Oldest-touched first; entries never touched (no metadata) are treated as oldest
  sized.sort((a, b) => (meta[a.req.url] || 0) - (meta[b.req.url] || 0))

  for (const entry of sized) {
    if (total <= AUDIO_MAX_BYTES) break
    await cache.delete(entry.req)
    delete meta[entry.req.url]
    total -= entry.len
  }
  await setLruMeta(meta)
}

// Generic "keep only the N most recent entries" cap for non-audio caches
async function enforceEntryLimit(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  const excess = keys.length - maxEntries
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]) // Cache Storage preserves insertion order — oldest first
  }
}

function placeholderResponse(req) {
  // Non-navigate, non-audio failures get a quiet 503 instead of throwing —
  // calling code (fetch wrappers, <img onerror>, etc.) handles this gracefully.
  return new Response('', { status: 503, statusText: 'Offline' })
}

// ════════════════════════════════════════════════════════════════
// MESSAGE CHANNEL — client <-> SW communication
// ════════════════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
  const data = event.data || {}

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (data.type === 'CACHE_AUDIO_URLS') {
    cacheAudioUrls(data.urls || [])
    return
  }

  if (data.type === 'CHECK_AUDIO_CACHED') {
    checkAudioCached(data.url).then((cached) => {
      event.source && event.source.postMessage({ type: 'AUDIO_CACHED_RESULT', url: data.url, cached })
    })
    return
  }

  if (data.type === 'GET_CACHE_STATS') {
    getCacheStats().then((stats) => {
      event.source && event.source.postMessage({ type: 'CACHE_STATS', stats })
    })
    return
  }
})

// Pre-cache a list of audio URLs (called from useOfflineAudioSync every 5 min).
// Skips anything already cached, never re-downloads working entries, and
// never caches a failed/partial response.
async function cacheAudioUrls(urls) {
  if (!urls || !urls.length) return
  const cache = await caches.open(CACHE_AUDIO)
  for (const url of urls) {
    try {
      const already = await cache.match(url)
      if (already) { await touchAudioEntry(url); continue }
      const res = await fetch(url)
      if (res && res.ok) {
        const len = res.headers.get('content-length')
        if (!len || Number(len) > 0) {
          await cache.put(url, res)
          await touchAudioEntry(url)
        }
      }
      // non-ok response: never cached, silently skipped
    } catch {
      // offline mid-loop — stop silently, remaining URLs picked up next cycle
    }
  }
  enforceAudioQuota().catch(() => {})
}

async function checkAudioCached(url) {
  if (!url) return false
  try {
    const cache = await caches.open(CACHE_AUDIO)
    const res = await cache.match(url)
    return !!res
  } catch {
    return false
  }
}

async function getCacheStats() {
  try {
    const cache = await caches.open(CACHE_AUDIO)
    const keys = await cache.keys()
    const audioKeys = keys.filter((k) => k.url !== LRU_META_KEY)
    let totalBytes = 0
    for (const k of audioKeys) {
      const res = await cache.match(k)
      totalBytes += Number(res?.headers.get('content-length') || 0)
    }
    let quota = null, usage = null
    if (self.navigator?.storage?.estimate) {
      const est = await self.navigator.storage.estimate()
      quota = est.quota
      usage = est.usage
    }
    return { audioTrackCount: audioKeys.length, audioBytes: totalBytes, quota, usage }
  } catch {
    return { audioTrackCount: 0, audioBytes: 0, quota: null, usage: null }
  }
}

// ════════════════════════════════════════════════════════════════
// PERIODIC BACKGROUND SYNC — best-effort, browser-gated. Where the
// Periodic Background Sync API isn't supported (Safari/iOS, Firefox),
// the client-side syncQueue.js falls back to a setInterval that
// achieves the same 5-minute cadence while the tab is open. This
// handler covers the case where the browser supports true OS-level
// periodic sync (Chrome/Edge on Android + desktop with the PWA installed).
// ════════════════════════════════════════════════════════════════
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tunez9ja-refresh-audio') {
    event.waitUntil(notifyClientsToSendUrls())
  }
  if (event.tag === 'tunez9ja-sync-queue') {
    event.waitUntil(notifyClientsToFlushQueue())
  }
})

// ════════════════════════════════════════════════════════════════
// BACKGROUND SYNC — one-shot sync registered by syncQueue.js whenever
// a mutation fails offline. Fires automatically when connectivity
// returns, even if the tab is closed (where supported).
// ════════════════════════════════════════════════════════════════
self.addEventListener('sync', (event) => {
  if (event.tag === 'tunez9ja-flush-queue') {
    event.waitUntil(notifyClientsToFlushQueue())
  }
})

async function notifyClientsToSendUrls() {
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach((c) => c.postMessage({ type: 'REQUEST_AUDIO_URLS' }))
}
async function notifyClientsToFlushQueue() {
  const clients = await self.clients.matchAll({ type: 'window' })
  if (clients.length > 0) {
    clients.forEach((c) => c.postMessage({ type: 'FLUSH_SYNC_QUEUE' }))
  } else {
    // No open tab to do the actual work (Supabase client lives there) —
    // nothing more we can do from the SW itself; the queue will flush
    // as soon as a tab opens (syncQueue.js flushes on load + online event).
  }
}
