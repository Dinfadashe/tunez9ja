// ArtistKYC — minimal identity verification required before
// uploading music or videos. Separate from the Blue Tick milestone
// award (VerificationPanel), which requires stream/follower thresholds,
// a fee, and a more thorough review process.
//
// This collects a government ID and a legal name, uploads the ID to
// the private kyc-docs bucket, and sets kyc_status = 'pending'.
// Admin reviews in the KYC queue and sets kyc_status = 'approved',
// at which point the artist can upload.

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Upload, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'

export default function ArtistKYC({ currentUser, setCurrentUser }) {
  const [legalName, setLegalName]   = useState(currentUser?.kyc_legal_name || '')
  const [idFile,    setIdFile]      = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [error,     setError]       = useState('')
  const [success,   setSuccess]     = useState(false)

  const kycStatus = currentUser?.kyc_status

  // Already submitted or approved — show status screen
  if (kycStatus === 'approved') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <CheckCircle size={56} color="#22c55e" style={{ margin: '0 auto 20px', display: 'block' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>KYC Approved</h2>
        <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>
          Your identity has been verified. You can now upload music and videos.
        </p>
      </div>
    )
  }

  if (kycStatus === 'pending' && !success) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <Clock size={56} color="#ffb400" style={{ margin: '0 auto 20px', display: 'block' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>Under Review</h2>
        <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>
          Your identity documents are being reviewed. This usually takes 24–48 hours. You'll receive a notification once approved.
        </p>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!legalName.trim()) { setError('Please enter your full legal name.'); return }
    if (!idFile) { setError('Please upload a photo of your government ID.'); return }
    if (idFile.size > 10 * 1024 * 1024) { setError('File must be under 10MB.'); return }

    setUploading(true)
    setError('')

    try {
      const ext  = idFile.name.split('.').pop()
      const path = `${currentUser.id}/id.${ext}`
      const { error: upErr } = await supabase.storage
        .from('kyc-docs')
        .upload(path, idFile, { upsert: true, contentType: idFile.type })
      if (upErr) throw upErr

      const { error: dbErr } = await supabase.from('profiles').update({
        kyc_status:       'pending',
        kyc_submitted_at: new Date().toISOString(),
        kyc_id_path:      path,
        kyc_legal_name:   legalName.trim(),
      }).eq('id', currentUser.id)
      if (dbErr) throw dbErr

      if (setCurrentUser) setCurrentUser(prev => ({ ...prev, kyc_status: 'pending', kyc_legal_name: legalName.trim() }))
      setSuccess(true)
    } catch (e) {
      setError('Submission failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <Clock size={56} color="#ffb400" style={{ margin: '0 auto 20px', display: 'block' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>Submitted — Under Review</h2>
        <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>
          Thank you. We'll review your documents within 24–48 hours and notify you when approved.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>Identity Verification</h2>
      <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
        A one-time check required before uploading music or videos. Your ID is stored securely and is only viewable by our admin team.
      </p>

      {/* KYC vs Blue Tick distinction */}
      <div style={{ background: 'rgba(255,180,0,0.07)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10 }}>
        <AlertTriangle size={16} color="#ffb400" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: 'var(--grey-300)', lineHeight: 1.7 }}>
          <strong style={{ color: '#ffb400' }}>This is not the Blue Tick.</strong> KYC verification lets you upload content. The Blue Tick 🔵 is a separate milestone award (earned via streams, followers, and activity) — available from the Verification tab once you qualify.
        </p>
      </div>

      {kycStatus === 'rejected' && (
        <div style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid var(--border-red)', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#ff6b6b' }}>
            ❌ Your previous submission was rejected. Please re-submit with a clearer, unobstructed photo of a valid ID.
          </p>
        </div>
      )}

      {/* Legal name */}
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Full Legal Name</label>
        <input className="form-control" type="text" placeholder="As it appears on your ID"
          value={legalName} onChange={e => setLegalName(e.target.value)} />
      </div>

      {/* ID document upload */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">Government-Issued ID</label>
        <p style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 8, lineHeight: 1.6 }}>
          National ID card, passport, driver's licence, or voter's card. JPEG, PNG or PDF, max 10MB.
        </p>
        <div
          onClick={() => document.getElementById('kyc-id-input').click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 10, padding: '24px',
            textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--grey-500)' }} />
          <p style={{ fontSize: 13, color: idFile ? '#22c55e' : 'var(--grey-400)' }}>
            {idFile ? `✅ ${idFile.name}` : 'Click to upload your ID'}
          </p>
          <input id="kyc-id-input" type="file" accept=".jpg,.jpeg,.png,.pdf" hidden
            onChange={e => { setError(''); setIdFile(e.target.files?.[0] || null) }} />
        </div>
      </div>

      {error && (
        <div style={{ color: '#ff6b6b', fontSize: 13, background: 'rgba(200,16,46,0.08)', border: '1px solid var(--border-red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
        onClick={handleSubmit} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Submit for Review'}
      </button>

      <p style={{ marginTop: 16, fontSize: 11, color: 'var(--grey-600)', lineHeight: 1.6 }}>
        Your ID document is stored privately and encrypted. It is only accessible to our admin review team via a short-lived secure link. It is deleted after your verification is processed.
      </p>
    </div>
  )
}
