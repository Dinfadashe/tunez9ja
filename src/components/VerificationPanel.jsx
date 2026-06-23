import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { Shield, Upload, CheckCircle, Clock, XCircle, ChevronRight, AlertCircle } from 'lucide-react'

const MILESTONE_LABELS = {
  streams_needed: { label: 'Streams needed', icon: '🎵' },
  tracks_needed:  { label: 'Approved tracks', icon: '📀' },
  views_needed:   { label: 'Post views needed', icon: '👁' },
  posts_needed:   { label: 'Approved posts', icon: '📰' },
  days_needed:    { label: 'Account age (days)', icon: '📅' },
  tunez_needed:   { label: 'Organic TUNEZ earned', icon: '🪙' },
}

export default function VerificationPanel({ currentUser, onRoleSwitch }) {
  const [eligibility, setEligibility] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [step,        setStep]        = useState('status') // status | fee | kyc | submitted
  const [form,        setForm]        = useState({ legalName: '', socialLinks: '' })
  const [idFile,      setIdFile]      = useState(null)
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (!currentUser?.id) return
    supabase.rpc('check_verification_eligibility', { p_user_id: currentUser.id })
      .then(({ data }) => { setEligibility(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [currentUser?.id])

  // ── Paystack fee payment ───────────────────────────────────
  const payVerificationFee = () => {
    if (!window.PaystackPop) { setError('Payment system unavailable. Please try again.'); return }
    const handler = window.PaystackPop.setup({
      key:    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email:  currentUser.email,
      amount: 200000, // ₦2,000 in kobo
      currency: 'NGN',
      ref:    'VRF-' + currentUser.id.slice(0,8) + '-' + Date.now(),
      metadata: { user_id: currentUser.id, type: 'verification_fee' },
      onSuccess: async (res) => {
        await supabase.from('profiles').update({
          kyc_fee_paid: true,
          kyc_fee_ref: res.reference
        }).eq('id', currentUser.id)
        setEligibility(prev => ({ ...prev, kyc_fee_paid: true }))
        setStep('kyc')
      },
      onClose: () => {}
    })
    handler.openIframe()
  }

  // ── KYC submission ─────────────────────────────────────────
  const submitKYC = async () => {
    if (!form.legalName.trim()) { setError('Legal name is required'); return }
    if (!idFile) { setError('Please upload your government-issued ID'); return }
    if (idFile.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }

    setUploading(true)
    setError(null)

    try {
      // Upload ID to kyc-docs bucket
      const ext  = idFile.name.split('.').pop()
      const path = `${currentUser.id}/id.${ext}`
      const { error: upErr } = await supabase.storage
        .from('kyc-docs')
        .upload(path, idFile, { upsert: true, contentType: idFile.type })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('kyc-docs').getPublicUrl(path)

      // Save KYC data to profile
      const { error: dbErr } = await supabase.from('profiles').update({
        kyc_status:       'pending',
        kyc_submitted_at: new Date().toISOString(),
        kyc_id_url:       publicUrl,
        kyc_legal_name:   form.legalName.trim(),
        kyc_social_links: form.socialLinks.trim(),
        last_kyc_attempt: new Date().toISOString(),
      }).eq('id', currentUser.id)

      if (dbErr) throw dbErr

      setEligibility(prev => ({ ...prev, kyc_status: 'pending' }))
      setStep('submitted')
    } catch (e) {
      setError('Submission failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      CHECKING ELIGIBILITY...
    </div>
  )

  // ── Already verified ───────────────────────────────────────
  if (eligibility?.verified_type === 'milestone') {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 520 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔵</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>VERIFIED CREATOR</h2>
        <p style={{ color: 'var(--grey-300)', lineHeight: 1.7 }}>
          You have the Tunez9ja blue tick. Your account has a <strong style={{ color: '#ffb400' }}>1.5× TUNEZ earn multiplier</strong> and priority placement in listings.
        </p>
        <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.3)', borderRadius: 10, fontSize: 13, color: '#1DA1F2' }}>
          ✅ Verification active since {new Date(currentUser?.verified_at || Date.now()).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    )
  }

  // ── KYC submitted — awaiting review ───────────────────────
  if (eligibility?.kyc_status === 'pending' || step === 'submitted') {
    return (
      <div className="card" style={{ padding: 32, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Clock size={32} color="#ffb400" />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>UNDER REVIEW</h2>
            <p style={{ color: 'var(--grey-400)', fontSize: 13, marginTop: 4 }}>Your KYC is being reviewed by our team</p>
          </div>
        </div>
        <div style={{ padding: '16px 18px', background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 10, fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.7 }}>
          We review applications within <strong>3–5 working days</strong>. You'll receive an in-app notification once a decision is made. If approved, your blue tick and 1.5× earn rate activate immediately.
        </div>
      </div>
    )
  }

  // ── KYC rejected ──────────────────────────────────────────
  if (eligibility?.kyc_status === 'rejected') {
    const rejectDate    = currentUser?.last_kyc_attempt ? new Date(currentUser.last_kyc_attempt) : new Date()
    const reapplyDate   = new Date(rejectDate.getTime() + 60 * 24 * 60 * 60 * 1000)
    const canReapply    = new Date() >= reapplyDate

    return (
      <div className="card" style={{ padding: 32, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <XCircle size={32} color="var(--red)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>APPLICATION REJECTED</h2>
        </div>
        {currentUser?.kyc_reject_reason && (
          <div style={{ padding: '14px 18px', background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.25)', borderRadius: 10, fontSize: 14, color: 'var(--grey-300)', marginBottom: 20 }}>
            <strong>Reason:</strong> {currentUser.kyc_reject_reason}
          </div>
        )}
        {canReapply ? (
          <button onClick={() => setStep('fee')} className="btn btn-primary">
            Reapply Now
          </button>
        ) : (
          <p style={{ color: 'var(--grey-500)', fontSize: 13 }}>
            You can reapply after <strong>{reapplyDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
        )}
      </div>
    )
  }

  // ── Status page — show progress ───────────────────────────
  if (step === 'status') {
    const t = eligibility?.thresholds || {}
    const role = eligibility?.role

    const milestones = role === 'artist' ? [
      { key: 'streams', needed: 10000, have: t.streams_have || 0, label: 'Total Streams',    icon: '🎵' },
      { key: 'tracks',  needed: 5,     have: t.tracks_have  || 0, label: 'Approved Tracks',  icon: '📀' },
      { key: 'days',    needed: 90,    have: t.days_have    || 0, label: 'Account Age (days)',icon: '📅' },
      { key: 'tunez',   needed: 500,   have: Math.floor(t.tunez_have || 0), label: 'Organic TUNEZ Earned', icon: '🪙' },
    ] : [
      { key: 'views',   needed: 25000, have: t.views_have || 0,   label: 'Total Post Views', icon: '👁' },
      { key: 'posts',   needed: 10,    have: t.posts_have || 0,   label: 'Approved Posts',   icon: '📰' },
      { key: 'days',    needed: 90,    have: t.days_have  || 0,   label: 'Account Age (days)',icon: '📅' },
      { key: 'tunez',   needed: 500,   have: Math.floor(t.tunez_have || 0), label: 'Organic TUNEZ Earned', icon: '🪙' },
    ]

    const allMet = eligibility?.eligible
    const violations = t.violations > 0

    return (
      <div style={{ maxWidth: 560 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(29,161,242,0.15)', border: '2px solid #1DA1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="#1DA1F2" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, marginBottom: 2 }}>GET VERIFIED</h2>
            <p style={{ color: 'var(--grey-400)', fontSize: 13 }}>Earn the Tunez9ja blue tick 🔵</p>
          </div>
        </div>

        {/* Violations warning */}
        {violations && (
          <div style={{ padding: '12px 16px', background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 10, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
            <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0 }} />
            <span>Your account has content violations. All violations must be resolved before applying.</span>
          </div>
        )}

        {/* Milestone progress */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', letterSpacing: 2, marginBottom: 16 }}>MILESTONE PROGRESS</div>
          {milestones.map(m => {
            const pct  = Math.min(100, (m.have / m.needed) * 100)
            const done = m.have >= m.needed
            return (
              <div key={m.key} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span>{m.icon} {m.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: done ? '#00c864' : 'var(--grey-400)', fontWeight: done ? 700 : 400 }}>
                    {m.have.toLocaleString()} / {m.needed.toLocaleString()} {done ? '✅' : ''}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: done ? '#00c864' : '#1DA1F2', borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Benefits */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', letterSpacing: 2, marginBottom: 14 }}>BLUE TICK BENEFITS</div>
          {[
            ['🔵', 'Blue verified badge on all content, comments, and your profile'],
            ['⚡', '1.5× TUNEZ earn multiplier on all organic earnings — forever'],
            ['🔝', 'Priority placement in music and blog listings'],
            ['💬', 'Direct messages from fans'],
            ['⭐', 'Eligible for monthly homepage feature slot'],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 13, color: 'var(--grey-300)' }}>
              <span style={{ flexShrink: 0, fontSize: 16 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {allMet && !violations ? (
          <button onClick={() => setStep('fee')} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, gap: 10 }}>
            Apply Now — Pay ₦2,000 Verification Fee <ChevronRight size={18} />
          </button>
        ) : (
          <div style={{ padding: '14px 18px', background: 'var(--bg-surface)', borderRadius: 10, fontSize: 13, color: 'var(--grey-500)', textAlign: 'center' }}>
            Complete all milestones above to unlock your application
          </div>
        )}
      </div>
    )
  }

  // ── Step: Pay fee ─────────────────────────────────────────
  if (step === 'fee') {
    if (eligibility?.kyc_fee_paid) { setStep('kyc'); return null }
    return (
      <div className="card" style={{ padding: 32, maxWidth: 480 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>VERIFICATION FEE</h2>
        <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          A <strong style={{ color: 'var(--white)' }}>non-refundable ₦2,000</strong> application fee is required before KYC review. This covers the cost of manual document verification and deters spam applications.
          <br /><br />
          If your application is rejected, you may reapply after <strong>60 days</strong> and must pay the fee again.
        </p>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={payVerificationFee} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
            Pay ₦2,000 & Continue
          </button>
          <button onClick={() => setStep('status')} className="btn btn-secondary" style={{ padding: '12px 18px' }}>
            Back
          </button>
        </div>
      </div>
    )
  }

  // ── Step: KYC form ────────────────────────────────────────
  if (step === 'kyc') {
    return (
      <div className="card" style={{ padding: 32, maxWidth: 520 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>SUBMIT KYC</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, marginBottom: 28 }}>
          Your details are encrypted and only seen by Tunez9ja admins.
        </p>

        {/* Legal name */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 6 }}>
            FULL LEGAL NAME *
          </label>
          <input
            value={form.legalName}
            onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))}
            placeholder="As it appears on your government ID"
            maxLength={120}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#1DA1F2'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* ID upload */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 6 }}>
            GOVERNMENT-ISSUED ID * (NIN slip, passport, driver's licence)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 28, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#1DA1F2'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {idFile ? (
              <div>
                <CheckCircle size={24} color="#00c864" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>{idFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 4 }}>{(idFile.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            ) : (
              <div>
                <Upload size={24} color="var(--grey-500)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>Click to upload</div>
                <div style={{ fontSize: 12, color: 'var(--grey-600)', marginTop: 4 }}>JPG, PNG, PDF — max 10MB</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: 'none' }} onChange={e => setIdFile(e.target.files?.[0] || null)} />
        </div>

        {/* Social links */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 6 }}>
            SOCIAL MEDIA LINKS (optional — helps verification)
          </label>
          <textarea
            value={form.socialLinks}
            onChange={e => setForm(f => ({ ...f, socialLinks: e.target.value }))}
            placeholder="Instagram, Twitter/X, YouTube, Facebook..."
            rows={3}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#1DA1F2'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Disclaimer */}
        <div style={{ padding: '12px 14px', background: 'rgba(29,161,242,0.06)', border: '1px solid rgba(29,161,242,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.6, marginBottom: 20 }}>
          By submitting, you confirm that all information provided is accurate and that you are the rightful owner of the submitted identity document. False submissions result in permanent account suspension.
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={submitKYC} disabled={uploading} className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '13px', fontSize: 14, background: '#1DA1F2', borderColor: '#1DA1F2' }}>
            {uploading ? 'Submitting...' : '🔵 Submit KYC Application'}
          </button>
          <button onClick={() => setStep('status')} className="btn btn-secondary" style={{ padding: '13px 18px' }}>
            Back
          </button>
        </div>
      </div>
    )
  }

  return null
}
