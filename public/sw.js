const CACHE_NAME = 'tunez9ja-v1'
const OFFLINE_CACHE = 'tunez9ja-offline-v1'
const AUDIO_CACHE = 'tunez9ja-audio-v1'

// App shell — cache these for instant offline load
const APP_SHELL = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
]

// Install — cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== OFFLINE_CACHE && k !== AUDIO_CACHE)
            .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Audio files — cache first for offline playback
  if (url.pathname.includes('/storage/v1/object/public/music-audio/') ||
      e.request.destination === 'audio') {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        try {
          const response = await fetch(e.request)
          if (response.ok) {
            const toCache = response.clone()
            cache.put(e.request, toCache)
          }
          return response
        } catch {
          return cached || new Response('Audio not available offline', { status: 503 })
        }
      })
    )
    return
  }

  // Supabase API — network only (never cache auth/data calls)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.com')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }, status: 503
        })
      )
    )
    return
  }

  // Paystack — network only
  if (url.hostname.includes('paystack')) {
    e.respondWith(fetch(e.request))
    return
  }

  // App shell & static assets — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(response => {
        // Clone BEFORE doing anything else with the response
        if (response.ok && e.request.method === 'GET') {
          const toCache = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, toCache))
        }
        return response
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html')
        }
      })
    })
  )
})

// Message from app — cache a track for offline
self.addEventListener('message', e => {
  if (e.data?.type === 'CACHE_AUDIO') {
    const { url } = e.data
    caches.open(AUDIO_CACHE).then(async cache => {
      const existing = await cache.match(url)
      if (!existing) {
        const response = await fetch(url)
        if (response.ok) {
          cache.put(url, response)
          e.source?.postMessage({ type: 'AUDIO_CACHED', url })
        }
      }
    })
  }

  if (e.data?.type === 'REMOVE_AUDIO') {
    caches.open(AUDIO_CACHE).then(cache => cache.delete(e.data.url))
  }
})
