// Netlify Edge Function — live sitemap at /sitemap.xml
// Lists every public page and every approved song, artist, blog post and
// video, with last-updated dates and cover images, straight from the
// database. Cached at Netlify's edge for an hour (cleared on each deploy).

const SITE = 'https://tunez9ja.com'
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/music', changefreq: 'hourly', priority: '0.9' },
  { path: '/charts', changefreq: 'daily', priority: '0.8' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/videos', changefreq: 'daily', priority: '0.7' },
  { path: '/albums', changefreq: 'weekly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
]

const xml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
// Same rules as the app and seo.js: cut at a word, max 70 chars
function slugify(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 71)
    .replace(/-[^-]*$/, m => (m.length > 1 && String(text).length > 71 ? '' : m))
    .slice(0, 70).replace(/-+$/g, '')
}
const artistOf = (row) => (row?.performer_name && String(row.performer_name).trim()) || row?.profiles?.name || ''
const path = (seg, id, ...words) => {
  const slug = slugify(words.filter(Boolean).join(' '))
  return `/${seg}/${id}${slug ? '/' + slug : ''}`
}
const day = (d) => (d ? String(d).slice(0, 10) : undefined)

function entry({ loc, lastmod, changefreq, priority, image, title }) {
  return `  <url>
    <loc>${xml(SITE + loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ''}${priority ? `\n    <priority>${priority}</priority>` : ''}${image ? `\n    <image:image><image:loc>${xml(image)}</image:loc>${title ? `<image:title>${xml(title)}</image:title>` : ''}</image:image>` : ''}
  </url>`
}

export default async () => {
  const SB_URL = Netlify.env.get('VITE_SUPABASE_URL') || Netlify.env.get('SUPABASE_URL')
  const SB_KEY = Netlify.env.get('VITE_SUPABASE_ANON_KEY') || Netlify.env.get('SUPABASE_ANON_KEY')
  const get = (q) => (SB_URL && SB_KEY
    ? fetch(`${SB_URL}/rest/v1/${q}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal: AbortSignal.timeout(5000) })
        .then(r => (r.ok ? r.json() : [])).catch(() => [])
    : Promise.resolve([]))

  const [tracks, posts, videos, albums] = await Promise.all([
    get(`music_tracks?status=eq.approved&select=${encodeURIComponent('id,title,performer_name,genre,cover_url,created_at,updated_at,artist_id,profiles:artist_id(name)')}&order=created_at.desc&limit=10000`),
    get(`blog_posts?status=eq.approved&select=id,title,cover_url,published_at,created_at,updated_at&order=created_at.desc&limit=10000`),
    get(`videos?status=eq.approved&select=*&order=created_at.desc&limit=5000`),
    get(`albums?status=eq.approved&select=${encodeURIComponent('*,profiles:artist_id(name)')}&order=created_at.desc&limit=5000`),
  ])

  const urls = STATIC_PAGES.map(p => entry({ loc: p.path, changefreq: p.changefreq, priority: p.priority }))

  // Artists: everyone with at least one approved song (latest song date = lastmod)
  const artists = new Map()
  for (const t of tracks) {
    if (!t.artist_id || !t.profiles?.name) continue
    const d = day(t.updated_at || t.created_at)
    const a = artists.get(t.artist_id)
    if (!a || (d && d > a.lastmod)) artists.set(t.artist_id, { name: t.profiles.name, lastmod: d })
  }
  for (const [id, a] of artists) urls.push(entry({ loc: path('artist', id, a.name), lastmod: a.lastmod, changefreq: 'weekly', priority: '0.7' }))

  // Genres with at least one approved song
  const genres = new Map()
  for (const t of tracks) {
    if (!t.genre) continue
    const d = day(t.updated_at || t.created_at), slug = slugify(t.genre)
    if (!genres.has(slug) || (d && d > genres.get(slug))) genres.set(slug, d)
  }
  for (const [slug, lastmod] of genres) urls.push(entry({ loc: `/genre/${slug}`, lastmod, changefreq: 'daily', priority: '0.8' }))

  for (const a of albums) urls.push(entry({
    loc: path('album', a.id, a.title, artistOf(a)), lastmod: day(a.updated_at || a.created_at),
    changefreq: 'weekly', priority: '0.7', image: a.cover_url, title: a.title,
  }))

  for (const t of tracks) urls.push(entry({
    loc: path('track', t.id, t.title, artistOf(t)), lastmod: day(t.updated_at || t.created_at),
    changefreq: 'weekly', priority: '0.8', image: t.cover_url, title: t.title,
  }))
  for (const p of posts) urls.push(entry({
    loc: path('blog', p.id, p.title), lastmod: day(p.updated_at || p.published_at || p.created_at),
    changefreq: 'monthly', priority: '0.7', image: p.cover_url, title: p.title,
  }))
  for (const v of videos) urls.push(entry({
    loc: path('video', v.id, v.title), lastmod: day(v.updated_at || v.created_at), changefreq: 'monthly', priority: '0.6',
  }))

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, durable, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

export const config = { path: '/sitemap.xml', cache: 'manual' }
