import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Heart } from 'lucide-react'
import { getMyLibrary } from '../lib/tunez.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { Play, Music, Newspaper, Video, Lock } from 'lucide-react'

// Cache a track for offline playback
function cacheTrackOffline(audioUrl) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_AUDIO', url: audioUrl
    })
  }
}

// Check if track is cached offline
async function isTrackCached(audioUrl) {
  if (!('caches' in window)) return false
  const cache = await caches.open('tunez9ja-audio-v1')
  const match = await cache.match(audioUrl)
  return !!match
}

export default function MyLibrary({ currentUser }) {
  const [unlocks,      setUnlocks]      = useState([])
  const [savedTracks,  setSavedTracks]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('all')
  const { playTrack }           = usePlayer()

  useEffect(() => {
    if (!currentUser) return
    Promise.all([
      getMyLibrary(currentUser.id),
      supabase.from('saved_tracks')
        .select('*, track:track_id(id,title,genre,audio_url,cover_url,duration,artist_id,profiles:artist_id(name,is_verified))')
        .eq('user_id', currentUser.id)
        .order('saved_at', { ascending: false })
    ]).then(([unlockData, { data: savedData }]) => {
      setUnlocks(unlockData || [])
      setSavedTracks((savedData || []).map(r => r.track).filter(Boolean))
      setLoading(false)
    })
  }, [currentUser])

  const tracks = unlocks.filter(u => u.content_type === 'track')
  const posts  = unlocks.filter(u => u.content_type === 'post')
  const videos = unlocks.filter(u => u.content_type === 'video')

  const filtered = filter === 'all' ? unlocks
    : filter === 'music' ? tracks
    : filter === 'posts' ? posts
    : videos

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>LOADING LIBRARY...</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 8 }}>PREMIUM UNLOCKS</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>MY LIBRARY</h2>
        <p style={{ fontSize: 14, color: 'var(--grey-300)' }}>
          {unlocks.length} premium {unlocks.length === 1 ? 'item' : 'items'} unlocked · Access these forever, free.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'all',   label: 'All',    count: unlocks.length, icon: <Lock size={13} />     },
          { key: 'music', label: 'Music',  count: tracks.length,  icon: <Music size={13} />    },
          { key: 'posts', label: 'Blog',   count: posts.length,   icon: <Newspaper size={13} /> },
          { key: 'video', label: 'Videos', count: videos.length,  icon: <Video size={13} />    },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: filter === f.key ? 'var(--red)' : 'transparent', borderColor: filter === f.key ? 'var(--red)' : 'var(--border)', color: filter === f.key ? 'white' : 'var(--grey-300)' }}>
            {f.icon} {f.label} <span style={{ fontSize: 11, opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey-500)' }}>
          <Lock size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 15 }}>No {filter === 'all' ? 'premium content' : filter} unlocked yet.</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Use TUNEZ to unlock premium content from artists and bloggers.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map(unlock => {
            const item = unlock.track || unlock.post || unlock.video
            const type = unlock.content_type
            if (!item?.id) return null
            return (
              <div key={unlock.content_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', paddingBottom: '60%', background: '#000', overflow: 'hidden' }}>
                  {(item.cover_url || item.thumbnail_url) ? (
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${item.cover_url || item.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a0a0d,#0a0d1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {type === 'track' ? <Music size={32} style={{ opacity: 0.3 }} /> : type === 'post' ? <Newspaper size={32} style={{ opacity: 0.3 }} /> : <Video size={32} style={{ opacity: 0.3 }} />}
                    </div>
                  )}
                  {/* Type badge */}
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.8)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', color: type === 'track' ? '#7b4fff' : type === 'post' ? '#00b4dc' : '#00c864', letterSpacing: 1 }}>
                    {type === 'track' ? '🎵 MUSIC' : type === 'post' ? '📰 POST' : '🎬 VIDEO'}
                  </div>
                  {/* Play button for tracks */}
                  {type === 'track' && (
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                      <button onClick={() => item.audio_url && cacheTrackOffline(item.audio_url)}
                        title="Save for offline"
                        style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                        ⬇️
                      </button>
                      <button onClick={() => playTrack(item)}
                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--red)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />
                      </button>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-300)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.profiles?.name || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>
                      Unlocked {new Date(unlock.unlocked_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 11, color: '#ffb400', fontFamily: 'var(--font-mono)' }}>
                      {unlock.tunez_paid} T
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
