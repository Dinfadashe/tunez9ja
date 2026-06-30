import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
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

  // ── Core: play a track ──────────────────────────────────────
  const playTrack = useCallback((track, trackList = []) => {
    if (!track?.audio_url) {
      console.error('❌ playTrack: no audio_url on track', track?.title, track)
      return
    }
    const list = trackList.length ? trackList : [track]
    const idx  = list.findIndex(t => t.id === track.id)
    setQueue(list)
    setQueueIndex(idx >= 0 ? idx : 0)
    setNowPlaying(track)
    setIsPlaying(true)
    setCurrentTime(0)
    setAudioError(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = track.audio_url
      audioRef.current.volume = volume
      audioRef.current.muted  = muted
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (!navigator.onLine) {
            // Offline and this track was never cached by the service
            // worker — give the user a clear, friendly reason instead
            // of a silently stuck play button.
            setAudioError({ trackId: track.id, message: "This track isn't available offline yet." })
          } else {
            // Autoplay blocked by browser - user needs to click play button
            console.warn('Autoplay blocked:', err.message)
          }
          setIsPlaying(false) // Show play button so user can click manually
        })
      }
    }
  }, [volume, muted])

  // ── Skip next ───────────────────────────────────────────────
  const skipNext = useCallback(() => {
    setQueue(q => {
      if (!q.length) return q
      const idx  = q.findIndex(t => t.id === nowPlaying?.id)
      const ni   = (idx + 1) % q.length
      const next = q[ni]
      if (next && next.audio_url) {
        setQueueIndex(ni)
        setNowPlaying(next)
        setIsPlaying(true)
        setCurrentTime(0)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.src = next.audio_url
          const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Autoplay blocked by browser - user needs to click play button
          console.warn('Autoplay blocked:', err.message)
          setIsPlaying(false) // Show play button so user can click manually
        })
      }
        }
      }
      return q
    })
  }, [nowPlaying?.id])

  // ── Skip prev ───────────────────────────────────────────────
  const skipPrev = useCallback(() => {
    // If more than 3 seconds in, restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    setQueue(q => {
      if (!q.length) return q
      const idx  = q.findIndex(t => t.id === nowPlaying?.id)
      const pi   = (idx - 1 + q.length) % q.length
      const prev = q[pi]
      if (prev && prev.audio_url) {
        setQueueIndex(pi)
        setNowPlaying(prev)
        setIsPlaying(true)
        setCurrentTime(0)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.src = prev.audio_url
          const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Autoplay blocked by browser - user needs to click play button
          console.warn('Autoplay blocked:', err.message)
          setIsPlaying(false) // Show play button so user can click manually
        })
      }
        }
      }
      return q
    })
  }, [nowPlaying?.id])

  // ── Toggle play/pause ───────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
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
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
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

  // ── Add to play next ────────────────────────────────────────
  const addToQueue = useCallback((track) => {
    setQueue(q => {
      if (q.find(t => t.id === track.id)) return q
      return [...q, track]
    })
  }, [])

  const addToPlayNext = useCallback((track) => {
    setQueue(q => {
      const idx  = q.findIndex(t => t.id === nowPlaying?.id)
      const newQ = [...q]
      newQ.splice(idx + 1, 0, track)
      return newQ
    })
  }, [nowPlaying?.id])

  // ── Media Session API ───────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !nowPlaying) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   nowPlaying.title || 'Unknown',
      artist:  nowPlaying.profiles?.name || '',
      artwork: nowPlaying.cover_url ? [{ src: nowPlaying.cover_url }] : [],
    })
    navigator.mediaSession.setActionHandler('play',          () => { audioRef.current?.play(); setIsPlaying(true) })
    navigator.mediaSession.setActionHandler('pause',         () => { audioRef.current?.pause(); setIsPlaying(false) })
    navigator.mediaSession.setActionHandler('nexttrack',     skipNext)
    navigator.mediaSession.setActionHandler('previoustrack', skipPrev)
  }, [nowPlaying, skipNext, skipPrev])

  return (
    <PlayerContext.Provider value={{
      nowPlaying, isPlaying, currentTime, duration,
      queue, queueIndex, volume, muted,
      audioRef, audioError,
      playTrack, stopPlayer,
      skipNext, skipPrev,
      playNext: skipNext, playPrev: skipPrev,
      togglePlay, seekTo,
      changeVolume, toggleMute,
      addToPlayNext,
      addToQueue,
      setIsPlaying,
    }}>
      {/* Single global <audio> — the only audio element in the entire app */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={()       => { setIsPlaying(true); setAudioError(null) }}
        onError={(e)     => {
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
        onPause={()      => setIsPlaying(false)}
        onEnded={() => {}} // Handled by FloatingPlayer with repeat/shuffle logic
        onTimeUpdate={e  => { setCurrentTime(e.target.currentTime); setDuration(e.target.duration || 0) }}
        onLoadedMetadata={e => setDuration(e.target.duration || 0)}
      />
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
