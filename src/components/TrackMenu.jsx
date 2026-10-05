// src/components/TrackMenu.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The "⋮" menu on every track: Play next · Add to queue · Add to playlist ·
// Save to library · Download for offline · Go to track · Go to artist · Share.
//
// Rendered in a portal at <body> level so no parent (cards with overflow,
// the blurred navbar…) can clip it. Phones get a bottom sheet with large
// touch rows; desktop gets a popover anchored to the button.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  MoreVertical, Plus, ListPlus, ListEnd, ListMusic, Heart, Download, CheckCircle2,
  Disc3, User, Share2, ChevronLeft, X, Loader2, Lock,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { openItem, shareLinkFor } from '../lib/urlState.js'
import { isUnlocked } from '../lib/tunez.js'
import {
  useDownloads, downloadTrack, removeDownload, cancelDownload, canDownload, isDownloadSupported, formatBytes,
} from '../lib/downloads.js'

const MOBILE_MAX = 640

export default function TrackMenu({ track, currentUser, trigger = 'dots', size = 18, style }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('main')           // 'main' | 'playlists'
  const [pos, setPos] = useState(null)                // desktop popover position
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_MAX)
  const btnRef = useRef(null)
  const sheetRef = useRef(null)

  // Desktop popover sits under the button (or above it near the bottom of
  // the screen). Returns false if the button has scrolled out of view.
  const placePopover = () => {
    if (!btnRef.current) return false
    const r = btnRef.current.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return false
    const W = 280, H = 430
    const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8)
    const below = r.bottom + 6 + H <= window.innerHeight
    setPos({ left, top: below ? r.bottom + 6 : Math.max(8, r.top - H - 6) })
    return true
  }

  const openMenu = (e, startView = 'main') => {
    e.stopPropagation()
    e.preventDefault()
    const mobile = window.innerWidth < MOBILE_MAX
    setIsMobile(mobile)
    if (!mobile) placePopover()
    setView(startView)
    setOpen(true)
  }
  const close = () => setOpen(false)

  // Close on Escape / outside tap; stop page scroll behind the mobile sheet
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    const onDown = (e) => {
      if (sheetRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    const prev = document.body.style.overflow
    if (isMobile) document.body.style.overflow = 'hidden'
    // Phone: rotating/resizing closes the sheet. Desktop: the popover follows
    // its button while scrolling and closes once the button leaves the screen.
    const onResize = () => close()
    const onScroll = () => { if (!placePopover()) close() }
    window.addEventListener('resize', onResize)
    if (!isMobile) window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      document.body.style.overflow = prev
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [open, isMobile])

  if (!track) return null

  const Icon = trigger === 'plus' ? Plus : MoreVertical
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={trigger === 'plus' ? `Add ${track.title} to playlist` : `More options for ${track.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => openMenu(e, trigger === 'plus' ? 'playlists' : 'main')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-500)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 36, minHeight: 36, padding: 6, borderRadius: 8, flexShrink: 0,
          ...style,
        }}
      >
        <Icon size={size} />
      </button>
      {open && createPortal(
        <MenuPanel
          track={track} currentUser={currentUser} view={view} setView={setView}
          isMobile={isMobile} pos={pos} sheetRef={sheetRef} onClose={close}
        />,
        document.body,
      )}
    </>
  )
}

function MenuPanel({ track, currentUser, view, setView, isMobile, pos, sheetRef, onClose }) {
  const { addToPlayNext, addToQueue } = usePlayer()
  const { addToast } = useApp()
  const { isDownloaded, progress } = useDownloads()
  const [saved, setSaved] = useState(null)
  const [unlocked, setUnlocked] = useState(!track.is_premium)
  const dl = progress(track.id)
  const downloaded = isDownloaded(track.id)
  const artistName = track.profiles?.name || track.artist_name || ''

  useEffect(() => {
    if (!currentUser?.id) return
    supabase.from('saved_tracks').select('id').eq('user_id', currentUser.id).eq('track_id', track.id).maybeSingle()
      .then(({ data }) => setSaved(!!data)).catch(() => {})
    if (track.is_premium && track.artist_id !== currentUser.id) {
      isUnlocked(currentUser.id, track.id).then(setUnlocked).catch(() => {})
    } else setUnlocked(true)
  }, [currentUser?.id, track.id])

  const requireLogin = (what) => {
    if (currentUser?.id) return true
    addToast(`Sign in to ${what}`, 'info')
    onClose()
    return false
  }

  const act = (fn) => () => { fn(); }
  const playNext = () => {
    if (track.is_premium && !unlocked) { addToast('Unlock this track to play it', 'info'); return }
    if (addToPlayNext(track) !== false) addToast('Playing next', 'success')
    onClose()
  }
  const queue = () => {
    if (track.is_premium && !unlocked) { addToast('Unlock this track to play it', 'info'); return }
    if (addToQueue(track) !== false) addToast('Added to queue', 'success')
    onClose()
  }
  const toggleSave = async () => {
    if (!requireLogin('save tracks')) return
    const next = !saved
    setSaved(next)
    const { error } = next
      ? await supabase.from('saved_tracks').insert({ user_id: currentUser.id, track_id: track.id, saved_at: new Date().toISOString() })
      : await supabase.from('saved_tracks').delete().eq('user_id', currentUser.id).eq('track_id', track.id)
    if (error) { setSaved(!next); addToast('Could not update your library', 'error'); return }
    addToast(next ? 'Saved to your library' : 'Removed from your library', 'success')
  }
  const download = async () => {
    if (dl) { cancelDownload(track.id); return }
    if (downloaded) {
      await removeDownload(track.id)
      addToast('Download removed', 'success')
      return
    }
    if (!canDownload(track, { unlocked, userId: currentUser?.id })) {
      addToast('Unlock this premium track to download it', 'info'); return
    }
    try {
      addToast('Downloading for offline…', 'info')
      await downloadTrack(track)
      addToast(`Downloaded “${track.title}” — plays offline`, 'success')
    } catch (err) {
      addToast(err.message || 'Download failed', 'error')
    }
  }
  const share = async () => {
    const url = shareLinkFor('track', track.id)
    try {
      if (navigator.share) await navigator.share({ title: track.title, text: `${track.title}${artistName ? ' — ' + artistName : ''} on Tunez9ja`, url })
      else { await navigator.clipboard.writeText(url); addToast('Link copied', 'success') }
    } catch { /* cancelled */ }
    onClose()
  }

  const pct = dl?.total ? Math.round((dl.received / dl.total) * 100) : null
  const downloadLabel = dl ? (pct != null ? `Downloading… ${pct}% · tap to cancel` : 'Downloading… · tap to cancel')
    : downloaded ? 'Downloaded · remove download'
    : (!unlocked ? 'Unlock to download' : 'Download for offline')
  const DownloadIcon = dl ? Loader2 : downloaded ? CheckCircle2 : (!unlocked ? Lock : Download)

  const panelStyle = isMobile ? {
    position: 'fixed', left: 0, right: 0, bottom: 0,
    maxHeight: '85dvh', overflowY: 'auto',
    background: 'var(--bg-card, #161616)', borderTop: '1px solid var(--border, #2a2a2a)',
    borderRadius: '18px 18px 0 0',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
    animation: 't9SheetUp .2s ease-out', zIndex: 2,
  } : {
    position: 'fixed', left: pos?.left ?? 8, top: pos?.top ?? 8, width: 280, maxHeight: 440, overflowY: 'auto',
    background: 'var(--bg-card, #161616)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 12,
    boxShadow: '0 16px 48px rgba(0,0,0,0.55)', zIndex: 2, animation: 't9Pop .12s ease-out',
  }

  return (
    // React passes portal events up to the TrackMenu's parents (often a
    // clickable track row) — stop them here so menu taps never start playback.
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, pointerEvents: isMobile ? 'auto' : 'none' }}
      onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
      {isMobile && <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />}
      <div ref={sheetRef} role="menu" aria-label={`Options for ${track.title}`} style={{ ...panelStyle, pointerEvents: 'auto' }}
        onClick={e => e.stopPropagation()}>
        {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--grey-700, #444)', margin: '10px auto 2px' }} />}

        {/* Track header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '12px 18px' : '12px 14px', borderBottom: '1px solid var(--border, #2a2a2a)' }}>
          {view === 'playlists' && (
            <button type="button" onClick={() => setView('main')} aria-label="Back"
              style={{ ...iconBtn, marginLeft: -6 }}><ChevronLeft size={20} /></button>
          )}
          <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-surface, #222)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {track.cover_url ? <img src={track.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ListMusic size={18} color="var(--grey-500)" />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white, #fff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {view === 'playlists' ? 'Add to playlist' : track.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-500, #888)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {view === 'playlists' ? track.title : artistName}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={iconBtn}><X size={18} /></button>
        </div>

        {view === 'main' ? (
          <div style={{ padding: '6px 0' }}>
            <Row icon={ListPlus} label="Play next" onClick={playNext} big={isMobile} />
            <Row icon={ListEnd} label="Add to queue" onClick={queue} big={isMobile} />
            <Row icon={Plus} label="Add to playlist" onClick={() => { if (requireLogin('add to playlists')) setView('playlists') }} big={isMobile} />
            <Row icon={Heart} label={saved ? 'Remove from library' : 'Save to library'} onClick={toggleSave} big={isMobile} active={saved} />
            {isDownloadSupported() && (
              <Row icon={DownloadIcon} label={downloadLabel} onClick={download} big={isMobile}
                active={downloaded} spin={!!dl} progress={pct} />
            )}
            <div style={{ height: 1, background: 'var(--border, #2a2a2a)', margin: '6px 0' }} />
            <Row icon={Disc3} label="Go to track" onClick={() => { openItem('track', track.id, track); onClose() }} big={isMobile} />
            {track.artist_id && <Row icon={User} label="Go to artist" onClick={() => { openItem('profile', track.artist_id); onClose() }} big={isMobile} />}
            <Row icon={Share2} label="Share" onClick={share} big={isMobile} />
          </div>
        ) : (
          <PlaylistPicker track={track} currentUser={currentUser} big={isMobile} onDone={onClose} />
        )}
      </div>
      <style>{`
        @keyframes t9SheetUp { from { transform: translateY(100%) } to { transform: none } }
        @keyframes t9Pop { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
        @keyframes t9Spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

function PlaylistPicker({ track, currentUser, big, onDone }) {
  const { addToast } = useApp()
  const [playlists, setPlaylists] = useState(null)
  const [busy, setBusy] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!currentUser?.id) { setPlaylists([]); return }
    supabase.from('playlists').select('id, name').eq('user_id', currentUser.id).order('created_at', { ascending: false })
      .then(({ data }) => setPlaylists(data || [])).catch(() => setPlaylists([]))
  }, [currentUser?.id])

  const addTo = async (pl) => {
    setBusy(pl.id)
    const { data: existing } = await supabase.from('playlist_tracks').select('id').eq('playlist_id', pl.id).eq('track_id', track.id).maybeSingle()
    if (existing) { setBusy(null); addToast(`Already in “${pl.name}”`, 'info'); onDone(); return }
    const { count } = await supabase.from('playlist_tracks').select('id', { count: 'exact', head: true }).eq('playlist_id', pl.id)
    const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: pl.id, track_id: track.id, position: (count || 0) + 1 })
    setBusy(null)
    if (error) { addToast('Could not add to playlist', 'error'); return }
    addToast(`Added to “${pl.name}”`, 'success')
    onDone()
  }

  const create = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setBusy('new')
    const { data, error } = await supabase.from('playlists').insert({ user_id: currentUser.id, name: n.slice(0, 80) }).select('id, name').single()
    if (error || !data) { setBusy(null); addToast('Could not create playlist', 'error'); return }
    await addTo(data)
  }

  if (playlists === null) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--grey-500)' }}><Loader2 size={18} style={{ animation: 't9Spin 1s linear infinite' }} /></div>

  return (
    <div style={{ padding: '6px 0' }}>
      {creating ? (
        <form onSubmit={create} style={{ display: 'flex', gap: 8, padding: big ? '10px 18px' : '8px 14px' }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Playlist name" maxLength={80}
            style={{ flex: 1, minWidth: 0, minHeight: 44, fontSize: 16, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border, #333)', background: 'var(--bg-surface, #1f1f1f)', color: 'var(--white, #fff)' }} />
          <button type="submit" disabled={!name.trim() || busy === 'new'}
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--red, #c8102e)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: name.trim() ? 1 : 0.5 }}>
            {busy === 'new' ? '…' : 'Create'}
          </button>
        </form>
      ) : (
        <Row icon={Plus} label="New playlist" onClick={() => setCreating(true)} big={big} accent />
      )}
      {playlists.length === 0 && !creating && (
        <div style={{ padding: big ? '6px 18px 14px' : '6px 14px 12px', fontSize: 13, color: 'var(--grey-500)' }}>You don't have any playlists yet.</div>
      )}
      {playlists.map(pl => (
        <Row key={pl.id} icon={busy === pl.id ? Loader2 : ListMusic} spin={busy === pl.id} label={pl.name} onClick={() => !busy && addTo(pl)} big={big} />
      ))}
    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', color: 'var(--grey-300, #bbb)', cursor: 'pointer',
  minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, flexShrink: 0,
}

function Row({ icon: Icon, label, onClick, big, active, accent, spin, progress }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      style={{
        position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 16,
        padding: big ? '0 20px' : '0 14px', minHeight: big ? 52 : 42,
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        color: accent ? 'var(--red, #c8102e)' : active ? 'var(--white, #fff)' : 'var(--grey-200, #ddd)',
        fontSize: big ? 15 : 14, fontWeight: accent ? 700 : 500, overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.06))' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
    >
      {progress != null && (
        <span aria-hidden style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${progress}%`, background: 'var(--red, #c8102e)', transition: 'width .2s' }} />
      )}
      <Icon size={20} style={{ flexShrink: 0, color: active ? 'var(--red, #c8102e)' : undefined, animation: spin ? 't9Spin 1s linear infinite' : undefined }}
        fill={active && Icon === Heart ? 'currentColor' : 'none'} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}
