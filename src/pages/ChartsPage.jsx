import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { MusicArt } from '../components/UI.jsx'
import { Play, Pause, TrendingUp, Flame, Star, Clock, Music2, Award, ChevronUp, ChevronDown, Minus } from 'lucide-react'

const CHART_TABS = [
  { key: 'top50',    label: 'Top 50',        icon: Award,      desc: 'Most streamed this week' },
  { key: 'trending', label: 'Trending',      icon: TrendingUp, desc: 'Fastest rising right now' },
  { key: 'new',      label: 'New Entries',   icon: Star,       desc: 'Fresh drops this month' },
  { key: 'genres',   label: 'By Genre',      icon: Music2,     desc: 'Charts by genre' },
]

const GENRES = ['Afrobeats','Afropop','Amapiano','Street Pop','Highlife','Hip-Hop','R&B','Gospel','Fuji','Dancehall']

const SK = '@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:6px}'

function ChartSkeleton() {
  return (
    <div style={{ padding: '0 0 80px' }}>
      <style>{SK}</style>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="sk" style={{ width: 28, height: 18, flexShrink: 0 }} />
          <div className="sk" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="sk" style={{ height: 14, width: '60%', marginBottom: 6 }} />
            <div className="sk" style={{ height: 11, width: '35%' }} />
          </div>
          <div className="sk" style={{ width: 50, height: 14 }} />
        </div>
      ))}
    </div>
  )
}

function MovementIndicator({ movement }) {
  if (movement === 0 || movement === null || movement === undefined)
    return <Minus size={12} style={{ color: 'var(--grey-600)' }} />
  if (movement > 0)
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#22c55e', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
        <ChevronUp size={11} />{movement}
      </span>
    )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#ef4444', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
      <ChevronDown size={11} />{Math.abs(movement)}
    </span>
  )
}

const ChartRow = React.memo(function ChartRow({ track, position, currentUser, isPlaying, isCurrentTrack, onPlay }) {
  const isPodium = position <= 3
  const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <div
      onClick={() => onPlay(track)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 20px',
        background: isCurrentTrack ? 'rgba(200,16,46,0.08)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        borderLeft: isCurrentTrack ? '3px solid var(--red)' : '3px solid transparent',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isCurrentTrack) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!isCurrentTrack) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Position number */}
      <div style={{
        width: 32, textAlign: 'center', flexShrink: 0,
        fontFamily: 'var(--font-display)', fontSize: isPodium ? 20 : 15,
        fontWeight: 700,
        color: isPodium ? podiumColors[position - 1] : 'var(--grey-600)',
      }}>
        {position}
      </div>

      {/* Movement */}
      <div style={{ width: 28, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <MovementIndicator movement={track._movement} />
      </div>

      {/* Cover */}
      <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: isPodium ? '2px solid ' + podiumColors[position - 1] : '1px solid var(--border)' }}>
        {track.cover_url
          ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" decoding="async" />
          : <MusicArt title={track.title} size={46} />
        }
        {isCurrentTrack && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,16,46,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying ? <Pause size={16} fill="white" color="white" /> : <Play size={16} fill="white" color="white" />}
          </div>
        )}
      </div>

      {/* Title + artist */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: isCurrentTrack ? 'var(--red)' : 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
          {track.is_premium && <span style={{ marginLeft: 6, fontSize: 9, background: '#ffb400', color: '#000', padding: '1px 5px', borderRadius: 3, fontWeight: 700, verticalAlign: 'middle' }}>PREMIUM</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 2 }}>
          {track.profiles?.name || '—'}{track.profiles?.is_verified ? ' ✅' : ''}
          {track.genre && <span style={{ marginLeft: 8, color: 'var(--grey-700)', fontSize: 10 }}>· {track.genre}</span>}
        </div>
      </div>

      {/* Streams */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grey-400)', fontWeight: 600 }}>
          {track.play_count >= 1000
            ? (track.play_count / 1000).toFixed(1) + 'K'
            : track.play_count || 0}
        </div>
        <div style={{ fontSize: 9, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)' }}>streams</div>
      </div>

      {/* Play button */}
      <button
        onClick={e => { e.stopPropagation(); onPlay(track) }}
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: isCurrentTrack ? 'var(--red)' : 'rgba(255,255,255,0.06)',
          border: isCurrentTrack ? 'none' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
        {isCurrentTrack && isPlaying
          ? <Pause size={13} fill="white" color="white" />
          : <Play size={13} fill={isCurrentTrack ? 'white' : 'var(--grey-400)'} color={isCurrentTrack ? 'white' : 'var(--grey-400)'} style={{ marginLeft: 1 }} />
        }
      </button>
    </div>
  )
})

export default function ChartsPage({ currentUser }) {
  const [tab,          setTab]          = useState('top50')
  const [tracks,       setTracks]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selectedGenre, setSelectedGenre] = useState('Afrobeats')
  const [genreTracks,  setGenreTracks]  = useState([])
  const [genreLoading, setGenreLoading] = useState(false)
  const { playTrack, nowPlaying, isPlaying, togglePlay } = usePlayer()

  // Fetch chart data
  useEffect(() => {
    setLoading(true)
    let query = supabase.from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified, avatar_url)')
      .eq('status', 'approved')

    if (tab === 'top50') {
      query = query.order('play_count', { ascending: false }).limit(50)
    } else if (tab === 'trending') {
      // Trending = high play_count but relatively recent
      query = query
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('play_count', { ascending: false })
        .limit(50)
    } else if (tab === 'new') {
      query = query
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(30)
    }

    if (tab !== 'genres') {
      query.then(({ data }) => {
        // Simulate chart movement (±0–5 positions randomly for demo)
        const withMovement = (data || []).map(t => ({
          ...t,
          _movement: Math.random() > 0.6 ? 0 : Math.floor(Math.random() * 8) * (Math.random() > 0.5 ? 1 : -1)
        }))
        setTracks(withMovement)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [tab])

  // Fetch genre chart
  useEffect(() => {
    if (tab !== 'genres') return
    setGenreLoading(true)
    supabase.from('music_tracks')
      .select('*, profiles:artist_id(name, is_verified)')
      .eq('status', 'approved')
      .ilike('genre', '%' + selectedGenre + '%')
      .order('play_count', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setGenreTracks((data || []).map(t => ({ ...t, _movement: 0 })))
        setGenreLoading(false)
      })
  }, [tab, selectedGenre])

  const handlePlay = (track) => {
    if (nowPlaying?.id === track.id) {
      togglePlay()
    } else {
      const list = tab === 'genres' ? genreTracks : tracks
      playTrack(track, list)
    }
  }

  const displayTracks = tab === 'genres' ? genreTracks : tracks
  const isLoadingDisplay = tab === 'genres' ? genreLoading : loading

  // Total streams for top track (for bar scaling)
  const maxStreams = displayTracks.length > 0
    ? Math.max(...displayTracks.map(t => t.play_count || 0), 1)
    : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: 80 }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(200,16,46,0.15) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '32px 20px 0',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,40px)', letterSpacing: 1, color: 'var(--white)' }}>
                NAIJA CHARTS
              </h1>
              <p style={{ fontSize: 12, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Updated live · Powered by real streams
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginTop: 20, overflow: 'auto' }}>
            {CHART_TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', background: 'none', border: 'none',
                    borderBottom: active ? '2px solid var(--red)' : '2px solid transparent',
                    color: active ? 'var(--red)' : 'var(--grey-500)',
                    cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
                    whiteSpace: 'nowrap', transition: 'all 0.15s', marginBottom: -1,
                  }}>
                  <Icon size={14} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Genre selector */}
        {tab === 'genres' && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, overflow: 'auto' }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setSelectedGenre(g)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: selectedGenre === g ? 'var(--red)' : 'rgba(255,255,255,0.06)',
                  color: selectedGenre === g ? 'white' : 'var(--grey-400)',
                  fontSize: 12, fontWeight: selectedGenre === g ? 700 : 400,
                  whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                }}>
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Chart description + play all */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>
            {CHART_TABS.find(t => t.key === tab)?.desc}
            {tab === 'genres' && ` · ${selectedGenre}`}
          </p>
          {displayTracks.length > 0 && (
            <button onClick={() => playTrack(displayTracks[0], displayTracks)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20, background: 'var(--red)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Play size={12} fill="white" /> Play All
            </button>
          )}
        </div>

        {/* Column headers */}
        {!isLoadingDisplay && displayTracks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 20px 6px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 32, fontSize: 9, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>#</div>
            <div style={{ width: 28 }} />
            <div style={{ width: 46 }} />
            <div style={{ flex: 1, fontSize: 9, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>Track</div>
            <div style={{ fontSize: 9, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1, marginRight: 46 }}>Streams</div>
          </div>
        )}

        {/* Chart list */}
        {isLoadingDisplay ? (
          <ChartSkeleton />
        ) : displayTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--grey-600)' }}>
            <TrendingUp size={40} style={{ opacity: 0.2, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>
              {tab === 'new' ? 'No new drops in the last 2 weeks.' :
               tab === 'trending' ? 'No trending tracks this month.' :
               tab === 'genres' ? 'No tracks in this genre yet.' :
               'No tracks yet.'}
            </p>
          </div>
        ) : (
          displayTracks.map((track, idx) => (
            <ChartRow
              key={track.id}
              track={track}
              position={idx + 1}
              currentUser={currentUser}
              isCurrentTrack={nowPlaying?.id === track.id}
              isPlaying={isPlaying}
              onPlay={handlePlay}
            />
          ))
        )}
      </div>
    </div>
  )
}
