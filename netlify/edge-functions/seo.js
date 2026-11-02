// Netlify Edge Function — server-side SEO for every page.
// ─────────────────────────────────────────────────────────────────────────────
// Search engines and link-preview bots often don't run JavaScript, so on its
// own the app would look like an empty page to them. Before the HTML is sent,
// this function:
//   1. Redirects old links (/?page=music, /?track=<id> …) permanently to the
//      clean address (/music, /track/<id>/<slug>).
//   2. Writes the right <title>, description, canonical address, Open Graph /
//      Twitter tags and structured data (JSON-LD) for the page.
//   3. Puts the page's real content (headings, text, links) inside #root, so
//      crawlers can read it. The app replaces it as soon as it starts — it is
//      the same content every visitor gets.
//   4. Marks private pages (dashboards, login…) noindex, and answers 404 for
//      pages and items that don't exist.
// Results are cached at Netlify's edge for 5 minutes (cleared on each deploy).
// ─────────────────────────────────────────────────────────────────────────────

const SITE = 'https://tunez9ja.com'
const NAME = 'Tunez9ja'
const DEFAULT_IMAGE = `${SITE}/og-default.jpg`
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Pages ────────────────────────────────────────────────────────────────────
const PAGES = {
  home:   { index: true,  title: `${NAME} — Stream Nigerian Music, Download & Earn`, h1: 'The beat of every culture',
            description: 'Stream Afrobeats, Highlife, Street Pop and more from Nigerian and African artists. Download songs for offline, follow your favourite artists and earn TUNEZ rewards.' },
  music:  { index: true,  title: `New Music — Afrobeats, Highlife & Street Pop | ${NAME}`, h1: 'Music',
            description: 'Stream the latest Afrobeats, Highlife, Street Pop, Gospel and Hip-Hop songs from independent Nigerian artists on Tunez9ja.' },
  blog:   { index: true,  title: `Music News, Artist Stories & Gist | ${NAME} Blog`, h1: 'Blog',
            description: 'Nigerian music news, new releases, artist interviews and stories from the Tunez9ja blog.' },
  videos: { index: true,  title: `Music Videos | ${NAME}`, h1: 'Music videos',
            description: 'Watch music videos from Nigerian and African artists on Tunez9ja.' },
  charts: { index: true,  title: `Top Charts — Most-Played Songs | ${NAME}`, h1: 'Top charts',
            description: 'The most-played songs on Tunez9ja right now, updated as listeners stream.' },
  albums: { index: true,  title: `Albums | ${NAME}`, h1: 'Albums',
            description: 'Albums and EPs from independent artists on Tunez9ja.' },
  about:  { index: true,  title: `About ${NAME}`, h1: 'About Tunez9ja',
            description: 'Tunez9ja is a music streaming platform built in Jos, Nigeria, where listeners discover new music and artists earn from their work.' },
  terms:  { index: true,  title: `Terms of Service | ${NAME}`, h1: 'Terms of Service', description: 'Terms of Service for using Tunez9ja.' },
  privacy:{ index: true,  title: `Privacy Policy | ${NAME}`, h1: 'Privacy Policy', description: 'How Tunez9ja collects, uses and protects your information.' },
}
// Real pages that shouldn't appear in search results
const PRIVATE_PAGES = new Set([
  'login', 'register', 'reset-password', 'downloads', 'search', 'profile',
  'admin-dashboard', 'artist-dashboard', 'blogger-dashboard', 'user-dashboard', 'editor-dashboard',
])

// Item addresses: first path segment → kind
const ITEM_SEGMENTS = { track: 'track', blog: 'post', post: 'post', video: 'video', artist: 'profile', profile: 'profile' }
const SEGMENT_FOR = { track: 'track', post: 'blog', video: 'video', profile: 'artist' }
const LEGACY_KEYS = { track: 'track', post: 'post', video: 'video', profile: 'profile', artist: 'profile' }

// ── Helpers ──────────────────────────────────────────────────────────────────
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const stripHtml = (html = '') => String(html || '')
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<\/(p|div|h[1-6]|li|br)\s*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : (s || ''))

function slugify(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '')
}
function slugFor(kind, row) {
  if (kind === 'profile') return slugify(row.name)
  const by = kind === 'track' ? (row.profiles?.name || '') : ''
  return slugify([row.title, by].filter(Boolean).join(' '))
}
const itemPath = (kind, row) => {
  const slug = slugFor(kind, row)
  return `/${SEGMENT_FOR[kind]}/${row.id}${slug ? '/' + slug : ''}`
}

function youtubeId(url = '') {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}
function isoDuration(v) {
  let s = Number(v)
  if (!Number.isFinite(s)) {
    const m = String(v || '').match(/^(\d+):(\d{1,2})$/)
    if (!m) return undefined
    s = Number(m[1]) * 60 + Number(m[2])
  }
  if (!s || s <= 0) return undefined
  return `PT${Math.floor(s / 60)}M${Math.round(s % 60)}S`
}
const fmtDuration = (v) => {
  const iso = isoDuration(v)
  if (!iso) return ''
  const [, m, sec] = iso.match(/PT(\d+)M(\d+)S/)
  return `${m}:${String(sec).padStart(2, '0')}`
}
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`
const breadcrumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE + it.path })),
})
const PUBLISHER = { '@type': 'Organization', name: NAME, url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } }

// ── Supabase (public, approved content only — anon key) ──────────────────────
function supabase() {
  const url = Netlify.env.get('VITE_SUPABASE_URL') || Netlify.env.get('SUPABASE_URL')
  const key = Netlify.env.get('VITE_SUPABASE_ANON_KEY') || Netlify.env.get('SUPABASE_ANON_KEY')
  if (!url || !key) return null
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  const get = (path) => fetch(`${url}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(2500) })
    .then(r => (r.ok ? r.json() : [])).catch(() => [])
  const rpc = (fn, body) => fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) })
    .then(r => (r.ok ? r.json() : null)).catch(() => null)
  return { get, rpc }
}

const TRACK_FIELDS = 'id,title,genre,duration,cover_url,description,created_at,updated_at,play_count,is_premium,artist_id,profiles:artist_id(name)'
const POST_FIELDS = 'id,title,excerpt,content,cover_url,category,tags,published_at,created_at,updated_at,is_premium,author_id,profiles:author_id(name)'

async function loadItem(db, kind, id) {
  if (kind === 'track') return (await db.get(`music_tracks?id=eq.${id}&status=eq.approved&select=${encodeURIComponent(TRACK_FIELDS)}&limit=1`))?.[0] || null
  if (kind === 'post') return (await db.get(`blog_posts?id=eq.${id}&status=eq.approved&select=${encodeURIComponent(POST_FIELDS)}&limit=1`))?.[0] || null
  if (kind === 'video') return (await db.get(`videos?id=eq.${id}&status=eq.approved&select=*&limit=1`))?.[0] || null
  if (kind === 'profile') {
    const p = await db.rpc('public_profile', { p_id: id })
    const row = Array.isArray(p) ? p[0] : p
    if (!row?.id) return null
    row.tracks = await db.get(`music_tracks?artist_id=eq.${id}&status=eq.approved&select=id,title,genre,cover_url,play_count,duration&order=play_count.desc&limit=30`)
    return row
  }
  return null
}

// ── What each page says ──────────────────────────────────────────────────────
function linkList(items) {
  if (!items?.length) return ''
  return `<ul>${items.map(i => `<li><a href="${esc(i.href)}">${esc(i.text)}</a>${i.note ? ` <span>${esc(i.note)}</span>` : ''}</li>`).join('')}</ul>`
}
const trackLinks = (rows) => (rows || []).map(t => ({ href: itemPath('track', t), text: t.title, note: [t.profiles?.name, t.genre].filter(Boolean).join(' · ') }))
const postLinks = (rows) => (rows || []).map(p => ({ href: itemPath('post', p), text: p.title, note: p.profiles?.name || '' }))
const videoLinks = (rows) => (rows || []).map(v => ({ href: itemPath('video', v), text: v.title }))

function trackPage(t) {
  const artist = t.profiles?.name || ''
  const path = itemPath('track', t)
  const artistPath = t.artist_id ? itemPath('profile', { id: t.artist_id, name: artist }) : null
  const desc = clip(stripHtml(t.description), 200) ||
    `Listen to "${t.title}"${artist ? ` by ${artist}` : ''}${t.genre ? `, a ${t.genre} song,` : ''} on Tunez9ja. Stream it, download it for offline and earn TUNEZ rewards.`
  return {
    path, ogType: 'music.song', image: t.cover_url,
    title: `${t.title}${artist ? ` — ${artist}` : ''} | Listen on ${NAME}`,
    ogTitle: artist ? `${t.title} — ${artist}` : t.title,
    description: desc,
    ld: [
      {
        '@context': 'https://schema.org', '@type': 'MusicRecording', name: t.title, url: SITE + path,
        ...(t.cover_url && { image: t.cover_url }), ...(t.genre && { genre: t.genre }),
        ...(isoDuration(t.duration) && { duration: isoDuration(t.duration) }),
        ...(t.created_at && { datePublished: t.created_at.slice(0, 10) }),
        ...(artist && { byArtist: { '@type': 'MusicGroup', name: artist, ...(artistPath && { url: SITE + artistPath }) } }),
        isAccessibleForFree: !t.is_premium,
        ...(t.play_count > 0 && { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ListenAction', userInteractionCount: t.play_count } }),
      },
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Music', path: '/music' }, { name: t.title, path }]),
    ],
    body: `<h1>${esc(t.title)}</h1>
      ${artist ? `<p>By ${artistPath ? `<a href="${esc(artistPath)}">${esc(artist)}</a>` : esc(artist)}</p>` : ''}
      <p>${esc([t.genre, fmtDuration(t.duration), t.is_premium ? 'Premium' : 'Free to stream'].filter(Boolean).join(' · '))}</p>
      <p>${esc(desc)}</p>
      <p><a href="/music">More music on Tunez9ja</a></p>`,
  }
}

function postPage(p) {
  const author = p.profiles?.name || ''
  const path = itemPath('post', p)
  const text = stripHtml(p.content)
  const desc = clip((p.excerpt || '').trim() || text, 200) || `Read "${p.title}" on Tunez9ja.`
  // Free posts: the full text is crawlable. Premium posts: the summary only.
  const bodyText = p.is_premium ? desc : clip(text, 6000)
  return {
    path, ogType: 'article', image: p.cover_url,
    title: `${p.title} | ${NAME}`, ogTitle: p.title, description: desc,
    ld: [
      {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: clip(p.title, 110), description: desc,
        url: SITE + path, mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + path },
        ...(p.cover_url && { image: [p.cover_url] }),
        datePublished: p.published_at || p.created_at, dateModified: p.updated_at || p.published_at || p.created_at,
        ...(author && { author: { '@type': 'Person', name: author, ...(p.author_id && { url: SITE + itemPath('profile', { id: p.author_id, name: author }) }) } }),
        publisher: PUBLISHER,
        ...(p.category && { articleSection: p.category }),
        ...(Array.isArray(p.tags) && p.tags.length && { keywords: p.tags.join(', ') }),
        isAccessibleForFree: !p.is_premium,
      },
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: p.title, path }]),
    ],
    body: `<article><h1>${esc(p.title)}</h1>
      ${author ? `<p>By ${esc(author)}${p.published_at ? ` · ${esc(new Date(p.published_at).toDateString())}` : ''}</p>` : ''}
      ${bodyText.split(/\n{2,}/).map(par => `<p>${esc(par)}</p>`).join('')}
      <p><a href="/blog">More from the Tunez9ja blog</a></p></article>`,
  }
}

function videoPage(v) {
  const path = itemPath('video', v)
  const yt = youtubeId(v.youtube_url)
  const thumb = v.thumbnail_url || v.cover_url || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : DEFAULT_IMAGE)
  const desc = clip(stripHtml(v.description), 200) || `Watch "${v.title}" on Tunez9ja.`
  return {
    path, ogType: 'video.other', image: thumb,
    title: `${v.title} | Watch on ${NAME}`, ogTitle: v.title, description: desc,
    ld: [
      {
        '@context': 'https://schema.org', '@type': 'VideoObject', name: v.title, description: desc,
        thumbnailUrl: [thumb], uploadDate: v.created_at || new Date().toISOString(), url: SITE + path,
        ...(yt ? { embedUrl: `https://www.youtube.com/embed/${yt}` } : v.video_url ? { contentUrl: v.video_url } : {}),
        publisher: PUBLISHER,
      },
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Videos', path: '/videos' }, { name: v.title, path }]),
    ],
    body: `<h1>${esc(v.title)}</h1><p>${esc(desc)}</p><p><a href="/videos">More music videos</a></p>`,
  }
}

function profilePage(p) {
  const path = itemPath('profile', p)
  const isArtist = p.role === 'artist' || (p.tracks?.length > 0)
  const bio = clip(stripHtml(p.bio), 200)
  const desc = bio || (isArtist
    ? `Listen to songs by ${p.name} on Tunez9ja. Stream, download and follow ${p.name} for new releases.`
    : `${p.name} on Tunez9ja.`)
  const tracks = p.tracks || []
  return {
    path, ogType: 'profile', image: p.avatar_url,
    title: isArtist ? `${p.name} — Songs & Music | ${NAME}` : `${p.name} | ${NAME}`,
    ogTitle: p.name, description: desc,
    ld: [
      {
        '@context': 'https://schema.org', '@type': isArtist ? 'MusicGroup' : 'Person', name: p.name, url: SITE + path,
        ...(p.avatar_url && { image: p.avatar_url }), ...(bio && { description: bio }),
        ...(isArtist && p.genre && { genre: p.genre }),
        ...(isArtist && tracks.length && { track: tracks.slice(0, 20).map(t => ({ '@type': 'MusicRecording', name: t.title, url: SITE + itemPath('track', { ...t, profiles: { name: p.name } }) })) }),
      },
      breadcrumbs([{ name: 'Home', path: '/' }, { name: isArtist ? 'Artists' : 'People', path: '/music' }, { name: p.name, path }]),
    ],
    body: `<h1>${esc(p.name)}</h1>${bio ? `<p>${esc(bio)}</p>` : ''}
      ${tracks.length ? `<h2>Songs by ${esc(p.name)}</h2>${linkList(tracks.map(t => ({ href: itemPath('track', { ...t, profiles: { name: p.name } }), text: t.title, note: t.genre || '' })))}` : ''}`,
  }
}

async function listPage(db, key, meta) {
  const base = { path: key === 'home' ? '/' : `/${key}`, ogType: 'website', title: meta.title, ogTitle: meta.title, description: meta.description, image: null, ld: [] }
  let links = ''
  if (db && key === 'home') {
    const [tracks, posts] = await Promise.all([
      db.get(`music_tracks?status=eq.approved&select=${encodeURIComponent(TRACK_FIELDS)}&order=created_at.desc&limit=12`),
      db.get(`blog_posts?status=eq.approved&select=id,title,profiles:author_id(name)&order=created_at.desc&limit=6`),
    ])
    links = `<h2>New music</h2>${linkList(trackLinks(tracks))}<h2>From the blog</h2>${linkList(postLinks(posts))}`
  } else if (db && key === 'music') {
    links = linkList(trackLinks(await db.get(`music_tracks?status=eq.approved&select=${encodeURIComponent(TRACK_FIELDS)}&order=created_at.desc&limit=60`)))
  } else if (db && key === 'charts') {
    links = linkList(trackLinks(await db.get(`music_tracks?status=eq.approved&select=${encodeURIComponent(TRACK_FIELDS)}&order=play_count.desc&limit=50`)))
  } else if (db && key === 'blog') {
    links = linkList(postLinks(await db.get(`blog_posts?status=eq.approved&select=id,title,profiles:author_id(name)&order=created_at.desc&limit=40`)))
  } else if (db && key === 'videos') {
    links = linkList(videoLinks(await db.get(`videos?status=eq.approved&select=id,title&order=created_at.desc&limit=40`)))
  }
  if (key !== 'home') base.ld.push(breadcrumbs([{ name: 'Home', path: '/' }, { name: meta.h1, path: base.path }]))
  base.body = `<h1>${esc(meta.h1)}</h1><p>${esc(meta.description)}</p>${links}`
  return base
}

// ── HTML rewriting ───────────────────────────────────────────────────────────
function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${key.replace(/:/g, '\\:')}"\\s+content=")[^"]*(")`, 'i')
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`)
  return html.replace('</head>', `    <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`)
}
const dropMeta = (html, attr, key) =>
  html.replace(new RegExp(`\\s*<meta\\s+${attr}="${key.replace(/:/g, '\\:')}"[^>]*>`, 'gi'), '')

const NAV = `<nav><a href="/">Home</a> · <a href="/music">Music</a> · <a href="/charts">Charts</a> · <a href="/videos">Videos</a> · <a href="/blog">Blog</a> · <a href="/about">About</a></nav>`
const PRERENDER_STYLE = `<style>.seo-prerender{max-width:760px;margin:0 auto;padding:88px 20px 40px;color:#d8d8d8;font:16px/1.65 Inter,system-ui,sans-serif}.seo-prerender h1{color:#fff;font-size:32px;line-height:1.2;margin:16px 0}.seo-prerender h2{color:#fff;font-size:20px;margin:28px 0 8px}.seo-prerender a{color:#ff5470}.seo-prerender ul{padding-left:18px}.seo-prerender span{color:#8a8a8a;font-size:14px}</style>`

function render(html, page, { noindex = false } = {}) {
  const url = SITE + page.path
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(page.title)}</title>`)
  html = setMeta(html, 'name', 'description', page.description)
  html = setMeta(html, 'name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${esc(url)}$2`)
  html = setMeta(html, 'property', 'og:type', page.ogType || 'website')
  html = setMeta(html, 'property', 'og:title', page.ogTitle || page.title)
  html = setMeta(html, 'property', 'og:description', page.description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', page.ogTitle || page.title)
  html = setMeta(html, 'name', 'twitter:description', page.description)
  if (page.image) {
    // Real cover size is unknown: drop the default 1200×630 hints
    html = dropMeta(html, 'property', 'og:image:width')
    html = dropMeta(html, 'property', 'og:image:height')
    html = setMeta(html, 'property', 'og:image', page.image)
    html = setMeta(html, 'property', 'og:image:secure_url', page.image)
    html = setMeta(html, 'property', 'og:image:alt', page.ogTitle || page.title)
    html = setMeta(html, 'name', 'twitter:image', page.image)
  }
  if (page.ld?.length) html = html.replace('</head>', `    ${page.ld.map(jsonLd).join('\n    ')}\n  </head>`)
  if (page.body) {
    html = html.replace('</head>', `    ${PRERENDER_STYLE}\n  </head>`)
    html = html.replace(/<div id="root"><\/div>/i, `<div id="root"><main class="seo-prerender">${NAV}${page.body}</main></div>`)
  }
  return html
}

function finish(response, html, status, cacheable) {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  if (cacheable) {
    // Cached at Netlify's edge for 5 minutes; cleared automatically on deploy
    headers.set('netlify-cdn-cache-control', 'public, durable, s-maxage=300, stale-while-revalidate=3600')
    headers.set('netlify-vary', 'query')
  }
  return new Response(html, { status, headers })
}

// ── Entry point ──────────────────────────────────────────────────────────────
export default async (request, context) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return
  const accept = request.headers.get('accept') || ''
  if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return

  const url = new URL(request.url)
  const db = supabase()
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)

  // 1. Old query-style links → permanent redirect to the clean address
  if (!parts.length && url.search) {
    const legacyKey = Object.keys(LEGACY_KEYS).find(k => url.searchParams.has(k))
    const page = url.searchParams.get('page')
    if (legacyKey || page) {
      let target = '/'
      if (legacyKey) {
        const kind = LEGACY_KEYS[legacyKey]
        const id = url.searchParams.get(legacyKey)
        const row = db && UUID.test(id || '') ? await loadItem(db, kind, id) : null
        target = row ? itemPath(kind, row) : `/${SEGMENT_FOR[kind]}/${encodeURIComponent(id || '')}`
      } else if (page && page !== 'home') {
        target = `/${encodeURIComponent(page)}`
      }
      const rest = new URLSearchParams(url.search)
      for (const k of ['page', ...Object.keys(LEGACY_KEYS)]) rest.delete(k)
      const qs = rest.toString()
      return new Response(null, { status: 301, headers: { location: target + (qs ? `?${qs}` : ''), 'cache-control': 'public, max-age=3600' } })
    }
  }

  // 2. Item pages: /track/<id>/<slug>, /blog/<id>/<slug>, /video/…, /artist/…
  const kind = ITEM_SEGMENTS[parts[0]]
  if (kind && parts[1] && UUID.test(parts[1])) {
    const [response, row] = await Promise.all([context.next(), db ? loadItem(db, kind, parts[1]) : null])
    if (!(response.headers.get('content-type') || '').includes('text/html')) return response
    let html = await response.text()
    if (!row) {
      const notFound = { path: url.pathname, title: `Not found | ${NAME}`, description: 'This item is not available on Tunez9ja.', ld: [], body: `<h1>Not found</h1><p>This item isn't available. <a href="/music">Browse music</a></p>` }
      return finish(response, render(html, notFound, { noindex: true }), 404, false)
    }
    const canonical = itemPath(kind, row)
    // Missing or outdated slug → one permanent redirect to the canonical address
    if (url.pathname !== canonical) {
      return new Response(null, { status: 301, headers: { location: canonical + url.search, 'cache-control': 'public, max-age=3600' } })
    }
    const page = kind === 'track' ? trackPage(row) : kind === 'post' ? postPage(row) : kind === 'video' ? videoPage(row) : profilePage(row)
    return finish(response, render(html, page), 200, true)
  }

  // 3. Pages
  const key = parts[0] || 'home'
  const response = await context.next()
  if (!(response.headers.get('content-type') || '').includes('text/html')) return response
  let html = await response.text()

  if (PAGES[key] && parts.length <= 1) {
    const page = await listPage(db, key, PAGES[key])
    return finish(response, render(html, page), 200, true)
  }
  if (PRIVATE_PAGES.has(key)) {
    const page = { path: `/${key}`, title: `${NAME}`, description: PAGES.home.description, ld: [] }
    return finish(response, render(html, page, { noindex: true }), 200, false)
  }
  // Anything else isn't a real page: tell search engines (the app shows home)
  const notFound = { path: url.pathname, title: `Page not found | ${NAME}`, description: PAGES.home.description, ld: [], body: `<h1>Page not found</h1><p><a href="/">Go to Tunez9ja</a></p>` }
  return finish(response, render(html, notFound, { noindex: true }), 404, false)
}

export const config = {
  path: '/*',
  excludedPath: [
    '/assets/*', '/test/*', '/.well-known/*',
    '/sw.js', '/manifest.json', '/robots.txt', '/sitemap.xml', '/asset-manifest.json', '/offline.html',
    '/*.js', '/*.css', '/*.map', '/*.png', '/*.jpg', '/*.jpeg', '/*.webp', '/*.svg', '/*.ico', '/*.gif',
    '/*.json', '/*.txt', '/*.xml', '/*.woff', '/*.woff2', '/*.ttf', '/*.mp3', '/*.wav', '/*.webm', '/*.mp4',
  ],
  cache: 'manual',
}
