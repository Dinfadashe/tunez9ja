// Netlify Edge Function — rich link previews for shared content.
//
// Social crawlers (WhatsApp, Facebook, X, Telegram, LinkedIn…) don't run
// JavaScript, so they only ever see the default tags in index.html. When a
// request for the site root carries ?post=, ?track= or ?video=, this function
// looks the item up in Supabase and rewrites the <title>, description,
// Open Graph and Twitter tags in the HTML before it's sent. Real visitors get
// the same page and the SPA opens the item as usual via its deep-link handler.

const SITE = 'https://tunez9ja.netlify.app'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SOURCES = {
  post:  { table: 'blog_posts',   select: '*,profiles:author_id(name)', type: 'article' },
  track: { table: 'music_tracks', select: '*',                          type: 'music.song' },
  video: { table: 'videos',       select: '*',                          type: 'video.other' },
}

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;')

const stripHtml = (html = '') => String(html)
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

function youtubeThumb(url = '') {
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null
}

function buildMeta(kind, row) {
  if (kind === 'post') {
    const by = row.profiles?.name ? ` by ${row.profiles.name}` : ''
    return {
      title: row.title,
      description: clip(row.excerpt?.trim() || stripHtml(row.content) || `Read "${row.title}"${by} on Tunez9ja.`, 200),
      image: row.cover_url,
      alt: row.title,
    }
  }
  if (kind === 'track') {
    const artist = row.artist_name || row.artist || ''
    return {
      title: artist ? `${row.title} — ${artist}` : row.title,
      description: `Listen to "${row.title}"${artist ? ` by ${artist}` : ''} on Tunez9ja and earn TUNEZ while you stream.`,
      image: row.cover_url,
      alt: row.title,
    }
  }
  return {
    title: row.title,
    description: clip(stripHtml(row.description) || `Watch "${row.title}" on Tunez9ja.`, 200),
    image: row.thumbnail_url || row.cover_url || youtubeThumb(row.youtube_url),
    alt: row.title,
  }
}

function setTag(html, attr, key, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${key.replace(/:/g, '\\:')}"\\s+content=")[^"]*(")`, 'i')
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`)
  return html.replace('</head>', `    <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`)
}

const dropTag = (html, attr, key) =>
  html.replace(new RegExp(`\\s*<meta\\s+${attr}="${key.replace(/:/g, '\\:')}"[^>]*>`, 'i'), '')

export default async (request, context) => {
  const url = new URL(request.url)
  const kind = Object.keys(SOURCES).find(k => url.searchParams.has(k))
  if (!kind) return                       // not a share link — serve normally
  const id = url.searchParams.get(kind)
  if (!UUID.test(id || '')) return

  const SB_URL = Netlify.env.get('VITE_SUPABASE_URL') || Netlify.env.get('SUPABASE_URL')
  const SB_KEY = Netlify.env.get('VITE_SUPABASE_ANON_KEY') || Netlify.env.get('SUPABASE_ANON_KEY')
  if (!SB_URL || !SB_KEY) return

  const { table, select, type } = SOURCES[kind]
  const api = `${SB_URL}/rest/v1/${table}?id=eq.${id}&status=eq.approved&select=${encodeURIComponent(select)}&limit=1`

  const [response, row] = await Promise.all([
    context.next(),
    fetch(api, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      signal: AbortSignal.timeout(2500),
    }).then(r => (r.ok ? r.json() : [])).then(rows => rows?.[0]).catch(() => null),
  ])

  const contentType = response.headers.get('content-type') || ''
  if (!row || !contentType.includes('text/html')) return response

  const meta = buildMeta(kind, row)
  const shareUrl = `${SITE}/?${kind}=${id}`
  const title = `${meta.title} | Tunez9ja`
  let html = await response.text()

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`)
  html = setTag(html, 'name', 'description', meta.description)
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${esc(shareUrl)}$2`)

  html = setTag(html, 'property', 'og:type', type)
  html = setTag(html, 'property', 'og:title', meta.title)
  html = setTag(html, 'property', 'og:description', meta.description)
  html = setTag(html, 'property', 'og:url', shareUrl)
  html = setTag(html, 'name', 'twitter:title', meta.title)
  html = setTag(html, 'name', 'twitter:description', meta.description)

  if (meta.image) {
    // Size of the cover is unknown — drop the default 1200×630 hints so
    // platforms measure the real image instead of trusting wrong numbers.
    html = dropTag(html, 'property', 'og:image:width')
    html = dropTag(html, 'property', 'og:image:height')
    html = setTag(html, 'property', 'og:image', meta.image)
    html = setTag(html, 'property', 'og:image:secure_url', meta.image)
    html = setTag(html, 'property', 'og:image:alt', meta.alt)
    html = setTag(html, 'name', 'twitter:image', meta.image)
    html = setTag(html, 'name', 'twitter:card', 'summary_large_image')
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(html, { status: response.status, headers })
}

export const config = { path: '/' }
