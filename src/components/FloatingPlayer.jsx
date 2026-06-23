import React, { useEffect, useRef, useState } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { supabase } from '../lib/supabase.js'
import { earnStream } from '../lib/tunez.js'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ChevronDown, ChevronUp, Shuffle, Repeat, Repeat1, ListPlus, Music
} from 'lucide-react'

export default function FloatingPlayer({ currentUser }) {
  const {
    nowPlaying, queue, queueIndex,
    isPlaying, setIsPlaying,
    playTrack, playNext: ctxNext, playPrev: ctxPrev,
    stopPlayer
  } = usePlayer()

  const audioRef  = useRef(null)
  const earnedRef = useRef(false)
  const [volume,     setVolume]     = useState(1)
  const [muted,      setMuted]      = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [duration,   setDuration]   = useState(0)
  const [minimised,  setMinimised]  = useState(false)
  const [shuffle,    setShuffle]    = useState(false)
  const [repeat,     setRepeat]     = useState('none') // 'none' | 'all' | 'one'

  // ── Load track ─────────────────────────────────────────────
  useEffect(() => {
    if (!nowPlaying?.audio_url) return
    const audio = audioRef.current
    if (!audio) return
    audio.src = nowPlaying.audio_url
    audio.volume = volume
    audio.muted  = muted
    audio.play().catch(() => {})
    setIsPlaying(true)
    earnedRef.current = false
    setProgress(0)
    // Increment play count
    supabase.rpc('increment_play_count', { p_track_id: nowPlaying.id }).catch(() => {})
  }, [nowPlaying?.id])

  // ── Sync play/pause ────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.play().catch(() => {})
    else audio.pause()
  }, [isPlaying])

  // ── Time update & TUNEZ earn ───────────────────────────────
  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return
    setProgress(audio.currentTime)
    setDuration(audio.duration || 0)
    if (!earnedRef.current && audio.currentTime >= 10 && currentUser) {
      earnedRef.current = true
      earnStream(currentUser.id, nowPlaying).catch(() => {})
    }
  }

  // ── Track ended ────────────────────────────────────────────
  const handleEnded = () => {
    if (repeat === 'one') {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      return
    }
    if (queue.length > 1) {
      if (shuffle) {
        const next = Math.floor(Math.random() * queue.length)
        playTrack(queue[next], queue)
      } else if (queueIndex < queue.length - 1) {
        ctxNext()
      } else if (repeat === 'all') {
        playTrack(queue[0], queue)
      } else {
        setIsPlaying(false)
      }
    } else {
      setIsPlaying(false)
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * (audio.duration || 0)
  }

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    setMuted(v === 0)
  }

  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)
    if (audioRef.current) audioRef.current.muted = newMuted
  }

  const cycleRepeat = () => {
    setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!nowPlaying) return null

  const pct = duration ? (progress / duration) * 100 : 0

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const repeatColor = repeat !== 'none' ? 'var(--red)' : 'var(--grey-500)'
  const shuffleColor = shuffle ? 'var(--red)' : 'var(--grey-500)'

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
        background: 'rgba(12,12,12,0.97)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
        transition: 'transform 0.3s ease',
      }}>
        {/* Progress bar — always visible */}
        <div onClick={handleSeek} style={{ height: 3, background: 'var(--bg-surface)', cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: pct + '%', background: 'var(--red)', transition: 'width 0.5s linear', borderRadius: 2 }} />
        </div>

        <div style={{ padding: minimised ? '8px 16px' : '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Cover */}
          <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-surface)' }}>
            {nowPlaying.cover_url
              ? <img src={nowPlaying.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={18} style={{ opacity: 0.3 }} /></div>
            }
          </div>

          {/* Track info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.title}</div>
            <div style={{ fontSize: 11, color: 'var(--grey-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nowPlaying.profiles?.name || nowPlaying.artist_name || ''}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Shuffle */}
            <button onClick={() => setShuffle(s => !s)} title="Shuffle"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: shuffleColor, display: 'flex' }}>
              <Shuffle size={16} />
            </button>

            {/* Prev */}
            <button onClick={ctxPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--grey-300)', display: 'flex' }}>
              <SkipBack size={20} />
            </button>

            {/* Play/Pause */}
            <button onClick={() => setIsPlaying(p => !p)}
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isPlaying
                ? <Pause size={20} fill="white" color="white" />
                : <Play  size={20} fill="white" color="white" style={{ marginLeft: 2 }} />
              }
            </button>

            {/* Next */}
            <button onClick={ctxNext} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--grey-300)', display: 'flex' }}>
              <SkipForward size={20} />
            </button>

            {/* Repeat */}
            <button onClick={cycleRepeat} title={`Repeat: ${repeat}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: repeatColor, display: 'flex' }}>
              <RepeatIcon size={16} />
            </button>
          </div>

          {/* Time + Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', minWidth: 80, textAlign: 'center' }}>
              {fmt(progress)} / {fmt(duration)}
            </span>
            <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)', display: 'flex', padding: 4 }}>
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
              onChange={handleVolume}
              style={{ width: 70, accentColor: 'var(--red)', cursor: 'pointer' }} />
            <button onClick={() => setMinimised(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-500)', display: 'flex', padding: 4 }}>
              {minimised ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
