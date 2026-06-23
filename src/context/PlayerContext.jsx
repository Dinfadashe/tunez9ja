import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [queue,       setQueue]       = useState([])
  const [queueIndex,  setQueueIndex]  = useState(0)
  const [nowPlaying,  setNowPlaying]  = useState(null)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showInfo,    setShowInfo]    = useState(false)
  const [minimized,   setMinimized]   = useState(false)
  const audioRef = useRef(null)

  const playTrack = useCallback((track, trackList = []) => {
    if (!track) return
    const list = trackList.length ? trackList : [track]
    const idx  = list.findIndex(t => t.id === track.id)
    setQueue(list)
    setQueueIndex(idx >= 0 ? idx : 0)
    setNowPlaying(track)
    setIsPlaying(true)
    if (audioRef.current) {
      const url = track.audio_url || null
      if (url) {
        audioRef.current.src = url
        audioRef.current.play().catch(() => {})
      }
    }
  }, [])

  const stopPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setNowPlaying(null)
    setIsPlaying(false)
    setProgress(0)
  }, [])

  const skipNext = useCallback(() => {
    setQueue(q => {
      if (!q.length) return q
      const idx  = q.findIndex(t => t.id === nowPlaying?.id)
      const next = q[(idx + 1) % q.length]
      if (next) {
        setQueueIndex((idx + 1) % q.length)
        setNowPlaying(next)
        setIsPlaying(true)
        if (audioRef.current && next.audio_url) {
          audioRef.current.src = next.audio_url
          audioRef.current.play().catch(() => {})
        }
      }
      return q
    })
  }, [nowPlaying?.id])

  const skipPrev = useCallback(() => {
    setQueue(q => {
      if (!q.length) return q
      const idx  = q.findIndex(t => t.id === nowPlaying?.id)
      const prev = q[(idx - 1 + q.length) % q.length]
      if (prev) {
        setQueueIndex((idx - 1 + q.length) % q.length)
        setNowPlaying(prev)
        setIsPlaying(true)
        if (audioRef.current && prev.audio_url) {
          audioRef.current.src = prev.audio_url
          audioRef.current.play().catch(() => {})
        }
      }
      return q
    })
  }, [nowPlaying?.id])

  const addToPlayNext = useCallback((track) => {
    setQueue(q => {
      const idx  = q.findIndex(t => t.id === nowPlaying?.id)
      const newQ = [...q]
      newQ.splice(idx + 1, 0, track)
      return newQ
    })
  }, [nowPlaying?.id])

  const seekTo = useCallback((pct) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = pct * audioRef.current.duration
    }
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying(p => {
      if (p) audioRef.current?.pause()
      else   audioRef.current?.play().catch(() => {})
      return !p
    })
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !nowPlaying) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  nowPlaying.title  || 'Unknown',
      artist: nowPlaying.profiles?.name || '',
      artwork: nowPlaying.cover_url ? [{ src: nowPlaying.cover_url }] : [],
    })
    navigator.mediaSession.setActionHandler('nexttrack',     skipNext)
    navigator.mediaSession.setActionHandler('previoustrack', skipPrev)
  }, [nowPlaying, skipNext, skipPrev])

  return (
    <PlayerContext.Provider value={{
      nowPlaying, isPlaying, progress, duration, currentTime,
      audioRef, showInfo, setShowInfo, minimized, setMinimized,
      queue, queueIndex,
      playTrack, stopPlayer,
      skipNext, skipPrev,
      playNext: skipNext, playPrev: skipPrev,
      addToPlayNext,
      seekTo, togglePlay,
      setIsPlaying,
    }}>
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={() => {
          if (!audioRef.current) return
          const d   = audioRef.current.duration || 0
          const cur = audioRef.current.currentTime || 0
          setProgress(d ? (cur / d) * 100 : 0)
          setCurrentTime(cur)
          setDuration(d)
        }}
        onEnded={skipNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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
