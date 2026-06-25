import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { Camera, Save, User } from 'lucide-react'

// Avatar shown everywhere — falls back to initial
export function Avatar({ profile, size = 40, style = {} }) {
  const url = profile?.avatar_url
  const name = profile?.name || '?'
  const initial = name[0]?.toUpperCase()

  const roleColor = {
    admin:   '#c8102e',
    artist:  '#7b4fff',
    blogger: '#00b4dc',
    user:    '#00c864',
  }[profile?.role] || '#c8102e'

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: `2px solid ${roleColor}`,
          ...style
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: roleColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.4,
      color: 'white', flexShrink: 0, userSelect: 'none',
      border: `2px solid ${roleColor}44`,
      ...style
    }}>
      {initial}
    </div>
  )
}

// Full profile editor panel used in all dashboards
export default function ProfileEditor({ currentUser, onUpdated }) {
  const [name,     setName]     = useState(currentUser?.name     || '')
  const [bio,      setBio]      = useState(currentUser?.bio      || '')
  const [location, setLocation] = useState(currentUser?.location || '')
  const [website,  setWebsite]  = useState(currentUser?.website  || '')
  const [avatar,   setAvatar]   = useState(currentUser?.avatar_url || null)
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState(null)
  const fileRef = useRef()

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type and size
    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'Please select an image file' }); return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image must be under 2MB' }); return
    }

    setUploading(true)
    setMsg(null)

    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${currentUser.id}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })

      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // Add cache-bust
      const url = publicUrl + '?t=' + Date.now()
      setAvatar(url)
      setMsg({ type: 'success', text: 'Photo uploaded!' })
    } catch (err) {
      setMsg({ type: 'error', text: 'Upload failed: ' + err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { setMsg({ type: 'error', text: 'Name is required' }); return }

    setSaving(true)
    setMsg(null)

    // Sanitize inputs
    const updates = {
      name:       name.trim().slice(0, 80),
      bio:        bio.trim().slice(0, 300),
      location:   location.trim().slice(0, 100),
      website:    website.trim().split('<').join('').split('>').join('').split('"').join('').split("'").join('').slice(0, 200),
      avatar_url: avatar,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id)
    if (error) console.warn('Profile update error (run setup.sql if columns missing):', error.message)

    if (error) {
      setMsg({ type: 'error', text: 'Save failed: ' + error.message })
    } else {
      setMsg({ type: 'success', text: 'Profile saved!' })
      onUpdated?.({ ...currentUser, ...updates })
    }
    setSaving(false)
  }

  return (
    <div className="card" style={{ padding: 28, maxWidth: 560 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 24 }}>
        EDIT PROFILE
      </h3>

      {/* Avatar upload — tap anywhere on avatar to upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          title="Tap to change photo"
          style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
        >
          {/* Avatar circle */}
          <Avatar profile={{ ...currentUser, avatar_url: avatar }} size={90} />

          {/* Camera overlay — covers entire avatar */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, opacity: uploading ? 1 : 0, transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => { if (!uploading) e.currentTarget.style.opacity = 0 }}
          >
            {uploading
              ? <div style={{ width: 22, height: 22, borderRadius: '50%', border: '3px solid white', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
              : <Camera size={22} color="white" />
            }
            <span style={{ fontSize: 9, color: 'white', fontFamily: 'var(--font-mono)', letterSpacing: 1, textAlign: 'center', lineHeight: 1.2 }}>
              {uploading ? 'UPLOADING' : 'TAP TO\nCHANGE'}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{name || 'Your Name'}</div>
          <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {currentUser?.role}{currentUser?.is_verified ? ' · ✅ Verified' : ''}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', cursor: 'pointer' }}
            onClick={() => !uploading && fileRef.current?.click()}>
            📷 {uploading ? 'Uploading...' : 'Change profile photo'}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
      </div>

      {/* Fields */}
      {[
        { label: 'Display Name *', val: name,     set: setName,     max: 80,  ph: 'Your name' },
        { label: 'Location',       val: location, set: setLocation, max: 100, ph: 'Lagos, Nigeria' },
        { label: 'Website',        val: website,  set: setWebsite,  max: 200, ph: 'https://yoursite.com' },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', marginBottom: 6, letterSpacing: 1 }}>
            {f.label.toUpperCase()}
          </label>
          <input
            value={f.val}
            onChange={e => f.set(e.target.value)}
            maxLength={f.max}
            placeholder={f.ph}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      ))}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', marginBottom: 6, letterSpacing: 1 }}>
          BIO (MAX 300 CHARS)
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Tell the community about yourself..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = 'var(--red)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{ fontSize: 11, color: 'var(--grey-600)', textAlign: 'right', marginTop: 4 }}>{bio.length}/300</div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(200,16,46,0.1)', border: `1px solid ${msg.type === 'success' ? '#00c864' : 'var(--red)'}`, color: msg.type === 'success' ? '#00c864' : 'var(--red)' }}>
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary"
        style={{ gap: 8 }}>
        <Save size={15} />
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}
