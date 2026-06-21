import React from 'react'
import { Logo } from '../components/UI.jsx'
import { Mic2, Newspaper, Shield, Music, Globe, Award } from 'lucide-react'

export default function AboutPage({ setPage }) {
  return (
    <div style={{ minHeight: '80vh' }}>
      <div style={{ background: 'linear-gradient(180deg, #1a0a0d 0%, var(--bg-deep) 100%)', padding: '72px 0 56px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <Logo size={80} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 96px)', letterSpacing: 1, marginTop: 24, lineHeight: 1 }}>
            ABOUT TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span>
          </h1>
          <p style={{ color: 'var(--grey-300)', fontSize: 18, marginTop: 20, maxWidth: 600, margin: '20px auto 0', lineHeight: 1.7 }}>
            Nigeria's premier online destination for music discovery, entertainment news, and cultural commentary. Born in 2021, built for the culture.
          </p>
        </div>
      </div>

      <div className="container section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', marginBottom: 80 }}>
          <div>
            <div className="section-label">Our Story</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, marginBottom: 20 }}>FROM LAGOS<br/>WITH LOVE</h2>
            <p style={{ color: 'var(--grey-300)', fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
              Tunez9ja Entertainment was registered in 2021 with a simple mission: to give Nigerian music and culture the platform it deserves. From Afrobeats to Fuji, from street pop to gospel — we cover it all.
            </p>
            <p style={{ color: 'var(--grey-300)', fontSize: 15, lineHeight: 1.8 }}>
              We are a community of music lovers, journalists, and artists who believe that African sound is the future of global music. Our platform connects artists with fans, and brings the latest entertainment news straight from the source.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: <Music size={24} color="var(--red)" />, label: 'Songs Reviewed', value: '2,000+' },
              { icon: <Mic2 size={24} color="#7b4fff" />, label: 'Artists Featured', value: '500+' },
              { icon: <Newspaper size={24} color="#00b4dc" />, label: 'Articles Published', value: '1,500+' },
              { icon: <Globe size={24} color="#00c864" />, label: 'Monthly Readers', value: '50K+' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                <div style={{ marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="section-label">What We Offer</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}>THE PLATFORM</h2>
        </div>
        <div className="grid-3" style={{ marginBottom: 80 }}>
          {[
            { icon: <Mic2 size={32} color="var(--red)" />, title: 'For Artists', desc: 'Upload your music for review. Once approved, your track reaches thousands of fans on our platform. Artist profiles, play counts, and discovery features built in.', color: 'var(--red)' },
            { icon: <Newspaper size={32} color="#00b4dc" />, title: 'For Bloggers', desc: 'Write music reviews, industry news, gossip, interviews, and opinion pieces. Our editorial team reviews every submission to maintain quality.', color: '#00b4dc' },
            { icon: <Shield size={32} color="#00c864" />, title: 'Quality Control', desc: 'Every piece of content on Tunez9ja goes through admin review. We ensure every track and article meets our editorial standards before going live.', color: '#00c864' },
          ].map(f => (
            <div key={f.title} className="card" style={{ padding: 28 }}>
              <div style={{ marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(135deg, #1a0a0d, #0a0d1a)', border: '1px solid var(--border-red)', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <Award size={48} color="var(--red)" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, marginBottom: 16 }}>JOIN THE FAMILY</h2>
          <p style={{ color: 'var(--grey-300)', fontSize: 16, maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Whether you're an artist, writer, or music fan — Tunez9ja is your home. Sign up free and be part of Nigeria's fastest-growing music community.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => setPage('register')}>
              <Mic2 size={16} /> Join as Artist
            </button>
            <button className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => setPage('register')}>
              <Newspaper size={16} /> Join as Blogger
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
