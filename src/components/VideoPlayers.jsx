// src/components/VideoPlayers.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Video playback that keeps going when you leave the app.
//
//  UploadedVideo — our own video files:
//    • Picture-in-Picture button (floats over other apps, keeps playing)
//    • Floats automatically when the app is minimised, where the browser
//      allows it (Chrome/Android & Safari support this to different degrees)
//    • Lock-screen / notification controls via the Media Session API
//    • Plays inline on iPhone (no forced fullscreen)
//
//  YouTubeEmbed — YouTube links:
//    • Desktop Chrome/Edge: "Pop out" opens the video in an always-on-top
//      window (Document Picture-in-Picture) at the same second, and returns it
//      to the page when that window closes.
//    • Phones: YouTube itself pauses embedded videos in the background
//      (background play is a YouTube Premium feature) — we can't change that.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react'
import { PictureInPicture2, ExternalLink } from 'lucide-react'

const pipSupported = (v) => !!v && (
  (document.pictureInPictureEnabled && !v.disablePictureInPicture) ||
  typeof v.webkitSetPresentationMode === 'function'
)

async function enterPip(v) {
  if (!v) return false
  try {
    if (document.pictureInPictureEnabled && v.requestPictureInPicture) {
      if (document.pictureInPictureElement !== v) await v.requestPictureInPicture()
      return true
    }
    if (typeof v.webkitSetPresentationMode === 'function') {       // Safari / iPhone
      v.webkitSetPresentationMode('picture-in-picture')
      return true
    }
  } catch { /* needs a tap, or not allowed right now */ }
  return false
}

export function UploadedVideo({ src, poster, title = '', artist = '', autoPlay = true, muted = false, style }) {
  const ref = useRef(null)
  const [canPip, setCanPip] = useState(false)
  const [inPip, setInPip] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    setCanPip(pipSupported(v))
    // Chrome: float automatically when the user leaves (installed apps / supported cases)
    try { v.autoPictureInPicture = true } catch { /* ignore */ }
    const onEnter = () => setInPip(true), onLeave = () => setInPip(false)
    v.addEventListener('enterpictureinpicture', onEnter)
    v.addEventListener('leavepictureinpicture', onLeave)
    const onMode = () => setInPip(v.webkitPresentationMode === 'picture-in-picture')
    v.addEventListener('webkitpresentationmodechanged', onMode)

    // Leaving the app while the video plays → try to float it.
    // If the browser refuses (needs a tap), the sound keeps playing and the
    // lock-screen controls stay available.
    const onHide = () => { if (document.hidden && !v.paused && !v.ended) enterPip(v) }
    document.addEventListener('visibilitychange', onHide)

    // Lock-screen / notification controls for the video
    const onPlay = () => {
      if (!('mediaSession' in navigator)) return
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || 'Video', artist: artist || 'Tunez9ja', album: 'Tunez9ja Videos',
          artwork: poster ? [{ src: poster, sizes: '512x512' }] : [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
        })
        navigator.mediaSession.setActionHandler('play', () => v.play())
        navigator.mediaSession.setActionHandler('pause', () => v.pause())
        navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime != null) v.currentTime = d.seekTime })
      } catch { /* ignore */ }
    }
    v.addEventListener('play', onPlay)
    return () => {
      v.removeEventListener('enterpictureinpicture', onEnter)
      v.removeEventListener('leavepictureinpicture', onLeave)
      v.removeEventListener('webkitpresentationmodechanged', onMode)
      v.removeEventListener('play', onPlay)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [src, title, artist, poster])

  return (
    <div style={{ position: 'relative', background: '#000', ...style }}>
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        controls
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        autopictureinpicture="true"
        preload="metadata"
        style={{ display: 'block', width: '100%', height: '100%', maxHeight: 520, background: '#000' }}
      />
      {canPip && (
        <button type="button" onClick={() => {
          const v = ref.current
          if (inPip) { try { document.exitPictureInPicture?.() } catch { /* ignore */ } if (v?.webkitSetPresentationMode) v.webkitSetPresentationMode('inline') }
          else enterPip(v)
        }}
          aria-label={inPip ? 'Return video to page' : 'Play in a floating window'}
          title={inPip ? 'Return to page' : 'Float video (keeps playing in other apps)'}
          style={{ position: 'absolute', top: 10, right: 10, minHeight: 36, padding: '0 12px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>
          <PictureInPicture2 size={15} /> {inPip ? 'Back to page' : 'Float'}
        </button>
      )}
    </div>
  )
}

// ── YouTube ──────────────────────────────────────────────────────────────────
export function YouTubeEmbed({ ytId, title = '', autoplay = true, muted = false, style }) {
  const frameRef = useRef(null)
  const timeRef = useRef(0)
  const [popped, setPopped] = useState(null)        // the pop-out window, if open
  const docPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const src = `https://www.youtube.com/embed/${ytId}?autoplay=${autoplay ? 1 : 0}&rel=0&playsinline=1&enablejsapi=1&mute=${muted ? 1 : 0}&origin=${encodeURIComponent(origin)}`

  // Follow the playback position (YouTube iframe API messages) so the
  // pop-out can continue from the same second
  useEffect(() => {
    const onMsg = (e) => {
      try {
        if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        const t = d?.info?.currentTime
        if (typeof t === 'number' && e.source === frameRef.current?.contentWindow) timeRef.current = t
      } catch { /* not ours */ }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])
  const command = (win, func, args = []) => {
    try { win?.postMessage(JSON.stringify({ event: 'command', func, args }), '*') } catch { /* ignore */ }
  }
  const startListening = () => {
    try { frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: ytId }), '*') } catch { /* ignore */ }
  }

  const popOut = async () => {
    if (!docPip || popped) return
    const pip = await window.documentPictureInPicture.requestWindow({ width: 480, height: 270 })
    const start = Math.floor(timeRef.current || 0)
    command(frameRef.current?.contentWindow, 'pauseVideo')
    pip.document.body.style.cssText = 'margin:0;background:#000;overflow:hidden'
    pip.document.title = title || 'Tunez9ja video'
    const f = pip.document.createElement('iframe')
    f.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&start=${start}&origin=${encodeURIComponent(origin)}`
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    f.style.cssText = 'border:0;width:100vw;height:100vh'
    pip.document.body.appendChild(f)
    let pipTime = start
    pip.addEventListener('message', (e) => {
      try { const d = JSON.parse(e.data); if (typeof d?.info?.currentTime === 'number') pipTime = d.info.currentTime } catch { /* ignore */ }
    })
    f.addEventListener('load', () => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*') } catch { /* ignore */ } })
    // Window closed → continue in the page from where the pop-out reached
    pip.addEventListener('pagehide', () => {
      setPopped(null)
      command(frameRef.current?.contentWindow, 'seekTo', [Math.floor(pipTime), true])
      command(frameRef.current?.contentWindow, 'playVideo')
    })
    setPopped(pip)
  }

  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', ...style }}>
      <iframe
        ref={frameRef}
        src={src}
        onLoad={startListening}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        title={title}
      />
      {popped && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: 14 }}>
          Playing in a floating window
          <button type="button" onClick={() => popped.close()} style={{ minHeight: 36, padding: '0 14px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Bring it back</button>
        </div>
      )}
      {docPip && !popped && (
        <button type="button" onClick={popOut} aria-label="Pop out video" title="Pop out — keeps the video on top while you use other apps"
          style={{ position: 'absolute', top: 10, right: 10, minHeight: 36, padding: '0 12px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <ExternalLink size={14} /> Pop out
        </button>
      )}
    </div>
  )
}
