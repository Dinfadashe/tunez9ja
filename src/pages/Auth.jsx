import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchMyProfile, forgetMyProfile } from '../lib/myProfile.js'
import { claimReferralBonus } from '../lib/tunez.js'
import { Logo } from '../components/UI.jsx'
import { Eye, EyeOff, Mic2, Newspaper, Shield, User as User2, Headphones } from 'lucide-react'

// Input sanitization
const sanitize = (str) => { if (!str) return ''; return str.trim().split('<').join('').split('>').join('').split('"').join('').split("'").join('').split('`').join('') }
const sanitizeEmail = (email) => { if (!email) return ''; var e = email.trim().toLowerCase(); var ok = 'abcdefghijklmnopqrstuvwxyz0123456789@._+-'; var out = ''; for (var i=0;i<e.length;i++) { if (ok.indexOf(e[i]) >= 0) out += e[i]; } return out }



const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

const ROLE_CONFIG = {
  admin:   { label: 'Admin',   icon: Shield,    color: 'var(--red)',  page: 'admin-dashboard'   },
  artist:  { label: 'Artist',  icon: Mic2,      color: '#7b4fff',     page: 'artist-dashboard'  },
  blogger: { label: 'Blogger', icon: Newspaper, color: '#00b4dc',     page: 'blogger-dashboard' },
  user:    { label: 'User',    icon: User2,     color: '#00c864',     page: 'user-dashboard'    },
}

export function LoginPage({ setPage, setProfile, setActiveRole }) {
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [rolePicker, setRolePicker] = useState(null)
  const [notice, setNotice]     = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  const sendReset = async () => {
    setError(''); setNotice('')
    const email = form.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter your email above, then tap "Forgot password?" again.'); return }
    setSendingReset(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?page=reset-password`,
    })
    setSendingReset(false)
    // Same message whether or not the account exists (no account probing)
    if (resetErr && !/rate|seconds/i.test(resetErr.message)) { setError('Could not send the reset email. Please try again shortly.'); return }
    if (resetErr) { setError('Please wait a minute before requesting another reset email.'); return }
    setNotice('If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data, error: authError } = await Promise.race([
        supabase.auth.signInWithPassword({ email: form.email, password: form.password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 15000))
      ])
      if (authError) {
        const m = authError.message || ''
        setError(/email not confirmed/i.test(m) ? 'Please confirm your email first — check your inbox for the confirmation link.'
          : /invalid login credentials/i.test(m) ? 'Incorrect email or password.'
          : m || 'Login failed.')
        setLoading(false); return
      }
      const { data: profile } = (forgetMyProfile(), await fetchMyProfile())
      setLoading(false)
      if (!profile) { setError('Profile not found. Contact support.'); return }
      const availableRoles = profile.available_roles || [profile.role]
      if (availableRoles.length > 1) {
        setRolePicker({ profile, roles: availableRoles })
      } else {
        enterAs(profile, profile.role)
      }
    } catch (err) { setError(typeof err === 'string' ? err : err.message || 'Something went wrong. Please try again.'); setLoading(false) }
  }

  const enterAs = (profile, role) => {
    const merged = { ...profile, active_role: role }
    setProfile(merged); setActiveRole(role); setRolePicker(null)
    supabase.from('profiles').update({ active_role: role }).eq('id', profile.id)
    setPage(ROLE_CONFIG[role]?.page || 'home')
  }

  // ── Role picker ────────────────────────────────────────────
  if (rolePicker) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          <div className="auth-logo"><Logo size={48} /><span className="auth-logo-text">TUNEZ<span>9JA</span></span></div>
          <h2 className="auth-title">Enter as...</h2>
          <p className="auth-sub" style={{ marginBottom: 28 }}>Your account has multiple roles. Choose which dashboard to open.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rolePicker.roles.map(role => {
              const cfg = ROLE_CONFIG[role]; if (!cfg) return null
              return (
                <button key={role} onClick={() => enterAs(rolePicker.profile, role)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--white)', transition: 'all 0.2s', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: cfg.color+'22', border: `1px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <cfg.icon size={20} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 0.5 }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey-300)', marginTop: 2 }}>
                      {role === 'admin' && 'Manage music, posts, and users'}
                      {role === 'artist' && 'Upload and manage your music'}
                      {role === 'blogger' && 'Write and manage your posts'}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: cfg.color, fontSize: 18 }}>→</div>
                </button>
              )
            })}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 20, width: '100%', justifyContent: 'center', fontSize: 13 }}
            onClick={() => { setRolePicker(null); supabase.auth.signOut() }}>
            ← Sign in with a different account
          </button>
        </div>
      </div>
    )
  }

  // ── Login form ─────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Logo size={48} /><span className="auth-logo-text">TUNEZ<span>9JA</span></span></div>
        <h2 className="auth-title">Sign In</h2>
        <p className="auth-sub">Welcome back to Nigeria's #1 music blog</p>

        {error && (
          <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff6b6b' }}>
            ⚠️ {error}
          </div>
        )}

        {notice && (
          <div role="status" style={{ background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#00c864' }}>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="form-control" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 6 }}>
            <button type="button" onClick={sendReset} disabled={sendingReset}
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', fontSize: 13, cursor: 'pointer', padding: '6px 0', textDecoration: 'underline' }}>
              {sendingReset ? 'Sending…' : 'Forgot password?'}
            </button>
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <a onClick={() => setPage('register')}>Join Tunez9ja</a>
        </div>
      </div>
    </div>
  )
}

export function RegisterPage({ setPage, setProfile, setActiveRole }) {
  const [step, setStep]     = useState(1)
  const [refCode, setRefCode] = useState('')
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: '', bio: '', genre: '' })

  // Check URL for referral code (also sessionStorage fallback after URL clean)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setRefCode(ref)
      sessionStorage.setItem('t9_ref', ref) // save before App cleans URL
    } else {
      // Fallback: check sessionStorage (set before URL was cleaned)
      const saved = sessionStorage.getItem('t9_ref')
      if (saved) setRefCode(saved)
    }
  }, [])
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleRole = (role) => { setForm(p => ({ ...p, role })); setStep(2) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.name || !form.email || !form.password || !form.role) { setError('Please fill all required fields'); return }
    if (!['user', 'artist', 'blogger'].includes(form.role)) { setError('Please choose a valid account type'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!termsAgreed) { setError('Please agree to the Terms of Service and Privacy Policy to continue'); return }
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name, role: form.role, bio: form.bio || null, genre: form.genre || null } }
      })
      if (signUpError) {
        const msg = signUpError.message || signUpError.msg || signUpError.error_description || ''
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
          setError('This email is already registered. Please log in instead.')
        } else if (msg) {
          setError(msg)
        } else {
          setError('Signup failed. Please check your details and try again.')
        }
        setLoading(false); return
      }
      // Everyone gets 'user' as base role + their chosen role
      const availableRoles = form.role === 'user'
        ? ['user']
        : ['user', form.role]

      // Keep the referral code until this account has a session (claimed server-side)
      const pendingRef = String(refCode || '').trim().replace(/[^A-Za-z0-9-]/g, '').slice(0, 64)
      if (pendingRef) localStorage.setItem('t9_ref_pending', pendingRef)

      // Email confirmation on: there is a user but no session yet. Don't
      // pretend the person is logged in — every write would fail.
      if (data?.user?.id && !data.session) {
        setLoading(false)
        setError('✅ Account created! Check your email and tap the confirmation link, then sign in.')
        return
      }

      // If email confirmation required, data.user may be null
      if (!data?.user?.id) {
        setError(''); setLoading(false)
        setStep && setStep('verify') // will show success message
        // Show success message
        setError('✅ Account created! Please check your email to confirm your account.')
        return
      }
      const profileData = {
        id: data.user.id, email: form.email, name: form.name,
        role: form.role, active_role: form.role,
        available_roles: availableRoles,
        bio: form.bio || null, genre: form.genre || null,
        is_verified: false, earn_multiplier: 1.0,
        content_violations: 0,
      }
      const { error: profileErr } = await supabase.from('profiles').upsert(profileData)
      if (profileErr) {
        console.error('Profile upsert error:', profileErr)
        // Still continue - auth account was created
      }
      // Referral bonus (server checks code, once-only, account age)
      if (pendingRef) {
        claimReferralBonus(pendingRef).finally(() => localStorage.removeItem('t9_ref_pending'))
      }

      // Generate referral code for new user
      // Referral code is generated by the database at signup
      const { data: fresh } = await supabase.from('profiles').select('referral_code').eq('id', data.user.id).maybeSingle()
      const refCodeNew = fresh?.referral_code || null

      // Clear any stale cache
      sessionStorage.removeItem('t9_profile')
      sessionStorage.removeItem('t9_ref')
      setProfile({ ...profileData, referral_code: refCodeNew })
      setActiveRole(form.role); setLoading(false)
      if (form.role === 'artist')       setPage('artist-dashboard')
      else if (form.role === 'blogger') setPage('blogger-dashboard')
      else if (form.role === 'user')    setPage('user-dashboard')
      else setPage('home')
    } catch (err) { setError(typeof err === 'string' ? err : err.message || 'Something went wrong. Please try again.'); setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 1 ? 560 : 460 }}>
        <div className="auth-logo"><Logo size={48} /><span className="auth-logo-text">TUNEZ<span>9JA</span></span></div>

        {step === 1 ? (
          <>
            <h2 className="auth-title">Join as...</h2>
            <p className="auth-sub">Choose your role on the platform</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginTop: 8 }}>
              <RoleCard icon={<Mic2 size={32} color="var(--red)" />} title="Artist"
                desc="Upload your music and get discovered by thousands of fans"
                onClick={() => handleRole('artist')} color="var(--red)" />
              <RoleCard icon={<Newspaper size={32} color="#00b4dc" />} title="Blogger"
                desc="Write music reviews, news, gossip, and entertainment features"
                onClick={() => handleRole('blogger')} color="#00b4dc" />
            <RoleCard icon={<Headphones size={32} color="#00c864" />} title="User"
                desc="Stream music, watch videos, read posts and earn TUNEZ tokens"
                onClick={() => handleRole('user')} color="#00c864" />
            </div>
            <div className="auth-footer">Already have an account? <a onClick={() => setPage('login')}>Sign In</a></div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ padding: '6px 0', fontSize: 13 }}>← Back</button>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>{form.role?.toUpperCase()} ACCOUNT</div>
            </div>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-sub" style={{ marginBottom: 24 }}>Join Tunez9ja for free</p>

            {error && (
              <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff6b6b' }}>
                ⚠️ {typeof error === 'string' ? error : (error && error.message) ? error.message : 'Something went wrong. Please try again.'}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name / Stage Name *</label>
                <input className="form-control" placeholder="e.g. Burna Wave" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-control" type="password" placeholder="Min. 8 characters" autoComplete="new-password" minLength={8} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
              </div>
              {form.role === 'artist' && (
                <div className="form-group">
                  <label className="form-label">Primary Genre</label>
                  <select className="form-control" value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}>
                    <option value="">Select genre</option>
                    {['Afrobeats','Afropop','Highlife','Amapiano','Fuji','Hip-Hop','R&B','Gospel','Street Pop'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-control" placeholder="Tell us about yourself..." rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>


              {/* ── REFERRAL CODE ── */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Referral Code
                  {refCode && <span style={{ fontSize: 10, background: 'rgba(0,200,100,0.15)', color: '#00c864', borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--font-mono)' }}>AUTO-FILLED</span>}
                  {!refCode && <span style={{ fontSize: 10, color: 'var(--grey-600)' }}>(optional — earn 15 TUNEZ for both)</span>}
                </label>
                <input
                  className="form-control"
                  placeholder="Paste a friend's referral code"
                  value={refCode}
                  onChange={e => setRefCode(e.target.value.trim().toUpperCase())}
                  style={{ letterSpacing: refCode ? 2 : 0, fontFamily: refCode ? 'var(--font-mono)' : 'inherit' }}
                />
              </div>

              {/* ── TERMS AGREEMENT ── */}
              <div style={{ background: 'var(--bg-surface)', border: `1px solid ${termsAgreed ? 'rgba(0,200,100,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: 16, marginBottom: 20, transition: 'border-color 0.2s' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.6 }}>
                    By creating an account I agree to Tunez9ja's{' '}
                    <a onClick={() => setPage('terms')} style={{ color: 'var(--red)', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</a>{' '}
                    and{' '}
                    <a onClick={() => setPage('privacy')} style={{ color: 'var(--red)', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</a>.
                    I understand that all content I submit must comply with copyright law and that infringing content will result in account suspension.
                  </span>
                </label>
              </div>

              <button className="btn btn-primary" type="submit"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, opacity: termsAgreed ? 1 : 0.65 }}
                disabled={loading || !termsAgreed}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <div className="auth-footer">Already have an account? <a onClick={() => setPage('login')}>Sign In</a></div>
          </>
        )}
      </div>
    </div>
  )
}

function RoleCard({ icon, title, desc, onClick, color }) {
  return (
    <button onClick={onClick}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'var(--white)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)' }}>
      <div style={{ marginBottom: 14 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.6 }}>{desc}</div>
    </button>
  )
}


// ── Reset password (landing page of the recovery email link) ────────────────
export function ResetPasswordPage({ setPage }) {
  const [pw, setPw]           = useState('')
  const [pw2, setPw2]         = useState('')
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [hasSession, setHasSession] = useState(null)

  useEffect(() => {
    // The recovery link signs the user in temporarily; give supabase-js a
    // moment to read the token from the URL before deciding it's invalid.
    let tries = 0
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session || tries++ > 6) setHasSession(!!session)
      else setTimeout(check, 500)
    }
    check()
  }, [])

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (pw !== pw2) { setError('Passwords do not match'); return }
    setSaving(true)
    const { error: upErr } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (upErr) { setError(upErr.message || 'Could not update password. Request a new reset link.'); return }
    setDone(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title" style={{ marginBottom: 8 }}>Set a new password</h1>
        {hasSession === null && <p style={{ color: 'var(--grey-300)' }}>Checking your reset link…</p>}
        {hasSession === false && (
          <>
            <p style={{ color: 'var(--grey-300)', marginBottom: 16 }}>This reset link is invalid or has expired.</p>
            <button className="btn btn-primary" onClick={() => setPage('login')}>Back to Sign In</button>
          </>
        )}
        {hasSession && done && (
          <>
            <p style={{ color: '#00c864', marginBottom: 16 }}>✅ Your password has been updated.</p>
            <button className="btn btn-primary" onClick={() => setPage('home')}>Continue</button>
          </>
        )}
        {hasSession && !done && (
          <form onSubmit={submit}>
            {error && <div role="alert" style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff6b6b' }}>⚠️ {error}</div>}
            <div className="form-group">
              <label className="form-label">New password</label>
              <input className="form-control" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={e => setPw(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input className="form-control" type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={e => setPw2(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
