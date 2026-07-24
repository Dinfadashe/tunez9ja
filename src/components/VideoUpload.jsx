import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Youtube, Upload, Video, Link, CheckCircle, AlertTriangle } from 'lucide-react'

// Allowed direct video formats
const ALLOWED_VIDEO    = ['.mp4', '.mov', '.webm', '.mkv']
const ALLOWED_VID_MIME = ['video/mp4','video/quicktime','video/webm','video/x-matroska']
const MAX_VIDEO_MB     = 200

function getYoutubeId(url) {
  if (!url) return null
  if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0]
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0]
  if (url.includes('/embed/')) return url.split('/embed/')[1].split('?')[0]
  if (url.includes('/shorts/')) return url.split('/shorts/')[1].split('?')[0]
  return null
}

export default function VideoUpload({ currentUser, onSuccess, onGoToKYC }) {
  const [mode, setMode]           = useState('youtube') // 'youtube' | 'upload'

  // ── KYC gate: same requirement as audio upload ──────────────
  const kycStatus = currentUser?.kyc_status
  if (kycStatus !== 'approved') {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(200,16,46,0.1)', border: '2px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>
          🪪
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>Identity Verification Required</h2>
        <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          Complete your identity verification before uploading videos.
        </p>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
          {kycStatus === 'pending'
            ? '⏳ Your KYC is under review — usually within 24–48 hours.'
            : kycStatus === 'rejected'
              ? '❌ Previous KYC rejected. Please re-submit with a clearer document.'
              : 'You haven\'t submitted your identity documents yet.'}
        </p>
        {kycStatus !== 'pending' && (
          <button className="btn btn-primary" style={{ minWidth: 180, justifyContent: 'center' }}
            onClick={onGoToKYC}>
            Complete KYC Verification
          </button>
        )}
      </div>
    )
  }

  const [form, setForm]           = useState({ title: '', description: '', tags: '', youtubeUrl: '' })
  const [videoFile, setVideoFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [urlError, setUrlError]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState('')
  const [preview, setPreview]     = useState(null) // youtube preview

  const handleYoutubeUrl = (val) => {
    setForm(p => ({ ...p, youtubeUrl: val }))
    setUrlError('')
    setPreview(null)
    if (!val) return
    const id = getYoutubeId(val)
    if (id) {
      setPreview(id)
    } else if (val.includes('youtube') || val.includes('youtu.be')) {
      setUrlError('❌ Could not parse YouTube URL. Paste the full video link.')
    }
  }

  const handleVideoFile = (e) => {
    setFileError('')
    const file = e.target.files?.[0]
    if (!file) return
    const ext  = '.' + file.name.split('.').pop().toLowerCase()
    const sizeMB = file.size / (1024 * 1024)
    if (!ALLOWED_VIDEO.includes(ext) && !ALLOWED_VID_MIME.includes(file.type)) {
      setFileError(`❌ "${file.name}" is not supported. Allowed: ${ALLOWED_VIDEO.join(', ')}`)
      e.target.value = ''; return
    }
    if (sizeMB > MAX_VIDEO_MB) {
      setFileError(`❌ File is ${sizeMB.toFixed(0)}MB. Maximum allowed is ${MAX_VIDEO_MB}MB.`)
      e.target.value = ''; return
    }
    setVideoFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title) { setMessage('❌ Title is required'); return }
    if (mode === 'youtube' && !form.youtubeUrl) { setMessage('❌ Please paste a YouTube link'); return }
    if (mode === 'youtube' && !getYoutubeId(form.youtubeUrl)) { setMessage('❌ Invalid YouTube URL'); return }
    if (mode === 'upload' && !videoFile) { setMessage('❌ Please select a video file'); return }
    if (fileError || urlError) { setMessage('❌ Please fix the errors above'); return }

    // Test phase limit
    const { count: vCount } = await supabase.from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('uploader_id', currentUser.id)
    if (vCount >= 6) {
      setMessage('❌ Test phase: max 6 videos allowed. Reach verification milestone to upload more.')
      return
    }


    setLoading(true); setMessage('')

    const payload = {
      uploader_id:   currentUser.id,
      uploader_role: currentUser.active_role || currentUser.role,
      title:         form.title,
      description:   form.description || null,
      tags:          form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      youtube_url:   mode === 'youtube' ? form.youtubeUrl : null,
      status:        'pending',
      view_count:    0,
    }

    const { error } = await supabase.from('videos').insert(payload)
    setLoading(false)

    if (error) { setMessage('❌ ' + error.message); return }

    setMessage('✅ Video submitted for review! Admin will review it shortly.')
    setForm({ title: '', description: '', tags: '', youtubeUrl: '' })
    setVideoFile(null); setPreview(null)
    setTimeout(() => { setMessage(''); onSuccess?.() }, 2000)
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card" style={{ padding: 32 }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg-surface)', borderRadius: 8, padding: 4 }}>
          {[
            { key: 'youtube', label: 'YouTube Link', icon: <Youtube size={16} color={mode==='youtube'?'#ff0000':'var(--grey-500)'} /> },
            { key: 'upload',  label: 'Upload Video', icon: <Upload size={16} color={mode==='upload'?'var(--red)':'var(--grey-500)'} /> },
          ].map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setMessage(''); setFileError(''); setUrlError('') }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.2s', background: mode === m.key ? 'var(--bg-card)' : 'transparent', color: mode === m.key ? 'var(--white)' : 'var(--grey-500)', boxShadow: mode === m.key ? 'var(--shadow)' : 'none' }}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        {message && (
          <div style={{ background: message.startsWith('✅') ? 'rgba(0,200,100,0.1)' : 'var(--red-glow)', border: `1px solid ${message.startsWith('✅') ? 'rgba(0,200,100,0.3)' : 'var(--border-red)'}`, borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Video Title *</label>
            <input className="form-control" placeholder="e.g. Lagos Nights — Official Music Video" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>

          {/* ── YOUTUBE MODE ── */}
          {mode === 'youtube' && (
            <div className="form-group">
              <label className="form-label">YouTube Link *</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Link size={16} color="var(--grey-500)" />
                </div>
                <input className="form-control" style={{ paddingLeft: 38 }}
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  value={form.youtubeUrl}
                  onChange={e => handleYoutubeUrl(e.target.value)} />
              </div>
              {urlError && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>{urlError}</div>
              )}

              {/* YouTube preview */}
              {preview && (
                <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,200,100,0.3)', background: 'rgba(0,200,100,0.05)' }}>
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#00c864', fontFamily: 'var(--font-mono)' }}>
                    <CheckCircle size={14} /> Valid YouTube link detected
                  </div>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${preview}?rel=0`}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allowFullScreen
                      title="Preview"
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--grey-500)', lineHeight: 1.6 }}>
                Supported: youtube.com/watch?v=... · youtu.be/... · YouTube Shorts
              </div>
            </div>
          )}

          {/* ── UPLOAD MODE ── */}
          {mode === 'upload' && (
            <div className="form-group">
              <label className="form-label">Video File *</label>

              {/* Accepted formats box */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grey-300)', letterSpacing: 1, marginBottom: 8 }}>ACCEPTED FORMATS</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {ALLOWED_VIDEO.map(f => (
                    <span key={f} style={{ padding: '3px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)', color: '#00c864' }}>{f}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>📦 Max size: <strong style={{ color: 'var(--grey-300)' }}>{MAX_VIDEO_MB}MB</strong></div>
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,100,50,0.08)', border: '1px solid rgba(255,100,50,0.2)', borderRadius: 6, fontSize: 11, color: '#ffb400', fontFamily: 'var(--font-mono)' }}>
                  NOT ACCEPTED: .avi · .wmv · .flv · .3gp · .mpeg · .rmvb · YouTube links go in the other tab
                </div>
              </div>

              <div style={{ border: `2px dashed ${fileError ? 'var(--red)' : videoFile ? '#00c864' : 'var(--border)'}`, borderRadius: 8, padding: 32, textAlign: 'center', cursor: 'pointer', background: videoFile ? 'rgba(0,200,100,0.05)' : fileError ? 'var(--red-glow)' : 'transparent', transition: 'all 0.2s' }}
                onClick={() => document.getElementById('video-file-input').click()}>
                <input id="video-file-input" type="file"
                  accept=".mp4,.mov,.webm,.mkv,video/mp4,video/quicktime,video/webm"
                  style={{ display: 'none' }} onChange={handleVideoFile} />
                <div style={{ fontSize: 32, marginBottom: 10 }}>
                  {videoFile ? '✅' : fileError ? '❌' : '🎬'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: videoFile ? '#00c864' : fileError ? 'var(--red)' : 'var(--grey-300)' }}>
                  {videoFile ? videoFile.name : fileError ? 'Invalid file — click to try again' : 'Click to upload your video'}
                </div>
                {videoFile && (
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6 }}>
                    {(videoFile.size / (1024*1024)).toFixed(1)}MB · {videoFile.name.split('.').pop().toUpperCase()}
                  </div>
                )}
                {!videoFile && !fileError && (
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 8 }}>MP4 · MOV · WebM · MKV — max {MAX_VIDEO_MB}MB</div>
                )}
              </div>
              {fileError && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, fontSize: 12, color: '#ff6b6b', lineHeight: 1.5 }}>
                  {fileError}
                </div>
              )}

              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: 6 }}>
                <AlertTriangle size={14} color="#ffb400" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6 }}>
                  <strong>Tip:</strong> For best results, upload your video to YouTube first and use the YouTube link tab. It loads faster and supports HD quality without file size limits.
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} placeholder="Tell viewers about this video..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-control" placeholder="e.g. music video, afrobeats, official" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6 }}>
            🎬 All videos are reviewed by admin before going live. Approved videos appear on the public Videos page.
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }} disabled={loading}>
            {loading ? 'Submitting...' : mode === 'youtube' ? <><Youtube size={16} /> Submit YouTube Video</> : <><Upload size={16} /> Submit Video for Review</>}
          </button>
        </form>
      </div>
    </div>
  )
}
