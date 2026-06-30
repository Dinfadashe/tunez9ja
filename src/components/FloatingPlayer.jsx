import React, { useRef, useState, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { supabase } from '../lib/supabase.js'
import { earnStream } from '../lib/tunez.js'
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  ChevronDown, ChevronUp, Music
} from 'lucide-react'

// ── Animated equalizer bars ────────────────────────────────────
function Equalizer({ isPlaying, color = 'var(--red)', size = 'md' }) {
  const h = size === 'sm' ? 10 : 16
  const w = size === 'sm' ? 2  : 3
  const gap = size === 'sm' ? 1 : 2
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap, height: h, flexShrink: 0 }}>
      <style>{`
        @keyframes eq1 { 0%,100%{height:2px} 50%{height:${h}px} }
        @keyframes eq2 { 0%,100%{height:${Math.round(h*0.55)}px} 25%{height:2px} 75%{height:${h}px} }
        @keyframes eq3 { 0%,100%{height:${h}px} 40%{height:3px} 80%{height:${Math.round(h*0.7)}px} }
        @keyframes eq4 { 0%,100%{height:3px} 60%{height:${h}px} }
      `}</style>
      {[
        { a: 'eq1', d: '0.55s' },
        { a: 'eq2', d: '0.75s' },
        { a: 'eq3', d: '0.48s' },
        { a: 'eq4', d: '0.65s' },
      ].map((b, i) => (
        <div key={i} style={{
          width: w,
          borderRadius: 2,
          background: color,
          height: isPlaying ? undefined : 3,
          animation: isPlaying
            ? `${b.a} ${b.d} ease-in-out infinite`
            : 'none',
          minHeight: 3,
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )
}

export default function FloatingPlayer({ currentUser }) {
  const {
    nowPlaying, isPlaying, currentTime, duration,
    queue, queueIndex, volume, muted,
    audioRef, audioError, skipNext, skipPrev,
    togglePlay, seekTo, changeVolume, toggleMute, playTrack,
  } = usePlayer()

  const earnedRef = useRef(false)
  const prevIdRef = useRef(null)
  const [shuffle,    setShuffle]   = useState(false)
  const [repeat,     setRepeat]    = useState('none') // none | all | one
  const [minimised,  setMinimised] = useState(false)

  // ── Premium guard helpers ─────────────────────────────────────
  const [unlockedIds, setUnlockedIds] = React.useState(new Set())

  React.useEffect(() => {
    if (!currentUser?.id) { setUnlockedIds(new Set()); return }
    supabase.from('tunez_unlocks')
      .select('content_id')
      .eq('user_id', currentUser.id)
      .eq('content_type', 'track')
      .then(({ data }) => setUnlockedIds(new Set((data || []).map(u => u.content_id))))
  }, [currentUser?.id])

  const isTrackLocked = (track) => {
    if (!track || !track.is_premium) return false
    if (!currentUser) return true
    return !unlockedIds.has(track.id)
  }

  const skipNextUnlocked = () => {
    if (!queue.length) return
    let idx = (queueIndex + 1) % queue.length
    let attempts = 0
    while (isTrackLocked(queue[idx]) && attempts < queue.length) {
      idx = (idx + 1) % queue.length
      attempts++
    }
    if (!isTrackLocked(queue[idx])) {
      playTrack(queue[idx], queue)
    }
  }


  // ── Track change ─────────────────────────────────────────────
  useEffect(() => {
    if (!nowPlaying?.id || nowPlaying.id === prevIdRef.current) return
    prevIdRef.current = nowPlaying.id
    earnedRef.current = false
    supabase.rpc('increment_play_count', { p_track_id: nowPlaying.id })
      .then(() => {}).catch(() => {})
  }, [nowPlaying?.id])

  // ── Earn TUNEZ after 10s ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !nowPlaying || earnedRef.current) return
    if (currentTime >= 10) {
      earnedRef.current = true
      earnStream(currentUser.id, nowPlaying).catch(() => {})
    }
  }, [currentTime, nowPlaying, currentUser])

  // ── Track end: repeat / shuffle ──────────────────────────────
  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    const onEnd = () => {
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      if (shuffle && queue.length > 1) {
        // Skip locked premium tracks in shuffle
        let attempts = 0
        let idx
        do {
          idx = Math.floor(Math.random() * queue.length)
          attempts++
        } while (attempts < queue.length && (idx === queueIndex || isTrackLocked(queue[idx])))
        if (!isTrackLocked(queue[idx])) {
          playTrack(queue[idx], queue)
        }
        return
      }
      if (repeat === 'all' || queueIndex < queue.length - 1) {
        skipNextUnlocked()
      }
      // else: stop — last track, no repeat
    }
    audio.addEventListener('ended', onEnd)
    return () => audio.removeEventListener('ended', onEnd)
  }, [repeat, shuffle, queue, queueIndex, skipNext, playTrack])

  if (!nowPlaying) return null

  const pct        = duration > 0 ? (currentTime / duration) * 100 : 0
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const repeatClr  = repeat !== 'none' ? 'var(--red)' : 'var(--grey-500)'
  const shuffleClr = shuffle ? 'var(--red)' : 'var(--grey-500)'

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const handleSeekClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo(((e.clientX - rect.left) / rect.width) * (duration || 0))
  }

  const cycleRepeat = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')

  const btnStyle = (active = false, color = 'var(--grey-400)') => ({
    background: 'none', border: 'none', cursor: 'pointer',
    color: active ? 'var(--red)' : color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 7, borderRadius: 6,
    transition: 'color 0.15s, transform 0.1s',
  })

  return (
    <>
      {/* ── Friendly offline notice — never a silent failure, never a crash ── */}
      {audioError && audioError.trackId === nowPlaying?.id && (
        <div style={{
          position: 'fixed',
          bottom: minimised ? 64 : 92,
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 301,
          background: 'rgba(200,16,46,0.95)',
          color: 'white',
          fontSize: 12.5,
          fontFamily: 'var(--font-mono, monospace)',
          padding: '8px 16px',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          maxWidth: 'calc(100vw - 2rem)',
          textAlign: 'center',
        }}>
          {audioError.message}
        </div>
      )}
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
      background: 'rgba(8,8,8,0.98)',
      backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
      transition: 'height 0.25s ease',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>

      {/* ── Progress bar — always visible, clickable ─────────── */}
      <div
        onClick={handleSeekClick}
        style={{
          height: minimised ? 3 : 4,
          background: 'rgba(255,255,255,0.08)',
          cursor: 'pointer', position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: pct + '%',
          background: 'linear-gradient(90deg, #c8102e, #ff4466)',
          transition: 'width 0.35s linear',
        }} />
        {/* Scrubber dot */}
        <div style={{
          position: 'absolute', top: '50%', left: pct + '%',
          transform: 'translate(-50%, -50%)',
          width: minimised ? 8 : 12, height: minimised ? 8 : 12,
          borderRadius: '50%', background: 'white',
          boxShadow: '0 0 6px rgba(200,16,46,0.8)',
          transition: 'left 0.35s linear',
        }} />
      </div>

      {/* ══ MINIMISED bar ══════════════════════════════════════ */}
      {minimised && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 14px',
        }}>
          {/* Cover */}
          <div style={{
            width: 30, height: 30, borderRadius: 4,
            overflow: 'hidden', flexShrink: 0,
            background: 'var(--bg-surface)',
            position: 'relative',
          }}>
            {nowPlaying.cover_url
              ? <img src={nowPlaying.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={12} style={{ opacity: 0.3 }} />
                </div>
            }
            {/* Equalizer overlay on cover */}
            {isPlaying && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 4,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Equalizer isPlaying size="sm" color="#ff4466" />
              </div>
            )}
          </div>

          {/* Title + artist — click to open track page */}
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => { window.dispatchEvent(new CustomEvent('openTrackPage', { detail: nowPlaying })) }}>
            <div style={{
              fontSize: 12, fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: 'var(--white)',
            }}>
              {nowPlaying.title}
            </div>
            <div style={{ fontSize: 10, color: 'var(--grey-500)', marginTop: 1 }}>
              {nowPlaying.profiles?.name || ''}
            </div>
          </div>

          {/* Mini controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button onClick={skipPrev} style={btnStyle()}>
              <SkipBack size={15} />
            </button>
            <button onClick={togglePlay} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--red)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPlaying
                ? <Pause size={14} fill="white" color="white" />
                : <Play  size={14} fill="white" color="white" style={{ marginLeft: 1 }} />
              }
            </button>
            <button onClick={skipNext} style={btnStyle()}>
              <SkipForward size={15} />
            </button>
            {/* Expand */}
            <button onClick={() => setMinimised(false)} title="Expand player"
              style={{ ...btnStyle(), marginLeft: 4 }}>
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══ FULL player ════════════════════════════════════════ */}
      {!minimised && (
        <div style={{ padding: 'clamp(6px,2vw,10px) clamp(10px,3vw,16px)', display: 'flex', alignItems: 'center', gap: 'clamp(8px,2vw,12px)' }}>

          {/* Cover + equalizer overlay — click to minimise */}
          <div
            onClick={() => setMinimised(true)}
            title="Click to minimise"
            style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 7,
              overflow: 'hidden', background: 'var(--bg-surface)',
            }}>
              {nowPlaying.cover_url
                ? <img src={nowPlaying.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={18} style={{ opacity: 0.3 }} />
                  </div>
              }
            </div>
            {/* Animated equalizer overlay when playing */}
            {isPlaying && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 7,
                background: 'rgba(0,0,0,0.58)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Equalizer isPlaying color="#ff6680" />
              </div>
            )}
          </div>

          {/* Track info — click to open track page */}
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => { window.dispatchEvent(new CustomEvent('openTrackPage', { detail: nowPlaying })) }}>
            <div style={{
              fontWeight: 700, fontSize: 13,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: 'var(--white)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {nowPlaying.title}
              <Equalizer isPlaying={isPlaying} size="sm" />
            </div>
            <div style={{
              fontSize: 11, color: 'var(--grey-400)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {nowPlaying.profiles?.name || ''}
            </div>
          </div>

          {/* ── Playback controls ───────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button onClick={() => setShuffle(s => !s)} title="Shuffle"
              className="player-shuffle"
              style={btnStyle(shuffle)}>
              <Shuffle size={15} />
            </button>

            <button onClick={skipPrev} title="Previous"
              style={btnStyle(false, 'var(--grey-300)')}>
              <SkipBack size={20} />
            </button>

            <button onClick={togglePlay}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'var(--red)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 2px 12px rgba(200,16,46,0.5)',
                transition: 'transform 0.1s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPlaying
                ? <Pause size={18} fill="white" color="white" />
                : <Play  size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
              }
            </button>

            <button onClick={skipNext} title="Next"
              style={btnStyle(false, 'var(--grey-300)')}>
              <SkipForward size={20} />
            </button>

            <button onClick={cycleRepeat}
              title={repeat === 'none' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one'}
              className="player-repeat"
              style={btnStyle(repeat !== 'none')}>
              <RepeatIcon size={15} />
            </button>
          </div>

          {/* ── Time + Volume + Minimise ─────────────────────── */}
          <div className="player-time"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--grey-500)', minWidth: 80, textAlign: 'center',
            }}>
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            <div className="player-volume" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
                style={btnStyle()}>
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <input
                type="range" min="0" max="1" step="0.02"
                value={muted ? 0 : volume}
                onChange={e => changeVolume(parseFloat(e.target.value))}
                style={{ width: 72, accentColor: 'var(--red)', cursor: 'pointer' }}
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>

            {/* Minimise button — always visible */}
            <button onClick={() => setMinimised(true)} title="Minimise player"
              style={btnStyle()}>
              <ChevronDown size={17} />
            </button>
          </div>

        </div>
      )}
    </div>
    </>
  )
}
