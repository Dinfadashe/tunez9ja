const CACHE_NAME    = 'tunez9ja-v2'
const AUDIO_CACHE   = 'tunez9ja-audio-v1'

const APP_SHELL = ['/', '/index.html', '/logo.png', '/manifest.json']

// External domains — never intercept, pass through directly
const EXTERNAL_PASSTHROUGH = [
  'paystack.com', 'paystack.co',
  'youtube.com', 'youtu.be', 'ytimg.com',
  'googleapis.com', 'gstatic.com',
  'cloudflare.com', 'jsdelivr.net', 'cdnjs.cloudflare.com',
  'supabase.co', 'supabase.com',
  'localhost:5173', 'vite',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== AUDIO_CACHE).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)

  // Always pass through: external CDNs, APIs, payment providers
  if (EXTERNAL_PASSTHROUGH.some(d => url.hostname.includes(d))) {
    return // let browser handle it normally — do NOT call e.respondWith()
  }

  // Pass through non-GET requests
  if (req.method !== 'GET') return

  // Audio files — cache for offline playback
  if (url.pathname.includes('/music-audio/') || req.destination === 'audio') {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        const cached = await cache.match(req)
        if (cached) return cached
        try {
          const res = await fetch(req)
          if (res.ok) cache.put(req, res.clone())
          return res
        } catch {
          return cached || new Response('Audio unavailable offline', { status: 503 })
        }
      })
    )
    return
  }

  // App shell — cache first, network fallback
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached
      return fetch(req).then(res => {
        if (res.ok) {
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone()))
        }
        return res
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('/index.html')
      })
    })
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'CACHE_AUDIO') {
    caches.open(AUDIO_CACHE).then(async cache => {
      const { url } = e.data
      const existing = await cache.match(url)
      if (!existing) {
        try {
          const res = await fetch(url)
          if (res.ok) {
            cache.put(url, res)
            e.source?.postMessage({ type: 'AUDIO_CACHED', url })
          }
        } catch {}
      }
    })
  }
  if (e.data?.type === 'REMOVE_AUDIO') {
    caches.open(AUDIO_CACHE).then(c => c.delete(e.data.url))
  }
})
