import TrackMenu from './TrackMenu.jsx'
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { Play, Music, ChevronLeft, Clock, Disc } from 'lucide-react'
import PremiumUnlockModal from './PremiumUnlockModal.jsx'
import { isUnlocked } from '../lib/tunez.js'

export default function Albums({ currentUser, setPage }) {
  const [albums,  setAlbums]  = useState([])
  const [selected, setSelected] = useState(null)
  const [tracks,  setTracks]  = useState([])
  const [loading, setLoading] = useState(true)
  const [unlockTarget, setUnlockTarget] = useState(null)
  const { playTrack } = usePlayer()

  useEffect(() => {
    supabase.from('albums')
      .select('*, profiles:artist_id(name, is_verified)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAlbums(data || []); setLoading(false) })
  }, [])

  const openAlbum = async (album) => {
    setSelected(album)
    const { data } = await supabase
      .from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified)')
      .eq('album_id', album.id)
      .eq('status', 'approved')
      .order('track_number')
    setTracks(data || [])
  }

  const playAlbum = async () => {
    if (!tracks.length) return
    // Check if album is premium — unlock all tracks
    if (selected.is_premium) {
      const unlocked = await isUnlocked(currentUser?.id, selected.id)
      if (!unlocked) { setUnlockTarget(selected); return }
    }
    playTrack(tracks[0], tracks)
  }

  const handleTrackClick = async (track) => {
    if (track.is_premium) {
      const unlocked = await isUnlocked(currentUser?.id, track.id)
      if (!unlocked) { setUnlockTarget(track); return }
    }
    playTrack(track, tracks)
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>LOADING ALBUMS...</div>

  if (selected) return (
    <div>
      {/* Album detail */}
      <button onClick={() => { setSelected(null); setTracks([]) }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>
        <ChevronLeft size={18} /> Back to Albums
      </button>

      <div className="album-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'min(12.5rem, 35vw) 1fr', gap: 'clamp(1rem, 0.8rem + 1vw, 2rem)', marginBottom: 32, alignItems: 'start' }}>
        {/* Cover */}
        <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: 'linear-gradient(135deg,#1a0a0d,#0a0d1a)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {selected.cover_url
            ? <img src={selected.cover_url} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" decoding="async" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Disc size={64} style={{ opacity: 0.2 }} /></div>
          }
        </div>
        {/* Info */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 8 }}>ALBUM</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1.1, marginBottom: 8 }}>{selected.title}</h1>
          <div style={{ fontSize: 16, color: 'var(--grey-300)', marginBottom: 4 }}>
            {selected.profiles?.name}{selected.profiles?.is_verified && ' ✅'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 16 }}>
            {selected.genre} · {tracks.length} tracks
            {selected.release_date && ` · ${new Date(selected.release_date).getFullYear()}`}
          </div>
          {selected.description && (
            <p style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.7, marginBottom: 20, maxWidth: 480 }}>{selected.description}</p>
          )}
          {selected.is_premium && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#ffb400', marginBottom: 16 }}>
              💎 Premium Album · {selected.tunez_price} TUNEZ
            </div>
          )}
          <button onClick={playAlbum} className="btn btn-primary" style={{ gap: 10, padding: '12px 28px', fontSize: 15 }}>
            <Play size={18} fill="white" /> Play Album
          </button>
        </div>
      </div>

      {/* Track list */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ display: 'flex', padding: '0 14px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <span style={{ width: 32 }}>#</span>
          <span style={{ flex: 1 }}>TITLE</span>
          <span style={{ width: 80, textAlign: 'right' }}>DURATION</span>
        </div>
        {tracks.map((track, i) => (
          <div key={track.id}
            onClick={() => handleTrackClick(track)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 32, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--grey-500)', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.title}
                {track.is_premium && <span style={{ marginLeft: 8, fontSize: 10, color: '#ffb400' }}>💎</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 2 }}>{track.genre}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', width: 80, textAlign: 'right', flexShrink: 0 }}>
              {track.duration || '—'}
            </div>
            <TrackMenu track={{ ...track, artist_id: track.artist_id || selected?.artist_id, profiles: track.profiles || selected?.profiles }} currentUser={currentUser} size={18} />
          </div>
        ))}
      </div>

      {unlockTarget && (
        <PremiumUnlockModal
          content={unlockTarget}
          contentType={unlockTarget.tunez_price === selected.tunez_price ? 'album' : 'track'}
          currentUser={currentUser}
          onClose={() => setUnlockTarget(null)}
          onUnlocked={() => { playTrack(tracks[0], tracks); setUnlockTarget(null) }}
          setPage={setPage}
        />
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 8 }}>COLLECTIONS</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>ALBUMS</h2>
      </div>

      {albums.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey-500)' }}>
          <Disc size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div>No albums yet.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {albums.map(album => (
            <div key={album.id}
              onClick={() => openAlbum(album)}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ position: 'relative', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg,#1a0a0d,#0a0d1a)', marginBottom: 12 }}>
                {album.cover_url
                  ? <img src={album.cover_url} alt={album.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" decoding="async" />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Disc size={48} style={{ opacity: 0.15 }} /></div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.querySelector('.play-btn').style.opacity = 1 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.querySelector('.play-btn').style.opacity = 0 }}
                >
                  <div className="play-btn" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <Play size={20} fill="white" color="white" style={{ marginLeft: 3 }} />
                  </div>
                </div>
                {album.is_premium && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.8)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#ffb400', fontFamily: 'var(--font-mono)' }}>
                    💎 {album.tunez_price}T
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
              <div style={{ fontSize: 12, color: 'var(--grey-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {album.profiles?.name}{album.profiles?.is_verified && ' ✅'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 2 }}>{album.genre}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
