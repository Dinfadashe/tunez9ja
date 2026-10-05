// src/lib/downloads.js
// ─────────────────────────────────────────────────────────────────────────────
// Offline downloads (Audiomack-style).
//
//  • Audio + cover are stored in the Cache API under DOWNLOADS_CACHE — a cache
//    the service worker never deletes on updates and never evicts for space.
//  • A small record per track (title, artist, cover…) is kept in localStorage
//    so the Downloads screen works with no internet at all.
//  • The service worker serves these files for playback (including seeking);
//    the player can also read them directly if needed (getDownloadedBlobUrl).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

export const DOWNLOADS_CACHE = 't9j-downloads'   // must match public/sw.js
const META_KEY = 't9_downloads_v1'
const EVENT = 't9:downloads'

const inProgress = new Map()   // id → { received, total, controller }

const readMeta = () => {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') } catch { return {} }
}
const writeMeta = (meta) => {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)) } catch { /* storage full */ }
  emit()
}
const emit = () => window.dispatchEvent(new Event(EVENT))

export const isDownloadSupported = () => typeof window !== 'undefined' && 'caches' in window

export function listDownloads() {
  return Object.values(readMeta()).sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0))
}
export const isDownloaded = (id) => !!readMeta()[id]
export const downloadProgress = (id) => {
  const p = inProgress.get(id)
  return p ? { received: p.received, total: p.total } : null
}

/** Tracks are downloadable if free, unlocked, or the listener's own. */
export function canDownload(track, { unlocked = false, userId = null } = {}) {
  if (!track?.audio_url) return false
  return !track.is_premium || unlocked || (userId && track.artist_id === userId)
}

async function askPersistentStorage() {
  // Asks the browser not to clear downloads when the phone is low on space
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist() } catch { /* ignore */ }
}

/**
 * Download a track for offline play. Resolves when stored.
 * Progress is broadcast through useDownloads()/downloadProgress().
 */
export async function downloadTrack(track) {
  if (!isDownloadSupported()) throw new Error('Downloads are not supported in this browser')
  if (!track?.id || !track.audio_url) throw new Error('This track has no audio file')
  if (isDownloaded(track.id)) return
  if (inProgress.has(track.id)) return

  const controller = new AbortController()
  const state = { received: 0, total: 0, controller }
  inProgress.set(track.id, state)
  emit()
  askPersistentStorage()

  try {
    const res = await fetch(track.audio_url, { mode: 'cors', signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`Download failed (${res.status})`)
    state.total = Number(res.headers.get('content-length') || 0)

    // Read with progress
    let body
    if (res.body && res.body.getReader) {
      const reader = res.body.getReader()
      const chunks = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        state.received += value.length
        emit()
      }
      body = new Blob(chunks, { type: res.headers.get('content-type') || 'audio/mpeg' })
    } else {
      body = await res.blob()
      state.received = body.size
    }
    if (!body.size) throw new Error('Downloaded file is empty')

    const cache = await caches.open(DOWNLOADS_CACHE)
    await cache.put(track.audio_url, new Response(body, {
      status: 200,
      headers: {
        'Content-Type': body.type || 'audio/mpeg',
        'Content-Length': String(body.size),
        'Accept-Ranges': 'bytes',
      },
    }))

    // Cover image (best effort — the track still plays without it)
    if (track.cover_url) {
      try {
        const img = await fetch(track.cover_url, { mode: 'cors', cache: 'no-store' })
        if (img.ok) await cache.put(track.cover_url, img)
      } catch { /* ignore */ }
    }

    const meta = readMeta()
    meta[track.id] = {
      id: track.id,
      title: track.title || 'Untitled',
      artist: track.profiles?.name || track.artist_name || '',
      artist_id: track.artist_id || null,
      cover_url: track.cover_url || null,
      audio_url: track.audio_url,
      duration: track.duration || null,
      genre: track.genre || null,
      size: body.size,
      downloadedAt: Date.now(),
    }
    inProgress.delete(track.id)
    writeMeta(meta)
  } catch (err) {
    inProgress.delete(track.id)
    emit()
    if (err?.name === 'AbortError') return
    if (/quota/i.test(err?.message || '') || err?.name === 'QuotaExceededError') {
      throw new Error('Not enough storage on this device. Remove some downloads and try again.')
    }
    throw err
  }
}

export function cancelDownload(id) {
  inProgress.get(id)?.controller.abort()
}

export async function removeDownload(id) {
  const meta = readMeta()
  const item = meta[id]
  if (!item) return
  try {
    const cache = await caches.open(DOWNLOADS_CACHE)
    await cache.delete(item.audio_url)
    // Keep the cover if another download uses it
    if (item.cover_url && !Object.values(meta).some(m => m.id !== id && m.cover_url === item.cover_url)) {
      await cache.delete(item.cover_url)
    }
  } catch { /* ignore */ }
  delete meta[id]
  writeMeta(meta)
}

export async function removeAllDownloads() {
  try { await caches.delete(DOWNLOADS_CACHE) } catch { /* ignore */ }
  writeMeta({})
}

/** Total bytes used by downloads (from our records — fast, works offline). */
export const downloadsSize = () => listDownloads().reduce((n, d) => n + (d.size || 0), 0)

/** A blob: URL for a downloaded track, read straight from storage. */
export async function getDownloadedBlobUrl(audioUrl) {
  try {
    const cache = await caches.open(DOWNLOADS_CACHE)
    const res = await cache.match(audioUrl)
    if (!res) return null
    return URL.createObjectURL(await res.blob())
  } catch { return null }
}

export const isDownloadedUrl = (audioUrl) => Object.values(readMeta()).some(m => m.audio_url === audioUrl)

/** Downloads list + live progress, re-rendering on every change. */
export function useDownloads() {
  const [, force] = useState(0)
  useEffect(() => {
    const h = () => force(n => n + 1)
    window.addEventListener(EVENT, h)
    window.addEventListener('storage', h)   // other tabs
    return () => { window.removeEventListener(EVENT, h); window.removeEventListener('storage', h) }
  }, [])
  return {
    downloads: listDownloads(),
    isDownloaded,
    progress: downloadProgress,
    totalSize: downloadsSize(),
  }
}

export function formatBytes(n) {
  if (!n) return '0 MB'
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB'
  return (n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB'
}
