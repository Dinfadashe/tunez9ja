import { shareLinkFor } from '../lib/urlState.js'
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { queuedMutation } from '../lib/syncQueue.js'
import CommentsSection, { ReactionBar } from './CommentsSection.jsx'
import ShareButton from './ShareButton.jsx'
import PremiumUnlockModal from './PremiumUnlockModal.jsx'
import { MusicArt } from './UI.jsx'
import { Play, Pause, ArrowLeft, Heart, ListMusic, MoreVertical, ListPlus, Plus, Search, X } from 'lucide-react'

export default function TrackPage({ track, currentUser, onBack, onPlay, isPlaying, nowPlaying, unlocked, onUnlocked, setPage }) {
  const { addToPlayNext, addToQueue, queue } = usePlayer()
  const [showUnlock, setShowUnlock]   = useState(false)
  const [saved, setSaved]             = useState(false)
  const [showQueue, setShowQueue]     = useState(false)

  const playing = nowPlaying?.id === track.id

  useEffect(() => {
    if (!currentUser?.id) return
    supabase.from('saved_tracks').select('id').eq('user_id', currentUser.id).eq('track_id', track.id).maybeSingle()
      .then(r => setSaved(!!r.data))
  }, [track.id, currentUser?.id])

  function handlePlay() {
    if (track.is_premium && !unlocked) { setShowUnlock(true); return }
    onPlay(track)
    supabase.rpc('increment_play_count', { p_track_id: track.id }).then(() => {}).catch(() => {})
  }

  function toggleSave() {
    if (!currentUser) return
    // Optimistic: flip immediately so the UI never appears unresponsive
    // offline — the actual write is durably queued and retried via
    // Background Sync (5-minute cadence) if it can't go through now.
    const next = !saved
    setSaved(next)
    if (next) {
      queuedMutation({
        id: 'save:' + currentUser.id + ':' + track.id,
        table: 'saved_tracks',
        op: 'insert',
        payload: { user_id: currentUser.id, track_id: track.id, saved_at: new Date().toISOString() },
      }).then(result => { if (!result.ok && !result.queued) setSaved(false) })
    } else {
      queuedMutation({
        id: 'unsave:' + currentUser.id + ':' + track.id,
        table: 'saved_tracks',
        op: 'delete',
        payload: { user_id: currentUser.id, track_id: track.id },
        match: { user_id: currentUser.id, track_id: track.id },
      }).then(result => { if (!result.ok && !result.queued) setSaved(true) })
    }
  }

  if (showQueue) return (
    <QueuePanel
      currentUser={currentUser}
      onClose={() => setShowQueue(false)}
      onBack={onBack}
      nowPlaying={nowPlaying}
      onPlay={onPlay}
      isPlaying={isPlaying}
    />
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 120 }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14, padding: '20px 0', fontFamily: 'inherit' }}>
        <ArrowLeft size={18} /> Back to Music
      </button>

      {/* Cover */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        {track.cover_url
          ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', maxHeight: 400 }} />
          : <div style={{ width: '100%', aspectRatio: '1', maxHeight: 400, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MusicArt title={track.title} size={120} />
            </div>
        }
        {track.is_premium && !unlocked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 40 }}>💎</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'white' }}>PREMIUM TRACK</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#ffb400' }}>{track.tunez_price}T to unlock</div>
          </div>
        )}
      </div>

      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,6vw,48px)', margin: '0 0 6px', lineHeight: 1.1 }}>
          {track.title}
        </h1>
        <div style={{ fontSize: 16, color: 'var(--grey-300)' }}>
          {track.profiles?.name}{track.profiles?.is_verified && <span style={{ marginLeft: 6 }}>✅</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-500)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          {track.genre}{track.duration ? ' · ' + track.duration : ''} · {(track.play_count || 0) >= 1000 ? ((track.play_count||0)/1000).toFixed(1)+'K' : (track.play_count||0)} plays
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={handlePlay}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--red)', border: 'none', borderRadius: 40, padding: '14px 28px', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>
          {playing && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          {track.is_premium && !unlocked ? 'Unlock · ' + track.tunez_price + 'T' : playing && isPlaying ? 'Pause' : 'Play'}
        </button>

        <button onClick={toggleSave}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 40, padding: '12px 20px', color: saved ? 'var(--red)' : 'var(--grey-300)', cursor: 'pointer', fontSize: 14 }}>
          <Heart size={16} fill={saved ? 'var(--red)' : 'none'} /> {saved ? 'Saved' : 'Save'}
        </button>

        <button onClick={() => setShowQueue(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 40, padding: '12px 20px', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14 }}>
          <ListMusic size={16} /> Now Playing
        </button>

        <ShareButton url={shareLinkFor('track', track.id)} text={'Listen to ' + track.title + ' on Tunez9ja!'} title={track.title} coverUrl={track.cover_url} />
      </div>

      {/* Reactions */}
      <div style={{ marginBottom: 32 }}>
        <ReactionBar targetType="track" targetId={track.id} currentUser={currentUser} />
      </div>

      {/* Comments */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20 }}>COMMENTS</h3>
        <CommentsSection targetType="track" targetId={track.id} currentUser={currentUser} />
      </div>

      {showUnlock && (
        <PremiumUnlockModal
          content={track} contentType="track" currentUser={currentUser}
          onClose={() => setShowUnlock(false)}
          onUnlocked={t => { setShowUnlock(false); onUnlocked(t || track) }}
          setPage={setPage}
        />
      )}
    </div>
  )
}

// ── Queue / Now Playing Panel ─────────────────────────────────
function QueuePanel({ currentUser, onClose, onBack, nowPlaying, onPlay, isPlaying }) {
  const { addToPlayNext, addToQueue, queue } = usePlayer()
  const [allTracks, setAllTracks] = useState([])
  const [search, setSearch]       = useState('')
  const [menuTrack, setMenuTrack] = useState(null)
  const [tab, setTab]             = useState('queue') // queue | browse

  useEffect(() => {
    supabase.from('music_tracks').select('*, profiles:artist_id(name,is_verified)')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(200)
      .then(r => setAllTracks(r.data || []))
  }, [])

  // Deduplicate by id to prevent React key warnings
  const dedupe = (arr) => arr.filter((t, i, self) => self.findIndex(x => x.id === t.id) === i)
  const filtered = dedupe(tab === 'queue' ? queue : allTracks).filter(t =>
    !search || t.title?.toLowerCase().includes(search.toLowerCase()) ||
    (t.profiles?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  function TrackRow({ t }) {
    const isNow = nowPlaying?.id === t.id
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
        {t.cover_url
          ? <img src={t.cover_url} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} alt="" />
          : <div style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--bg-surface)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>♪</div>
        }
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { onPlay(t); supabase.rpc('increment_play_count', { p_track_id: t.id }).then(() => {}).catch(() => {}) }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: isNow ? 'var(--red)' : 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isNow && isPlaying ? '▶ ' : ''}{t.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>
            {t.profiles?.name}{t.profiles?.is_verified ? ' ✅' : ''} · {t.genre || ''}
          </div>
        </div>
        {/* Menu button */}
        <button onClick={e => { e.stopPropagation(); setMenuTrack(menuTrack?.id === t.id ? null : t) }}
          style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 6, borderRadius: 6, flexShrink: 0 }}>
          <MoreVertical size={16} />
        </button>
        {/* Dropdown menu */}
        {menuTrack?.id === t.id && (
          <div style={{ position: 'absolute', right: 0, top: 40, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, zIndex: 100, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <button onClick={() => { addToPlayNext(t); setMenuTrack(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', color: 'var(--grey-200)', cursor: 'pointer', padding: '8px 12px', borderRadius: 6, fontSize: 13, textAlign: 'left' }}>
              <ListPlus size={14} /> Play Next
            </button>
            <button onClick={() => { addToQueue(t); setMenuTrack(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', color: 'var(--grey-200)', cursor: 'pointer', padding: '8px 12px', borderRadius: 6, fontSize: 13, textAlign: 'left' }}>
              <Plus size={14} /> Add to Queue
            </button>
            <button onClick={() => { onPlay(t); setMenuTrack(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', color: 'var(--grey-200)', cursor: 'pointer', padding: '8px 12px', borderRadius: 6, fontSize: 13, textAlign: 'left' }}>
              <Play size={14} /> Play Now
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 16px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0, flex: 1 }}>NOW PLAYING</h2>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
      </div>

      {/* Now playing track */}
      {nowPlaying && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-red)', background: 'var(--red-glow)' }}>
          {nowPlaying.cover_url
            ? <img src={nowPlaying.cover_url} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} alt="" />
            : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg-surface)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>♪</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isPlaying ? '▶ ' : '⏸ '}{nowPlaying.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>{nowPlaying.profiles?.name}</div>
          </div>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--red)', letterSpacing: 1 }}>PLAYING</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['queue', 'browse'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: tab === t ? 700 : 400,
              background: tab === t ? 'var(--red)' : 'transparent',
              border: '1px solid ' + (tab === t ? 'var(--red)' : 'var(--border)'),
              color: tab === t ? 'white' : 'var(--grey-300)' }}>
            {t === 'queue' ? 'Queue (' + queue.length + ')' : 'Browse All'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-500)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tracks..."
          style={{ width: '100%', padding: '10px 36px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
        {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer' }}><X size={14} /></button>}
      </div>

      {/* Track list */}
      <div onClick={() => setMenuTrack(null)}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-500)' }}>
            {tab === 'queue' ? 'Queue is empty — browse tracks to add some' : 'No tracks found'}
          </div>
        ) : filtered.map(t => <TrackRow key={t.id} t={t} />)}
      </div>
    </div>
  )
}
