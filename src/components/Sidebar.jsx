import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Logo } from './UI.jsx'
import { LogOut, Home, ChevronDown, Shield, Mic2, Newspaper } from 'lucide-react'

const ROLES = [
  { key: 'admin',   label: 'Admin',   icon: Shield,    color: 'var(--red)'  },
  { key: 'artist',  label: 'Artist',  icon: Mic2,      color: '#7b4fff'     },
  { key: 'blogger', label: 'Blogger', icon: Newspaper, color: '#00b4dc'     },
]

export default function Sidebar({ items, activePage, setActivePage, setPage, currentUser, onRoleSwitch }) {
  const [showRolePicker, setShowRolePicker] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setPage('home')
  }

  const activeRole = ROLES.find(r => r.key === currentUser?.active_role) || ROLES[0]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
        <Logo size={36} />
        <span className="sidebar-logo-text">TUNEZ<span>9JA</span></span>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => setActivePage(item.key)}
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
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: activeRole.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, flexShrink: 0 }}>
                {currentUser.name?.[0]}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: activeRole.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>{activeRole.label}</div>
              </div>
            </div>

            {/* Role switcher */}
            {onRoleSwitch && (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <button
                  onClick={() => setShowRolePicker(p => !p)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--grey-300)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}
                >
                  <activeRole.icon size={13} style={{ color: activeRole.color }} />
                  SWITCH ROLE
                  <ChevronDown size={13} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: showRolePicker ? 'rotate(180deg)' : 'none' }} />
                </button>

                {showRolePicker && (
                  <div style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow)', zIndex: 200 }}>
                    {ROLES.map(role => (
                      <button
                        key={role.key}
                        onClick={() => { onRoleSwitch(role.key); setShowRolePicker(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: currentUser.active_role === role.key ? 'var(--bg-hover)' : 'transparent', border: 'none', color: currentUser.active_role === role.key ? 'var(--white)' : 'var(--grey-300)', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderLeft: currentUser.active_role === role.key ? `3px solid ${role.color}` : '3px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = currentUser.active_role === role.key ? 'var(--bg-hover)' : 'transparent'}
                      >
                        <role.icon size={15} style={{ color: role.color }} />
                        {role.label}
                        {currentUser.active_role === role.key && <span style={{ marginLeft: 'auto', fontSize: 10, color: role.color }}>● ACTIVE</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 8, padding: '8px 4px', fontSize: 13 }} onClick={handleLogout}>
          <LogOut size={15} /> Sign Out
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 8, padding: '8px 4px', fontSize: 13 }} onClick={() => setPage('home')}>
          <Home size={15} /> Back to Site
        </button>
      </div>
    </aside>
  )
}
