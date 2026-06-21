import React, { useState, useEffect } from 'react'
import CommentsSection, { ReactionBar } from '../components/CommentsSection.jsx'
import { supabase } from '../lib/supabase.js'
import { SearchBar, EmptyState } from '../components/UI.jsx'

import { Play, Youtube, Video, Eye, Clock, Filter } from 'lucide-react'

function getYoutubeId(url) {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function getYoutubeThumbnail(url) {
  const id = getYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export default function VideosPage({ currentUser }) {
  const [videos, setVideos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')  // all | youtube | upload
  const [playing, setPlaying]     = useState(null)

  useEffect(() => {
    supabase.from('videos').select(`
      *,
      profiles:uploader_id ( name, is_verified, role )
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .then(({ data }) => { setVideos(data || []); setLoading(false) })
  }, [])

  const filtered = videos.filter(v => {
    const matchSearch = v.title?.toLowerCase().includes(search.toLowerCase()) ||
      v.profiles?.name?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      (filter === 'youtube' && v.youtube_url) ||
      (filter === 'upload'  && v.video_url && !v.youtube_url)
    return matchSearch && matchFilter
  })

  const [featured, ...rest] = filtered

  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#1a0a0d 0%,var(--bg-deep) 100%)', padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-label"><Video size={12} style={{ display:'inline', marginRight:6 }} />Video</div>
          <h1 className="page-title">WATCH <span style={{ color:'var(--red)' }}>NAIJA</span></h1>
          <p style={{ color:'var(--grey-300)', marginTop:12, fontSize:15 }}>
            {videos.length} videos from Nigerian artists and bloggers
          </p>
        </div>
      </div>

      <div className="container section">
        {/* Filters */}
        <div style={{ display:'flex', gap:16, marginBottom:32, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ flex:'1 1 260px', maxWidth:360 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search videos..." />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { key:'all',     label:'All Videos', icon:<Video size={13} /> },
              { key:'youtube', label:'YouTube',    icon:<Youtube size={13} /> },
              { key:'upload',  label:'Uploads',    icon:<Play size={13} /> },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, fontSize:12, fontFamily:'var(--font-mono)', border:'1px solid', cursor:'pointer', transition:'all 0.2s', background: filter===f.key ? 'var(--red)' : 'transparent', borderColor: filter===f.key ? 'var(--red)' : 'var(--border)', color: filter===f.key ? 'white' : 'var(--grey-300)' }}>
                {f.icon}{f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>Loading videos...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Video size={48} />} title="No videos yet" message="Check back soon for video content." />
        ) : (
          <>
            {/* Featured video */}
            {featured && !playing && (
              <div style={{ marginBottom:40 }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', letterSpacing:3, textTransform:'uppercase', marginBottom:16 }}>Featured</div>
                <FeaturedVideoCard video={featured} onPlay={() => setPlaying(featured)} />
              </div>
            )}

            {/* Playing video */}
            {playing && (
              <div style={{ marginBottom:40 }}>
                <button className="btn btn-ghost" onClick={() => setPlaying(null)} style={{ marginBottom:16, gap:6, fontSize:13 }}>
                  â† Back to videos
                </button>
                <VideoPlayer video={playing} currentUser={currentUser} />
              </div>
            )}

            {/* Grid */}
            <div className="grid-3">
              {(playing ? filtered : rest).map(v => (
                <VideoCard key={v.id} video={v} onPlay={() => setPlaying(v)} isPlaying={playing?.id === v.id} currentUser={currentUser} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function VideoPlayer({ video, currentUser }) {
  const ytId = getYoutubeId(video.youtube_url)
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-red)', borderRadius:12, overflow:'hidden' }}>
      {ytId ? (
        <div style={{ position:'relative', paddingBottom:'56.25%', height:0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
            style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={video.title}
          />
        </div>
      ) : video.video_url ? (
        <video controls autoPlay style={{ width:'100%', maxHeight:520, background:'#000' }}>
          <source src={video.video_url} />
          Your browser does not support video playback.
        </video>
      ) : null}
      <div style={{ padding:20 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:8 }}>{video.title}</h2>
        <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:13, color:'var(--grey-300)', marginBottom:12 }}>
          <span>{video.profiles?.name}</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Eye size={13} /> {video.view_count?.toLocaleString() || 0}</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={13} /> {video.created_at?.slice(0,10)}</span>
          <div onClick={e => e.stopPropagation()} style={{ marginLeft:'auto' }}>
            <ReactionBar targetType="video" targetId={video.id} currentUser={currentUser} compact />
          </div>
          {video.youtube_url && <span style={{ display:'flex', alignItems:'center', gap:4, color:'#ff0000' }}><Youtube size={13} /> YouTube</span>}
        </div>
        {video.description && <p style={{ color:'var(--grey-300)', fontSize:14, lineHeight:1.7 }}>{video.description}</p>}
        {video.tags?.length > 0 && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
            {video.tags.map(t => <span key={t} style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', padding:'2px 8px', border:'1px solid var(--border)', borderRadius:12 }}>#{t}</span>)}
          </div>
        )}
        <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:12, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>REACT:</span>
          <ReactionBar targetType="video" targetId={video.id} currentUser={currentUser} />
        </div>
        <CommentsSection targetType="video" targetId={video.id} currentUser={currentUser} />
      </div>
    </div>
  )
}

function FeaturedVideoCard({ video, onPlay }) {
  const thumb = video.youtube_url ? getYoutubeThumbnail(video.youtube_url) : video.thumbnail_url
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', cursor:'pointer' }}
      onClick={onPlay}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-red)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
      <div style={{ position:'relative', minHeight:280, background:'#000', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {thumb
          ? <img src={thumb} alt={video.title} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0, opacity:0.8 }} />
          : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1a0a0d,#0a0d1a)', position:'absolute', inset:0 }} />
        }
        <div style={{ position:'relative', zIndex:1, width:72, height:72, borderRadius:'50%', background:'rgba(200,16,46,0.9)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 40px rgba(200,16,46,0.5)' }}>
          <Play size={32} fill="white" color="white" />
        </div>
        {video.youtube_url && (
          <div style={{ position:'absolute', top:12, left:12, display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.8)', borderRadius:6, padding:'4px 10px', fontSize:11, fontFamily:'var(--font-mono)' }}>
            <Youtube size={12} color="#ff0000" /> YouTube
          </div>
        )}
      </div>
      <div style={{ padding:32, display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', letterSpacing:2, marginBottom:12 }}>NOW PLAYING</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:36, lineHeight:1.1, marginBottom:12 }}>{video.title}</h2>
        <div style={{ color:'var(--grey-300)', fontSize:14, marginBottom:16 }}>
          By <strong>{video.profiles?.name}</strong>
          {video.profiles?.is_verified && ' âœ…'}
        </div>
        {video.description && <p style={{ color:'var(--grey-500)', fontSize:13, lineHeight:1.7, marginBottom:20 }}>{video.description?.slice(0,120)}{video.description?.length > 120 ? '...' : ''}</p>}
        <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>
          <span><Eye size={12} style={{ display:'inline', marginRight:4 }} />{video.view_count?.toLocaleString() || 0} views</span>
          <span><Clock size={12} style={{ display:'inline', marginRight:4 }} />{video.created_at?.slice(0,10)}</span>
        </div>
      </div>
    </div>
  )
}

function VideoCard({ video, onPlay, isPlaying, currentUser }) {
  const thumb = video.youtube_url ? getYoutubeThumbnail(video.youtube_url) : video.thumbnail_url
  return (
    <div onClick={onPlay} style={{ background:'var(--bg-card)', border:`1px solid ${isPlaying ? 'var(--border-red)' : 'var(--border)'}`, borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'all 0.3s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-red)'; e.currentTarget.style.transform='translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=isPlaying?'var(--border-red)':'var(--border)'; e.currentTarget.style.transform='none' }}>
      {/* Thumbnail */}
      <div style={{ position:'relative', aspectRatio:'16/9', background:'#000', overflow:'hidden' }}>
        {thumb
          ? <img src={thumb} alt={video.title} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.85 }} />
          : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1a0a0d,#0a0d1a)', display:'flex', alignItems:'center', justifyContent:'center' }}><Video size={40} style={{ opacity:0.2 }} /></div>
        }
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)', opacity:0, transition:'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity=1}
          onMouseLeave={e => e.currentTarget.style.opacity=0}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Play size={22} fill="white" color="white" />
          </div>
        </div>
        {video.youtube_url && (
          <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.85)', borderRadius:4, padding:'3px 8px', display:'flex', alignItems:'center', gap:4, fontSize:10, fontFamily:'var(--font-mono)' }}>
            <Youtube size={10} color="#ff0000" /> YT
          </div>
        )}
        {isPlaying && (
          <div style={{ position:'absolute', bottom:8, left:8, background:'var(--red)', borderRadius:4, padding:'3px 8px', fontSize:10, fontFamily:'var(--font-mono)' }}>â–¶ PLAYING</div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding:14 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{video.title}</div>
        <div style={{ fontSize:12, color:'var(--grey-300)', marginBottom:8 }}>{video.profiles?.name}{video.profiles?.is_verified && ' âœ…'}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>
          <span><Eye size={11} style={{ display:'inline', marginRight:3 }} />{video.view_count?.toLocaleString() || 0}</span>
          <span>{video.created_at?.slice(0,10)}</span>
        </div>
      </div>
    </div>
  )
}
