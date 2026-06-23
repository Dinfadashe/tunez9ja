import React, { useState, useEffect } from 'react'
import CommentsSection, { ReactionBar } from '../components/CommentsSection.jsx'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { earnStream, isUnlocked } from '../lib/tunez.js'
import PremiumUnlockModal from '../components/PremiumUnlockModal.jsx'

import { MusicArt, SearchBar, EmptyState } from '../components/UI.jsx'
import { Play, Pause, Music, Heart, Plus, ListMusic, Disc, Headphones } from 'lucide-react'
import ShareButton from '../components/ShareButton.jsx'
import Albums from '../components/Albums.jsx'


// ── Save track to library ─────────────────────────────────────
function SaveButton({ track, currentUser }) {
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
      await supabase.from('saved_tracks').insert({ user_id: currentUser.id, track_id: track.id })
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
}

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

export default function MusicPage({ currentUser }) {
  const [tracks, setTracks]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const { nowPlaying, isPlaying, playTrack } = usePlayer()
  const [unlockTarget, setUnlockTarget] = React.useState(null)
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
      .limit(200)
      .then(({ data }) => { setTracks(data || []); setLoading(false) })
  }, [])

  const genres   = ['All', ...new Set(tracks.map(t => t.genre).filter(Boolean))]
  const filtered = tracks.filter(t => {
    const artist = t.profiles?.name || ''
    const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
      artist.toLowerCase().includes(search.toLowerCase())
    const matchGenre = activeGenre === 'All' || t.genre === activeGenre
    return matchSearch && matchGenre
  })

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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filtered.map((track, idx) => {
                  const playing = nowPlaying?.id === track.id
                  return (
                    <div key={track.id}
                      onClick={async () => {
                        if (track.is_premium) {
                          const unlocked = await isUnlocked(currentUser?.id, track.id)
                          if (!unlocked) { setUnlockTarget(track); return }
                        }
                        playTrack(track, filtered)
                        supabase.rpc('increment_play_count', { p_track_id: track.id }).then(() => {}).catch(() => {})
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', background: playing ? 'var(--red-glow)' : 'transparent', border: `1px solid ${playing ? 'var(--border-red)' : 'transparent'}`, transition: 'all 0.2s' }}
                      onMouseEnter={e => { if (!playing) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (!playing) e.currentTarget.style.background = 'transparent' }}>

                      <div style={{ width: 32, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: playing ? 'var(--red)' : 'var(--grey-500)', flexShrink: 0 }}>
                        {playing
                          ? (isPlaying ? <Pause size={14} fill="var(--red)" color="var(--red)" /> : <Play size={14} fill="var(--red)" color="var(--red)" />)
                          : idx + 1}
                      </div>

                      {track.cover_url
                        ? <img loading="lazy" src={track.cover_url} alt={track.title} style={{ width: 44, height: 44, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                        : <MusicArt title={track.title} size={44} />
                      }

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: playing ? 'var(--red)' : 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {track.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--grey-300)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {track.profiles?.name}{track.profiles?.is_verified && ' ✅'}
                        </div>
                      </div>

                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', flexShrink: 0, display: 'none' }} className="hide-mobile">{track.genre}</span>
                      {track.is_premium && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, background: 'rgba(255,180,0,0.15)', color: '#ffb400', border: '1px solid rgba(255,180,0,0.3)', flexShrink: 0 }}>💎{track.tunez_price}T</span>}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grey-500)', width: 40, textAlign: 'right', flexShrink: 0 }}>{track.duration || '—'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', width: 48, textAlign: 'right', flexShrink: 0 }}>
                        {track.play_count >= 1000 ? (track.play_count/1000).toFixed(1)+'K' : track.play_count || 0}
                      </span>
                      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                        <ReactionBar targetType="track" targetId={track.id} currentUser={currentUser} compact />
                      </div>
                      <SaveButton track={track} currentUser={currentUser} />
                      <AddToPlaylist track={track} currentUser={currentUser} />
                      <ShareButton url={window.location.origin + '/?track=' + track.id} text={'Listen to ' + track.title + ' on Tunez9ja!'} title={track.title} compact />
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
          onUnlocked={() => { playTrack(unlockTarget, filtered); setUnlockTarget(null) }}
          setPage={() => {}}
        />
      )}
    </div>
  )
}
