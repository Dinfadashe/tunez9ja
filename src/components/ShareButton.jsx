import React, { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

export default function ShareButton({ url, text, title, coverUrl, compact = false }) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  // The link itself carries the preview: the share-meta edge function serves
  // the item's title, description and cover as Open Graph tags, so WhatsApp,
  // Facebook, X, Telegram etc. render a proper card. Never paste the raw image
  // URL into the message — that makes apps preview the bare image instead.
  const share = (platform) => {
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    }
    window.open(links[platform], '_blank', 'noopener,width=600,height=500')
    setOpen(false)
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
  }

  // Native share sheet (Android / iOS). Share the link only — attaching the
  // cover as a file made WhatsApp & co. send just the picture and drop the link.
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }) }
      catch { /* cancelled */ }
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
          <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '110%', right: 0,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 180,
          }}>
            {/* Cover thumbnail preview inside the share dropdown */}
            {coverUrl && (
              <div style={{ width:'100%', height:90, overflow:'hidden', background:'var(--bg-surface)' }}>
                <img src={coverUrl} alt="cover" loading="lazy" decoding="async"
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
            )}
            <div style={{ padding:'8px 12px', fontSize:10, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, borderBottom:'1px solid var(--border)' }}>
              SHARE ON
            </div>
            {[
              { key:'whatsapp', label:'WhatsApp',  emoji:'📱' },
              { key:'twitter',  label:'Twitter/X', emoji:'🐦' },
              { key:'telegram', label:'Telegram',  emoji:'✈️' },
              { key:'facebook', label:'Facebook',  emoji:'📘' },
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
