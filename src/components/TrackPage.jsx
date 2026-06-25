import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import ReactionBar from './ReactionBar.jsx'
import CommentsSection from './CommentsSection.jsx'
import ShareButton from './ShareButton.jsx'
import PremiumUnlockModal from './PremiumUnlockModal.jsx'
import { MusicArt } from './UI.jsx'
import { Play, Pause, ArrowLeft, Heart, ListPlus } from 'lucide-react'

export default function TrackPage({ track, currentUser, onBack, onPlay, isPlaying, nowPlaying, unlocked, onUnlocked, setPage }) {
  const { addToPlayNext } = usePlayer()
  const [showUnlock, setShowUnlock] = useState(false)
  const [saved, setSaved] = useState(false)

  const playing = nowPlaying?.id === track.id

  useEffect(function() {
    if (!currentUser?.id) return
    supabase.from('saved_tracks').select('id').eq('user_id', currentUser.id).eq('track_id', track.id).maybeSingle()
      .then(function(r) { setSaved(!!r.data) })
  }, [track.id, currentUser?.id])

  function handlePlay() {
    if (track.is_premium && !unlocked) { setShowUnlock(true); return }
    onPlay(track)
    supabase.rpc('increment_play_count', { p_track_id: track.id }).then(function(){}).catch(function(){})
  }

  function toggleSave() {
    if (!currentUser) return
    if (saved) {
      supabase.from('saved_tracks').delete().eq('user_id', currentUser.id).eq('track_id', track.id)
        .then(function() { setSaved(false) })
    } else {
      supabase.from('saved_tracks').insert({ user_id: currentUser.id, track_id: track.id, saved_at: new Date().toISOString() })
        .then(function() { setSaved(true) })
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 120 }}>
      {/* Back button */}
      <button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14, padding: '20px 0', fontFamily: 'inherit' }}>
        <ArrowLeft size={18} /> Back to Music
      </button>

      {/* Cover art */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        {track.cover_url
          ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', maxHeight: 400 }} />
          : <div style={{ width: '100%', aspectRatio: '1', maxHeight: 400, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MusicArt title={track.title} size={120} />
            </div>
        }
        {track.is_premium && !unlocked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 40 }}>💎</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'white' }}>PREMIUM TRACK</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#ffb400' }}>{track.tunez_price}T to unlock</div>
          </div>
        )}
      </div>

      {/* Title and artist */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 40px)', margin: '0 0 6px', lineHeight: 1.1 }}>
          {track.title}
        </h1>
        <div style={{ fontSize: 16, color: 'var(--grey-300)' }}>
          {track.profiles?.name}
          {track.profiles?.is_verified && <span style={{ marginLeft: 6 }}>✅</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-500)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          {track.genre}{track.duration ? ' · ' + track.duration : ''}
          {' · '}{track.play_count >= 1000 ? (track.play_count/1000).toFixed(1)+'K' : track.play_count || 0} plays
        </div>
      </div>

      {/* Play button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={handlePlay}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--red)', border: 'none', borderRadius: 40, padding: '14px 28px', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>
          {playing && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          {track.is_premium && !unlocked ? 'Unlock · ' + track.tunez_price + 'T' : (playing && isPlaying ? 'Pause' : 'Play')}
        </button>

        <button onClick={toggleSave}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 40, padding: '12px 20px', color: saved ? 'var(--red)' : 'var(--grey-300)', cursor: 'pointer', fontSize: 14 }}>
          <Heart size={16} fill={saved ? 'var(--red)' : 'none'} /> {saved ? 'Saved' : 'Save'}
        </button>

        {currentUser && (
          <button onClick={function() { addToPlayNext && addToPlayNext(track) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 40, padding: '12px 20px', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14 }}>
            <ListPlus size={16} /> Play Next
          </button>
        )}

        <ShareButton
          url={window.location.origin + '/?track=' + track.id}
          text={'Listen to ' + track.title + ' on Tunez9ja!'}
          title={track.title}
        />
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

      {/* Unlock modal */}
      {showUnlock && (
        <PremiumUnlockModal
          content={track}
          contentType="track"
          currentUser={currentUser}
          onClose={function() { setShowUnlock(false) }}
          onUnlocked={function(t) { setShowUnlock(false); onUnlocked(t || track) }}
          setPage={setPage}
        />
      )}
    </div>
  )
}
