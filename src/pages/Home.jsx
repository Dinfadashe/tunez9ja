import { openItem } from '../lib/urlState.js'
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSEO, websiteJsonLd, organizationJsonLd } from '../lib/useSEO.js'
import { MusicArt } from '../components/UI.jsx'
import { Play, TrendingUp, Mic2, Newspaper, ArrowRight, Music, Video, Youtube } from 'lucide-react'

const TICKER_ITEMS = ['\U0001f3b5 Afrobeats','\U0001f525 New Drops','\U0001f3a4 Artist Spotlight','\U0001f4f0 Latest Gist','\U0001f30d Global Sound','\U0001f3b5 Top Charts','\U0001f525 Hot Takes','\U0001f3a4 Studio Sessions']

const SK_STYLE = '@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:8px}'

function HomeSkeleton() {
  return (
    <div>
      <style>{SK_STYLE}</style>
      <div style={{ background: 'var(--bg-surface)', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div className="sk" style={{ height: 14, width: 160, marginBottom: 20 }} />
            <div className="sk" style={{ height: 52, width: '90%', marginBottom: 10 }} />
            <div className="sk" style={{ height: 52, width: '70%', marginBottom: 10 }} />
            <div className="sk" style={{ height: 52, width: '80%', marginBottom: 20 }} />
            <div className="sk" style={{ height: 15, width: '95%', marginBottom: 8 }} />
            <div className="sk" style={{ height: 15, width: '80%', marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="sk" style={{ height: 46, width: 150 }} />
              <div className="sk" style={{ height: 46, width: 140 }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="sk" style={{ width: 280, height: 280, borderRadius: 12 }} />
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <div className="sk" style={{ height: 36, width: 200, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div className="sk" style={{ paddingBottom: '100%', display: 'block' }} />
              <div style={{ padding: '12px 14px 14px' }}>
                <div className="sk" style={{ height: 14, width: '80%', marginBottom: 8 }} />
                <div className="sk" style={{ height: 11, width: '55%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home({
  
 setPage }) {
  useSEO({
    title: "Tunez9ja — Stream Music. Earn Rewards. Anywhere.",
    description: "Stream music from Afrobeats to Hip-Hop, Highlife to Amapiano. Earn TUNEZ tokens for every stream, comment, and reaction — the music platform where everyone gets paid.",
    jsonLd: [websiteJsonLd(), organizationJsonLd()],
  })

  const [tracks, setTracks] = useState([])
  const [posts,  setPosts]  = useState([])
  const [videos, setVideos] = useState([])
  const [stats,  setStats]  = useState({ artists: 0, tracks: 0, posts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Approved tracks
    supabase.from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setTracks(data || []))

    // Approved videos
    supabase.from('videos')
      .select('id,title,youtube_url,video_url,uploader_id,profiles:uploader_id(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setVideos(data || []))

    // Approved blog posts
    supabase.from('blog_posts')
      .select('*, profiles:author_id(name)')
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setPosts(data || []))

    // Stats counts
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artist'),
      supabase.from('music_tracks').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    ]).then(([a, t, p]) => { setStats({ artists: a.count || 0, tracks: t.count || 0, posts: p.count || 0 }); setLoading(false) })
  }, [])

  if (loading) return <HomeSkeleton />

  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="container hero-content" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-2xl)' }}>
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">Est. 2021 — Music For Everyone</div>
              <h1 className="hero-headline">
                THE BEAT<br />OF <span className="accent">EVERY</span><br />CULTURE
              </h1>
              <p className="hero-sub">
                Afrobeats. Highlife. Street Pop. We cover every sound shaping global music culture — new drops, artist stories, and the stories you can't miss.
              </p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => setPage('music')}>
                  <Play size={16} fill="white" /> Stream Music
                </button>
                <button className="btn btn-secondary" onClick={() => setPage('blog')}>
                  Read the Blog
                </button>
                <button className="btn btn-secondary" style={{ borderColor: '#ff3333', color: '#ff3333' }} onClick={() => setPage('videos')}>
                  <Youtube size={16} /> Watch Videos
                </button>
              </div>
            </div>
            <div className="hero-visual-wrap">
              <HeroVisual tracks={tracks} />
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="hero-ticker">
        <div className="ticker-inner">
          {[...TICKER_ITEMS,...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">{item}</span>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '28px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Years Online',    value: (new Date().getFullYear() - 2021) + '+' },
              { label: 'Artists',         value: stats.artists > 0 ? stats.artists + '+' : '—' },
              { label: 'Songs Published', value: stats.tracks  > 0 ? stats.tracks  + '+' : '—' },
              { label: 'Articles',        value: stats.posts   > 0 ? stats.posts   + '+' : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1, color: 'var(--red)' }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-300)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURED MUSIC ── */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div className="section-label"><TrendingUp size={12} style={{ display: 'inline', marginRight: 6 }} />Hot Right Now</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 5vw, 48px)', letterSpacing: 1 }}>LATEST DROPS</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setPage('music')} style={{ gap: 6 }}>All Music <ArrowRight size={15} /></button>
          </div>
          {tracks.length === 0 ? (
            <div className="empty-state">
              <Music size={48} />
              <h3>No music yet</h3>
              <p>Artists are uploading. Check back soon.</p>
            </div>
          ) : (
            <div className="grid-3">
              {tracks.map(track => <MusicCard key={track.id} track={track} setPage={setPage} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── LATEST VIDEOS ── */}
      <section className="section" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div className="section-label"><Video size={12} style={{ display: 'inline', marginRight: 6 }} />Visual Vibes</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 5vw, 48px)', letterSpacing: 1 }}>LATEST VIDEOS</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setPage('videos')} style={{ gap: 6 }}>All Videos <ArrowRight size={15} /></button>
          </div>
          {videos.length === 0 ? (
            <div className="empty-state">
              <Video size={48} />
              <h3>No videos yet</h3>
              <p>Artists are uploading. Check back soon.</p>
            </div>
          ) : (
            <div className="grid-3">
              {videos.map(v => <VideoCard key={v.id} video={v} setPage={setPage} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── LATEST BLOG ── */}
      <section className="section" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div className="section-label"><Newspaper size={12} style={{ display: 'inline', marginRight: 6 }} />Entertainment Desk</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 5vw, 48px)', letterSpacing: 1 }}>THE LATEST GIST</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setPage('blog')} style={{ gap: 6 }}>All Posts <ArrowRight size={15} /></button>
          </div>
          {posts.length === 0 ? (
            <div className="empty-state"><p>No posts published yet. Check back soon.</p></div>
          ) : (
            <div className="grid-3">
              {posts.map(post => <BlogCard key={post.id} post={post} setPage={setPage} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── JOIN CTA ── */}
      <section className="section">
        <div className="container">
          <div className="grid-2">
            <CTA icon={<Mic2 size={32} color="var(--red)" />} title="ARE YOU AN ARTIST?"
              desc="Upload your music for review. Get featured on Tunez9ja and reach fans around the world."
              action="Upload Your Music" onClick={() => setPage('register')} />
            <CTA icon={<Newspaper size={32} color="#00b4dc" />} title="ARE YOU A BLOGGER?"
              desc="Share music reviews, celebrity gossip, and industry news. Your voice belongs on Tunez9ja."
              action="Start Blogging" onClick={() => setPage('register')} accent="#00b4dc" />
          </div>
        </div>
      </section>
    </div>
  )
}

function HeroVisual({ tracks }) {
  // All child positions/sizes are percentages of this wrapper, so the
  // whole composition scales fluidly — the wrapper itself is sized with
  // clamp() in CSS (.hero-visual-wrap), not a fixed pixel box.
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '20rem', aspectRatio: '1 / 1' }}>
      {[
        { top: '0%',     left: '0%',     size: '62.5%', zIndex: 2 },
        { top: '12.5%',  left: '50%',    size: '50%',   zIndex: 1 },
        { top: '53.1%',  left: '6.25%',  size: '43.75%',zIndex: 1 },
      ].map((pos, i) => (
        <div key={i} style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.size, height: pos.size, borderRadius: 12, overflow: 'hidden', border: i === 0 ? '2px solid var(--border-red)' : '2px solid var(--border)', boxShadow: i === 0 ? '0 0 40px rgba(200,16,46,0.3)' : 'none', zIndex: pos.zIndex }}>
          {tracks[i] && tracks[i].cover_url
            ? <img src={tracks[i].cover_url} alt={tracks[i].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading={i === 0 ? 'eager' : 'lazy'} decoding={i === 0 ? 'sync' : 'async'} fetchpriority={i === 0 ? 'high' : 'auto'} />
            : <MusicArt title={tracks[i] ? tracks[i].title : String.fromCharCode(84 + i)} size="100%" />
          }
        </div>
      ))}
      {tracks[0] && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(15,15,15,0.92)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-red)', borderRadius: 8, padding: 'clamp(0.5rem, 0.4rem + 0.4vw, 0.75rem)', zIndex: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={14} fill="white" color="white" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tracks[0].title}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--red)' }}>{tracks[0].profiles ? tracks[0].profiles.name : ''}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--grey-300)', flexShrink: 0 }}>{tracks[0].duration || '—'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

const MusicCard = React.memo(function MusicCard({ track, setPage }) {
  return (
    <div onClick={() => openItem('track', track.id, track)} style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', transition: 'all 0.3s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(200,16,46,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', background: '#000', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {track.cover_url
            ? <div style={{ width: '100%', height: '100%', backgroundImage: 'url(' + track.cover_url + ')', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', transition: 'transform 0.4s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a0a0d,#0a0d1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MusicArt title={track.title} size={120} />
              </div>
          }
          <div className="card-play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(200,16,46,0.6)' }}>
              <Play size={24} fill="white" color="white" style={{ marginLeft: 3 }} />
            </div>
          </div>
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--grey-300)', letterSpacing: 1 }}>
            {track.genre}
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.profiles ? track.profiles.name : '—'}{track.profiles && track.profiles.is_verified ? ' ✅' : ''}
          </span>
          <span style={{ fontSize: 12, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', flexShrink: 0, marginLeft: 8 }}>{track.duration || '—'}</span>
        </div>
      </div>
    </div>
  )
})

function getYtId(url) {
  if (!url) return null
  if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0]
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0]
  if (url.includes('/shorts/')) return url.split('/shorts/')[1].split('?')[0]
  if (url.includes('/embed/')) return url.split('/embed/')[1].split('?')[0]
  return null
}

const VideoCard = React.memo(function VideoCard({ video, setPage }) {
  const ytId = getYtId(video.youtube_url)
  const thumb = ytId ? 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg' : null
  return (
    <div onClick={() => openItem('video', video.id, video)}
      style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', transition: 'all 0.3s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {thumb
            ? <img src={thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" decoding="async" />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a0a0d,#0a0d1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={40} style={{ opacity: 0.3 }} />
              </div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(255,0,0,0.5)' }}>
              <Play size={22} fill="white" color="white" style={{ marginLeft: 3 }} />
            </div>
          </div>
          {ytId && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: 'white', fontFamily: 'var(--font-mono)' }}>
              YouTube
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, marginBottom: 8 }}>
          {video.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
          {video.profiles ? video.profiles.name : 'Unknown'}
        </div>
      </div>
    </div>
  )
})

const BlogCard = React.memo(function BlogCard({ post, setPage }) {
  return (
    <div className="blog-card" onClick={() => openItem('post', post.id, post)} style={{ cursor: 'pointer' }}>
      <div className="blog-card-img">
        {post.cover_url
          ? <img src={post.cover_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" decoding="async" />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--bg-surface),#0a0d1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={40} style={{ opacity: 0.2 }} />
            </div>
        }
      </div>
      <div className="blog-card-body">
        <div className="blog-card-category">{post.category}</div>
        <h3 className="blog-card-title">{post.title}</h3>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        <div className="blog-card-meta">
          <span>{post.profiles ? post.profiles.name : 'Tunez9ja'}</span>
          <span>{post.published_at ? post.published_at.slice(0,10) : post.created_at ? post.created_at.slice(0,10) : ''}</span>
        </div>
      </div>
    </div>
  )
})

function CTA({ icon, title, desc, action, onClick, accent }) {
  const color = accent || 'var(--red)'
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: 1, marginBottom: 12 }}>{title}</h3>
      <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{desc}</p>
      <button className="btn btn-primary" onClick={onClick} style={{ background: color, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {action} <ArrowRight size={15} />
      </button>
    </div>
  )
}
