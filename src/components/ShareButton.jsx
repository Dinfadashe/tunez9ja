import React, { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

export default function ShareButton({ url, text, title, compact = false }) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  const share = (platform) => {
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    }
    window.open(links[platform], '_blank', 'width=600,height=400')
    setOpen(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
  }

  // Use native Web Share API on mobile if available
  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {})
    } else {
      setOpen(o => !o)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={nativeShare}
        title="Share"
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 0 : 6,
          padding: compact ? '6px' : '8px 14px',
          borderRadius: compact ? '50%' : 8,
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--grey-300)',
          cursor: 'pointer',
          fontSize: 13,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.color='var(--red)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--grey-300)' }}
      >
        <Share2 size={compact ? 14 : 15} />
        {!compact && 'Share'}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 180,
          }}>
            <div style={{ padding:'8px 12px', fontSize:10, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, borderBottom:'1px solid var(--border)' }}>
              SHARE ON
            </div>
            {[
              { key:'whatsapp', label:'WhatsApp',  color:'#25D366', emoji:'📱' },
              { key:'twitter',  label:'Twitter/X', color:'#1DA1F2', emoji:'🐦' },
              { key:'telegram', label:'Telegram',  color:'#0088cc', emoji:'✈️' },
              { key:'facebook', label:'Facebook',  color:'#1877F2', emoji:'📘' },
            ].map(s => (
              <button key={s.key} onClick={() => share(s.key)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'none', border:'none', color:'var(--grey-300)', cursor:'pointer', fontSize:13, textAlign:'left' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
            <div style={{ borderTop:'1px solid var(--border)' }}>
              <button onClick={copyLink}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'none', border:'none', color: copied ? '#00c864' : 'var(--grey-300)', cursor:'pointer', fontSize:13, textAlign:'left' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
