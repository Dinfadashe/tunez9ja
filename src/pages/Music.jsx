import React, { useState, useEffect } from 'react'
import CommentsSection, { ReactionBar } from '../components/CommentsSection.jsx'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'

import { MusicArt, SearchBar, EmptyState } from '../components/UI.jsx'
import { Play, Pause, Music } from 'lucide-react'

export default function MusicPage({ currentUser }) {
  const [tracks, setTracks]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const { nowPlaying, isPlaying, playTrack } = usePlayer()

  useEffect(() => {
    supabase
      .from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified, avatar_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
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
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>LOADING TRACKS...</div>
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
                  onClick={() => playTrack(track, filtered)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', background: playing ? 'var(--red-glow)' : 'transparent', border: `1px solid ${playing ? 'var(--border-red)' : 'transparent'}`, transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (!playing) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!playing) e.currentTarget.style.background = 'transparent' }}>

                  <div style={{ width: 32, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: playing ? 'var(--red)' : 'var(--grey-500)', flexShrink: 0 }}>
                    {playing
                      ? (isPlaying ? <Pause size={14} fill="var(--red)" color="var(--red)" /> : <Play size={14} fill="var(--red)" color="var(--red)" />)
                      : idx + 1}
                  </div>

                  {track.cover_url
                    ? <img src={track.cover_url} alt={track.title} style={{ width: 44, height: 44, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                    : <MusicArt title={track.title} size={44} />
                  }

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: playing ? 'var(--red)' : 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-300)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.profiles?.name}{track.profiles?.is_verified && ' âœ…'}
                      {track.description && <span style={{ color: 'var(--grey-500)', marginLeft: 8 }}>Â· {track.description.slice(0,60)}{track.description.length > 60 ? '...' : ''}</span>}
                    </div>
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', flexShrink: 0, display: 'none' }} className="hide-mobile">{track.genre}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grey-500)', width: 40, textAlign: 'right', flexShrink: 0 }}>{track.duration || 'â€”'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', width: 48, textAlign: 'right', flexShrink: 0 }}>
                    {track.play_count >= 1000 ? (track.play_count/1000).toFixed(1)+'K' : track.play_count || 0}
                  </span>
                  <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                    <ReactionBar targetType="track" targetId={track.id} currentUser={currentUser} compact />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
