import React from 'react'
import { MapPin, Mail, Globe, Users, Music, Newspaper, Video, Coins } from 'lucide-react'

export default function AboutPage({ setPage }) {
  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg,#1a0a0d 0%,var(--bg-deep) 100%)', padding: 'clamp(48px,8vw,80px) 0 clamp(32px,6vw,60px)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 12 }}>ABOUT US</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,7vw,64px)', lineHeight: 1.05, marginBottom: 20 }}>
            BUILT IN JOS,<br /><span style={{ color: 'var(--red)' }}>FOR NIGERIA</span>
          </h1>
          <p style={{ fontSize: 'clamp(14px,2vw,17px)', color: 'var(--grey-300)', maxWidth: 560, lineHeight: 1.8 }}>
            Tunez9ja is Nigeria's premier music blog and streaming platform — connecting artists, 
            bloggers, and fans through great content and a token economy that rewards genuine engagement.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: 'var(--grey-500)', fontSize: 14 }}>
            <MapPin size={15} color="var(--red)" />
            <span>Jos, Plateau State, Nigeria 🇳🇬</span>
          </div>
        </div>
      </div>

      <div className="container section">
        {/* Mission */}
        <div style={{ maxWidth: 680, marginBottom: 60 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 12 }}>OUR MISSION</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,38px)', marginBottom: 16 }}>Empowering Nigerian Creators</h2>
          <p style={{ fontSize: 15, color: 'var(--grey-300)', lineHeight: 1.9 }}>
            We built Tunez9ja because Nigerian artists and bloggers deserved a platform that 
            pays attention to them — not just streams. Every interaction on Tunez9ja earns 
            <strong style={{ color: 'var(--white)' }}> TUNEZ tokens</strong>, our in-app reward currency 
            that recognises real engagement: listening, reading, watching, commenting, and sharing.
          </p>
          <p style={{ fontSize: 15, color: 'var(--grey-300)', lineHeight: 1.9, marginTop: 16 }}>
            We believe the future of African entertainment is digital, decentralised in its reach, 
            and deeply community-driven. Tunez9ja is our contribution to that future — starting 
            from the Plateau.
          </p>
        </div>

        {/* What we offer */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 24 }}>WHAT WE OFFER</div>
          <div className="stat-grid">
            {[
              { icon: <Music size={28} />, title: 'Music Streaming', desc: 'Stream and discover Naija sounds across all genres — Afrobeats, Highlife, Gospel, Hip-Hop, Amapiano and more.', color: 'var(--red)' },
              { icon: <Newspaper size={28} />, title: 'Blog & Entertainment', desc: 'In-depth music reviews, artist spotlights, interviews, and entertainment news from Nigeria and beyond.', color: '#00b4dc' },
              { icon: <Video size={28} />, title: 'Video Content', desc: 'Music videos, live sessions, and exclusive video content from verified Nigerian artists and bloggers.', color: '#00c864' },
              { icon: <Coins size={28} />, title: 'TUNEZ Token Economy', desc: 'Earn TUNEZ by streaming, reading, watching and engaging. Use tokens to unlock premium content or top up your balance.', color: '#ffb400' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: 24, borderTop: `3px solid ${item.color}` }}>
                <div style={{ color: item.color, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TUNEZ Economy */}
        <div style={{ background: 'linear-gradient(135deg, rgba(200,16,46,0.08), rgba(123,79,255,0.05))', border: '1px solid var(--border)', borderRadius: 14, padding: 'clamp(24px,4vw,40px)', marginBottom: 60 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 16 }}>THE TUNEZ ECONOMY</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,34px)', marginBottom: 16 }}>Earn While You Engage</h2>
          <p style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.8, marginBottom: 24, maxWidth: 600 }}>
            TUNEZ is Tunez9ja's in-app virtual credit — <strong style={{ color: 'var(--white)' }}>not a cryptocurrency or financial security</strong>. 
            It's a reward system that recognises the real value of your attention and participation.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { action: '🎵 Stream a track (10s+)', earn: '+10 TUNEZ' },
              { action: '📰 Read a post (15s+)',    earn: '+6 TUNEZ'  },
              { action: '🎬 Watch a video (10s+)',   earn: '+8 TUNEZ'  },
              { action: '💬 Leave a comment',        earn: '+4 TUNEZ'  },
              { action: '👍 React to content',       earn: '+2 TUNEZ'  },
              { action: '👥 Refer a friend',         earn: '+15 TUNEZ' },
              { action: '☀️ Daily login bonus',      earn: '+5 TUNEZ'  },
              { action: '🔵 Verified creator',       earn: '1.5× all earnings' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--grey-300)' }}>{item.action}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffb400', fontFamily: 'var(--font-mono)', flexShrink: 0, marginLeft: 12 }}>{item.earn}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--grey-600)', marginTop: 16, fontStyle: 'italic' }}>
            Daily earning cap: 80 TUNEZ. Cooldowns apply per content to prevent gaming.
          </p>
        </div>

        {/* Verification */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#1DA1F2', letterSpacing: 3, marginBottom: 16 }}>VERIFIED CREATORS 🔵</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,34px)', marginBottom: 16 }}>The Blue Tick</h2>
          <p style={{ fontSize: 15, color: 'var(--grey-300)', lineHeight: 1.8, maxWidth: 620 }}>
            Our blue verification tick is earned — not bought. Artists who reach <strong style={{ color: 'var(--white)' }}>10,000 streams</strong> across 
            at least 5 approved tracks, and bloggers who reach <strong style={{ color: 'var(--white)' }}>25,000 post views</strong> across at least 10 posts, 
            can apply for verification after submitting KYC. Once approved, verified creators earn <strong style={{ color: '#1DA1F2' }}>1.5× TUNEZ</strong> on 
            all organic engagement and receive priority placement across the platform.
          </p>
          <button onClick={() => setPage('login')} className="btn btn-primary" style={{ marginTop: 20, gap: 8 }}>
            Start Your Journey →
          </button>
        </div>

        {/* Contact */}
        <div className="card" style={{ padding: 'clamp(24px,4vw,40px)', display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 12 }}>GET IN TOUCH</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,32px)', marginBottom: 16 }}>Contact Us</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="mailto:dinfadashe@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey-300)', textDecoration: 'none', fontSize: 14 }}>
                <Mail size={16} color="var(--red)" /> dinfadashe@gmail.com
              </a>
              <a href="https://t.me/+BpaRRvm53U1kZGM0" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey-300)', textDecoration: 'none', fontSize: 14 }}>
                <Users size={16} color="#0088cc" /> Join our Telegram Community
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey-300)', fontSize: 14 }}>
                <MapPin size={16} color="var(--red)" /> Jos, Plateau State, Nigeria
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--red)', lineHeight: 1 }}>T9</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 4 }}>TUNEZ9JA</div>
            <div style={{ fontSize: 12, color: 'var(--grey-600)', marginTop: 6 }}>© {new Date().getFullYear()} Tunez9ja Entertainment</div>
            <div style={{ fontSize: 11, color: 'var(--grey-600)', marginTop: 2 }}>A Web3.0 Alliance Ltd Product</div>
          </div>
        </div>

        {/* Legal note */}
        <p style={{ fontSize: 12, color: 'var(--grey-600)', textAlign: 'center', marginTop: 32, lineHeight: 1.7 }}>
          TUNEZ tokens are virtual in-app credits and do not constitute a cryptocurrency, financial instrument, 
          or security of any kind. Tunez9ja is not a financial services provider. 
          <span style={{ cursor: 'pointer', color: 'var(--grey-500)', marginLeft: 8 }} onClick={() => setPage('terms')}>Terms of Service</span>
          {' · '}
          <span style={{ cursor: 'pointer', color: 'var(--grey-500)' }} onClick={() => setPage('privacy')}>Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}
