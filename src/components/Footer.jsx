import React from 'react'
import { Logo } from './UI.jsx'

export default function Footer({ setPage }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '24px 0',
      marginTop: 'auto',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={28} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
            TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span>
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-600)' }}>
          © {new Date().getFullYear()} Tunez9ja · Jos, Nigeria
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span onClick={() => setPage('terms')} style={{ color: 'var(--grey-500)', cursor: 'pointer' }}>Terms</span>
          <span onClick={() => setPage('privacy')} style={{ color: 'var(--grey-500)', cursor: 'pointer' }}>Privacy</span>
          <span onClick={() => setPage('about')} style={{ color: 'var(--grey-500)', cursor: 'pointer' }}>About</span>
        </div>
      </div>
    </footer>
  )
}
