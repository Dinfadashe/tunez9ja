const CACHE_NAME  = 'tunez9ja-v1782298553'
const AUDIO_CACHE = 'tunez9ja-audio-v1'
const APP_SHELL   = ['/', '/index.html', '/logo.png', '/manifest.json']

const SKIP_DOMAINS = [
  'paystack.com', 'paystack.co',
  'youtube.com', 'youtu.be', 'ytimg.com',
  'googleapis.com', 'gstatic.com',
  'cloudflare.com', 'jsdelivr.net',
  'supabase.co', 'supabase.com',
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
        keys.filter(k => k !== CACHE_NAME && k !== AUDIO_CACHE)
            .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)

  // Never intercept external services
  if (SKIP_DOMAINS.some(d => url.hostname.includes(d))) return
  if (req.method !== 'GET') return

  // Audio — cache for offline
  if (url.pathname.includes('/music-audio/') || req.destination === 'audio') {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        const cached = await cache.match(req)
        if (cached) return cached
        try {
          const res = await fetch(req)
          if (res && res.ok) {
            cache.put(req, res.clone())
          }
          return res
        } catch {
          return cached || new Response('Audio unavailable offline', { status: 503 })
        }
      })
    )
    return
  }

  // App shell — network first, cache fallback
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(req, clone))
        }
        return res
      })
      .catch(() => caches.match(req).then(cached => {
        if (cached) return cached
        if (req.mode === 'navigate') return caches.match('/index.html')
      }))
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'CACHE_AUDIO') {
    caches.open(AUDIO_CACHE).then(async cache => {
      const { url } = e.data
      if (await cache.match(url)) return
      try {
        const res = await fetch(url)
        if (res && res.ok) {
          cache.put(url, res.clone())
          e.source?.postMessage({ type: 'AUDIO_CACHED', url })
        }
      } catch {}
    })
  }
  if (e.data?.type === 'REMOVE_AUDIO') {
    caches.open(AUDIO_CACHE).then(c => c.delete(e.data.url))
  }
})
