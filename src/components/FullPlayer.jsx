// src/components/FullPlayer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen "Now Playing" view (Spotify / Audiomack style). Opens when the
// mini player bar is tapped.
//  • Big artwork over a blurred, colour-matched backdrop
//  • Draggable progress bar, shuffle / prev / play / next / repeat
//  • Like, download status, track menu (⋮), share
//  • "Up next" sheet with the current queue (tap to play, remove)
//  • Close: ⌄ button, swipe down, Escape, or the phone's Back button
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  ListMusic, Heart, Share2, X, Music, CheckCircle2, Volume2, VolumeX,
} from 'lucide-react'
import { usePlayer, usePlayerTime } from '../context/PlayerContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { openItem, shareLinkFor } from '../lib/urlState.js'
import { useDownloads } from '../lib/downloads.js'
import TrackMenu from './TrackMenu.jsx'

const fmt = (s) => {
  if (!s || !Number.isFinite(s)) return '0:00'
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
}

export default function FullPlayer({ open, onClose, currentUser, startOnQueue = false }) {
  if (!open) return null
  return createPortal(
    <FullPlayerView onClose={onClose} currentUser={currentUser} startOnQueue={startOnQueue} />,
    document.body,
  )
}

function FullPlayerView({ onClose, currentUser, startOnQueue }) {
  const {
    nowPlaying, isPlaying, togglePlay, skipNext, skipPrev, seekTo, queue, volume, muted, changeVolume, toggleMute,
    shuffle, toggleShuffle, repeat, cycleRepeat,
  } = usePlayer()
  const { currentTime, duration } = usePlayerTime()
  const { addToast } = useApp()
  const { isDownloaded } = useDownloads()
  const [showQueue, setShowQueue] = useState(!!startOnQueue)
  const closeQueue = React.useCallback(() => setShowQueue(false), [])
  useEffect(() => { if (startOnQueue) setShowQueue(true) }, [startOnQueue])
  const [scrub, setScrub] = useState(null)          // seconds while dragging
  const [saved, setSaved] = useState(false)
  const [dragY, setDragY] = useState(0)
  const touchStart = useRef(null)
  const closingRef = useRef(false)

  // ── Phone Back button closes the player (instead of leaving the page) ──
  useEffect(() => {
    history.pushState({ ...(history.state || {}), t9player: true }, '')
    const onPop = () => { if (!closingRef.current) { closingRef.current = true; onClose() } }
    window.addEventListener('popstate', onPop)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Space / N / P etc. come from the global player shortcuts
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    if (history.state?.t9player) history.back()   // pops our entry; onClose follows
    onClose()
  }

  useEffect(() => {
    if (!currentUser?.id || !nowPlaying?.id) { setSaved(false); return }
    supabase.from('saved_tracks').select('id').eq('user_id', currentUser.id).eq('track_id', nowPlaying.id).maybeSingle()
      .then(({ data }) => setSaved(!!data)).catch(() => {})
  }, [currentUser?.id, nowPlaying?.id])

  if (!nowPlaying) return null

  const dur = duration || Number(nowPlaying.duration) || 0
  const pos = scrub ?? currentTime
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const idx = queue.findIndex(t => t.id === nowPlaying.id)
  const upNext = idx >= 0 ? queue.slice(idx + 1) : []
  const artist = nowPlaying.profiles?.name || ''

  const toggleSave = async () => {
    if (!currentUser?.id) { addToast('Sign in to save tracks', 'info'); return }
    const next = !saved
    setSaved(next)
    const { error } = next
      ? await supabase.from('saved_tracks').insert({ user_id: currentUser.id, track_id: nowPlaying.id, saved_at: new Date().toISOString() })
      : await supabase.from('saved_tracks').delete().eq('user_id', currentUser.id).eq('track_id', nowPlaying.id)
    if (error) { setSaved(!next); addToast('Could not update your library', 'error') }
  }
  const share = async () => {
    const url = shareLinkFor('track', nowPlaying.id)
    try {
      if (navigator.share) await navigator.share({ title: nowPlaying.title, text: `${nowPlaying.title}${artist ? ' — ' + artist : ''} on Tunez9ja`, url })
      else { await navigator.clipboard.writeText(url); addToast('Link copied', 'success') }
    } catch { /* cancelled */ }
  }

  // Swipe down (on the top part) to close
  const onTouchStart = (e) => { if (!showQueue) touchStart.current = e.touches[0].clientY }
  const onTouchMove = (e) => {
    if (touchStart.current == null) return
    const dy = e.touches[0].clientY - touchStart.current
    setDragY(dy > 0 ? dy : 0)
  }
  const onTouchEnd = () => {
    if (touchStart.current == null) return
    touchStart.current = null
    if (dragY > 120) close()
    else setDragY(0)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Now playing"
      style={{
        position: 'fixed', inset: 0, zIndex: 1150, background: '#0b0b0b', overflow: 'hidden',
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragY ? 'none' : 'transform .25s ease',
        animation: 't9FullUp .28s cubic-bezier(.2,.8,.2,1)',
        color: '#fff',
      }}>
      {/* Blurred artwork backdrop */}
      {nowPlaying.cover_url && (
        <img src={nowPlaying.cover_url} alt="" aria-hidden
          style={{ position: 'absolute', inset: '-20%', width: '140%', height: '140%', objectFit: 'cover', filter: 'blur(60px) saturate(1.4)', opacity: 0.55 }} />
      )}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,11,11,0.25) 0%, rgba(11,11,11,0.75) 55%, #0b0b0b 100%)' }} />

      <div style={{
        position: 'relative', height: '100%', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 22px calc(env(safe-area-inset-bottom, 0px) + 18px)',
      }}>
        {/* Header (also the swipe-down handle) */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 52 }}>
          <button type="button" onClick={close} aria-label="Close player" style={iconBtn}><ChevronDown size={28} /></button>
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.65)' }}>NOW PLAYING</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {queue.length > 1 ? `Queue · ${queue.length} songs` : 'Single'}{shuffle ? ' · Shuffle' : ''}{repeat === 'all' ? ' · Repeat' : repeat === 'one' ? ' · Repeat one' : ''}
            </div>
          </div>
          <TrackMenu track={nowPlaying} currentUser={currentUser} size={22} style={{ ...iconBtn, color: '#fff' }} />
        </div>

        {/* Artwork */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
          <div style={{
            width: 'min(84vw, 380px, 42vh)', aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
            background: 'rgba(255,255,255,0.06)', boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            transform: isPlaying ? 'scale(1)' : 'scale(0.9)', transition: 'transform .35s cubic-bezier(.2,.8,.2,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {nowPlaying.cover_url
              ? <img src={nowPlaying.cover_url} alt={nowPlaying.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Music size={72} style={{ opacity: 0.3 }} />}
          </div>
        </div>

        {/* Title / artist / like */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 7vw, 32px)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
              {nowPlaying.title}
            </div>
            <button type="button" disabled={!nowPlaying.artist_id}
              onClick={() => { if (nowPlaying.artist_id) { close(); setTimeout(() => openItem('profile', nowPlaying.artist_id), 50) } }}
              style={{ background: 'none', border: 'none', padding: '2px 0', color: 'rgba(255,255,255,0.72)', fontSize: 15, cursor: nowPlaying.artist_id ? 'pointer' : 'default', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              {artist}
              {isDownloaded(nowPlaying.id) && <CheckCircle2 size={14} color="#00c864" aria-label="Downloaded" />}
            </button>
          </div>
          <button type="button" onClick={toggleSave} aria-label={saved ? 'Remove from library' : 'Save to library'} aria-pressed={saved}
            style={{ ...iconBtn, color: saved ? 'var(--red)' : '#fff' }}>
            <Heart size={26} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', left: 0, width: pct + '%', height: 4, borderRadius: 2, background: '#fff' }} />
            <div style={{ position: 'absolute', left: `calc(${pct}% - 7px)`, width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.5)' }} />
            <input type="range" min={0} max={dur || 1} step={0.1} value={pos} aria-label="Seek"
              onChange={e => setScrub(parseFloat(e.target.value))}
              onPointerUp={() => { if (scrub != null) { seekTo(scrub); setScrub(null) } }}
              onKeyUp={() => { if (scrub != null) { seekTo(scrub); setScrub(null) } }}
              onTouchEnd={() => { if (scrub != null) { seekTo(scrub); setScrub(null) } }}
              style={{ position: 'absolute', inset: 0, width: '100%', margin: 0, opacity: 0, cursor: 'pointer', touchAction: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
            <span>{fmt(pos)}</span><span>-{fmt(Math.max(0, dur - pos))}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 6px' }}>
          <button type="button" onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffle}
            style={{ ...iconBtn, color: shuffle ? 'var(--red)' : 'rgba(255,255,255,0.8)' }}><Shuffle size={22} /></button>
          <button type="button" onClick={skipPrev} aria-label="Previous" style={{ ...iconBtn, color: '#fff' }}><SkipBack size={34} fill="currentColor" /></button>
          <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ width: 76, height: 76, borderRadius: '50%', border: 'none', background: '#fff', color: '#0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.45)', flexShrink: 0 }}>
            {isPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" style={{ marginLeft: 4 }} />}
          </button>
          <button type="button" onClick={skipNext} aria-label="Next" style={{ ...iconBtn, color: '#fff' }}><SkipForward size={34} fill="currentColor" /></button>
          <button type="button" onClick={cycleRepeat}
            aria-label={repeat === 'none' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one'} aria-pressed={repeat !== 'none'}
            style={{ ...iconBtn, color: repeat !== 'none' ? 'var(--red)' : 'rgba(255,255,255,0.8)' }}><RepeatIcon size={22} /></button>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <button type="button" onClick={() => setShowQueue(true)} aria-label="Now playing queue"
            style={{ ...pillBtn }}>
            <ListMusic size={18} /> Now playing{upNext.length ? ` · ${upNext.length} next` : ''}
          </button>
          <div className="fullplayer-volume" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} style={{ ...iconBtn, color: 'rgba(255,255,255,0.8)' }}>
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume} aria-label="Volume"
              onChange={e => changeVolume(parseFloat(e.target.value))} style={{ width: 110, accentColor: '#fff' }} />
          </div>
          <button type="button" onClick={share} aria-label="Share" style={{ ...iconBtn, color: 'rgba(255,255,255,0.85)', marginLeft: 'auto' }}><Share2 size={20} /></button>
        </div>
      </div>

      {showQueue && (
        <UpNext onClose={closeQueue} />
      )}

      <style>{`
        @keyframes t9FullUp { from { transform: translateY(100%) } to { transform: none } }
        @keyframes t9QueueUp { from { transform: translateY(100%) } to { transform: none } }
        /* Phones have hardware volume buttons — hide the slider there */
        @media (hover: none) and (pointer: coarse) { .fullplayer-volume { visibility: hidden; } }
      `}</style>
    </div>
  )
}

const QueueRow = React.memo(function QueueRow({ t, current, isPlaying, onPlay, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <button type="button" onClick={() => !current && onPlay(t)} aria-label={current ? 'Now playing' : `Play ${t.title}`}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: current ? 'default' : 'pointer' }}>
        <div style={{ width: 46, height: 46, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {t.cover_url ? <img src={t.cover_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Music size={18} style={{ opacity: 0.4 }} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: current ? 'var(--red)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current && isPlaying ? '▶ ' : ''}{t.title}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.profiles?.name || ''}</div>
        </div>
      </button>
      {!current && (
        <button type="button" onClick={() => onRemove(t.id)} aria-label={`Remove ${t.title} from queue`}
          style={{ ...iconBtn, color: 'rgba(255,255,255,0.55)' }}><X size={18} /></button>
      )}
    </div>
  )
})

// Memoised: the full player redraws every tick (progress), this list must not
const UpNext = React.memo(function UpNext({ onClose }) {
  const { nowPlaying, isPlaying, queue, playTrack, removeFromQueue } = usePlayer()
  const idx = queue.findIndex(t => t.id === nowPlaying?.id)
  const upNext = idx >= 0 ? queue.slice(idx + 1) : queue
  const earlier = idx > 0 ? queue.slice(0, idx) : []
  const onPlay = React.useCallback((t) => playTrack(t, queue), [playTrack, queue])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div role="dialog" aria-label="Now playing queue" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '78%', maxWidth: 520, margin: '0 auto',
        background: '#141414', borderRadius: '18px 18px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', animation: 't9QueueUp .22s ease-out',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 10px 6px 20px' }}>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 0.5 }}>NOW PLAYING</div>
          <button type="button" onClick={onClose} aria-label="Close queue" style={{ ...iconBtn, color: '#fff' }}><ChevronDown size={24} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 20px' }}>
          <div style={sectionLabel}>Now playing</div>
          {nowPlaying && <QueueRow t={nowPlaying} current isPlaying={isPlaying} onPlay={onPlay} onRemove={removeFromQueue} />}
          <div style={sectionLabel}>{upNext.length ? `Next in queue · ${upNext.length}` : 'Next in queue'}</div>
          {upNext.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, padding: '6px 0 12px' }}>Nothing queued. Use ⋮ → Add to queue on any track.</div>
            : upNext.map(t => <QueueRow key={t.id} t={t} onPlay={onPlay} onRemove={removeFromQueue} />)}
          {earlier.length > 0 && (
            <>
              <div style={sectionLabel}>Played earlier</div>
              {earlier.map(t => <QueueRow key={t.id} t={t} onPlay={onPlay} onRemove={removeFromQueue} />)}
            </>
          )}
        </div>
      </div>
    </div>
  )
})

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
  minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, flexShrink: 0, padding: 0,
}
const pillBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 14px', borderRadius: 20,
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
}
const sectionLabel = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '14px 0 4px' }
