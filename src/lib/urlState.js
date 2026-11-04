// src/lib/urlState.js
// ─────────────────────────────────────────────────────────────────────────────
// Keeps the browser address bar in sync with what's on screen, using clean,
// search-friendly addresses:
//
//   Pages:  /                         home
//           /music  /blog  /videos …  any page key
//   Items:  /track/<id>/<slug>        a track page
//           /blog/<id>/<slug>         a blog post in full read mode
//           /video/<id>/<slug>        a video, playing
//           /artist/<id>/<slug>       a public profile
//           /album/<id>/<slug>        an album
//           /genre/<slug>             the Music page, filtered to a genre
//
// The slug (song/post title, artist name) is for people and search engines;
// only the id is used to load the item. Old links (/?page=music, /?track=<id>,
// /?post=<id>, /?video=<id>, /?profile=<id>, /?artist=<id>) still work — the
// server redirects them permanently, and the app rewrites them too.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_TYPES = ['post', 'track', 'video', 'profile', 'artist', 'album']

// Which page shows each kind of item
export const ITEM_PAGE = { post: 'blog', track: 'music', video: 'videos', profile: 'profile', album: 'albums' }

// Item type ↔ first path segment
const SEGMENT_FOR = { post: 'blog', track: 'track', video: 'video', profile: 'artist', album: 'album' }
const TYPE_FOR = { blog: 'post', post: 'post', track: 'track', video: 'video', artist: 'profile', profile: 'profile', album: 'album' }

export const SITE = 'https://tunez9ja.com'
const EVENT = 't9:urlchange'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** "Tears for Naija — Ice Prince!" → "tears-for-naija-ice-prince" */
export function slugify(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 71)
    .replace(/-[^-]*$/, m => (m.length > 1 && String(text).length > 71 ? '' : m))  // cut at a word, not mid-word
    .slice(0, 70)
    .replace(/-+$/g, '')
}

/** The performing artist: the credited name if set, otherwise the uploader. */
export function artistOf(track) {
  return (track?.performer_name && String(track.performer_name).trim()) || track?.profiles?.name || track?.artist_name || track?.artist || ''
}

/** A readable slug for an item object (title, plus artist for tracks). */
export function slugFor(type, obj) {
  if (!obj) return ''
  if (type === 'profile') return slugify(obj.name)
  const by = type === 'track' || type === 'album' ? artistOf(obj) : ''
  return slugify([obj.title, by].filter(Boolean).join(' '))
}

// Objects handed over at click time, so the destination can render instantly
// instead of re-fetching. Keyed by `${type}:${id}`.
const itemCache = new Map()
export const takeCachedItem = (type, id) => {
  const key = `${type}:${id}`
  const obj = itemCache.get(key)
  itemCache.delete(key)
  return obj || null
}

/** Old query-style links (/?page=music, /?track=<id> …) → { page, item } */
function parseLegacy(loc) {
  const params = new URLSearchParams(loc.search)
  for (const type of ITEM_TYPES) {
    const id = params.get(type)
    if (!id) continue
    const t = type === 'artist' ? 'profile' : type
    return { page: ITEM_PAGE[t], item: { type: t, id } }
  }
  const page = params.get('page')
  return page ? { page, item: null } : null
}

export function parseLocation(loc = window.location) {
  // Old links keep working
  if (loc.pathname === '/' || loc.pathname === '') {
    const legacy = parseLegacy(loc)
    if (legacy) return { ...legacy, legacy: true }
  }
  const parts = loc.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (!parts.length) return { page: 'home', item: null }
  const [first, second] = parts
  if (first === 'genre' && second) return { page: 'music', item: null, genre: second }
  const type = TYPE_FOR[first]
  if (type && second && UUID.test(second)) {
    return { page: ITEM_PAGE[type], item: { type, id: second } }
  }
  return { page: first, item: null }
}

/** Show the Music page filtered to a genre (/genre/<slug>), or all music. */
export function navigateToGenre(genre) {
  go(!genre || genre === 'All' ? '/music' : `/genre/${slugify(genre)}`)
}

/** True when the address bar still shows an old-style link. */
export const isLegacyLocation = (loc = window.location) => !!parseLocation(loc).legacy

export function urlFor(page, item, obj) {
  if (item?.type && item?.id) {
    const seg = SEGMENT_FOR[item.type] || item.type
    const slug = item.slug || slugFor(item.type, obj)
    return `/${seg}/${encodeURIComponent(item.id)}${slug ? '/' + slug : ''}`
  }
  if (!page || page === 'home') return '/'
  return `/${encodeURIComponent(page)}`
}

/** Absolute link for sharing — always the public site, even on localhost. */
export function shareLinkFor(type, id, obj) {
  const origin = typeof window !== 'undefined' && /tunez9ja/.test(window.location.host)
    ? window.location.origin : SITE
  return origin + urlFor(null, { type, id }, obj)
}

function currentUrl() {
  return window.location.pathname + window.location.search
}

function go(url, { replace = false, state = {} } = {}) {
  if (url === currentUrl()) return
  window.history[replace ? 'replaceState' : 'pushState'](state, '', url)
  window.dispatchEvent(new Event(EVENT))
}

/** Show a page; clears any open item. */
export function navigateToPage(page, opts) {
  go(urlFor(page), opts)
}

/** Open a post / track / video / profile — updates the address bar. */
export function openItem(type, id, obj) {
  if (!type || !id) return
  if (obj) itemCache.set(`${type}:${id}`, obj)
  go(urlFor(null, { type, id }, obj))
}

/** Close the open item and return to its list page. */
export function closeItem(page) {
  go(urlFor(page))
}

/**
 * Add the readable slug to the address once an item has loaded (e.g. after
 * opening a bare /track/<id> link), without adding a history entry.
 */
export function settleItemUrl(type, id, obj) {
  const want = urlFor(null, { type, id }, obj)
  const now = window.location.pathname
  if (now.startsWith(`/${SEGMENT_FOR[type]}/${id}`) && now !== want) {
    window.history.replaceState(window.history.state, '', want + window.location.search)
  }
}

/** Subscribe to address-bar changes (in-app navigation and back/forward). */
export function onUrlChange(handler) {
  window.addEventListener(EVENT, handler)
  window.addEventListener('popstate', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('popstate', handler)
  }
}
