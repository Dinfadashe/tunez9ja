import React from 'react'
import { Logo } from './UI.jsx'

export default function Footer({ setPage }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Logo size={36} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 1 }}>
                TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span>
              </span>
            </div>
            <p className="footer-brand-text">
              Nigeria's premier music blog and entertainment platform.
              Championing African talent since 2021. From the streets of Lagos to the world.
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <a href="https://instagram.com/tunez9ja" target="_blank" rel="noreferrer" className="footer-link" style={{ margin: 0 }}>Instagram</a>
              <span style={{ color: 'var(--grey-700)' }}>·</span>
              <a href="https://twitter.com/tunez9ja" target="_blank" rel="noreferrer" className="footer-link" style={{ margin: 0 }}>Twitter/X</a>
              <span style={{ color: 'var(--grey-700)' }}>·</span>
              <a href="https://youtube.com/tunez9ja" target="_blank" rel="noreferrer" className="footer-link" style={{ margin: 0 }}>YouTube</a>
            </div>
          </div>

          <div>
            <p className="footer-col-title">Explore</p>
            <a className="footer-link" onClick={() => setPage('home')}>Home</a>
            <a className="footer-link" onClick={() => setPage('music')}>Music</a>
            <a className="footer-link" onClick={() => setPage('blog')}>Blog</a>
            <a className="footer-link" onClick={() => setPage('about')}>About Us</a>
          </div>

          <div>
            <p className="footer-col-title">Join</p>
            <a className="footer-link" onClick={() => setPage('register')}>Artist Signup</a>
            <a className="footer-link" onClick={() => setPage('register')}>Blogger Signup</a>
            <a className="footer-link" onClick={() => setPage('login')}>Sign In</a>
            <a className="footer-link" href="mailto:info@tunez9ja.com">Contact Us</a>
          </div>

          <div>
            <p className="footer-col-title">Legal</p>
            <a className="footer-link" onClick={() => setPage('terms')}>Terms of Service</a>
            <a className="footer-link" onClick={() => setPage('privacy')}>Privacy Policy</a>
            <a className="footer-link" href="mailto:dmca@tunez9ja.com">DMCA / Copyright</a>
            <a className="footer-link" href="mailto:legal@tunez9ja.com">Legal Inquiries</a>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="footer-bottom">
          <span>© 2021–{new Date().getFullYear()} Tunez9ja Entertainment. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={() => setPage('terms')} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>Terms</button>
            <button onClick={() => setPage('privacy')} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>Privacy</button>
            <a href="mailto:dmca@tunez9ja.com" style={{ color: 'var(--grey-500)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>DMCA</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
