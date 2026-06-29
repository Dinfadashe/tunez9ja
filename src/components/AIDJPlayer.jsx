import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { djBrain, inferTrackEnergy, inferBPM, getTimeContext, getStage, EVENT_TYPES, STAGE } from '../lib/DJBrain.js'
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Radio, Zap, Music2, TrendingUp, BarChart2, Shuffle,
  ChevronDown, ChevronUp, Settings, X, Mic2, Clock, Users
} from 'lucide-react'

// ── Energy bar ───────────────────────────────────────────────────────────────
function EnergyBar({ value, label, color = 'var(--red)' }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: value + '%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

// ── Equalizer animation ──────────────────────────────────────────────────────
function EQBars({ active, count = 5, color = 'var(--red)' }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20 }}>
      <style>{`
        @keyframes djbar1{0%,100%{height:3px}50%{height:18px}}
        @keyframes djbar2{0%,100%{height:10px}30%{height:3px}70%{height:18px}}
        @keyframes djbar3{0%,100%{height:18px}40%{height:3px}80%{height:12px}}
        @keyframes djbar4{0%,100%{height:5px}55%{height:18px}}
        @keyframes djbar5{0%,100%{height:14px}25%{height:3px}75%{height:18px}}
      `}</style>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 1, background: color,
          height: active ? undefined : 3,
          animation: active ? `djbar${(i % 5) + 1} ${0.4 + i * 0.08}s ease-in-out infinite` : 'none',
          minHeight: 3,
        }} />
      ))}
    </div>
  )
}

// ── Stage pill ───────────────────────────────────────────────────────────────
function StagePill({ stage }) {
  const colors = {
    arrival:  { bg: 'rgba(59,130,246,0.2)',  border: '#3b82f6', text: '#93c5fd' },
    warm_up:  { bg: 'rgba(245,158,11,0.2)',  border: '#f59e0b', text: '#fcd34d' },
    peak:     { bg: 'rgba(200,16,46,0.25)',  border: 'var(--red)', text: '#fca5a5' },
    recovery: { bg: 'rgba(139,92,246,0.2)',  border: '#8b5cf6', text: '#c4b5fd' },
    closing:  { bg: 'rgba(16,185,129,0.2)',  border: '#10b981', text: '#6ee7b7' },
  }
  const c = colors[stage.id] || colors.peak
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: c.bg, border: '1px solid ' + c.border,
      fontSize: 10, color: c.text, fontFamily: 'var(--font-mono)',
      letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700,
    }}>
      <Zap size={9} />
      {stage.label}
    </div>
  )
}

// ── Energy curve mini chart ──────────────────────────────────────────────────
function EnergyCurve({ history }) {
  if (!history.length) return null
  const W = 120, H = 32
  const max = Math.max(...history, 1)
  const pts = history.map((v, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * W
    const y = H - (v / 100) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {history.map((v, i) => (
        <circle key={i} cx={(i / Math.max(history.length - 1, 1)) * W} cy={H - (v / 100) * H} r={i === history.length - 1 ? 3 : 1.5} fill="var(--red)" />
      ))}
    </svg>
  )
}

// ── Main AI DJ Player ────────────────────────────────────────────────────────
export default function AIDJPlayer({ currentUser, onClose }) {
  const { playTrack, nowPlaying, isPlaying, togglePlay, skipNext, audioRef } = usePlayer()

  const [catalogue,      setCatalogue]      = useState([])
  const [eventType,      setEventType]      = useState('general')
  const [sessionMins,    setSessionMins]    = useState(120)
  const [djActive,       setDjActive]       = useState(false)
  const [currentStage,   setCurrentStage]   = useState(STAGE.ARRIVAL)
  const [targetEnergy,   setTargetEnergy]   = useState(60)
  const [currentEnergy,  setCurrentEnergy]  = useState(60)
  const [energyHistory,  setEnergyHistory]  = useState([])
  const [djComment,      setDjComment]      = useState('')
  const [upNext,         setUpNext]         = useState(null)
  const [crowdAlert,     setCrowdAlert]     = useState(false)
  const [setupOpen,      setSetupOpen]      = useState(false)
  const [statsOpen,      setStatsOpen]      = useState(false)
  const [timeCtx,        setTimeCtx]        = useState(getTimeContext())
  const [skipsToday,     setSkipsToday]     = useState(0)
  const [plays,          setPlays]          = useState(0)
  const [crossfadeSecs,  setCrossfadeSecs]  = useState(4)
  const [genreGenerated, setGenreGenerated] = useState(null)
  const autoSelectTimer = useRef(null)
  const prevTrackId     = useRef(null)

  // Load catalogue from Supabase
  useEffect(() => {
    supabase.from('music_tracks')
      .select('*, profiles:artist_id(name,avatar_url,is_verified)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setCatalogue(data || []))
  }, [])

  // Update time context every minute
  useEffect(() => {
    const t = setInterval(() => setTimeCtx(getTimeContext()), 60000)
    return () => clearInterval(t)
  }, [])

  // When a new track starts, update energy + predict next
  useEffect(() => {
    if (!nowPlaying || nowPlaying.id === prevTrackId.current) return
    prevTrackId.current = nowPlaying.id

    const energy = inferTrackEnergy(nowPlaying)
    setCurrentEnergy(energy)
    setEnergyHistory(h => [...h.slice(-19), Math.round(energy)])
    djBrain.trackPlayed(nowPlaying)
    setPlays(p => p + 1)

    // Predict next track
    if (djActive && catalogue.length > 0) {
      const result = djBrain.selectNext(catalogue, { currentTrack: nowPlaying })
      if (result) {
        setUpNext(result.track)
        setCurrentStage(result.stage)
        setTargetEnergy(result.targetEnergy)
        setCrowdAlert(result.crowdLostInterest)
        setDjComment(djBrain.getDJComment(nowPlaying, result.stage, eventType))
        setCrossfadeSecs(djBrain.getCrossfadeDuration(nowPlaying, result.track))
      }
    }
  }, [nowPlaying?.id, djActive, catalogue])

  // Track skip behaviour
  const handleSkip = useCallback(() => {
    if (nowPlaying && audioRef.current) {
      const pct = audioRef.current.currentTime / (audioRef.current.duration || 1)
      djBrain.behaviour.recordSkip(nowPlaying, pct)
      setSkipsToday(s => s + 1)
    }
    if (djActive && upNext) {
      playTrack(upNext, catalogue)
    } else {
      skipNext()
    }
  }, [nowPlaying, upNext, djActive, catalogue, playTrack, skipNext, audioRef])

  // Track completion
  useEffect(() => {
    if (!audioRef.current || !nowPlaying) return
    const audio = audioRef.current
    const onEnded = () => {
      djBrain.behaviour.recordCompletion(nowPlaying)
      if (djActive && upNext) {
        playTrack(upNext, catalogue)
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [nowPlaying, upNext, djActive, catalogue, playTrack, audioRef])

  // Start DJ session
  const startDJ = useCallback(() => {
    djBrain.configure(eventType, sessionMins)
    const result = djBrain.selectNext(catalogue, {})
    if (result) {
      playTrack(result.track, catalogue)
      setCurrentStage(result.stage)
      setTargetEnergy(result.targetEnergy)
      setDjComment('🎧 DJ is in the building!')
    }
    setDjActive(true)
  }, [eventType, sessionMins, catalogue, playTrack])

  // Auto-apply crossfade via audio element volume ramp
  useEffect(() => {
    if (!djActive || !audioRef.current) return
    const audio = audioRef.current
    const onTimeUpdate = () => {
      const remaining = (audio.duration || 0) - audio.currentTime
      if (remaining > 0 && remaining < crossfadeSecs && audio.volume > 0.05) {
        const newVol = Math.max(0.05, audio.volume - (0.95 / (crossfadeSecs * 10)))
        audio.volume = newVol
      }
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [djActive, crossfadeSecs, audioRef])

  const event      = EVENT_TYPES[eventType] || EVENT_TYPES.general
  const trackEnergy= nowPlaying ? inferTrackEnergy(nowPlaying) : 0
  const trackBPM   = nowPlaying ? Math.round(inferBPM(nowPlaying)) : 0
  const progress   = djBrain.behaviour.getSessionProgress(sessionMins)
  const genreAffinity = Object.entries(djBrain.behaviour.genreScores)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 540,
        background: 'linear-gradient(160deg, #0f0305 0%, #060a14 50%, #050f0a 100%)',
        border: '1px solid rgba(200,16,46,0.3)',
        borderRadius: 20,
        boxShadow: '0 0 80px rgba(200,16,46,0.15)',
        overflow: 'hidden',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={16} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 1 }}>
                TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span> AI DJ
              </div>
              <div style={{ fontSize: 10, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                {timeCtx.label} · {event.label}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setStatsOpen(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 7, borderRadius: 8 }}>
              <BarChart2 size={16} />
            </button>
            <button onClick={() => setSetupOpen(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 7, borderRadius: 8 }}>
              <Settings size={16} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 7, borderRadius: 8 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── Setup panel ── */}
          {setupOpen && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>DJ Setup</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>Event type</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--grey-200)', fontSize: 12, padding: '6px 8px' }}>
                    {Object.entries(EVENT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>Session length</label>
                  <select value={sessionMins} onChange={e => setSessionMins(Number(e.target.value))}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--grey-200)', fontSize: 12, padding: '6px 8px' }}>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                    <option value={360}>6 hours</option>
                  </select>
                </div>
              </div>
              <button onClick={() => { startDJ(); setSetupOpen(false) }}
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Radio size={15} /> {djActive ? 'Restart DJ Session' : 'Start AI DJ'}
              </button>
            </div>
          )}

          {/* ── Stats panel ── */}
          {statsOpen && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Session Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Tracks played', value: plays },
                  { label: 'Skips', value: skipsToday },
                  { label: 'Progress', value: Math.round(progress * 100) + '%' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--red)' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {genreAffinity.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>YOUR TOP GENRES THIS SESSION</div>
                  {genreAffinity.map(([g, v]) => (
                    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--grey-300)', minWidth: 90, textTransform: 'capitalize' }}>{g}</div>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: v + '%', background: 'var(--red)', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)', minWidth: 24 }}>{Math.round(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>ENERGY CURVE</div>
                <EnergyCurve history={energyHistory} />
              </div>
            </div>
          )}

          {/* ── Current track display ── */}
          <div style={{ padding: '20px 20px 16px' }}>
            {/* Stage + crowd alert */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <StagePill stage={currentStage} />
              {crowdAlert && (
                <div style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 8px', borderRadius: 20, fontFamily: 'var(--font-mono)' }}>
                  ⚡ Crowd recovery mode
                </div>
              )}
            </div>

            {/* DJ Comment */}
            {djComment && djActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)', borderRadius: 10 }}>
                <Mic2 size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic' }}>{djComment}</span>
              </div>
            )}

            {/* Album art */}
            <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', background: '#111', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {nowPlaying && nowPlaying.cover_url
                  ? <img src={nowPlaying.cover_url} alt={nowPlaying.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--grey-700)' }}>
                      <Music2 size={48} />
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{djActive ? 'AI DJ is selecting...' : 'Set up your AI DJ'}</span>
                    </div>
                }
                {/* EQ bars overlay */}
                {isPlaying && (
                  <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
                    <EQBars active={isPlaying} count={6} color="rgba(255,255,255,0.8)" />
                  </div>
                )}
                {/* Energy badge */}
                {nowPlaying && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Zap size={11} style={{ color: 'var(--red)' }} />
                    <span style={{ fontSize: 11, color: 'var(--grey-200)', fontFamily: 'var(--font-mono)' }}>{Math.round(trackEnergy)}</span>
                    <span style={{ fontSize: 9, color: 'var(--grey-600)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--grey-200)', fontFamily: 'var(--font-mono)' }}>{trackBPM} BPM</span>
                  </div>
                )}
              </div>
            </div>

            {/* Track info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                {nowPlaying ? nowPlaying.title : 'No track playing'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--red)' }}>
                {nowPlaying ? nowPlaying.profiles?.name || 'Unknown artist' : '—'}
              </div>
            </div>

            {/* Energy meters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <EnergyBar value={currentEnergy} label="Current energy" color="var(--red)" />
              <EnergyBar value={targetEnergy} label="Target energy" color="#3b82f6" />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <button onClick={() => skipNext()} style={{ background: 'none', border: 'none', color: 'var(--grey-400)', cursor: 'pointer', padding: 10, borderRadius: '50%' }}>
                <SkipBack size={22} />
              </button>
              <button onClick={togglePlay}
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--red)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(200,16,46,0.5)' }}>
                {isPlaying ? <Pause size={24} fill="white" color="white" /> : <Play size={24} fill="white" color="white" style={{ marginLeft: 2 }} />}
              </button>
              <button onClick={handleSkip}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: djActive ? 'var(--red)' : 'var(--grey-400)', cursor: 'pointer', padding: 10, borderRadius: '50%', display: 'flex', position: 'relative' }}>
                <SkipForward size={22} />
                {djActive && (
                  <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', border: '2px solid #060a14' }} />
                )}
              </button>
            </div>

            {/* Crossfade indicator */}
            {djActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <TrendingUp size={11} style={{ color: 'var(--grey-600)', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>CROSSFADE</span>
                <span style={{ fontSize: 10, color: 'var(--grey-400)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{crossfadeSecs}s</span>
                <div style={{ flex: 1 }} />
                <Clock size={11} style={{ color: 'var(--grey-600)' }} />
                <span style={{ fontSize: 10, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>SESSION</span>
                <span style={{ fontSize: 10, color: 'var(--grey-400)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.round(progress * 100)}%</span>
              </div>
            )}

            {/* Up next */}
            {djActive && upNext && (
              <div style={{ padding: '10px 14px', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: 10 }}>
                <div style={{ fontSize: 9, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>AI Selected · Up Next</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: '#1a1a1a', overflow: 'hidden', flexShrink: 0 }}>
                    {upNext.cover_url
                      ? <img src={upNext.cover_url} alt={upNext.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={14} style={{ color: 'var(--grey-600)' }} /></div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upNext.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey-500)' }}>{upNext.profiles?.name || '—'} · {upNext.genre}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>ENERGY</div>
                    <div style={{ fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.round(inferTrackEnergy(upNext))}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Start prompt if not active */}
            {!djActive && (
              <button onClick={() => { djBrain.configure(eventType, sessionMins); setSetupOpen(true) }}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'var(--red)', border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
                <Radio size={18} /> Launch AI DJ
              </button>
            )}
          </div>
        </div>

        {/* ── Footer: catalogue count ── */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)' }}>
            {catalogue.length} tracks in catalogue
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <EQBars active={isPlaying && djActive} count={4} color={djActive ? 'var(--red)' : 'var(--grey-700)'} />
            <span style={{ fontSize: 10, color: djActive ? 'var(--red)' : 'var(--grey-700)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {djActive ? 'DJ LIVE' : 'DJ OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
