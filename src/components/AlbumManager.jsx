import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { compressImage, extFor } from '../lib/imageCompress.js'
import { Plus, Disc, Trash2, Music, Check, Upload } from 'lucide-react'

export default function AlbumManager({ currentUser }) {
  const [albums,    setAlbums]    = useState([])
  const [selected,  setSelected]  = useState(null)
  const [tracks,    setTracks]    = useState([])
  const [allTracks, setAllTracks] = useState([])
  const [creating,  setCreating]  = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [form, setForm] = useState({
    title: '', description: '', genre: '', release_date: '',
    is_premium: false, tunez_price: ''
  })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  const fetchAlbums = async () => {
    const { data } = await supabase.from('albums').select('*')
      .eq('artist_id', currentUser.id).order('created_at', { ascending: false })
    setAlbums(data || [])
    setLoading(false)
  }

  const fetchArtistTracks = async () => {
    const { data } = await supabase.from('music_tracks').select('id,title,genre,album_id,track_number,status')
      .eq('artist_id', currentUser.id).order('title') // all statuses — pending tracks can be added to albums
    setAllTracks(data || [])
  }

  useEffect(() => {
    if (currentUser?.id) { fetchAlbums(); fetchArtistTracks() }
  }, [currentUser?.id])

  const fetchAlbumTracks = async (album) => {
    setSelected(album)
    const { data } = await supabase.from('music_tracks').select('id,title,genre,track_number')
      .eq('album_id', album.id).order('track_number')
    setTracks(data || [])
  }

  const handleCover = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const createAlbum = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError('')

    // Test phase limit — checked before uploading anything
    const { count: aCount } = await supabase.from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', currentUser.id)
    if (aCount >= 3) {
      setError('❌ Test phase: max 3 albums allowed. Reach verification milestone to create more.')
      setSaving(false)
      return
    }

    let cover_url = null
    if (coverFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(coverFile.type) || coverFile.size > 5 * 1024 * 1024) {
        setError('❌ Cover must be a JPG, PNG or WebP image under 5MB.'); setSaving(false); return
      }
      const upCover = await compressImage(coverFile, { maxDim: 1200 })
      const ext  = extFor(upCover)
      const path = `album-covers/${currentUser.id}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('music-covers')
        .upload(path, upCover, { upsert: true, contentType: upCover.type })
      if (upErr) { setError('❌ Cover upload failed: ' + upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('music-covers').getPublicUrl(path)
      cover_url = urlData.publicUrl
    }

    const { data, error: insErr } = await supabase.from('albums').insert({
      artist_id: currentUser.id,
      title: form.title.trim(),
      description: form.description || null,
      genre: form.genre || null,
      release_date: form.release_date || null,
      is_premium: form.is_premium,
      tunez_price: form.is_premium ? parseFloat(form.tunez_price) || null : null,
      cover_url,
      status: 'pending',
    }).select().single()

    if (insErr) setError('❌ Could not create album: ' + insErr.message)
    if (data) {
      setAlbums(prev => [data, ...prev])
      setForm({ title: '', description: '', genre: '', release_date: '', is_premium: false, tunez_price: '' })
      setCoverFile(null); setCoverPreview(null)
      setCreating(false)
    }
    setSaving(false)
  }

  // Album membership goes through set_track_album: approved tracks can't be
  // edited directly (so their audio can't be swapped), but can join albums.
  const ALBUM_ERRORS = {
    not_your_track: "You can only add your own tracks.",
    not_your_album: "You can only change your own albums.",
    not_logged_in:  'Please sign in again.',
    not_found:      'This album no longer exists.',
  }
  const setTrackAlbum = async (trackId, albumId, position) => {
    const { data, error: rpcErr } = await supabase.rpc('set_track_album', {
      p_track_id: trackId, p_album_id: albumId, p_track_number: position ?? null,
    })
    if (rpcErr || !data?.success) {
      setError('❌ ' + (ALBUM_ERRORS[data?.reason] || rpcErr?.message || 'Could not update the album. Please try again.'))
      return false
    }
    setError('')
    return true
  }

  const assignTrack = async (trackId, albumId, position) => {
    if (!(await setTrackAlbum(trackId, albumId, position))) return
    setTracks(prev => {
      const exists = prev.find(t => t.id === trackId)
      if (exists) return prev
      const track = allTracks.find(t => t.id === trackId)
      return track ? [...prev, { ...track, track_number: position }].sort((a,b) => a.track_number - b.track_number) : prev
    })
    setAllTracks(prev => prev.map(t => t.id === trackId ? { ...t, album_id: albumId } : t))
  }

  const removeFromAlbum = async (trackId) => {
    if (!(await setTrackAlbum(trackId, null, null))) return
    setTracks(prev => prev.filter(t => t.id !== trackId))
    setAllTracks(prev => prev.map(t => t.id === trackId ? { ...t, album_id: null } : t))
  }

  const deleteAlbum = async (id) => {
    if (!confirm('Delete this album? Tracks will not be deleted.')) return
    const { data, error: rpcErr } = await supabase.rpc('delete_album', { p_album_id: id })
    if (rpcErr || !data?.success) {
      setError(data?.reason === 'approved_album'
        ? '❌ Approved albums can only be removed by an admin. Contact support if you need it taken down.'
        : '❌ ' + (ALBUM_ERRORS[data?.reason] || rpcErr?.message || 'Could not delete the album.'))
      return
    }
    setError('')
    setAlbums(prev => prev.filter(a => a.id !== id))
    if (selected?.id === id) { setSelected(null); setTracks([]) }
  }

  const GENRES = ['Afrobeats','Afropop','Amapiano','Highlife','Afrojuju','R&B','Hip-Hop','Gospel','Fuji','Juju']

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>LOADING...</div>

  if (selected) return (
    <div>
      {error && (
        <div role="alert" style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid var(--border-red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff6b81', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
        </div>
      )}
      <button onClick={() => { setSelected(null); setTracks([]) }}
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-300)', padding: '8px 14px', cursor: 'pointer', fontSize: 13, marginBottom: 24 }}>
        ← Back to Albums
      </button>

      <div style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}>
        {selected.cover_url
          ? <img src={selected.cover_url} alt={selected.title} style={{ width: 100, height: 100, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 100, height: 100, borderRadius: 10, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Disc size={36} style={{ opacity: 0.2 }} /></div>
        }
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 4 }}>{selected.title}</div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', background: selected.status === 'approved' ? 'rgba(0,200,100,0.1)' : 'rgba(255,180,0,0.1)', color: selected.status === 'approved' ? '#00c864' : '#ffb400', border: `1px solid ${selected.status === 'approved' ? 'rgba(0,200,100,0.3)' : 'rgba(255,180,0,0.3)'}` }}>
            {selected.status.toUpperCase()}
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 16 }}>TRACKS IN ALBUM</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
        {tracks.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grey-500)', width: 24, flexShrink: 0 }}>{t.track_number || i+1}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{t.title}</span>
            <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{t.genre}</span>
            <button onClick={() => removeFromAlbum(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 4 }} title="Remove from album">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {tracks.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--grey-500)', fontSize: 13 }}>No tracks added yet</div>
        )}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>ADD TRACKS</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {allTracks.filter(t => t.album_id !== selected.id).map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <span style={{ flex: 1, fontSize: 14 }}>{t.title}</span>
            <span style={{ fontSize: 12, color: t.status === 'approved' ? 'var(--grey-500)' : '#ffb400' }}>{t.album_id ? '(in another album)' : t.status !== 'approved' ? '(pending approval)' : ''}</span>
            <button onClick={() => assignTrack(t.id, selected.id, tracks.length + 1)}
              style={{ background: 'var(--red)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} /> Add
            </button>
          </div>
        ))}
        {allTracks.filter(t => t.album_id !== selected.id).length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--grey-500)', fontSize: 13 }}>All your tracks are in this album</div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {error && !creating && (
        <div role="alert" style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid var(--border-red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff6b81', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 4 }}>DISCOGRAPHY</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>MY ALBUMS</h2>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ gap: 8 }}>
          <Plus size={15} /> New Album
        </button>
      </div>

      {/* Create album form */}
      {creating && (
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 20 }}>CREATE ALBUM</h3>
          <form onSubmit={createAlbum}>
            {/* Cover upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--grey-300)' }}>Album Cover</label>
              <div style={{ width: 120, height: 120, borderRadius: 10, border: '2px dashed var(--border)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                onClick={() => document.getElementById('album-cover-input').click()}>
                {coverPreview
                  ? <img src={coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--grey-500)' }}>
                      <Upload size={24} /><span style={{ fontSize: 11 }}>Upload</span>
                    </div>
                }
                <input id="album-cover-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleCover} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Album Title *</label>
              <input className="form-control" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Genre</label>
                <select className="form-control" value={form.genre} onChange={e => setForm(p => ({...p, genre: e.target.value}))}>
                  <option value="">Select genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Release Date</label>
                <input className="form-control" type="date" value={form.release_date} onChange={e => setForm(p => ({...p, release_date: e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
            </div>

            {/* Premium toggle */}
            <div style={{ background: 'var(--bg-surface)', border: `1px solid ${form.is_premium ? 'rgba(255,180,0,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: form.is_premium ? 14 : 0 }}>
                <div onClick={() => setForm(p => ({...p, is_premium: !p.is_premium}))}
                  style={{ width: 44, height: 24, borderRadius: 12, background: form.is_premium ? '#ffb400' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, left: form.is_premium ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Premium Album</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>Charge TUNEZ to unlock all tracks</div>
                </div>
              </label>
              {form.is_premium && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">TUNEZ Price</label>
                  <input className="form-control" type="number" min="10" max="1000" placeholder="e.g. 100"
                    value={form.tunez_price} onChange={e => setForm(p => ({...p, tunez_price: e.target.value}))} />
                </div>
              )}
            </div>

            {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: '4px 0 12px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" style={{ gap: 8 }} disabled={saving}>
                <Check size={15} /> {saving ? 'Creating...' : 'Create Album'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setCreating(false); setCoverFile(null); setCoverPreview(null) }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Albums grid */}
      {albums.length === 0 && !creating ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey-500)' }}>
          <Disc size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 15 }}>No albums yet. Create your first album!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {albums.map(album => (
            <div key={album.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              onClick={() => fetchAlbumTracks(album)}
            >
              <div style={{ paddingBottom: '100%', position: 'relative', background: '#111' }}>
                {album.cover_url
                  ? <img src={album.cover_url} alt={album.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Disc size={40} style={{ opacity: 0.15 }} /></div>
                }
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 20, background: album.status === 'approved' ? 'rgba(0,200,100,0.8)' : 'rgba(255,180,0,0.8)', color: '#000' }}>
                  {album.status.toUpperCase()}
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--grey-500)' }}>{album.genre}</span>
                  <button onClick={e => { e.stopPropagation(); deleteAlbum(album.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
