import React, { useState } from 'react'
import { Logo } from './UI.jsx'
import { LogIn, LogOut, User, Menu, X } from 'lucide-react'

export default function Navbar({ page, setPage, profile, activeRole, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = [
    { label: 'Home',   key: 'home'   },
    { label: 'Music',  key: 'music'  },
    { label: 'Videos', key: 'videos' },
    { label: 'Blog',   key: 'blog'   },
    { label: 'About',  key: 'about'  },
  ]

  const handleNav = (key) => { setPage(key); setMenuOpen(false) }

  const getDashboardPage = () => {
    if (activeRole === 'admin')   return 'admin-dashboard'
    if (activeRole === 'artist')  return 'artist-dashboard'
    if (activeRole === 'blogger') return 'blogger-dashboard'
    return 'home'
  }

  const handleLogout = async () => {
    if (onLogout) await onLogout()
    handleNav('home')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => handleNav('home')} style={{ cursor: 'pointer' }}>
          <Logo size={40} />
          <span className="navbar-brand-text">TUNEZ<span>9JA</span></span>
        </div>

        <div className="navbar-links">
          {nav.map(n => (
            <button key={n.key} className={`navbar-link ${page === n.key ? 'active' : ''}`} onClick={() => handleNav(n.key)}>
              {n.label}
            </button>
          ))}
        </div>

        <div className="navbar-auth">
          {profile ? (
            <>
              <button className="btn btn-secondary" style={{ gap: 8, fontSize: 13 }} onClick={() => handleNav(getDashboardPage())}>
                <User size={15} /> Dashboard
              </button>
              <button className="btn btn-ghost" onClick={handleLogout} title="Sign out">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => handleNav('login')}>Sign In</button>
              <button className="btn btn-primary" onClick={() => handleNav('register')}>Join Free</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
