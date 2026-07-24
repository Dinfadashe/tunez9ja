import React, { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

export default function ShareButton({ url, text, title, coverUrl, compact = false }) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  // Rich text includes the cover URL on platforms that auto-preview images
  // from URLs in the message body (WhatsApp, Telegram do this natively).
  const shareText = text

  const share = (platform) => {
    // WhatsApp and Telegram both auto-unfurl image URLs in the text
    const textWithCover = coverUrl ? `${text}\n🖼 ${coverUrl}\n` : text
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(textWithCover + '\n' + url)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(textWithCover)}`,
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

  // Native Web Share API — on Android Chrome/Edge and Safari 15+
  // we attempt to attach the cover image as a file so it shows
  // as a rich preview card. Falls back to text-only if unsupported.
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        let shareData = { title, text: shareText, url }
        if (coverUrl && navigator.canShare) {
          try {
            const res = await fetch(coverUrl)
            const blob = await res.blob()
            const ext = blob.type.includes('png') ? 'png' : 'jpg'
            const file = new File([blob], `cover.${ext}`, { type: blob.type })
            const candidate = { ...shareData, files: [file] }
            if (navigator.canShare(candidate)) shareData = candidate
          } catch { /* cover fetch failed — share without file */ }
        }
        await navigator.share(shareData)
      } catch { /* cancelled or unsupported */ }
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
            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
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
