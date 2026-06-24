import React from 'react'
import { MapPin, Mail, Users } from 'lucide-react'

export default function AboutPage({ setPage }) {
  return (
    <div style={{ minHeight: '80vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg,#1a0a0d 0%,var(--bg-deep) 100%)', padding: 'clamp(48px,8vw,80px) 0 clamp(32px,6vw,60px)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 12 }}>ABOUT US</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,7vw,64px)', lineHeight: 1.05, marginBottom: 16 }}>
            BUILT IN JOS,<br /><span style={{ color: 'var(--red)' }}>FOR NIGERIA</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--grey-300)', maxWidth: 520, lineHeight: 1.8 }}>
            Nigeria's premier music blog and streaming platform — connecting artists, bloggers, and fans through great content and a token economy that rewards genuine engagement.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: 'var(--grey-500)', fontSize: 14 }}>
            <MapPin size={14} color="var(--red)" />
            <span>Jos, Plateau State, Nigeria 🇳🇬</span>
          </div>
        </div>
      </div>

      <div className="container section">

        {/* TUNEZ earn rates — simple table */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 20 }}>TUNEZ EARN RATES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[
              ['🎵 Stream a track', '+10 T'],
              ['📰 Read a post',    '+6 T'],
              ['🎬 Watch a video',  '+8 T'],
              ['💬 Comment',        '+4 T'],
              ['👍 React',          '+2 T'],
              ['👥 Refer a friend', '+15 T'],
              ['☀️ Daily login',    '+5 T'],
              ['🔵 Verified',       '1.5× all'],
            ].map(([action, earn], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--grey-300)' }}>{action}</span>
                <span style={{ fontWeight: 700, color: '#ffb400', fontFamily: 'var(--font-mono)' }}>{earn}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--grey-600)', marginTop: 10 }}>Daily cap: 80 TUNEZ. Cooldowns apply per content.</p>
        </div>
{/* Contact */}
        <div className="card" style={{ padding: 'clamp(20px,4vw,32px)', display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 14 }}>CONTACT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="mailto:dinfadashe@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey-300)', textDecoration: 'none', fontSize: 14 }}>
                <Mail size={15} color="var(--red)" /> dinfadashe@gmail.com
              </a>
              <a href="https://t.me/+BpaRRvm53U1kZGM0" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey-300)', textDecoration: 'none', fontSize: 14 }}>
                <Users size={15} color="#0088cc" /> Join our Telegram Community
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey-300)', fontSize: 14 }}>
                <MapPin size={15} color="var(--red)" /> Jos, Plateau State, Nigeria
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--red)', lineHeight: 1 }}>T9</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 4 }}>TUNEZ9JA</div>
            <div style={{ fontSize: 11, color: 'var(--grey-600)', marginTop: 6 }}>© {new Date().getFullYear()} Web3.0 Alliance Ltd</div>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--grey-600)', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          TUNEZ are virtual in-app credits, not a cryptocurrency or financial instrument. ·
          <span style={{ cursor: 'pointer', color: 'var(--grey-500)', marginLeft: 6 }} onClick={() => setPage('terms')}>Terms</span>
          {' · '}
          <span style={{ cursor: 'pointer', color: 'var(--grey-500)' }} onClick={() => setPage('privacy')}>Privacy</span>
        </p>

      </div>
    </div>
  )
}
