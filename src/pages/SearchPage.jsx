import { openItem } from '../lib/urlState.js'
import TrackMenu from '../components/TrackMenu.jsx'
import React, { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { Search, Music, Newspaper, Video, User, Disc, Play, Eye } from 'lucide-react'

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

export default function SearchPage({ setPage, currentUser }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState({ tracks: [], posts: [], videos: [], artists: [], albums: [] })
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('all')
  const { playTrack } = usePlayer()

  const doSearch = useCallback(debounce(async (q) => {
    if (!q.trim()) { setResults({ tracks:[], posts:[], videos:[], artists:[], albums:[] }); return }
    setLoading(true)
    const like = `%${q}%`
    const [tracks, posts, videos, artists, albums] = await Promise.all([
      supabase.from('music_tracks').select('id,title,genre,cover_url,duration,audio_url,artist_id,profiles:artist_id(name,is_verified)').eq('status','approved').ilike('title', like).limit(8),
      supabase.from('blog_posts').select('id,title,category,cover_url,excerpt,author_id,profiles:author_id(name)').eq('status','approved').ilike('title', like).limit(8),
      supabase.from('videos').select('id,title,youtube_url,video_url,uploader_id,profiles:uploader_id(name)').eq('status','approved').ilike('title', like).limit(8),
      supabase.from('profiles').select('id,name,role,is_verified,bio,avatar_url').ilike('name', like).limit(8),
      supabase.from('albums').select('id,title,genre,cover_url,artist_id,profiles:artist_id(name)').eq('status','approved').ilike('title', like).limit(6),
    ])
    setResults({
      tracks:  tracks.data  || [],
      posts:   posts.data   || [],
      videos:  videos.data  || [],
      artists: artists.data || [],
      albums:  albums.data  || [],
    })
    setLoading(false)
  }, 350), [])

  const handleChange = (e) => {
    setQuery(e.target.value)
    doSearch(e.target.value)
  }

  const total = results.tracks.length + results.posts.length + results.videos.length + results.artists.length + results.albums.length

  const TABS = [
    { key:'all',     label:'All',     count: total },
    { key:'tracks',  label:'Music',   count: results.tracks.length  },
    { key:'albums',  label:'Albums',  count: results.albums.length  },
    { key:'posts',   label:'Blog',    count: results.posts.length   },
    { key:'videos',  label:'Videos',  count: results.videos.length  },
    { key:'artists', label:'People', count: results.artists.length },
  ]

  const showTracks  = tab === 'all' || tab === 'tracks'
  const showPosts   = tab === 'all' || tab === 'posts'
  const showVideos  = tab === 'all' || tab === 'videos'
  const showArtists = tab === 'all' || tab === 'artists'
  const showAlbums  = tab === 'all' || tab === 'albums'

  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Search hero */}
      <div style={{ background: 'linear-gradient(180deg,#1a0a0d,var(--bg-deep))', padding: '60px 0 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', letterSpacing:3, marginBottom:12 }}>SEARCH</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:48, marginBottom:24 }}>FIND<br /><span style={{ color:'var(--red)' }}>ANYTHING</span></h1>
          <div style={{ position:'relative', maxWidth:600, marginBottom:0 }}>
            <Search size={20} style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', color:'var(--grey-500)', pointerEvents:'none' }} />
            <input
              value={query}
              onChange={handleChange}
              placeholder="Search tracks, people, posts, videos, albums..."
              autoFocus
              style={{ width:'100%', padding:'18px 18px 18px 52px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--white)', fontSize:16, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor='var(--red)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
            {loading && <div style={{ position:'absolute', right:18, top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', border:'2px solid var(--red)', borderTopColor:'transparent', animation:'spin 0.6s linear infinite' }} />}
          </div>
          {/* Tabs */}
          {query && (
            <div style={{ display:'flex', gap:0, marginTop:24, borderBottom:'1px solid transparent' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ padding:'10px 18px', background:'none', border:'none', color: tab===t.key ? 'var(--white)' : 'var(--grey-500)', borderBottom: tab===t.key ? '2px solid var(--red)' : '2px solid transparent', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:-1 }}>
                  {t.label} {t.count > 0 && <span style={{ fontSize:10, background:'var(--red)', borderRadius:10, padding:'1px 6px', color:'white' }}>{t.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container section">
        {!query ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--grey-500)' }}>
            <Search size={48} style={{ opacity:0.15, margin:'0 auto 16px', display:'block' }} />
            <div style={{ fontSize:16 }}>Start typing to search across all content</div>
            <div style={{ fontSize:13, marginTop:8, color:'var(--grey-600)' }}>Tracks · Albums · Artists · Blog posts · Videos</div>
          </div>
        ) : total === 0 && !loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--grey-500)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:16 }}>No results for "<strong style={{ color:'var(--white)' }}>{query}</strong>"</div>
            <div style={{ fontSize:13, marginTop:8 }}>Try different keywords</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:40 }}>

            {/* Tracks */}
            {showTracks && results.tracks.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <Music size={18} color="var(--red)" />
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>TRACKS</h3>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                  {results.tracks.map(track => (
                    <div key={track.id} onClick={() => playTrack(track)}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', borderRadius:8, cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:44, height:44, borderRadius:6, overflow:'hidden', flexShrink:0, background:'var(--bg-surface)' }}>
                        {track.cover_url ? <img loading="lazy" src={track.cover_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Music size={18} style={{ opacity:0.3 }} /></div>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.title}</div>
                        <div style={{ fontSize:12, color:'var(--grey-300)', marginTop:2 }}>{track.profiles?.name}{track.profiles?.is_verified && ' ✅'}</div>
                      </div>
                      <span style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>{track.genre}</span>
                    {track.play_count > 0 && <span style={{ fontSize:11, color:'var(--grey-500)', display:'flex', alignItems:'center', gap:3 }}><Play size={10}/>{track.play_count >= 1000 ? (track.play_count/1000).toFixed(1)+'K':track.play_count}</span>}
                      <TrackMenu track={track} currentUser={currentUser} size={18} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Albums */}
            {showAlbums && results.albums.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <Disc size={18} color="#7b4fff" />
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>ALBUMS</h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 }}>
                  {results.albums.map(album => (
                    <div key={album.id} style={{ cursor:'pointer', transition:'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                      onMouseLeave={e => e.currentTarget.style.transform='none'}>
                      <div style={{ paddingBottom:'100%', position:'relative', borderRadius:10, overflow:'hidden', background:'var(--bg-surface)', marginBottom:10 }}>
                        {album.cover_url ? <img loading="lazy" src={album.cover_url} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Disc size={32} style={{ opacity:0.15 }} /></div>}
                      </div>
                      <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{album.title}</div>
                      <div style={{ fontSize:12, color:'var(--grey-400)' }}>{album.profiles?.name}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* People */}
            {showArtists && results.artists.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <User size={18} color="#00c864" />
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>PEOPLE</h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                  {results.artists.map(artist => (
                    <div key={artist.id}
                      onClick={() => window.dispatchEvent(new CustomEvent('openProfile', { detail: { profileId: artist.id } }))}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', transition:'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-red)'; e.currentTarget.style.transform='translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
                      {artist.avatar_url
                        ? <img src={artist.avatar_url} alt={artist.name} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} loading="lazy" decoding="async" />
                        : <div style={{ width:44, height:44, borderRadius:'50%', background: artist.role==='artist' ? '#7b4fff' : artist.role==='blogger' ? '#00b4dc' : 'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:20, flexShrink:0, color:'white' }}>
                            {artist.name?.[0]?.toUpperCase()}
                          </div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{artist.name}{artist.is_verified && ' ✅'}</div>
                        <div style={{ fontSize:11, color: artist.role==='artist' ? '#7b4fff' : artist.role==='blogger' ? '#00b4dc' : 'var(--grey-500)', fontFamily:'var(--font-mono)', letterSpacing:1, textTransform:'uppercase' }}>{artist.role || 'user'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Posts */}
            {showPosts && results.posts.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <Newspaper size={18} color="#00b4dc" />
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>BLOG POSTS</h3>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {results.posts.map(post => (
                    <div key={post.id} onClick={() => openItem('post', post.id, post)}
                      style={{ display:'flex', gap:14, padding:'14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', transition:'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-red)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)' }}>
                      {post.cover_url && <img loading="lazy" src={post.cover_url} style={{ width:72, height:72, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.title}</div>
                        <div style={{ fontSize:12, color:'var(--grey-300)', marginBottom:6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{post.excerpt}</div>
                        <div style={{ fontSize:11, color:'var(--grey-500)', display:'flex', gap:12 }}><span>{post.profiles?.name} · {post.category}</span>{post.view_count > 0 && <span>{post.view_count >= 1000 ? (post.view_count/1000).toFixed(1)+'K' : post.view_count} views</span>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Videos */}
            {showVideos && results.videos.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <Video size={18} color="var(--red)" />
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>VIDEOS</h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                  {results.videos.map(video => (
                    <div key={video.id} onClick={() => openItem('video', video.id, video)}
                      style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-red)'; e.currentTarget.style.transform='translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
                      <div style={{ paddingBottom:'56.25%', position:'relative', background:'#000' }}>
                        {video.youtube_url?.includes('youtu')
                          ? <img loading="lazy" src={`https://img.youtube.com/vi/${video.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([\\w-]{11})/)?.[1]}/mqdefault.jpg`} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                          : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Video size={32} style={{ opacity:0.2 }} /></div>
                        }
                      </div>
                      <div style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{video.title}</div>
                        <div style={{ fontSize:11, color:'var(--grey-400)', marginTop:3 }}>{video.profiles?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
