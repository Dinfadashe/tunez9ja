// src/lib/urlState.js
// ─────────────────────────────────────────────────────────────────────────────
// Keeps the browser address bar in sync with what's on screen, so every page
// and every post / track / video has a link you can copy straight from it.
//
//   Pages:  /                     home
//           /?page=music          any page key (music, blog, videos, charts…)
//   Items:  /?post=<id>           a blog post in full read mode
//           /?track=<id>          a track page
//           /?video=<id>          a video, playing
//           /?profile=<id>        a public profile
//
// Item links stay on the site root on purpose: the share-meta edge function
// serves rich previews (cover, title, description) for exactly these URLs.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_TYPES = ['post', 'track', 'video', 'profile', 'artist']

// Which page shows each kind of item
export const ITEM_PAGE = { post: 'blog', track: 'music', video: 'videos', profile: 'profile' }

const SITE = 'https://tunez9ja.netlify.app'
const EVENT = 't9:urlchange'

// Objects handed over at click time, so the destination can render instantly
// instead of re-fetching. Keyed by `${type}:${id}`.
const itemCache = new Map()
export const takeCachedItem = (type, id) => {
  const key = `${type}:${id}`
  const obj = itemCache.get(key)
  itemCache.delete(key)
  return obj || null
}

export function parseLocation(loc = window.location) {
  const params = new URLSearchParams(loc.search)
  for (const type of ITEM_TYPES) {
    const id = params.get(type)
    if (!id) continue
    const t = type === 'artist' ? 'profile' : type   // old ?artist= links open the profile
    return { page: ITEM_PAGE[t], item: { type: t, id } }
  }
  const page = params.get('page')
  return { page: page || 'home', item: null }
}

export function urlFor(page, item) {
  if (item?.type && item?.id) return `/?${item.type}=${encodeURIComponent(item.id)}`
  if (!page || page === 'home') return '/'
  return `/?page=${encodeURIComponent(page)}`
}

/** Absolute link for sharing — always the public site, even on localhost. */
export function shareLinkFor(type, id) {
  const origin = typeof window !== 'undefined' && /tunez9ja/.test(window.location.host)
    ? window.location.origin : SITE
  return `${origin}/?${type}=${encodeURIComponent(id)}`
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
  go(urlFor(null, { type, id }))
}

/** Close the open item and return to its list page. */
export function closeItem(page) {
  go(urlFor(page))
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
