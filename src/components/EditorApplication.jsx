import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { Upload, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function EditorApplication({ currentUser }) {
  const [form,      setForm]      = useState({ whyEditor: '', experience: '' })
  const [cvFile,    setCvFile]    = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState(null)
  const [done,      setDone]      = useState(false)
  const fileRef = useRef()

  const status = currentUser?.editor_status

  if (status === 'approved') return (
    <div className="card" style={{ padding:28, textAlign:'center' }}>
      <CheckCircle size={40} color="#00c864" style={{ margin:'0 auto 12px', display:'block' }} />
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:24 }}>YOU ARE AN EDITOR</h3>
      <p style={{ color:'var(--grey-400)', marginTop:8, fontSize:14 }}>
        Switch to your Editor role from the sidebar to start reviewing posts.
      </p>
    </div>
  )

  if (status === 'applied' || done) return (
    <div className="card" style={{ padding:28, textAlign:'center' }}>
      <Clock size={40} color="#ffb400" style={{ margin:'0 auto 12px', display:'block' }} />
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:24 }}>APPLICATION SUBMITTED</h3>
      <p style={{ color:'var(--grey-400)', marginTop:8, fontSize:14, lineHeight:1.7 }}>
        Your editor application is under review. We'll notify you within 3–5 working days.
      </p>
    </div>
  )

  if (status === 'rejected') return (
    <div className="card" style={{ padding:28, maxWidth:480 }}>
      <XCircle size={36} color="var(--red)" style={{ marginBottom:12, display:'block' }} />
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:24, marginBottom:8 }}>APPLICATION NOT APPROVED</h3>
      {currentUser.editor_reject_reason && (
        <p style={{ color:'var(--grey-400)', fontSize:14, marginBottom:20 }}>
          <strong>Reason:</strong> {currentUser.editor_reject_reason}
        </p>
      )}
      <button onClick={() => {}} className="btn btn-primary">Reapply</button>
    </div>
  )

  const submit = async () => {
    if (!form.whyEditor.trim())  { setError('Please tell us why you want to be an editor'); return }
    if (!form.experience.trim()) { setError('Please describe your experience'); return }
    if (!cvFile)                 { setError('Please upload your CV'); return }

    setUploading(true)
    setError(null)
    try {
      const ext  = cvFile.name.split('.').pop()
      const path = `${currentUser.id}/cv.${ext}`
      const { error: upErr } = await supabase.storage
        .from('editor-cvs').upload(path, cvFile, { upsert: true, contentType: cvFile.type })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('editor-cvs').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('profiles').update({
        editor_status:     'applied',
        editor_cv_url:     publicUrl,
        editor_applied_at: new Date().toISOString(),
      }).eq('id', currentUser.id)

      if (dbErr) throw dbErr
      setDone(true)
    } catch(e) {
      setError('Submission failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ maxWidth:520 }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:6 }}>BECOME AN EDITOR</h2>
      <p style={{ color:'var(--grey-400)', fontSize:14, lineHeight:1.7, marginBottom:28 }}>
        Editors review and approve blog posts submitted by bloggers. You earn <strong style={{ color:'#ffb400' }}>5 TUNEZ per free post</strong> and <strong style={{ color:'#ffb400' }}>15% of premium post price</strong>.
      </p>

      {/* Why editor */}
      <div style={{ marginBottom:18 }}>
        <label style={{ display:'block', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, marginBottom:6 }}>
          WHY DO YOU WANT TO BE AN EDITOR? *
        </label>
        <textarea value={form.whyEditor} onChange={e => setForm(f => ({ ...f, whyEditor: e.target.value }))}
          placeholder="Tell us your motivation and what you'll bring to Tunez9ja..." rows={4}
          style={{ width:'100%', padding:'11px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:14, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
      </div>

      {/* Experience */}
      <div style={{ marginBottom:18 }}>
        <label style={{ display:'block', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, marginBottom:6 }}>
          RELEVANT EXPERIENCE *
        </label>
        <textarea value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
          placeholder="Writing, editing, journalism, music industry background..." rows={3}
          style={{ width:'100%', padding:'11px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:14, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
      </div>

      {/* CV Upload */}
      <div style={{ marginBottom:24 }}>
        <label style={{ display:'block', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, marginBottom:6 }}>
          CV / RESUME * (PDF, DOC, or image)
        </label>
        <div onClick={() => fileRef.current?.click()}
          style={{ border:'2px dashed var(--border)', borderRadius:10, padding:24, textAlign:'center', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          {cvFile ? (
            <div>
              <CheckCircle size={22} color="#00c864" style={{ margin:'0 auto 8px', display:'block' }} />
              <div style={{ fontSize:13, fontWeight:600 }}>{cvFile.name}</div>
              <div style={{ fontSize:11, color:'var(--grey-500)', marginTop:4 }}>{(cvFile.size/1024/1024).toFixed(2)} MB</div>
            </div>
          ) : (
            <div>
              <Upload size={22} color="var(--grey-500)" style={{ margin:'0 auto 8px', display:'block' }} />
              <div style={{ fontSize:13, color:'var(--grey-400)' }}>Click to upload CV</div>
              <div style={{ fontSize:11, color:'var(--grey-600)', marginTop:4 }}>Max 10MB</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png"
          style={{ display:'none' }} onChange={e => setCvFile(e.target.files?.[0] || null)} />
      </div>

      {error && <div style={{ color:'var(--red)', fontSize:13, marginBottom:16 }}>{error}</div>}

      <button onClick={submit} disabled={uploading} className="btn btn-primary"
        style={{ width:'100%', justifyContent:'center', padding:14 }}>
        {uploading ? 'Submitting...' : '📝 Submit Editor Application'}
      </button>
    </div>
  )
}
