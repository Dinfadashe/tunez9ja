import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { Plus, Play, Trash2, Music, Edit3, Check, X, Globe, Lock } from 'lucide-react'

export default function Playlists({ currentUser }) {
  const [playlists,  setPlaylists]  = useState([])
  const [selected,   setSelected]   = useState(null)
  const [tracks,     setTracks]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [editingId,  setEditingId]  = useState(null)
  const [editName,   setEditName]   = useState('')
  const { playTrack }               = usePlayer()

  const fetchPlaylists = async () => {
    const { data } = await supabase
      .from('playlists')
      .select('*, playlist_tracks(id)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
    setPlaylists(data || [])
    setLoading(false)
  }

  useEffect(() => { if (currentUser?.id) fetchPlaylists() }, [currentUser?.id])

  const fetchTracks = async (playlist) => {
    setSelected(playlist)
    const { data } = await supabase
      .from('playlist_tracks')
      .select('*, track:track_id(id,title,genre,audio_url,cover_url,duration,artist_id,profiles:artist_id(name,is_verified))')
      .eq('playlist_id', playlist.id)
      .order('position')
    setTracks((data || []).map(r => r.track).filter(Boolean))
  }

  const createPlaylist = async () => {
    if (!newName.trim()) return
    const { data } = await supabase.from('playlists').insert({
      user_id: currentUser.id,
      name: newName.trim(),
    }).select().single()
    if (data) {
      setPlaylists(prev => [data, ...prev])
      setNewName('')
      setCreating(false)
    }
  }

  const deletePlaylist = async (id) => {
    await supabase.from('playlists').delete().eq('id', id)
    setPlaylists(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) { setSelected(null); setTracks([]) }
  }

  const removeTrack = async (trackId) => {
    await supabase.from('playlist_tracks')
      .delete().eq('playlist_id', selected.id).eq('track_id', trackId)
    setTracks(prev => prev.filter(t => t.id !== trackId))
  }

  const renamePlaylist = async (id) => {
    if (!editName.trim()) return
    await supabase.from('playlists').update({ name: editName.trim() }).eq('id', id)
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: editName.trim() } : p))
    if (selected?.id === id) setSelected(prev => ({ ...prev, name: editName.trim() }))
    setEditingId(null)
  }

  const playAll = () => {
    if (tracks.length === 0) return
    playTrack(tracks[0], tracks)
  }

  const togglePublic = async (playlist) => {
    const updated = !playlist.is_public
    await supabase.from('playlists').update({ is_public: updated }).eq('id', playlist.id)
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, is_public: updated } : p))
    if (selected?.id === playlist.id) setSelected(prev => ({ ...prev, is_public: updated }))
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>LOADING...</div>

  if (selected) return (
    <div>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={() => { setSelected(null); setTracks([]) }}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-300)', padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          {editingId === selected.id ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="form-control" style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && renamePlaylist(selected.id)} autoFocus />
              <button onClick={() => renamePlaylist(selected.id)} className="btn btn-primary" style={{ padding: '8px 14px' }}><Check size={14} /></button>
              <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '8px 14px' }}><X size={14} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{selected.name}</h2>
              <button onClick={() => { setEditingId(selected.id); setEditName(selected.name) }}
                style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer' }}>
                <Edit3 size={15} />
              </button>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 4 }}>
            {tracks.length} tracks
          </div>
        </div>
        <button onClick={() => togglePublic(selected)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 12 }}>
          {selected.is_public ? <><Globe size={13} /> Public</> : <><Lock size={13} /> Private</>}
        </button>
        {tracks.length > 0 && (
          <button onClick={playAll} className="btn btn-primary" style={{ gap: 8 }}>
            <Play size={15} fill="white" /> Play All
          </button>
        )}
      </div>

      {tracks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey-500)' }}>
          <Music size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div>No tracks yet. Go to Music page and add tracks to this playlist.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tracks.map((track, i) => (
            <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-red)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: 28, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grey-500)', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#111' }}>
                {track.cover_url
                  ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={18} style={{ opacity: 0.3 }} /></div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => playTrack(track, tracks)}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-300)', marginTop: 2 }}>{track.profiles?.name}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{track.genre}</div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', width: 40, textAlign: 'right', flexShrink: 0 }}>{track.duration || '—'}</div>
              <button onClick={() => removeTrack(track.id)}
                style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                title="Remove from playlist">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 4 }}>YOUR MUSIC</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>PLAYLISTS</h2>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ gap: 8 }}>
          <Plus size={15} /> New Playlist
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 10, padding: 20, marginBottom: 20, display: 'flex', gap: 10 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            className="form-control" placeholder="Playlist name..." style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && createPlaylist()} autoFocus />
          <button onClick={createPlaylist} className="btn btn-primary" style={{ gap: 6 }}><Check size={14} /> Create</button>
          <button onClick={() => { setCreating(false); setNewName('') }} className="btn btn-secondary"><X size={14} /></button>
        </div>
      )}

      {playlists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey-500)' }}>
          <Music size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 15 }}>No playlists yet.</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Create your first playlist and add tracks from the Music page.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {playlists.map(pl => (
            <div key={pl.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              onClick={() => fetchTracks(pl)}
            >
              {/* Cover */}
              <div style={{ paddingBottom: '100%', position: 'relative', background: 'linear-gradient(135deg, #1a0a0d, #0a0d1a)' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={48} style={{ opacity: 0.15 }} />
                </div>
                <div style={{ position: 'absolute', bottom: 8, right: 8, width: 36, height: 36, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                  className="playlist-play-btn">
                  <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                {editingId === pl.id ? (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="form-control" style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                      onKeyDown={e => e.key === 'Enter' && renamePlaylist(pl.id)} autoFocus />
                    <button onClick={() => renamePlaylist(pl.id)} style={{ background: 'none', border: 'none', color: '#00c864', cursor: 'pointer' }}><Check size={13} /></button>
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--grey-500)' }}>
                    {pl.playlist_tracks?.[0]?.count || 0} tracks · {pl.is_public ? '🌐' : '🔒'}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingId(pl.id); setEditName(pl.name) }}
                      style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 4 }}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => deletePlaylist(pl.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
