// src/components/PlayerShortcuts.jsx
// Keyboard shortcuts for the music player (desktop, and phones/tablets with a
// keyboard). Ignored while typing in a field, and when a modifier key is held
// (so browser shortcuts like Ctrl+R or Cmd+P keep working).
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext.jsx'

export const SHORTCUTS = [
  ['Space  /  K', 'Play / pause'],
  ['N', 'Next song'],
  ['P', 'Previous song'],
  ['→  /  ←', 'Forward / back 10 seconds'],
  ['↑  /  ↓', 'Volume up / down'],
  ['M', 'Mute / unmute'],
  ['S', 'Shuffle on / off'],
  ['R', 'Repeat: off → all → one'],
  ['F', 'Open / close full player'],
  ['Q', 'Now playing (queue)'],
  ['?', 'Show these shortcuts'],
]

const isTyping = (el) => {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function PlayerShortcuts({ onFull, onQueue, onHelp }) {
  const {
    nowPlaying, togglePlay, skipNext, skipPrev, seekTo, audioRef,
    volume, muted, changeVolume, toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer()

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      if (isTyping(e.target) || isTyping(document.activeElement)) return
      // A focused video/iframe gets its own keys (e.g. Space pauses the video)
      if (/VIDEO|AUDIO|IFRAME/.test(document.activeElement?.tagName || '')) return
      const k = e.key
      if (k === '?') { e.preventDefault(); onHelp?.(); return }
      if (!nowPlaying) return
      const a = audioRef.current
      const handled = () => e.preventDefault()
      switch (k) {
        case ' ': case 'k': case 'K':
          // Space on a focused button should still press that button
          if (k === ' ' && document.activeElement?.tagName === 'BUTTON') return
          handled(); togglePlay(); break
        case 'n': case 'N': handled(); skipNext(); break
        case 'p': case 'P': handled(); skipPrev(); break
        case 'ArrowRight':
          if (!a) return; handled(); seekTo(Math.min((a.duration || Infinity), a.currentTime + 10)); break
        case 'ArrowLeft':
          if (!a) return; handled(); seekTo(Math.max(0, a.currentTime - 10)); break
        case 'ArrowUp':   handled(); changeVolume(Math.min(1, (muted ? 0 : volume) + 0.1)); break
        case 'ArrowDown': handled(); changeVolume(Math.max(0, (muted ? 0 : volume) - 0.1)); break
        case 'm': case 'M': handled(); toggleMute(); break
        case 's': case 'S': handled(); toggleShuffle(); break
        case 'r': case 'R': handled(); cycleRepeat(); break
        case 'f': case 'F': handled(); onFull?.(); break
        case 'q': case 'Q': handled(); onQueue?.(); break
        default:
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nowPlaying, togglePlay, skipNext, skipPrev, seekTo, audioRef, volume, muted, changeVolume, toggleMute, toggleShuffle, cycleRepeat, onFull, onQueue, onHelp])

  return null
}

export function ShortcutHelp({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-label="Keyboard shortcuts" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--bg-card, #161616)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 0.5 }}>KEYBOARD SHORTCUTS</div>
          <button type="button" onClick={onClose} aria-label="Close shortcuts"
            style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border, #2a2a2a)' }}>
            <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 92, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-surface, #222)', border: '1px solid var(--border, #333)', color: 'var(--white, #fff)', textAlign: 'center' }}>{keys}</kbd>
            <span style={{ fontSize: 14, color: 'var(--grey-300, #bbb)' }}>{what}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}
