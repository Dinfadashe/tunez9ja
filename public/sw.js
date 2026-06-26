// Tunez9ja Service Worker — offline music + background refresh
const CACHE_NAME   = 'tunez9ja-v2'
const AUDIO_CACHE  = 'tunez9ja-audio-v2'
const IMAGE_CACHE  = 'tunez9ja-images-v2'
const APP_SHELL    = ['/', '/index.html', '/manifest.json']

const SKIP_DOMAINS = [
  'paystack.com', 'paystack.co',
  'youtube.com', 'youtu.be', 'ytimg.com',
  'googleapis.com', 'gstatic.com',
  'cloudflare.com', 'jsdelivr.net',
  'supabase.co', 'supabase.com',
  'google-analytics.com', 'googletagmanager.com',
]

// ── Install: cache app shell ─────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(APP_SHELL))
      .catch(() => {})
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', e => {
  const KEEP = [CACHE_NAME, AUDIO_CACHE, IMAGE_CACHE]
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: smart caching strategy ────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return
  if (SKIP_DOMAINS.some(d => url.hostname.includes(d))) return
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return

  // Audio files — cache first (offline music)
  if (url.pathname.includes('/music-audio/') || req.destination === 'audio') {
    e.respondWith(audioStrategy(req))
    return
  }

  // Cover images — cache first
  if (url.pathname.includes('/music-covers/') || url.pathname.includes('/post-images/') || url.pathname.includes('/avatars/')) {
    e.respondWith(imageStrategy(req))
    return
  }

  // App shell — network first, cache fallback
  e.respondWith(networkFirstStrategy(req))
})

// Audio: cache-first, background update
async function audioStrategy(req) {
  const cache = await caches.open(AUDIO_CACHE)
  const cached = await cache.match(req)
  if (cached) {
    // Background: update cache silently
    fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()) }).catch(() => {})
    return cached
  }
  try {
    const res = await fetch(req)
    if (res && res.ok) cache.put(req, res.clone())
    return res
  } catch {
    return new Response('Audio not available offline', { status: 503 })
  }
}

// Images: cache-first
async function imageStrategy(req) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res && res.ok) cache.put(req, res.clone())
    return res
  } catch {
    return new Response('Image not available offline', { status: 503 })
  }
}

// App shell: network-first
async function networkFirstStrategy(req) {
  try {
    const res = await fetch(req)
    if (res && res.ok) {
      const clone = res.clone()
      caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {})
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    if (req.mode === 'navigate') {
      const fallback = await caches.match('/index.html')
      if (fallback) return fallback
    }
    return new Response('Offline', { status: 503 })
  }
}

// ── Background sync: refresh audio cache every 5 minutes ─────
self.addEventListener('message', e => {
  if (e.data?.type === 'CACHE_AUDIO_URLS') {
    const urls = e.data.urls || []
    cacheAudioUrls(urls)
  }
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

async function cacheAudioUrls(urls) {
  if (!urls.length) return
  const cache = await caches.open(AUDIO_CACHE)
  for (const url of urls) {
    try {
      const already = await cache.match(url)
      if (!already) {
        const res = await fetch(url)
        if (res && res.ok) {
          await cache.put(url, res)
        }
      }
    } catch {
      // Network unavailable, skip
    }
  }
}

// Periodic background sync (when supported)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'refresh-audio-cache') {
    e.waitUntil(notifyClientsToSendUrls())
  }
})

async function notifyClientsToSendUrls() {
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage({ type: 'REQUEST_AUDIO_URLS' }))
}
