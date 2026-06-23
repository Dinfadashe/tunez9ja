import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { Play, Music, Video, Newspaper, Disc, Share2 } from 'lucide-react'
import ShareButton from './ShareButton.jsx'
import { Avatar } from './ProfileEditor.jsx'

export default function ArtistProfile({ artistId, onBack, currentUser }) {
  const [artist,  setArtist]  = useState(null)
  const [tracks,  setTracks]  = useState([])
  const [albums,  setAlbums]  = useState([])
  const [videos,  setVideos]  = useState([])
  const [posts,   setPosts]   = useState([])
  const [tab,     setTab]     = useState('music')
  const [loading, setLoading] = useState(true)
  const { playTrack } = usePlayer()

  useEffect(() => {
    if (!artistId) return
    Promise.all([
      supabase.from('profiles').select('*').eq('id', artistId).single(),
      supabase.from('music_tracks').select('*,profiles:artist_id(name)').eq('artist_id', artistId).eq('status','approved').order('created_at', { ascending: false }),
      supabase.from('albums').select('id,title,genre,cover_url,release_date').eq('artist_id', artistId).eq('status','approved').order('created_at', { ascending: false }).limit(30),
      supabase.from('videos').select('id,title,youtube_url,thumbnail_url,view_count').eq('uploader_id', artistId).eq('status','approved').order('created_at', { ascending: false }).limit(30),
      supabase.from('blog_posts').select('id,title,category,cover_url,excerpt,created_at').eq('author_id', artistId).eq('status','approved').order('created_at', { ascending: false }).limit(30),
    ]).then(([a, t, al, v, p]) => {
      setArtist(a.data)
      setTracks(t.data  || [])
      setAlbums(al.data || [])
      setVideos(v.data  || [])
      setPosts(p.data   || [])
      setLoading(false)
    })
  }, [artistId])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)', letterSpacing:2 }}>LOADING PROFILE...</div>
  if (!artist) return null

  const isArtist  = artist.role === 'artist'
  const accent    = isArtist ? '#7b4fff' : '#00b4dc'
  const shareUrl  = `${window.location.origin}/?artist=${artistId}`
  const shareText = `Check out ${artist.name} on Tunez9ja!`

  const TABS = [
    { key:'music',  label:'Music',   count: tracks.length,  show: isArtist  },
    { key:'albums', label:'Albums',  count: albums.length,  show: isArtist  },
    { key:'videos', label:'Videos',  count: videos.length,  show: true      },
    { key:'posts',  label:'Blog',    count: posts.length,   show: !isArtist },
  ].filter(t => t.show)

  return (
    <div>
      {onBack && (
        <button onClick={onBack} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--grey-300)', padding:'8px 14px', cursor:'pointer', fontSize:13, marginBottom:24, display:'flex', alignItems:'center', gap:8 }}>
          ← Back
        </button>
      )}

      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg, ${accent}22, var(--bg-deep))`, border:`1px solid ${accent}33`, borderRadius:14, padding:32, marginBottom:28 }}>
        <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
          <Avatar profile={artist} size={96} />
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:accent, letterSpacing:3, marginBottom:6, textTransform:'uppercase' }}>{artist.role}</div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:40, lineHeight:1, marginBottom:8 }}>
              {artist.name}{artist.is_verified && ' ✅'}
            </h1>
            {artist.bio && <p style={{ fontSize:14, color:'var(--grey-300)', lineHeight:1.7, maxWidth:560, marginBottom:16 }}>{artist.bio}</p>}
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:16 }}>
              {[
                { label:'Tracks',  val: tracks.length  },
                { label:'Albums',  val: albums.length  },
                { label:'Videos',  val: videos.length  },
              ].filter(s => s.val > 0).map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:28 }}>{s.val}</div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {tracks.length > 0 && (
                <button onClick={() => playTrack(tracks[0], tracks)} className="btn btn-primary" style={{ gap:8 }}>
                  <Play size={15} fill="white" /> Play All
                </button>
              )}
              <ShareButton url={shareUrl} text={shareText} title={artist.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'10px 20px', background:'none', border:'none', color: tab===t.key ? 'var(--white)' : 'var(--grey-500)', borderBottom: tab===t.key ? `2px solid ${accent}` : '2px solid transparent', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:-1, display:'flex', alignItems:'center', gap:6 }}>
            {t.label} <span style={{ fontSize:11, opacity:0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Music */}
      {tab === 'music' && (
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {tracks.map((track, i) => (
            <div key={track.id} onClick={() => playTrack(track, tracks)}
              style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', borderRadius:8, cursor:'pointer', transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span style={{ width:28, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--grey-500)', flexShrink:0 }}>{i+1}</span>
              <div style={{ width:44, height:44, borderRadius:6, overflow:'hidden', flexShrink:0, background:'var(--bg-surface)' }}>
                {track.cover_url ? <img loading="lazy" src={track.cover_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Music size={16} style={{ opacity:0.3 }} /></div>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.title}</div>
                <div style={{ fontSize:12, color:'var(--grey-500)', marginTop:2 }}>{track.genre}</div>
              </div>
              <span style={{ fontSize:12, color:'var(--grey-500)', fontFamily:'var(--font-mono)', flexShrink:0 }}>{track.duration || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Albums */}
      {tab === 'albums' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>
          {albums.map(album => (
            <div key={album.id} style={{ cursor:'pointer', transition:'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform='none'}>
              <div style={{ paddingBottom:'100%', position:'relative', borderRadius:10, overflow:'hidden', background:'var(--bg-surface)', marginBottom:10 }}>
                {album.cover_url ? <img loading="lazy" src={album.cover_url} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Disc size={36} style={{ opacity:0.15 }} /></div>}
              </div>
              <div style={{ fontWeight:700, fontSize:14 }}>{album.title}</div>
              <div style={{ fontSize:12, color:'var(--grey-500)' }}>{album.genre}</div>
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {tab === 'videos' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
          {videos.map(video => (
            <div key={video.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-red)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
              <div style={{ paddingBottom:'56.25%', position:'relative', background:'#000' }}>
                {video.youtube_url?.includes('youtu')
                  ? <img src={`https://img.youtube.com/vi/${video.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([\\w-]{11})/)?.[1]}/mqdefault.jpg`} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                  : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Video size={28} style={{ opacity:0.2 }} /></div>
                }
              </div>
              <div style={{ padding:'10px 14px' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{video.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {tab === 'posts' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {posts.map(post => (
            <div key={post.id} style={{ display:'flex', gap:14, padding:14, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', transition:'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-red)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              {post.cover_url && <img loading="lazy" src={post.cover_url} style={{ width:72, height:72, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{post.title}</div>
                <div style={{ fontSize:12, color:'var(--grey-300)', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{post.excerpt}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
