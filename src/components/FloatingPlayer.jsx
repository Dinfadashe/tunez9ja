import React, { useState } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import {
  Play, Pause, SkipBack, SkipForward, X,
  ChevronUp, ChevronDown, Music
} from 'lucide-react'
import CommentsSection, { ReactionBar } from './CommentsSection.jsx'

function fmtTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export default function FloatingPlayer({ currentUser }) {
  const {
    nowPlaying, isPlaying, progress, duration, currentTime,
    audioRef, showInfo, setShowInfo, minimized, setMinimized,
    stopPlayer, skipNext, skipPrev, seekTo, togglePlay,
  } = usePlayer()

  if (!nowPlaying) return null

  return (
    <>
      {/* â”€â”€ FULL PLAYER BAR (bottom) â”€â”€ */}
      {!minimized && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
          background: 'rgba(13,13,13,0.97)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-red)',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>

            {/* Cover + track info â€” click to open detail */}
            <div onClick={() => setShowInfo(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: '0 0 auto', minWidth: 0, width: 'clamp(140px, 25%, 220px)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                {nowPlaying.cover_url
                  ? <img src={nowPlaying.cover_url} alt={nowPlaying.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'var(--red-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={18} color="var(--red)" /></div>
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.title}</div>
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.profiles?.name}</div>
              </div>
            </div>

            {/* Controls + progress */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <button onClick={skipPrev} style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 4 }}><SkipBack size={18} /></button>
                <button onClick={togglePlay} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {isPlaying
                    ? <Pause size={16} fill="white" color="white" />
                    : <Play size={16} fill="white" color="white" />
                  }
                </button>
                <button onClick={skipNext} style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 4 }}><SkipForward size={18} /></button>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 500 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', flexShrink: 0 }}>{fmtTime(currentTime)}</span>
                <div
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    seekTo(((e.clientX - rect.left) / rect.width) * 100)
                  }}
                  style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--red)', width: `${progress}%`, transition: 'width 0.1s linear', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', flexShrink: 0 }}>{fmtTime(duration)}</span>
              </div>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setMinimized(true)} title="Minimize" style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                <ChevronDown size={18} />
              </button>
              <button onClick={stopPlayer} title="Close player" style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MINI FLOATING BUBBLE (when minimized) â”€â”€ */}
      {minimized && (
        <MiniPlayer
          nowPlaying={nowPlaying}
          isPlaying={isPlaying}
          onExpand={() => setMinimized(false)}
          onTogglePlay={togglePlay}
          onStop={stopPlayer}
          onInfo={() => { setMinimized(false); setShowInfo(true) }}
        />
      )}

      {/* â”€â”€ TRACK INFO MODAL â”€â”€ */}
      {showInfo && (
        <TrackInfoModal
          nowPlaying={nowPlaying}
          isPlaying={isPlaying}
          progress={progress}
          duration={duration}
          currentTime={currentTime}
          onClose={() => setShowInfo(false)}
          onSeek={seekTo}
          onTogglePlay={togglePlay}
          currentUser={currentUser}
        />
      )}
    </>
  )
}

/* â”€â”€ Mini floating bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MiniPlayer({ nowPlaying, isPlaying, onExpand, onTogglePlay, onStop, onInfo }) {
  const [pos, setPos] = useState({ x: null, y: null })
  const [dragging, setDragging] = useState(false)
  const dragStart = React.useRef(null)
  const ref = React.useRef(null)

  const startDrag = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStart.current = {
      mouseX: clientX, mouseY: clientY,
      elemX: pos.x ?? (window.innerWidth - 80),
      elemY: pos.y ?? (window.innerHeight - 160),
    }
    setDragging(true)
  }

  React.useEffect(() => {
    const move = (e) => {
      if (!dragging || !dragStart.current) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const dx = clientX - dragStart.current.mouseX
      const dy = clientY - dragStart.current.mouseY
      const newX = Math.max(0, Math.min(window.innerWidth - 72, dragStart.current.elemX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 72, dragStart.current.elemY + dy))
      setPos({ x: newX, y: newY })
    }
    const end = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [dragging])

  const style = {
    position: 'fixed',
    right: pos.x !== null ? 'auto' : 20,
    bottom: pos.y !== null ? 'auto' : 100,
    left: pos.x !== null ? pos.x : 'auto',
    top: pos.y !== null ? pos.y : 'auto',
    zIndex: 600,
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  }

  return (
    <div ref={ref} style={style} onMouseDown={startDrag} onTouchStart={startDrag}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(13,13,13,0.95)',
        border: '2px solid var(--red)',
        boxShadow: '0 4px 24px rgba(200,16,46,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Cover art background */}
        {nowPlaying.cover_url && (
          <img src={nowPlaying.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
        )}

        {/* Spinning disc animation when playing */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(200,16,46,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1,
          animation: isPlaying ? 'spin 3s linear infinite' : 'none',
        }}>
          <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />
        </div>

        {/* Tap to expand â€” invisible overlay */}
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 2 }}
          onClick={onExpand}
          title="Tap to expand player"
        />
      </div>

      {/* Mini controls tooltip on hover */}
      <div style={{
        position: 'absolute', bottom: '110%', right: 0,
        background: 'rgba(13,13,13,0.95)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: '8px 10px',
        display: 'flex', gap: 8, alignItems: 'center',
        whiteSpace: 'nowrap',
        opacity: 0, pointerEvents: 'none',
        transition: 'opacity 0.2s',
      }}
        className="mini-controls"
      >
        <button onClick={e => { e.stopPropagation(); onTogglePlay() }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 2 }}>
          {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
        </button>
        <span style={{ fontSize: 12, color: 'var(--grey-300)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying.title}</span>
        <button onClick={e => { e.stopPropagation(); onStop() }} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 2 }}>
          <X size={12} />
        </button>
      </div>

      <style>{`
        div:hover > .mini-controls { opacity: 1 !important; pointer-events: auto !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

/* â”€â”€ Track Info Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function TrackInfoModal({ nowPlaying, isPlaying, progress, duration, currentTime, onClose, onSeek, onTogglePlay, currentUser }) {
  const fmtT = (s) => { if (!s || isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 16, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', margin: 'auto' }}>

        {/* Cover */}
        <div style={{ position: 'relative', height: 'min(280px,50vw)', minHeight: 160, background: '#000', overflow: 'hidden', flexShrink: 0 }}>
          {nowPlaying.cover_url
            ? <img src={nowPlaying.cover_url} alt={nowPlaying.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a0a0d,#0a0d1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={60} style={{ opacity: 0.1 }} /></div>
          }
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>âœ•</button>
          {isPlaying && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(200,16,46,0.9)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              â–¶ NOW PLAYING
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ padding: '20px 22px 24px', overflowY: 'auto', maxHeight: '55vh' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,4vw,26px)', letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 4 }}>{nowPlaying.title}</h2>
          <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600, marginBottom: 18 }}>{nowPlaying.profiles?.name}{nowPlaying.profiles?.is_verified && ' âœ…'}</div>

          {/* Progress */}
          <div style={{ marginBottom: 18 }}>
            <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX-r.left)/r.width)*100) }}
              style={{ width: '100%', height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', marginBottom: 6 }}>
              <div style={{ height: '100%', background: 'var(--red)', width: `${progress}%`, transition: 'width 0.1s linear', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)' }}>
              <span>{fmtT(currentTime)}</span><span>{fmtT(duration)}</span>
            </div>
          </div>

          {/* Play/Pause */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <button onClick={onTogglePlay}
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--red)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(200,16,46,0.4)' }}>
              {isPlaying
                ? <Pause size={22} fill="white" color="white" />
                : <Play size={22} fill="white" color="white" />
              }
            </button>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              ['Genre',    nowPlaying.genre],
              ['Duration', fmtT(duration) !== '0:00' ? fmtT(duration) : nowPlaying.duration || 'â€”'],
              ['Plays',    nowPlaying.play_count?.toLocaleString() || '0'],
              ['Released', nowPlaying.created_at?.slice(0,10) || 'â€”'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {nowPlaying.description && (
            <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.7 }}>
              {nowPlaying.description}
            </div>
          )}

          {nowPlaying.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {nowPlaying.tags.map(t => (
                <span key={t} style={{ padding: '3px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)' }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Reactions */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>REACT</span>
            <ReactionBar targetType="track" targetId={nowPlaying.id} currentUserId={currentUser?.id} compact />
          </div>

          {/* Comments */}
          <CommentsSection targetType="track" targetId={nowPlaying.id} currentUser={currentUser} />
        </div>
      </div>
    </div>
  )
}
