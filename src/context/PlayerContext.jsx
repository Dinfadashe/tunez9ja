import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [queue, setQueue]           = useState([])      // full track list
  const [nowPlaying, setNowPlaying] = useState(null)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const [duration, setDuration]     = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl]     = useState(null)
  const [showInfo, setShowInfo]     = useState(false)
  const [minimized, setMinimized]   = useState(false)
  const audioRef = useRef(null)

  // Build public URL from storage path
  const resolveUrl = useCallback((track) => {
    if (!track?.audio_url) return null
    if (track.audio_url.startsWith('http')) return track.audio_url
    const { data } = supabase.storage.from('music-audio').getPublicUrl(track.audio_url)
    return data.publicUrl
  }, [])

  const playTrack = useCallback((track, trackQueue = []) => {
    if (trackQueue.length > 0) setQueue(trackQueue)
    if (nowPlaying?.id === track.id) {
      // Toggle play/pause same track
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause()
        else audioRef.current.play()
      }
      return
    }
    setNowPlaying(track)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setMinimized(false)

    // Increment play count
    supabase.rpc('increment_play_count', { p_track_id: track.id })
      .then(() => {}).catch(() => {})

    const url = resolveUrl(track)
    setAudioUrl(url)
  }, [nowPlaying, isPlaying, resolveUrl])

  const stopPlayer = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setNowPlaying(null); setIsPlaying(false)
    setProgress(0); setCurrentTime(0); setAudioUrl(null)
  }, [])

  const skipNext = useCallback(() => {
    if (!nowPlaying || queue.length === 0) return
    const idx = queue.findIndex(t => t.id === nowPlaying.id)
    if (idx < queue.length - 1) playTrack(queue[idx + 1], queue)
  }, [nowPlaying, queue, playTrack])

  const skipPrev = useCallback(() => {
    if (!nowPlaying || queue.length === 0) return
    const idx = queue.findIndex(t => t.id === nowPlaying.id)
    if (idx > 0) playTrack(queue[idx - 1], queue)
  }, [nowPlaying, queue, playTrack])

  const seekTo = useCallback((pct) => {
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
  }, [isPlaying])

  // Load and play when audioUrl changes
  useEffect(() => {
    if (!audioRef.current) return
    if (audioUrl) {
      audioRef.current.src = audioUrl
      audioRef.current.load()
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [audioUrl])

  // Media Session API â€” shows track info on phone lock screen / notification
  useEffect(() => {
    if (!nowPlaying || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  nowPlaying.title,
      artist: nowPlaying.profiles?.name || 'Tunez9ja',
      album:  'Tunez9ja',
      artwork: nowPlaying.cover_url
        ? [{ src: nowPlaying.cover_url, sizes: '512x512', type: 'image/jpeg' }]
        : [{ src: '/logo.png', sizes: '192x192', type: 'image/png' }]
    })
    navigator.mediaSession.setActionHandler('play',          () => audioRef.current?.play())
    navigator.mediaSession.setActionHandler('pause',         () => audioRef.current?.pause())
    navigator.mediaSession.setActionHandler('nexttrack',     skipNext)
    navigator.mediaSession.setActionHandler('previoustrack', skipPrev)
  }, [nowPlaying, skipNext, skipPrev])

  return (
    <PlayerContext.Provider value={{
      nowPlaying, isPlaying, progress, duration, currentTime,
      audioRef, showInfo, setShowInfo, minimized, setMinimized,
      playTrack, stopPlayer, skipNext, skipPrev, seekTo, togglePlay, queue,
    }}>
      {/* Single global audio element â€” lives here, never unmounts */}
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
        onError={() => setIsPlaying(false)}
      />
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}
