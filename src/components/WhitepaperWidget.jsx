import React, { useState } from 'react'
import { X, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react'

const WP = {
  title: 'TUNEZ9JA WHITEPAPER',
  subtitle: 'A Decentralised Music Streaming & Reward Ecosystem for the African Digital Economy',
  version: 'Version 1.0 · 2025',
  sections: [
    {
      id: 'exec',
      heading: 'Executive Summary',
      content: `Nigeria is home to one of the world's most vibrant music industries. Afrobeats, Highlife, Fuji, and a growing wave of Afrofusion genres have earned global recognition — yet the overwhelming majority of Nigerian artists receive no financial benefit from the digital streams their music generates.

Tunez9ja is a Nigerian-built, community-owned music streaming and entertainment platform that fundamentally reimagines this relationship. By combining a native digital token economy (TUNEZ), transparent content monetisation, and a community of editors, bloggers and artists — all hosted on Nigerian-built infrastructure — Tunez9ja creates a closed-loop ecosystem where every participant is rewarded for the value they contribute.`
    },
    {
      id: 'problem',
      heading: '1. The Problem',
      content: `**The Streaming Paradox:** Nigeria's music export value has grown exponentially. Yet despite billions of streams on Spotify, Apple Music, YouTube Music and Audiomack, the financial return to Nigerian artists — particularly independent and emerging acts — remains negligible.

• Per-stream rates average $0.003–$0.005, favouring artists with tens of millions of listeners
• Opaque royalty systems erode value at every stage before it reaches artists  
• Currency risk: royalties arrive in foreign currencies with unfavourable conversion rates
• No credible local discovery platform — emerging artists compete on Western-algorithm platforms

**The Fan Economy Gap:** Nigerian music fans drive viral moments, power chart movements, fill stadiums and create culture. Yet their streaming, sharing and promoting earns them nothing.

**The Blogger Problem:** Music journalism in Nigeria is thriving on social media but commercially precarious. Independent bloggers drive discovery but receive no share of the value they generate.`
    },
    {
      id: 'solution',
      heading: '2. The Solution',
      content: `Tunez9ja addresses these structural problems through four interlocking mechanisms:

• A native reward token (TUNEZ) that compensates every participant
• Direct artist monetisation through premium content and transparent revenue splits
• A community editorial layer that professionalises music journalism
• Local-first infrastructure optimised for Nigerian network conditions

**Platform Pillars:**
Music · Blog · Videos · Artist Portal · Community`
    },
    {
      id: 'token',
      heading: '3. TUNEZ Token Economy',
      content: `TUNEZ is the native in-platform digital token. In Phase 1, TUNEZ functions as an in-app credit earned through engagement and spent to unlock premium content. In Phase 2, TUNEZ migrates on-chain as a utility token.

**Earning TUNEZ:**
Streaming a track → 10T · Reading a blog post → 6T · Watching a video → 8T
Reacting to content → 2T · Leaving a comment → 4T · Daily login → 5T · Referral → 15T

**Revenue Split on Premium Unlocks:**
Content creator (artist/blogger) → 70% · Platform → 15% · Editor → 15%

**Purchase Packages (Naira):**
100T = ₦500 · 300T = ₦1,500 · 700T = ₦3,000 · 1,500T = ₦6,000 · 3,500T = ₦10,000

**Halving System:**
Genesis Era (0–1,000 users): 1.0× earn rate, 80T daily cap
Era 1 (1K–5K): 0.75× · Era 2 (5K–20K): 0.50× · Era 3 (20K–100K): 0.25×
Era 4 (100K–500K): 0.125× · Era 5+ (500K+): 0.0625×`
    },
    {
      id: 'roles',
      heading: '4. Roles Ecosystem',
      content: `**Users** — Stream, read, watch, comment, earn TUNEZ and unlock premium content.

**Artists** — Verified musicians who upload and monetise music. Earn 70% of every premium unlock. Verified artists earn at 1.5× multiplier. Requirements: 10,000+ streams · 5+ approved tracks · 90+ days on platform · KYC + ₦2,000 fee.

**Bloggers** — Music journalists who publish through the editorial system. Same 1.5× multiplier post-verification. Requirements: 25,000+ post views · 10+ approved posts · 90+ days on platform.

**Editors** — Professional layer between creators and publication. Earn 5T per free post approved + 15% of premium post price. Any user may apply by submitting a CV and motivation statement.

**Admin** — Platform administrators who manage the full ecosystem and earn 15% of all premium unlocks.`
    },
    {
      id: 'tech',
      heading: '5. Technology',
      content: `Frontend: React 18 + Vite (PWA, installable on all devices)
Backend / Database: Supabase (PostgreSQL, Auth, Storage, Realtime)
Payments: Paystack (Naira-native — debit card, bank transfer, USSD)
Deployment: Netlify (global CDN, auto-deploy from GitHub)
Storage: Supabase Storage (audio files, cover images, videos)

The platform functions as a Progressive Web Application — users can install it on their home screen without an app store, receive push notifications and access core features with reduced data consumption.`
    },
    {
      id: 'market',
      heading: '6. Market Opportunity',
      content: `Nigeria has over 220 million people, more than 120 million internet users and rapidly rising smartphone penetration. The youth demographic — primary consumers and creators of Nigerian music — is among the most digitally active on the continent.

**The Diaspora:** The Nigerian diaspora spans the UK, US, Canada and Europe. These communities are passionate consumers of Nigerian music and represent a significant premium content market.

**Continental Scale:** Ghana, Kenya, South Africa, Tanzania and Côte d'Ivoire all have vibrant music scenes and underserved digital creator communities. Tunez9ja's model is designed to scale across the continent.`
    },
    {
      id: 'roadmap',
      heading: '7. Roadmap',
      content: `**Phase 1 — Foundation (Current) ✅**
Platform launch · TUNEZ token economy · Artist & blogger portals
Editorial system · Paystack integration · Blue tick verification · PWA · Halving system

**Phase 2 — Growth (6–18 Months)**
TUNEZ on-chain migration · Peer-to-peer TUNEZ transfers
Artist merchandise integration · Live streaming · Expanded analytics
Label portal · West African expansion (Ghana, Côte d'Ivoire)

**Phase 3 — Maturity (18–36 Months)**
Decentralised governance (TUNEZ holders vote on platform parameters)
East & Southern African expansion · Fiat-to-TUNEZ DEX integration`
    },
  ]
}

export default function WhitepaperWidget() {
  const [open, setOpen]           = useState(false)
  const [expanded, setExpanded]   = useState({ exec: true })

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        title="Read Whitepaper"
        style={{
          position: 'fixed', top: 72, left: 16, zIndex: 800,
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(15,15,15,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-red)',
          borderRadius: 8, padding: '7px 12px',
          color: 'var(--grey-200)', cursor: 'pointer',
          fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1,
          textTransform: 'uppercase',
          boxShadow: '0 4px 20px rgba(200,16,46,0.25)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,15,15,0.92)'; e.currentTarget.style.color = 'var(--grey-200)' }}
      >
        <FileText size={13} />
        Whitepaper
      </button>

      {/* ── Full-screen modal ── */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            width: '100%', maxWidth: 760,
            maxHeight: '92vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          }}>

            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0508 100%)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="white" />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', letterSpacing: 2, textTransform: 'uppercase' }}>
                      Official Document
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 4vw, 28px)', letterSpacing: 1, marginBottom: 6, color: 'var(--white)' }}>
                    {WP.title}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--grey-400)', lineHeight: 1.5, marginBottom: 6 }}>{WP.subtitle}</p>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-600)', letterSpacing: 1 }}>{WP.version}</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--grey-400)', cursor: 'pointer', padding: 6, borderRadius: 8, flexShrink: 0, transition: 'color 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--grey-400)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {WP.sections.map(sec => (
                <div key={sec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Section header */}
                  <button
                    onClick={() => toggle(sec.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 24px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', gap: 12,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 0.5, color: expanded[sec.id] ? 'var(--red)' : 'var(--grey-100)' }}>
                      {sec.heading}
                    </span>
                    {expanded[sec.id]
                      ? <ChevronUp size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
                      : <ChevronDown size={16} style={{ color: 'var(--grey-500)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* Section body */}
                  {expanded[sec.id] && (
                    <div style={{ padding: '4px 24px 20px' }}>
                      {sec.content.split('\n\n').map((para, i) => (
                        <p key={i} style={{
                          fontSize: 13, lineHeight: 1.85, color: 'var(--grey-300)',
                          marginBottom: 12, whiteSpace: 'pre-line',
                        }}>
                          {para.split(/(\*\*.*?\*\*)/).map((part, j) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? <strong key={j} style={{ color: 'var(--grey-100)', fontWeight: 700 }}>{part.slice(2,-2)}</strong>
                              : part
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Footer */}
              <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)', lineHeight: 1.8, letterSpacing: 0.5 }}>
                  © 2025 TUNEZ9JA ENTERTAINMENT · JOS, NIGERIA<br />
                  This document is for informational purposes. TUNEZ tokens are utility tokens, not financial instruments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
