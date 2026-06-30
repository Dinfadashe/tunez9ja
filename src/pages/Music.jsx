import React, { useState, useEffect } from 'react'
import CommentsSection, { ReactionBar } from '../components/CommentsSection.jsx'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { earnStream, isUnlocked } from '../lib/tunez.js'
import PremiumUnlockModal from '../components/PremiumUnlockModal.jsx'

import { MusicArt, SearchBar, EmptyState } from '../components/UI.jsx'
import { Play, Pause, Music, Heart, Plus, ListMusic, Disc, Headphones } from 'lucide-react'
import ShareButton from '../components/ShareButton.jsx'
import TrackPage   from '../components/TrackPage.jsx'
import Albums from '../components/Albums.jsx'


// ── Save track to library ─────────────────────────────────────
const SaveButton = React.memo(function SaveButton({ track, currentUser }) {
  const [saved,   setSaved]   = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!currentUser?.id) return
    supabase.from('saved_tracks')
      .select('track_id').eq('user_id', currentUser.id).eq('track_id', track.id).maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [track.id, currentUser?.id])

  const toggle = async (e) => {
    e.stopPropagation()
    if (!currentUser) return
    setLoading(true)
    if (saved) {
      await supabase.from('saved_tracks').delete().eq('user_id', currentUser.id).eq('track_id', track.id)
      setSaved(false)
    } else {
      await supabase.from('saved_tracks').insert({ user_id: currentUser.id, track_id: track.id, saved_at: new Date().toISOString() })
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading}
      title={saved ? 'Remove from library' : 'Save to library'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: saved ? 'var(--red)' : 'var(--grey-500)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
})

// ── Add to playlist dropdown ──────────────────────────────────
function AddToPlaylist({ track, currentUser }) {
  const [open,      setOpen]      = React.useState(false)
  const [playlists, setPlaylists] = React.useState([])
  const [added,     setAdded]     = React.useState(null)

  const openMenu = async (e) => {
    e.stopPropagation()
    if (!currentUser) return
    const { data } = await supabase.from('playlists').select('id,name').eq('user_id', currentUser.id).order('created_at', { ascending: false })
    setPlaylists(data || [])
    setOpen(o => !o)
  }

  const addTo = async (e, playlist) => {
    e.stopPropagation()
    const count = await supabase.from('playlist_tracks').select('id', { count: 'exact', head: true }).eq('playlist_id', playlist.id)
    await supabase.from('playlist_tracks').upsert({
      playlist_id: playlist.id, track_id: track.id, position: (count.count || 0) + 1
    })
    setAdded(playlist.name)
    setTimeout(() => { setAdded(null); setOpen(false) }, 1500)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={openMenu} title="Add to playlist"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--grey-500)', display: 'flex', alignItems: 'center' }}>
        <Plus size={15} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, bottom: '110%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 180, zIndex: 100, boxShadow: 'var(--shadow)', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>ADD TO PLAYLIST</div>
          {added ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#00c864' }}>✅ Added to {added}</div>
          ) : playlists.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>No playlists yet</div>
          ) : (
            playlists.map(pl => (
              <button key={pl.id} onClick={e => addTo(e, pl)}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {pl.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}


function MusicSkeleton() {
  return (
    <div style={{ padding: '0 0 80px' }}>
      <style>{'@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:8px}'}</style>
      <div style={{ height: 120, background: 'var(--bg-surface)', marginBottom: 24, padding: '32px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="sk" style={{ width: 200, height: 40 }} />
        <div className="sk" style={{ width: 120, height: 36 }} />
        <div className="sk" style={{ width: 80, height: 36 }} />
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
          {Array.from({ length: 12 }, (_, i) => (
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


export default function MusicPage({ setPage, currentUser, deepLink }) {
  const [tracks, setTracks]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const { nowPlaying, isPlaying, playTrack, addToPlayNext } = usePlayer()
  const [unlockTarget, setUnlockTarget] = React.useState(null)
  const [unlockedIds, setUnlockedIds] = React.useState(new Set())
  const [unlocksLoaded, setUnlocksLoaded] = React.useState(false)
  const [trackPage, setTrackPage] = React.useState(null)

  // Listen for FloatingPlayer click to open track page
  React.useEffect(() => {
    const handler = (e) => setTrackPage(e.detail)
    window.addEventListener('openTrackPage', handler)
    return () => window.removeEventListener('openTrackPage', handler)
  }, [])
  const [view, setView] = React.useState('tracks')
  const earnedRef = React.useRef({})

  // Earn TUNEZ after 30s of play
  React.useEffect(() => {
    if (!nowPlaying || !currentUser?.id) return
    const key = nowPlaying.id
    if (earnedRef.current[key]) return
    const timer = setTimeout(async () => {
      try {
        const result = await earnStream(currentUser.id, nowPlaying)
        if (result) {
          earnedRef.current[key] = true
          console.log('✅ TUNEZ earned from stream:', result.userAmt)
        } else {
          console.log('ℹ️ No TUNEZ earned (cooldown or cap reached)')
        }
      } catch(e) {
        console.error('❌ earnStream error:', e)
      }
    }, 10000) // 10 seconds for responsiveness
    return () => clearTimeout(timer)
  }, [nowPlaying?.id, currentUser?.id])

  useEffect(() => {
    supabase
      .from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified, avatar_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(24).range(0, 23)
      .then(async ({ data }) => {
      const tracks = data || []
      setTracks(tracks)
      setLoading(false)
      // Pre-fetch which premium tracks user has unlocked
      if (currentUser?.id) {
        const premiumIds = tracks.filter(t => t.is_premium).map(t => t.id)
        if (premiumIds.length > 0) {
          const { data: unlocks } = await supabase.from('tunez_unlocks')
            .select('content_id').eq('user_id', currentUser.id)
            .in('content_id', premiumIds)
          if (unlocks) setUnlockedIds(new Set(unlocks.map(u => u.content_id)))
        }
        setUnlocksLoaded(true)
      }
      if (!currentUser?.id) setUnlocksLoaded(true)
      // Auto-play track from deep link
      if (deepLink?.type === 'track') {
        const t = tracks.find(t => t.id === deepLink.id)
        if (t) setTimeout(() => playTrack(t, tracks), 300)
      }
    })
  }, [])

  const genres   = ['All', ...new Set(tracks.map(t => t.genre).filter(Boolean))]
  const filtered = tracks.filter(t => {
    const artist = t.profiles?.name || ''
    const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
      artist.toLowerCase().includes(search.toLowerCase())
    const matchGenre = activeGenre === 'All' || t.genre === activeGenre
    return matchSearch && matchGenre
  })

  if (trackPage) return (
    <TrackPage
      track={trackPage}
      currentUser={currentUser}
      onBack={() => setTrackPage(null)}
      onPlay={(t) => { playTrack(t, filtered) }}
      isPlaying={isPlaying}
      nowPlaying={nowPlaying}
      unlocked={unlockedIds.has(trackPage.id)}
      onUnlocked={(t) => {
        const trk = t || trackPage
        setUnlockedIds(prev => new Set([...prev, trk.id]))
        setTrackPage(trk)
        setTimeout(() => playTrack(trk, filtered), 100)
      }}
      setPage={setPage}
    />
  )


  const loadMore = async () => {
    const nextPage = page + 1
    const from = nextPage * 24
    const to = from + 23
    const { data } = await supabase.from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified, avatar_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (data && data.length > 0) {
      setTracks(prev => {
        const ids = new Set(prev.map(t => t.id))
        return [...prev, ...data.filter(t => !ids.has(t.id))]
      })
      setPage2(nextPage)
      if (data.length < 24) setHasMore(false)
    } else {
      setHasMore(false)
    }
  }


  return (
    <div style={{ minHeight: '80vh', paddingBottom: nowPlaying ? 80 : 0 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#1a0a0d 0%,var(--bg-deep) 100%)', padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-label">Music Library</div>
          <h1 className="page-title">STREAM NAIJA<br /><span style={{ color: 'var(--red)' }}>SOUNDS</span></h1>
          <p style={{ color: 'var(--grey-300)', marginTop: 12, fontSize: 15 }}>
            {loading ? 'Loading...' : `${tracks.length} track${tracks.length !== 1 ? 's' : ''} from Nigeria's finest artists`}
          </p>
        </div>
      </div>

      <div className="container section">
        {/* Tracks / Albums switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={() => setView('tracks')}
            style={{ padding: '7px 20px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: view === 'tracks' ? 'var(--red)' : 'transparent', borderColor: view === 'tracks' ? 'var(--red)' : 'var(--border)', color: 'white' }}>
            <Music size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />Tracks
          </button>
          <button onClick={() => setView('albums')}
            style={{ padding: '7px 20px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: view === 'albums' ? 'var(--red)' : 'transparent', borderColor: view === 'albums' ? 'var(--red)' : 'var(--border)', color: 'white' }}>
            <Disc size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />Albums
          </button>
        </div>

        {/* Albums view */}
        {view === 'albums' && <Albums currentUser={currentUser} />}

        {/* Tracks view */}
        {view === 'tracks' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 260px', maxWidth: 360 }}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search tracks or artists..." />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 4 }}>
                {genres.map(g => (
                  <button key={g} onClick={() => setActiveGenre(g)}
                    style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-mono)', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', background: activeGenre === g ? 'var(--red)' : 'transparent', borderColor: activeGenre === g ? 'var(--red)' : 'var(--border)', color: activeGenre === g ? 'white' : 'var(--grey-300)' }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Track list */}
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[...Array(8)].map((_,i) => (
                <div key={i} style={{ display:'flex', gap:16, padding:'10px 14px', alignItems:'center' }}>
                  <div className="skeleton" style={{ width:32, height:14, flexShrink:0 }} />
                  <div className="skeleton" style={{ width:44, height:44, borderRadius:6, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div className="skeleton skeleton-text" style={{ width:'55%' }} />
                    <div className="skeleton skeleton-text" style={{ width:'35%', height:10 }} />
                  </div>
                  <div className="skeleton" style={{ width:40, height:12, flexShrink:0 }} />
                </div>
              ))}
            </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<Music size={48} />}
                title={tracks.length === 0 ? 'No tracks yet' : 'No tracks found'}
                message={tracks.length === 0 ? 'Artists are uploading. Check back soon!' : 'Try adjusting your search or genre filter.'} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 12 }}>
                {filtered.map((track) => {
                  const playing = nowPlaying?.id === track.id
                  const locked  = track.is_premium && unlocksLoaded && !unlockedIds.has(track.id)
                  return (
                    <div key={track.id} className="card" style={{
                      display: 'flex', flexDirection: 'column', gap: 0,
                      border: playing ? '1px solid var(--border-red)' : '1px solid var(--border)',
                      background: playing ? 'var(--red-glow)' : 'var(--bg-card)',
                      transition: 'all 0.2s', overflow: 'hidden'
                    }}>
                      {/* Cover + play area */}
                      <div style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => {
                          if (locked) { setUnlockTarget(track); return }
                          console.log('🎵 Playing track:', track.title, 'audio_url:', track.audio_url)
                          playTrack(track, filtered)
                          supabase.rpc('increment_play_count', { p_track_id: track.id }).then(() => {}).catch(() => {})
                        }}>
                        {track.cover_url
                          ? <img loading="lazy" src={track.cover_url} alt={track.title}
                              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <MusicArt title={track.title} size={80} />
                            </div>
                        }
                        {/* Play overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: playing ? 1 : 0, transition: 'opacity 0.2s' }}
                          className="track-play-overlay">
                          {playing
                            ? (isPlaying ? <Pause size={40} fill="white" color="white" /> : <Play size={40} fill="white" color="white" />)
                            : <Play size={40} fill="white" color="white" />}
                        </div>
                        {/* Premium badge */}
                        {track.is_premium && (
                          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: locked ? '#ffb400' : '#00c864', border: '1px solid ' + (locked ? 'rgba(255,180,0,0.4)' : 'rgba(0,200,100,0.4)') }}>
                            {locked ? '💎 ' + track.tunez_price + 'T' : '✅ Unlocked'}
                          </div>
                        )}
                        {/* Playing indicator */}
                        {playing && (
                          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'var(--red)', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'white', letterSpacing: 1 }}>
                            PLAYING
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '12px 14px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              onClick={() => setTrackPage(track)}
                              style={{ fontWeight: 700, fontSize: 14, color: playing ? 'var(--red)' : 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                              title={track.title}>
                              {track.title}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {track.profiles?.name}{track.profiles?.is_verified ? ' ✅' : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                            {track.play_count >= 1000 ? (track.play_count/1000).toFixed(1)+'K' : track.play_count || 0} plays
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--grey-600)', marginBottom: 10 }}>
                          {track.genre}{track.duration ? ' · ' + track.duration : ''}
                        </div>
                      </div>

                      {/* Actions */}
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px 10px', flexWrap: 'wrap' }}>
                        <ReactionBar targetType="track" targetId={track.id} currentUser={currentUser} compact />
                        <SaveButton track={track} currentUser={currentUser} />
                        <AddToPlaylist track={track} currentUser={currentUser} />
                        <button onClick={() => setTrackPage(track)}
                          style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', color: 'var(--grey-400)', cursor: 'pointer', fontSize: 11 }}>
                          View
                        </button>
                        <ShareButton url={window.location.origin + '/?track=' + track.id} text={'Listen to ' + track.title + ' on Tunez9ja!'} title={track.title} compact />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {unlockTarget && (
        <PremiumUnlockModal
          content={unlockTarget}
          contentType="track"
          currentUser={currentUser}
          onClose={() => setUnlockTarget(null)}
          onUnlocked={(track) => {
              // Add to unlocked set so track row allows play
              setUnlockedIds(prev => new Set([...prev, (track || unlockTarget).id]))
              setUnlockTarget(null)
              // Small delay then play - keeps user gesture chain intact
              setTimeout(() => {
                const t = track || unlockTarget
                if (t) playTrack(t, filtered)
              }, 100)
            }}
          setPage={() => {}}
        />
      )}
    </div>
  )
}
