import React from 'react'
import { Shield, AlertTriangle } from 'lucide-react'

// ── Music upload copyright agreement ──────────────────────────
export function MusicCopyrightAgreement({ agreed, onChange }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid ${agreed ? 'rgba(0,200,100,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: 16, marginBottom: 20, transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
        <Shield size={18} color={agreed ? '#00c864' : 'var(--grey-500)'} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Copyright Declaration</div>
          <div style={{ fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.7 }}>
            Before submitting your track, please confirm the following:
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {[
          'I am the original creator of this music or have obtained all necessary rights and licenses',
          'I own or have cleared all samples, interpolations, and third-party elements in this track',
          'I own or have rights to all cover artwork submitted with this track',
          'This content does not infringe on any third-party copyright, trademark, or intellectual property',
          'I understand that submitting copyrighted content I do not own may result in account suspension',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6 }}>
            <span style={{ color: agreed ? '#00c864' : 'var(--grey-500)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
              {agreed ? '✓' : '○'}
            </span>
            {item}
          </div>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => onChange(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--red)', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: agreed ? '#00c864' : 'var(--white)', lineHeight: 1.5 }}>
          I confirm that I own or have the legal rights to all content in this submission, and I accept full responsibility for any copyright claims arising from this upload.
        </span>
      </label>
    </div>
  )
}

// ── Blog post copyright agreement ──────────────────────────────
export function BlogCopyrightAgreement({ agreed, onChange }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid ${agreed ? 'rgba(0,200,100,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: 16, marginBottom: 20, transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
        <Shield size={18} color={agreed ? '#00c864' : 'var(--grey-500)'} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Content Originality Declaration</div>
          <div style={{ fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.7 }}>
            Before submitting your post, please confirm the following:
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {[
          'This article is my own original work and has not been copied from another source',
          'Any quotes from third parties are properly attributed and within fair use limits',
          'Any images used are either my own, royalty-free, or properly licensed',
          'This post does not defame, harass, or make false factual claims about any individual or entity',
          'I understand that plagiarized or infringing content will be rejected and may result in account suspension',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6 }}>
            <span style={{ color: agreed ? '#00c864' : 'var(--grey-500)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
              {agreed ? '✓' : '○'}
            </span>
            {item}
          </div>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => onChange(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--red)', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: agreed ? '#00c864' : 'var(--white)', lineHeight: 1.5 }}>
          I confirm this post is original content that I have the right to publish, and I accept full responsibility for its content.
        </span>
      </label>
    </div>
  )
}

// ── Inline DMCA notice (shown below any submitted content) ─────
export function DMCANotice() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: 6, marginTop: 12 }}>
      <AlertTriangle size={14} color="#ffb400" style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6, margin: 0 }}>
        All submissions are reviewed for copyright compliance. Infringing content will be rejected.
        To report a copyright violation, email <a href="mailto:dmca@tunez9ja.com" style={{ color: 'var(--red)' }}>dmca@tunez9ja.com</a>.
      </p>
    </div>
  )
}
