import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Logo } from './UI.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'
import { Avatar } from './ProfileEditor.jsx'
import { Search, Sun, Moon, Coins, Menu, X, Zap } from 'lucide-react'

export default function Navbar({ page, setPage, profile, activeRole, onLogout }) {
  const [theme,    setTheme]    = useState(localStorage.getItem('t9_theme') || 'dark')
  const [balance,  setBalance]  = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('t9_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('tunez_balances').select('balance').eq('user_id', profile.id).single()
      .then(({ data }) => { if (data) setBalance(Number(data.balance).toFixed(0)) })
  }, [profile?.id])

  const getDashPage = () => {
    if (activeRole === 'admin')   return 'admin-dashboard'
    if (activeRole === 'artist')  return 'artist-dashboard'
    if (activeRole === 'blogger') return 'blogger-dashboard'
    return 'user-dashboard'
  }

  const NAV_LINKS = [
    { label: 'Home',   page: 'home'   },
    { label: 'Music',  page: 'music'  },
    { label: 'Videos', page: 'videos' },
    { label: 'Blog',   page: 'blog'   },
    { label: 'About',  page: 'about'  },
  ]

  const navigate = (p) => { setPage(p); setMenuOpen(false) }

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: 56, gap: 6 }}>
          {/* Logo */}
          <div onClick={() => navigate('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
            <Logo size={32} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1 }}>
              TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span>
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="navbar-links" style={{ display: 'flex', gap: 4, marginLeft: 24, flex: 1 }}>
            {NAV_LINKS.map(l => (
              <button key={l.page} onClick={() => navigate(l.page)}
                style={{ padding: '6px 12px', borderRadius: 6, background: 'none', border: 'none',
                  color: page === l.page ? 'var(--white)' : 'var(--grey-400)',
                  fontWeight: page === l.page ? 700 : 400,
                  cursor: 'pointer', fontSize: 14, transition: 'color 0.2s' }}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
            {/* Search */}
            <button onClick={() => navigate('search')}
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'flex', borderRadius: 8 }}>
              <Search size={18} />
            </button>

            {/* Theme toggle — hide on mobile */}
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="hide-mobile"
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'flex', borderRadius: 8 }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            {profile && <NotificationsPanel userId={profile.id} />}

            {/* TUNEZ balance — hide on mobile */}
            {profile && balance !== null && (
              <button onClick={() => navigate(getDashPage())}
                className="hide-mobile"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
                  background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)',
                  color: '#ffb400', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                <Coins size={12} /> {balance}T
              </button>
            )}

            {/* Dashboard / Sign in */}
            {profile ? (
              <button onClick={() => navigate(getDashPage())}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <Avatar profile={profile} size={24} style={{ border: 'none' }} />
                <span className="hide-mobile">Dashboard</span>
              </button>
            ) : (
              <button onClick={() => navigate('login')}
                style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--red)',
                  border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Sign In
              </button>
            )}

            {/* Hamburger — mobile only */}
            <button onClick={() => setMenuOpen(o => !o)}
              className="navbar-hamburger"
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'none', borderRadius: 8 }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'rgba(10,10,10,0.99)', borderBottom: '1px solid var(--border)',
            zIndex: 199, padding: '8px 0',
          }}>
            {NAV_LINKS.map(l => (
              <button key={l.page} onClick={() => navigate(l.page)}
                style={{ width: '100%', display: 'block', padding: '14px 20px', background: 'none',
                  border: 'none', color: page === l.page ? 'var(--red)' : 'var(--grey-300)',
                  cursor: 'pointer', fontSize: 15, fontWeight: page === l.page ? 700 : 400,
                  textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {l.label}
              </button>
            ))}
            <div style={{ padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-300)', cursor: 'pointer', padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              {profile && balance !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 20,
                  background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)',
                  color: '#ffb400', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  <Coins size={13} /> {balance} TUNEZ
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
