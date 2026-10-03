import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Logo } from './UI.jsx'
import { LogOut, Home } from 'lucide-react'
import { ROLES } from './RoleSwitcher.jsx'

export default function Sidebar({ items, activePage, setActivePage, setPage, currentUser, onRoleSwitch, isOpen, onClose }) {
  const [signingOut,     setSigningOut]     = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      setPage('home')
    } catch(e) {
      console.error('Signout error:', e)
      setPage('home')
    } finally {
      setSigningOut(false)
    }
  }

  const activeRole = ROLES.find(r => r.key === currentUser?.active_role) || ROLES[ROLES.length - 1]

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}
        style={{ background: 'var(--bg-deep)' }}>
      <div className="sidebar-logo" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
        <Logo size={36} />
        <span className="sidebar-logo-text">TUNEZ<span>9JA</span></span>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => { setActivePage(item.key); onClose?.() }}
          >
            <item.icon size={18} />
            {item.label}
            {item.badge ? (
              <span style={{ marginLeft: 'auto', background: 'var(--red)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontFamily: 'var(--font-mono)', minWidth: 20, textAlign: 'center' }}>
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {currentUser && (
          <>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: activeRole.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, flexShrink: 0, color: 'white' }}>
                {currentUser.name?.[0]}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: activeRole.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>{activeRole.label}</div>
              </div>
            </div>

            {/* Role switching lives in each dashboard header (RoleSwitcher), visible on mobile and desktop */}
          </>
        )}

        <button
          onClick={handleLogout}
          disabled={signingOut}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', fontSize: 13, background: 'none', border: 'none', color: signingOut ? 'var(--grey-500)' : 'var(--red)', cursor: 'pointer', fontWeight: 600 }}
        >
          <LogOut size={15} /> {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>

        <button
          onClick={() => setPage('home')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', fontSize: 13, background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer' }}
        >
          <Home size={15} /> Back to Site
        </button>
      </div>
    </aside>
    </>
  )
}
