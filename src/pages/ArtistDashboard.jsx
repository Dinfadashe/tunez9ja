import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import ProfileEditor, { Avatar } from '../components/ProfileEditor.jsx'
import HalvingBanner from '../components/HalvingBanner.jsx'
import VerificationPanel from '../components/VerificationPanel.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import Sidebar from '../components/Sidebar.jsx'
import { MusicArt, StatusBadge, Modal, ConfirmModal, EmptyState } from '../components/UI.jsx'
import { MusicCopyrightAgreement, DMCANotice } from '../components/CopyrightCheckbox.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import AlbumManager from '../components/AlbumManager.jsx'
import MyLibrary   from '../components/MyLibrary.jsx'
import VideoUpload from '../components/VideoUpload.jsx'
import MyVideos from '../components/MyVideos.jsx'
import { LayoutDashboard, Music, Upload, User, CheckCircle, Clock, XCircle, Trash2, TrendingUp, Video, Youtube, Coins, BookMarked, Disc , Shield } from 'lucide-react'

const GENRES = ['Afrobeats','Afropop','Highlife','Fuji','Juju','Gospel','Hip-Hop','R&B','Pop','Rap','Reggae','Dancehall','Amapiano','Bongo Flava','Afro-Soul','Jazz','Electronic','Alternative']


const NAV = [
  { key: 'overview',   label: 'Overview',      icon: LayoutDashboard },
  { key: 'my-music',   label: 'My Music',      icon: Music           },
  { key: 'upload',     label: 'Upload Track',  icon: Upload          },
  { key: 'my-videos',  label: 'My Videos',     icon: Video           },
  { key: 'video-upload', label: 'Upload Video',icon: Youtube         },
  { key: 'albums',     label: 'My Albums',     icon: Disc            },
  { key: 'wallet',     label: 'TUNEZ Wallet',  icon: Coins           },
  { key: 'library',    label: 'My Library',    icon: BookMarked      },
  { key: 'profile',    label: 'My Profile',    icon: User            },
]

export default function ArtistDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const { currentUser, setCurrentUser } = useDashboard(propUser)

  if (!currentUser) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-300)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  return (
    <div className="dashboard-layout">
      <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          items={NAV} activePage={active} setActivePage={setActive} setPage={setPage} currentUser={currentUser} onRoleSwitch={onRoleSwitch} />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => setSidebarOpen(o => !o)}
                className="show-mobile"
                style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', color:'var(--grey-300)', cursor:'pointer', alignItems:'center', justifyContent:'center' }}>
                &#9776;
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>ARTIST PORTAL</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{NAV.find(n => n.key === active)?.label}</h1>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview' && <ArtistOverview setActive={setActive} currentUser={currentUser} />}
          {active === 'my-music' && <MyMusic currentUser={currentUser} />}
          {active === 'upload'   && <UploadTrack currentUser={currentUser} onSuccess={() => setActive('my-music')} />}
          {active === 'profile'    && <ArtistProfile currentUser={currentUser} setCurrentUser={setCurrentUser} />}
          {active === 'my-videos'   && <MyVideos currentUser={currentUser} />}
          {active === 'video-upload' && <VideoUpload currentUser={currentUser} onSuccess={() => setActive('my-videos')} />}
          {active === 'albums'       && <AlbumManager currentUser={currentUser} />}
          {active === 'wallet'       && <TunezWallet currentUser={currentUser} />}
          {active === 'library'      && <MyLibrary   currentUser={currentUser} />}
        </div>
      </main>
    </div>
  )
}

function ArtistOverview({ setActive, currentUser }) {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('music_tracks').select('id,title,genre,cover_url,audio_url,duration,play_count,status,is_premium,tunez_price,created_at').eq('artist_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setTracks(data || []); setLoading(false) })
  }, [currentUser.id])

  const approved   = tracks.filter(m => m.status === 'approved')
  const pending    = tracks.filter(m => m.status === 'pending')
  const rejected   = tracks.filter(m => m.status === 'rejected')
  const totalPlays = approved.reduce((s, m) => s + (m.play_count || 0), 0)

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,var(--bg-card),#1a0a0d)', border: '1px solid var(--border-red)', borderRadius: 12, padding: 28, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Avatar profile={currentUser} size={64} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>{currentUser.name}</div>
          <div style={{ color: 'var(--red)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{currentUser.genre || 'Artist'} {currentUser.is_verified && '· ✅ Verified'}</div>
          {currentUser.bio && <div style={{ color: 'var(--grey-300)', fontSize: 14, marginTop: 4 }}>{currentUser.bio}</div>}
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setActive('upload')}><Upload size={15} /> Upload Track</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card" style={{ '--accent': '#00c864' }}><div className="stat-value">{approved.length}</div><div className="stat-label">Published</div><CheckCircle size={32} className="stat-icon" /></div>
        <div className="stat-card" style={{ '--accent': '#ffb400' }}><div className="stat-value">{pending.length}</div><div className="stat-label">Pending Review</div><Clock size={32} className="stat-icon" /></div>
        <div className="stat-card" style={{ '--accent': 'var(--red)' }}><div className="stat-value">{rejected.length}</div><div className="stat-label">Rejected</div><XCircle size={32} className="stat-icon" /></div>
        <div className="stat-card" style={{ '--accent': '#7b4fff' }}><div className="stat-value">{totalPlays >= 1000 ? (totalPlays/1000).toFixed(1)+'K' : totalPlays}</div><div className="stat-label">Total Plays</div><TrendingUp size={32} className="stat-icon" /></div>
      </div>
      {!loading && tracks.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20 }}>MY TRACKS</h3>
          {tracks.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <MusicArt title={m.title} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-300)' }}>{m.genre} · {m.created_at?.slice(0,10)}</div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MyMusic({ currentUser }) {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [preview, setPreview] = useState(null)

  const fetchTracks = async () => {
    const { data } = await supabase.from('music_tracks').select('id,title,genre,cover_url,audio_url,duration,play_count,status,is_premium,tunez_price,created_at').eq('artist_id', currentUser.id).order('created_at', { ascending: false })
    setTracks(data || []); setLoading(false)
  }
  useEffect(() => { fetchTracks() }, [currentUser.id])
  const handleDelete = async (id) => { await supabase.from('music_tracks').delete().eq('id', id); fetchTracks() }

  if (loading) return <div style={{ color: 'var(--grey-300)', padding: 40, textAlign: 'center' }}>Loading tracks...</div>

  return (
    <div>
      {tracks.length === 0
        ? <EmptyState icon={<Music size={48} />} title="No tracks yet" message="Upload your first track to get started." />
        : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Track</th><th>Genre</th><th>Uploaded</th><th>Plays</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {tracks.map(m => (
                    <tr key={m.id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><MusicArt title={m.title} size={40} /><div><div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div><div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{m.duration}</div></div></div></td>
                      <td><span className="badge badge-music">{m.genre}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)' }}>{m.created_at?.slice(0,10)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{m.play_count?.toLocaleString() || 0}</td>
                      <td><StatusBadge status={m.status} />{m.review_note && <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 4 }}>Note: {m.review_note}</div>}</td>
                      <td><div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => setPreview(m)} style={{ padding: '6px' }}>👁</button>
                        <button className="btn btn-danger" onClick={() => setConfirmDelete(m.id)} style={{ padding: '6px' }}><Trash2 size={15} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''}>
        {preview && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}><MusicArt title={preview.title} size={80} /><div><div style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{preview.title}</div><div style={{ color: 'var(--red)', fontSize: 14, margin: '4px 0' }}>{preview.genre}</div><StatusBadge status={preview.status} /></div></div>
            {preview.description && <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>{preview.description}</p>}
            {preview.review_note && <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: 14, marginTop: 16 }}><strong style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>ADMIN FEEDBACK:</strong><p style={{ fontSize: 14, marginTop: 6 }}>{preview.review_note}</p></div>}
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete)} title="Delete Track" message="Remove this track permanently?" danger />
    </div>
  )
}

// Allowed audio formats
const ALLOWED_AUDIO = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']
const ALLOWED_AUDIO_MIME = [
  'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/flac', 'audio/x-flac',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a',
  'audio/aac', 'audio/x-aac',
  'audio/ogg', 'audio/vorbis',
]
const MAX_AUDIO_SIZE_MB = 50
const MAX_COVER_SIZE_MB = 5
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']

function UploadTrack({ currentUser, onSuccess }) {
  const [form, setForm] = useState({ title: '', genre: '', duration: '', description: '', tags: '', is_premium: false, tunez_price: '' })
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [fileError, setFileError] = useState('')
  const [coverError, setCoverError] = useState('')

  const handleAudioChange = (e) => {
    setFileError('')
    const file = e.target.files?.[0]
    if (!file) return

    const ext     = '.' + file.name.split('.').pop().toLowerCase()
    const validExt  = ALLOWED_AUDIO.includes(ext)
    const validMime = ALLOWED_AUDIO_MIME.includes(file.type)
    const sizeMB  = file.size / (1024 * 1024)

    if (!validExt && !validMime) {
      setFileError(`❌ "${file.name}" is not a supported format. Please upload: ${ALLOWED_AUDIO.join(', ')}`)
      e.target.value = ''
      return
    }
    if (sizeMB > MAX_AUDIO_SIZE_MB) {
      setFileError(`❌ File is ${sizeMB.toFixed(1)}MB. Maximum allowed size is ${MAX_AUDIO_SIZE_MB}MB.`)
      e.target.value = ''
      return
    }
    setAudioFile(file)

    // Auto-detect duration from the audio file
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio(objectUrl)
    audio.addEventListener('loadedmetadata', () => {
      const secs  = Math.floor(audio.duration)
      const mins  = Math.floor(secs / 60)
      const remaining = secs % 60
      const formatted = `${mins}:${String(remaining).padStart(2, '0')}`
      setForm(p => ({ ...p, duration: formatted }))
      URL.revokeObjectURL(objectUrl)
    })
  }

  const handleCoverChange = (e) => {
    setCoverError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
      setCoverError('❌ Cover art must be JPG, PNG, or WebP.')
      e.target.value = ''
      return
    }
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_COVER_SIZE_MB) {
      setCoverError(`❌ Image is ${sizeMB.toFixed(1)}MB. Maximum is ${MAX_COVER_SIZE_MB}MB.`)
      e.target.value = ''
      return
    }
    setCoverFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.genre) { setMessage('❌ Title and genre are required'); return }
    if (fileError || coverError) { setMessage('❌ Please fix the file errors above'); return }
    if (!copyrightAgreed) { setMessage('❌ Please confirm the copyright declaration before submitting'); return }
    setLoading(true); setMessage('')

    let audio_url = null
    let cover_url = null

    // Upload audio file to Supabase Storage
    if (audioFile) {
      setMessage('⏳ Uploading audio file...')
      const audioExt  = audioFile.name.split('.').pop()
      const audioPath = `${currentUser.id}/${Date.now()}.${audioExt}`
      const { data: audioData, error: audioErr } = await supabase.storage
        .from('music-audio')
        .upload(audioPath, audioFile, { upsert: false, contentType: audioFile.type || 'audio/mpeg' })
      if (audioErr) { setMessage('❌ Audio upload failed: ' + audioErr.message); setLoading(false); return }
      audio_url = audioData.path
    }

    // Upload cover art to Supabase Storage
    if (coverFile) {
      setMessage('⏳ Uploading cover art...')
      const coverExt  = coverFile.name.split('.').pop()
      const coverPath = `${currentUser.id}/${Date.now()}.${coverExt}`
      const { data: coverData, error: coverErr } = await supabase.storage
        .from('music-covers')
        .upload(coverPath, coverFile, { upsert: false })
      if (coverErr) { setMessage('❌ Cover upload failed: ' + coverErr.message); setLoading(false); return }
      // Get public URL for cover
      const { data: { publicUrl } } = supabase.storage.from('music-covers').getPublicUrl(coverData.path)
      cover_url = publicUrl
    }

    // Upload limit check (test phase)
    const isVerified = currentUser?.verified_type === 'milestone' || currentUser?.is_verified
    if (!isVerified) {
      const { count } = await supabase.from('music_tracks')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', currentUser.id)
      if (count >= 6) {
        setMessage('❌ Test phase: max 6 tracks allowed. Reach verification milestone to unlock unlimited uploads.')
        setUploading(false); return
      }
    }

    setMessage('⏳ Checking for duplicates...')
    const { data: existing } = await supabase
      .from('music_tracks')
      .select('id')
      .eq('artist_id', currentUser.id)
      .ilike('title', form.title.trim())
      .limit(1)
    if (existing?.length > 0) {
      setMessage('❌ Duplicate: You already uploaded a track with this title.')
      setUploading(false); return
    }

    setMessage('⏳ Saving track...')
    const { error } = await supabase.from('music_tracks').insert({
      artist_id:   currentUser.id,
      title:       form.title,
      genre:       form.genre,
      duration:    form.duration || null,
      description: form.description || null,
      tags:        form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      audio_url,
      cover_url,
      status:      'pending',
      play_count:  0,
      is_premium:  form.is_premium,
      tunez_price: form.is_premium ? parseFloat(form.tunez_price) || null : null,
    })
    setLoading(false)
    if (error) { setMessage('❌ ' + error.message); return }
    setMessage('✅ Track submitted for review! Admin will review it shortly.')
    setForm({ title: '', genre: '', duration: '', description: '', tags: '' })
    setAudioFile(null); setCoverFile(null)
    setCopyrightAgreed(false)
    setTimeout(() => onSuccess(), 1500)
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 8, padding: 14, marginBottom: 28, fontSize: 13, lineHeight: 1.6 }}>
          🎵 Your track will be reviewed by admin before going live on Tunez9ja.
        </div>

        {/* ── ACCEPTED FORMATS NOTICE ── */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grey-300)', letterSpacing: 1, marginBottom: 10 }}>ACCEPTED AUDIO FORMATS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALLOWED_AUDIO.map(fmt => (
              <span key={fmt} style={{ padding: '3px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)', color: '#00c864' }}>
                {fmt}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>📦 Max audio size: <strong style={{ color: 'var(--grey-300)' }}>{MAX_AUDIO_SIZE_MB}MB</strong></span>
            <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>🖼 Max cover size: <strong style={{ color: 'var(--grey-300)' }}>{MAX_COVER_SIZE_MB}MB</strong></span>
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,100,50,0.08)', border: '1px solid rgba(255,100,50,0.2)', borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#ffb400', letterSpacing: 1, marginBottom: 6 }}>NOT ACCEPTED</div>
            <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
              .midi · .wma · .amr · .ra · .ram · .aif · .aiff · .opus · .caf · .au · .8svx — and any video file format
            </div>
          </div>
        </div>

        {message && (
          <div style={{ background: message.startsWith('✅') ? 'rgba(0,200,100,0.1)' : 'var(--red-glow)', border: `1px solid ${message.startsWith('✅') ? 'rgba(0,200,100,0.3)' : 'var(--border-red)'}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Track Title *</label>
            <input className="form-control" placeholder="e.g. Lagos Nights" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Genre *</label>
            <select className="form-control" value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))} required>
              <option value="">Select genre</option>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          {form.duration && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 6, marginBottom: 16, fontSize: 13, color: '#00c864' }}>
              ⏱ Duration auto-detected: <strong>{form.duration}</strong>
            </div>
          )}

          {/* ── AUDIO FILE ── */}
          <div className="form-group">
            <label className="form-label">Audio File *</label>
            <div
              style={{ border: `2px dashed ${fileError ? 'var(--red)' : audioFile ? '#00c864' : 'var(--border)'}`, borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: audioFile ? 'rgba(0,200,100,0.06)' : fileError ? 'var(--red-glow)' : 'transparent', transition: 'all 0.2s' }}
              onClick={() => document.getElementById('audio-input').click()}
            >
              <input
                id="audio-input"
                type="file"
                accept=".mp3,.wav,.flac,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/aac,audio/ogg"
                style={{ display: 'none' }}
                onChange={handleAudioChange}
              />
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {audioFile ? '✅' : fileError ? '❌' : '🎵'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: audioFile ? '#00c864' : fileError ? 'var(--red)' : 'var(--grey-300)' }}>
                {audioFile ? audioFile.name : fileError ? 'Invalid file — click to try again' : 'Click to upload audio file'}
              </div>
              {audioFile && (
                <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 4 }}>
                  {(audioFile.size / (1024*1024)).toFixed(2)}MB · {audioFile.name.split('.').pop().toUpperCase()}
                </div>
              )}
              {!audioFile && !fileError && (
                <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6 }}>
                  MP3 · WAV · FLAC · M4A · AAC · OGG — max {MAX_AUDIO_SIZE_MB}MB
                </div>
              )}
            </div>
            {fileError && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, fontSize: 12, color: '#ff6b6b', lineHeight: 1.5 }}>
                {fileError}
              </div>
            )}
          </div>

          {/* ── COVER ART ── */}
          <div className="form-group">
            <label className="form-label">Cover Art</label>
            <div
              style={{ border: `2px dashed ${coverError ? 'var(--red)' : coverFile ? '#00c864' : 'var(--border)'}`, borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', background: coverFile ? 'rgba(0,200,100,0.06)' : coverError ? 'var(--red-glow)' : 'transparent', transition: 'all 0.2s' }}
              onClick={() => document.getElementById('cover-input').click()}
            >
              <input
                id="cover-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleCoverChange}
              />
              <div style={{ fontSize: 14, color: coverFile ? '#00c864' : coverError ? 'var(--red)' : 'var(--grey-300)' }}>
                {coverFile ? `✅ ${coverFile.name}` : coverError ? '❌ Invalid image — click to retry' : '🖼 Upload cover art (JPG, PNG, WebP — max 5MB)'}
              </div>
            </div>
            {coverError && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, fontSize: 12, color: '#ff6b6b' }}>
                {coverError}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} placeholder="Tell us about this track..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-control" placeholder="e.g. afrobeats, love, summer" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>

          {/* ── PREMIUM TOGGLE ── */}
          <div style={{ background: 'var(--bg-surface)', border: `1px solid ${form.is_premium ? 'rgba(255,180,0,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: form.is_premium ? 14 : 0 }}>
              <div onClick={() => setForm(p => ({ ...p, is_premium: !p.is_premium }))}
                style={{ width: 44, height: 24, borderRadius: 12, background: form.is_premium ? '#ffb400' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, left: form.is_premium ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Premium Track</div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>Charge TUNEZ tokens to unlock this track</div>
              </div>
            </label>
            {form.is_premium && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">TUNEZ Price (suggested: 20–200)</label>
                <input className="form-control" type="number" min="1" max="500" placeholder="e.g. 50"
                  value={form.tunez_price} onChange={e => setForm(p => ({ ...p, tunez_price: e.target.value }))} />
                <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 6 }}>
                  You earn 70% · Admin earns 30% of each unlock
                </div>
              </div>
            )}
          </div>

          {/* ── COPYRIGHT DECLARATION ── */}
          <MusicCopyrightAgreement agreed={copyrightAgreed} onChange={setCopyrightAgreed} />

          <button className="btn btn-primary" type="submit"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: copyrightAgreed && !fileError && !coverError ? 1 : 0.6 }}
            disabled={loading || !copyrightAgreed || !!fileError || !!coverError}>
            {loading ? 'Submitting...' : <><Upload size={16} /> Submit for Review</>}
          </button>

          {/* ── DMCA NOTICE ── */}
          <DMCANotice />
        </form>
      </div>
    </div>
  )
}

function ArtistProfile({ currentUser, setCurrentUser }) {
  return (
    <ProfileEditor
      currentUser={currentUser}
      onUpdated={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
    />
  )
}


