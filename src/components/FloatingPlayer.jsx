import React, { useRef, useState, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { supabase } from '../lib/supabase.js'
import { earnStream } from '../lib/tunez.js'
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  ChevronDown, ChevronUp, Music
} from 'lucide-react'

export default function FloatingPlayer({ currentUser }) {
  const {
    nowPlaying, isPlaying, currentTime, duration,
    queue, queueIndex, volume, muted,
    audioRef,
    skipNext, skipPrev,
    togglePlay, seekTo,
    changeVolume, toggleMute,
    playTrack,
  } = usePlayer()

  const earnedRef  = useRef(false)
  const prevIdRef  = useRef(null)
  const [shuffle,   setShuffle]   = useState(false)
  const [repeat,    setRepeat]    = useState('none') // 'none' | 'all' | 'one'
  const [minimised, setMinimised] = useState(false)

  // Reset earned flag when track changes + increment play count
  useEffect(() => {
    if (!nowPlaying?.id || nowPlaying.id === prevIdRef.current) return
    prevIdRef.current  = nowPlaying.id
    earnedRef.current  = false
    supabase.rpc('increment_play_count', { p_track_id: nowPlaying.id })
      .then(() => {}).catch(() => {})
  }, [nowPlaying?.id])

  // Earn TUNEZ after 10 seconds
  useEffect(() => {
    if (!currentUser || !nowPlaying || earnedRef.current) return
    if (currentTime >= 10) {
      earnedRef.current = true
      earnStream(currentUser.id, nowPlaying).catch(() => {})
    }
  }, [currentTime, nowPlaying, currentUser])

  // Handle track end with shuffle/repeat
  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    const handleEnd = () => {
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      if (shuffle && queue.length > 1) {
        const randIdx = Math.floor(Math.random() * queue.length)
        playTrack(queue[randIdx], queue)
        return
      }
      if (repeat === 'all' || queueIndex < queue.length - 1) {
        skipNext()
      }
    }
    audio.addEventListener('ended', handleEnd)
    return () => audio.removeEventListener('ended', handleEnd)
  }, [repeat, shuffle, queue, queueIndex, skipNext, playTrack])

  if (!nowPlaying) return null

  const pct          = duration > 0 ? (currentTime / duration) * 100 : 0
  const RepeatIcon   = repeat === 'one' ? Repeat1 : Repeat
  const repeatColor  = repeat !== 'none' ? 'var(--red)' : 'var(--grey-500)'
  const shuffleColor = shuffle ? 'var(--red)' : 'var(--grey-500)'

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    seekTo(pct * (duration || 0))
  }

  const cycleRepeat = () => {
    setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
      background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(16px)',
      borderTop: '1px solid var(--border)',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
    }}>
      {/* Seekbar */}
      <div
        onClick={handleSeek}
        style={{ height: 4, background: 'var(--bg-surface)', cursor: 'pointer', position: 'relative' }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: pct + '%', background: 'var(--red)',
          borderRadius: 2, transition: 'width 0.3s linear',
        }} />
      </div>

      <div style={{
        padding: minimised ? '8px 16px' : '10px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* Cover */}
        <div style={{ width: 42, height: 42, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-surface)' }}>
          {nowPlaying.cover_url
            ? <img src={nowPlaying.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={16} style={{ opacity: 0.3 }} />
              </div>
          }
        </div>

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--white)' }}>
            {nowPlaying.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {nowPlaying.profiles?.name || ''}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShuffle(s => !s)} title="Shuffle"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, color: shuffleColor, display: 'flex', borderRadius: 6 }}>
            <Shuffle size={15} />
          </button>

          <button onClick={skipPrev} title="Previous"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, color: 'var(--grey-300)', display: 'flex', borderRadius: 6 }}>
            <SkipBack size={19} />
          </button>

          <button onClick={togglePlay}
            style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isPlaying
              ? <Pause size={18} fill="white" color="white" />
              : <Play  size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
            }
          </button>

          <button onClick={skipNext} title="Next"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, color: 'var(--grey-300)', display: 'flex', borderRadius: 6 }}>
            <SkipForward size={19} />
          </button>

          <button onClick={cycleRepeat} title={`Repeat: ${repeat}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, color: repeatColor, display: 'flex', borderRadius: 6 }}>
            <RepeatIcon size={15} />
          </button>
        </div>

        {/* Time + Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', minWidth: 75, textAlign: 'center' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)', display: 'flex', padding: 5 }}>
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <input
            type="range" min="0" max="1" step="0.02"
            value={muted ? 0 : volume}
            onChange={e => changeVolume(parseFloat(e.target.value))}
            style={{ width: 72, accentColor: 'var(--red)', cursor: 'pointer' }}
            title={`Volume: ${Math.round(volume * 100)}%`}
          />

          <button onClick={() => setMinimised(m => !m)} title={minimised ? 'Expand' : 'Minimise'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-500)', display: 'flex', padding: 5 }}>
            {minimised ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
