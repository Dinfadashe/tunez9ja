import { isDownloadedUrl, getDownloadedBlobUrl } from '../lib/downloads.js'
import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'

const PlayerContext = createContext(null)
// Playback position changes several times a second. It lives in its own
// context so only the player bar re-renders on every tick — not every page
// that shows a play button (that made lists flicker and drop taps).
const PlayerTimeContext = createContext({ currentTime: 0, duration: 0 })

export function PlayerProvider({ children }) {
  const lastBlobUrl = useRef(null)
  const [queue,       setQueue]      = useState([])
  const [queueIndex,  setQueueIndex] = useState(0)
  const [nowPlaying,  setNowPlaying] = useState(null)
  const [isPlaying,   setIsPlaying]  = useState(false)
  const [currentTime, setCurrentTime]= useState(0)
  const [duration,    setDuration]   = useState(0)
  const [volume,      setVolume]     = useState(1)
  const [muted,       setMuted]      = useState(false)
  const [audioError,  setAudioError] = useState(null) // { trackId, message } | null — surfaced to UI for a friendly offline notice instead of a silent failure
  const audioRef = useRef(null)
  // Does the listener want music playing? Lets us tell a pause the user made
  // apart from one the phone made (incoming call, another app's audio…).
  const wantPlayingRef = useRef(false)
  const interruptRef   = useRef(null)   // { at, wasHidden } while interrupted
  const lastDeviceChangeRef = useRef(0) // headphones/Bluetooth changes

  // ── Core: play a track ──────────────────────────────────────
  // ── Shuffle / repeat live here so EVERY way of moving between songs
  // (Next, Previous, song ending, lock screen, headphones, keyboard) uses them.
  const [shuffle, setShuffleState] = useState(false)
  const [repeat,  setRepeat]       = useState('none')     // none | all | one
  const originalOrderRef = useRef([])                     // queue order before shuffling
  const queueRef = useRef([]); queueRef.current = queue
  const nowRef   = useRef(null); nowRef.current = nowPlaying
  const shuffleRef = useRef(false); shuffleRef.current = shuffle
  const repeatRef  = useRef('none'); repeatRef.current = repeat
  // Premium tracks the listener hasn't unlocked are skipped (set by the player bar)
  const canPlayRef = useRef(() => true)
  const setCanPlay = useCallback((fn) => { canPlayRef.current = typeof fn === 'function' ? fn : () => true }, [])

  const shuffled = (arr) => {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a
  }

  // Load and play one track (shared by every action below)
  const startTrack = useCallback((track) => {
    if (!track?.audio_url) return false
    wantPlayingRef.current = true
    setNowPlaying(track)
    setIsPlaying(true)
    setCurrentTime(0)
    setAudioError(null)
    const a = audioRef.current
    if (a) {
      a.pause()
      a.preload = 'auto'
      a.src = track.audio_url
      a.currentTime = 0
      a.volume = volume
      a.muted  = muted
      const pp = a.play()
      if (pp !== undefined) {
        pp.catch(err => {
          if (!navigator.onLine) setAudioError({ trackId: track.id, message: "This track isn't available offline yet." })
          else console.warn('Autoplay blocked:', err.message)
          setIsPlaying(false)
        })
      }
    }
    return true
  }, [volume, muted])

  const playTrack = useCallback((track, trackList = []) => {
    if (!track?.audio_url) {
      console.error('❌ playTrack: no audio_url on track', track?.title, track)
      return
    }
    const list = trackList.length ? trackList : [track]
    originalOrderRef.current = list
    // Shuffle on: the chosen song plays first, the rest in random order
    const q = shuffleRef.current
      ? [track, ...shuffled(list.filter(t => t.id !== track.id))]
      : list
    const idx = q.findIndex(t => t.id === track.id)
    setQueue(q)
    setQueueIndex(idx >= 0 ? idx : 0)
    startTrack(track)
  }, [startTrack])

  // ── Next: follows shuffle (already applied to the queue order) and repeat
  //    auto = the song ended by itself (vs. the listener pressing Next)
  const skipNext = useCallback((opts) => {
    const auto = opts === true || opts?.auto === true
    const q = queueRef.current
    if (!q.length) return
    const cur = Math.max(-1, q.findIndex(t => t.id === nowRef.current?.id))
    for (let step = 1; step <= q.length; step++) {
      let i = cur + step
      if (i >= q.length) {
        // End of the queue: wrap only with Repeat all (or when Next is pressed)
        if (repeatRef.current !== 'all' && auto) {
          wantPlayingRef.current = false
          setIsPlaying(false)
          return
        }
        i = i % q.length
        // Repeat all + shuffle: a fresh random order for the next round
        if (shuffleRef.current && i === 0 && q.length > 2) {
          const now = nowRef.current
          const rest = shuffled(q.filter(t => t.id !== now?.id))
          const nq = [...rest, now].filter(Boolean)
          setQueue(nq); queueRef.current = nq
          const first = nq.find(t => canPlayRef.current(t) && t.audio_url)
          if (first) { setQueueIndex(nq.indexOf(first)); startTrack(first) }
          return
        }
      }
      const t = q[i]
      if (t && t.audio_url && canPlayRef.current(t)) {
        setQueueIndex(i)
        startTrack(t)
        return
      }
    }
  }, [startTrack])

  // ── Previous: restart if >3s in, else the previous song ─────
  const skipPrev = useCallback(() => {
    const a = audioRef.current
    if (a && a.currentTime > 3) { a.currentTime = 0; return }
    const q = queueRef.current
    if (!q.length) return
    const cur = q.findIndex(t => t.id === nowRef.current?.id)
    for (let step = 1; step <= q.length; step++) {
      let i = cur - step
      if (i < 0) {
        if (repeatRef.current !== 'all') { if (a) a.currentTime = 0; return }
        i = (i + q.length) % q.length
      }
      const t = q[i]
      if (t && t.audio_url && canPlayRef.current(t)) { setQueueIndex(i); startTrack(t); return }
    }
  }, [startTrack])

  // ── Shuffle on/off: reorders what's coming up (so Up next is accurate) ──
  const setShuffle = useCallback((v) => {
    const on = typeof v === 'function' ? v(shuffleRef.current) : !!v
    if (on === shuffleRef.current) return
    const q = queueRef.current, now = nowRef.current
    const cur = q.findIndex(t => t.id === now?.id)
    if (on) {
      originalOrderRef.current = q
      const nq = cur >= 0 ? [...q.slice(0, cur + 1), ...shuffled(q.slice(cur + 1))] : shuffled(q)
      setQueue(nq); queueRef.current = nq
    } else {
      const orig = originalOrderRef.current
      if (orig.length && (!now || orig.some(t => t.id === now.id))) {
        // keep songs added while shuffled
        const extra = q.filter(t => !orig.some(o => o.id === t.id))
        const nq = [...orig, ...extra]
        setQueue(nq); queueRef.current = nq
        setQueueIndex(Math.max(0, nq.findIndex(t => t.id === now?.id)))
      }
    }
    setShuffleState(on)
  }, [])
  const toggleShuffle = useCallback(() => setShuffle(s => !s), [setShuffle])
  const cycleRepeat = useCallback(() => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'), [])

  // ── Toggle play/pause ───────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      wantPlayingRef.current = false
      interruptRef.current = null
      audioRef.current.pause()
    } else {
      wantPlayingRef.current = true
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Autoplay blocked by browser - user needs to click play button
          console.warn('Autoplay blocked:', err.message)
          setIsPlaying(false) // Show play button so user can click manually
        })
      }
    }
  }, [isPlaying])

  // ── Stop ────────────────────────────────────────────────────
  const stopPlayer = useCallback(() => {
    wantPlayingRef.current = false
    interruptRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      // removeAttribute + load() empties the player cleanly; setting src=''
      // makes the browser try to load the page URL and fire a false error
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    setNowPlaying(null)
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  // ── Seek ────────────────────────────────────────────────────
  const seekTo = useCallback((seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
    }
  }, [])

  // ── Volume ──────────────────────────────────────────────────
  const changeVolume = useCallback((v) => {
    const val = Math.max(0, Math.min(1, v))
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val
    if (val > 0 && muted) {
      setMuted(false)
      if (audioRef.current) audioRef.current.muted = false
    }
  }, [muted])

  const toggleMute = useCallback(() => {
    const newMuted = !muted
    setMuted(newMuted)
    if (audioRef.current) audioRef.current.muted = newMuted
  }, [muted])

  // ── Queue: play next / add to queue (Spotify-style) ────────
  // The queue never holds the same track twice (skip looks tracks up by id),
  // and with nothing playing either action simply starts the track.
  const insertIntoQueue = useCallback((track, where) => {
    if (!track?.audio_url) return false
    if (!nowPlaying) { playTrack(track, [track]); return true }
    if (track.id === nowPlaying.id) return false
    setQueue(q => {
      const rest = q.filter(t => t.id !== track.id)
      let cur = rest.findIndex(t => t.id === nowPlaying.id)
      if (cur < 0) { rest.unshift(nowPlaying); cur = 0 }
      if (where === 'next') rest.splice(cur + 1, 0, track)
      else rest.push(track)
      originalOrderRef.current = [...originalOrderRef.current.filter(t => t.id !== track.id), track]
      setQueueIndex(cur)
      return rest
    })
    return true
  }, [nowPlaying, playTrack])

  const removeFromQueue = useCallback((trackId) => {
    if (!trackId || trackId === nowPlaying?.id) return
    originalOrderRef.current = originalOrderRef.current.filter(t => t.id !== trackId)
    setQueue(q => {
      const rest = q.filter(t => t.id !== trackId)
      setQueueIndex(Math.max(0, rest.findIndex(t => t.id === nowPlaying?.id)))
      return rest
    })
  }, [nowPlaying])

  const addToPlayNext = useCallback((track) => insertIntoQueue(track, 'next'), [insertIntoQueue])
  const addToQueue    = useCallback((track) => insertIntoQueue(track, 'end'),  [insertIntoQueue])

  // ── Media Session API (lock screen / notification / headphones) ──
  useEffect(() => {
    if (!('mediaSession' in navigator) || !nowPlaying) return
    const ms = navigator.mediaSession
    const art = nowPlaying.cover_url
      ? ['96x96', '192x192', '512x512'].map(sizes => ({ src: nowPlaying.cover_url, sizes }))
      : [{ src: '/logo.png', sizes: '512x512', type: 'image/png' }]
    ms.metadata = new MediaMetadata({
      title:  nowPlaying.title || 'Unknown',
      artist: nowPlaying.profiles?.name || '',
      album:  'Tunez9ja',
      artwork: art,
    })
    const set = (action, fn) => { try { ms.setActionHandler(action, fn) } catch { /* unsupported */ } }
    set('play', () => {
      wantPlayingRef.current = true
      audioRef.current?.play().catch(() => setIsPlaying(false))
    })
    set('pause', () => {
      wantPlayingRef.current = false
      interruptRef.current = null
      audioRef.current?.pause()
    })
    set('nexttrack', () => skipNext())
    set('previoustrack', skipPrev)
    set('seekto', (d) => { if (audioRef.current && d.seekTime != null) audioRef.current.currentTime = d.seekTime })
    set('seekbackward', (d) => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (d.seekOffset || 10)) })
    set('seekforward', (d) => { if (audioRef.current) audioRef.current.currentTime = audioRef.current.currentTime + (d.seekOffset || 10) })
    set('stop', () => { wantPlayingRef.current = false; interruptRef.current = null; audioRef.current?.pause() })
  }, [nowPlaying, skipNext, skipPrev])

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = nowPlaying ? (isPlaying ? 'playing' : 'paused') : 'none'
  }, [isPlaying, nowPlaying])

  // Lock-screen progress bar (once a second is plenty)
  const wholeSecond = Math.floor(currentTime)
  useEffect(() => {
    try {
      if (navigator.mediaSession?.setPositionState && duration > 0 && Number.isFinite(duration)) {
        navigator.mediaSession.setPositionState({ duration, position: Math.min(currentTime, duration), playbackRate: 1 })
      }
    } catch { /* ignore */ }
  }, [wholeSecond, duration])

  // ── Keep playing after interruptions (calls, other apps, network drops) ──
  // Browsers pause the <audio> for a phone call but never resume afterwards.
  // If the pause wasn't the listener's, retry quietly until playback is
  // possible again: on returning to the app, when the network comes back,
  // and every few seconds while the app is in the background.
  useEffect(() => {
    // iOS/iPadOS: declare this as a music player (better background behaviour)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback' } catch { /* ignore */ }

    const tryResume = (reason) => {
      const a = audioRef.current, it = interruptRef.current
      if (!a || !it || !wantPlayingRef.current || !a.getAttribute('src')) return
      if (Date.now() - it.at > 30 * 60 * 1000) { interruptRef.current = null; return }   // give up after 30 min
      // Network dropped mid-stream: reload the file at the same position
      if (a.error || a.networkState === 3) {
        const t = a.currentTime, src = a.getAttribute('src')
        a.src = src
        try { a.currentTime = t } catch { /* ignore */ }
      }
      a.play().catch(() => { /* still interrupted (e.g. call in progress) — try again later */ })
    }

    const onVisible = () => { if (!document.hidden) tryResume('visible') }
    const onOnline  = () => tryResume('online')
    const onDevice  = () => {
      lastDeviceChangeRef.current = Date.now()
      // Headphones/Bluetooth just disconnected: don't resume through the speaker
      if (interruptRef.current && Date.now() - interruptRef.current.at < 3000) interruptRef.current = null
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('pageshow', onVisible)
    window.addEventListener('online', onOnline)
    navigator.mediaDevices?.addEventListener?.('devicechange', onDevice)
    // Background retries: during a call play() is refused; right after it
    // ends, the next attempt succeeds — usually within 3 seconds.
    const timer = setInterval(() => { if (document.hidden) tryResume('background') }, 3000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('pageshow', onVisible)
      window.removeEventListener('online', onOnline)
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDevice)
      clearInterval(timer)
    }
  }, [])

  // ── Remember the session (track, queue, position) across app restarts ──
  const SESSION_KEY = 't9_player_session_v1'
  const slim = (t) => t && ({
    id: t.id, title: t.title, audio_url: t.audio_url, cover_url: t.cover_url || null,
    artist_id: t.artist_id || null, is_premium: !!t.is_premium, duration: t.duration || null,
    genre: t.genre || null, profiles: t.profiles ? { name: t.profiles.name, is_verified: !!t.profiles.is_verified } : null,
  })
  const saveSession = useCallback(() => {
    try {
      if (!nowPlaying) return
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        track: slim(nowPlaying),
        queue: queue.slice(0, 200).map(slim),
        time: audioRef.current?.currentTime || 0,
        shuffle, repeat,
        savedAt: Date.now(),
      }))
    } catch { /* storage full */ }
  }, [nowPlaying, queue, shuffle, repeat])

  useEffect(() => { saveSession() }, [saveSession])
  useEffect(() => {
    if (!isPlaying) return
    const t = setInterval(saveSession, 5000)
    return () => clearInterval(t)
  }, [isPlaying, saveSession])
  useEffect(() => {
    const onHide = () => saveSession()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => { window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onHide) }
  }, [saveSession])

  // Restore on start — paused, at the saved position, ready to tap play
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
      if (!saved?.track?.audio_url || nowPlaying) return
      setQueue(saved.queue?.length ? saved.queue : [saved.track])
      setQueueIndex(Math.max(0, (saved.queue || []).findIndex(t => t.id === saved.track.id)))
      setNowPlaying(saved.track)
      setIsPlaying(false)
      if (saved.shuffle) { setShuffleState(true); originalOrderRef.current = saved.queue || [] }
      if (['none', 'all', 'one'].includes(saved.repeat)) setRepeat(saved.repeat)
      setCurrentTime(saved.time || 0)
      const a = audioRef.current
      if (a) {
        a.preload = 'none'              // don't download anything until play is tapped
        a.src = saved.track.audio_url
        try { a.currentTime = saved.time || 0 } catch { /* applied when it loads */ }
        if (saved.track.duration) setDuration(Number(saved.track.duration) || 0)
      }
    } catch { /* corrupt record — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playerValue = useMemo(() => ({
    nowPlaying, isPlaying,
    queue, queueIndex, volume, muted,
    audioRef, audioError,
    playTrack, stopPlayer,
    skipNext, skipPrev,
    playNext: skipNext, playPrev: skipPrev,
    togglePlay, seekTo,
    changeVolume, toggleMute,
    addToPlayNext,
    addToQueue,
    removeFromQueue,
    setIsPlaying,
    shuffle, setShuffle, toggleShuffle,
    repeat, setRepeat, cycleRepeat,
    setCanPlay,
  }), [nowPlaying, isPlaying, queue, queueIndex, volume, muted, audioError,
       playTrack, stopPlayer, skipNext, skipPrev, togglePlay, seekTo,
       changeVolume, toggleMute, addToPlayNext, addToQueue, removeFromQueue,
       shuffle, setShuffle, toggleShuffle, repeat, cycleRepeat, setCanPlay])

  const timeValue = useMemo(() => ({ currentTime, duration }), [currentTime, duration])

  return (
    <PlayerContext.Provider value={playerValue}>
    <PlayerTimeContext.Provider value={timeValue}>
      {/* Single global <audio> — the only audio element in the entire app */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={()       => { setIsPlaying(true); setAudioError(null) }}
        onError={(e)     => {
          // No source loaded (player stopped/reset) — nothing actually failed
          if (!e.target.getAttribute('src')) return
          // A downloaded song that didn't load through the service worker
          // (e.g. first offline launch): play it straight from storage.
          const failedSrc = e.target.getAttribute('src')
          if (!failedSrc.startsWith('blob:') && isDownloadedUrl(failedSrc)) {
            const el = e.target
            getDownloadedBlobUrl(failedSrc).then(blobUrl => {
              if (!blobUrl || el.getAttribute('src') !== failedSrc) return
              if (lastBlobUrl.current) URL.revokeObjectURL(lastBlobUrl.current)
              lastBlobUrl.current = blobUrl
              el.src = blobUrl
              el.play().catch(() => setIsPlaying(false))
            })
            return
          }
          const code = e.target.error?.code
          console.error('❌ Audio error:', code, e.target.error?.message, audioRef.current?.src)
          // MEDIA_ERR_NETWORK (2) / MEDIA_ERR_SRC_NOT_SUPPORTED (4) while
          // offline almost always means "never cached" rather than a real
          // corruption — surface a friendly, non-crashing message instead
          // of leaving the player silently stuck.
          if (!navigator.onLine) {
            setAudioError({ trackId: nowPlaying?.id, message: "This track isn't available offline yet." })
          } else {
            setAudioError({ trackId: nowPlaying?.id, message: 'This track could not be played.' })
          }
          setIsPlaying(false)
        }}
        onPause={(e) => {
          setIsPlaying(false)
          const a = e.target
          // Not the listener's pause and not the end of the song → interrupted
          if (wantPlayingRef.current && !a.ended && a.getAttribute('src')
              && Date.now() - lastDeviceChangeRef.current > 3000) {
            interruptRef.current = { at: Date.now(), wasHidden: document.hidden }
          }
        }}
        onPlaying={() => { interruptRef.current = null; if (audioRef.current) audioRef.current.preload = 'auto' }}
        onEnded={(e) => {
          interruptRef.current = null
          if (repeatRef.current === 'one') { e.target.currentTime = 0; e.target.play().catch(() => setIsPlaying(false)); return }
          skipNext({ auto: true })
        }}
        onTimeUpdate={e  => { setCurrentTime(e.target.currentTime); setDuration(e.target.duration || 0) }}
        onLoadedMetadata={e => setDuration(e.target.duration || 0)}
      />
      {children}
    </PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}

/** Playback position — only for components that show progress (player bar). */
export function usePlayerTime() {
  return useContext(PlayerTimeContext)
}
