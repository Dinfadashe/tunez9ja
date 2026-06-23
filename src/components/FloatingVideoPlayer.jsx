import React, { useState, useRef, useEffect } from 'react'
import { X, Minimize2, Maximize2, Volume2, VolumeX } from 'lucide-react'

// Global video state
let globalSetVideo = null
export function playFloatingVideo(video) {
  if (globalSetVideo) globalSetVideo(video)
}

export default function FloatingVideoPlayer() {
  const [video,     setVideo]     = useState(null)
  const [minimized, setMinimized] = useState(false)
  const [muted,     setMuted]     = useState(false)
  const [pos,       setPos]       = useState({ x: null, y: null })
  const [dragging,  setDragging]  = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const playerRef  = useRef(null)

  // Register global setter
  useEffect(() => {
    globalSetVideo = setVideo
    return () => { globalSetVideo = null }
  }, [])

  // Drag handlers
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('iframe') || e.target.closest('video')) return
    setDragging(true)
    const rect = playerRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const x = e.clientX - dragOffset.current.x
      const y = e.clientY - dragOffset.current.y
      const maxX = window.innerWidth  - playerRef.current.offsetWidth
      const maxY = window.innerHeight - playerRef.current.offsetHeight
      setPos({ x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  if (!video) return null

  const isYoutube = video.youtube_url?.includes('youtu')
  const ytId = isYoutube
    ? (video.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1])
    : null

  const width  = minimized ? 280 : 420
  const height = minimized ? 158 : 236

  const style = {
    position:   'fixed',
    right:      pos.x !== null ? 'auto' : 20,
    bottom:     pos.y !== null ? 'auto' : 80,
    left:       pos.x !== null ? pos.x  : 'auto',
    top:        pos.y !== null ? pos.y  : 'auto',
    width,
    zIndex:     1500,
    background: '#000',
    borderRadius: 12,
    overflow:   'hidden',
    boxShadow:  '0 8px 40px rgba(0,0,0,0.7)',
    border:     '1px solid rgba(200,16,46,0.4)',
    transition: 'width 0.2s, height 0.2s',
    cursor:     dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  }

  return (
    <div ref={playerRef} style={style} onMouseDown={onMouseDown}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--grey-300)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🎬 {video.title}
        </div>
        <button onClick={() => setMuted(m => !m)}
          style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <button onClick={() => setMinimized(m => !m)}
          style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
        </button>
        <button onClick={() => setVideo(null)}
          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={13} />
        </button>
      </div>

      {/* Video */}
      {!minimized && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          {ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&mute=${muted ? 1 : 0}`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={video.title}
            />
          ) : video.video_url ? (
            <video
              src={video.video_url}
              autoPlay
              muted={muted}
              controls
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-500)', fontSize: 13 }}>
              No video source
            </div>
          )}
        </div>
      )}

      {/* Minimized thumbnail */}
      {minimized && (
        <div style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 10px', background: 'rgba(200,16,46,0.1)' }}>
          <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>Video minimized — click ⬜ to restore</span>
        </div>
      )}
    </div>
  )
}
