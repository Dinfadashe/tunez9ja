import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Logo } from './UI.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'
import { Search, Sun, Moon, Coins } from 'lucide-react'
import { Avatar } from './ProfileEditor.jsx'

export default function Navbar({ page, setPage, profile, activeRole, onLogout }) {
  const [theme,   setTheme]   = useState(localStorage.getItem('t9_theme') || 'dark')
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('t9_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('tunez_balances').select('balance').eq('user_id', profile.id).single()
      .then(({ data }) => { if (data) setBalance(Number(data.balance).toFixed(0)) })
  }, [profile?.id])

  const getDashboardPage = () => {
    if (activeRole === 'admin')   return 'admin-dashboard'
    if (activeRole === 'artist')  return 'artist-dashboard'
    if (activeRole === 'blogger') return 'blogger-dashboard'
    if (activeRole === 'user')    return 'user-dashboard'
    return 'home'
  }

  const NAV_LINKS = [
    { label: 'Home',   page: 'home'   },
    { label: 'Music',  page: 'music'  },
    { label: 'Videos', page: 'videos' },
    { label: 'Blog',   page: 'blog'   },
    { label: 'About',  page: 'about'  },
  ]

  return (
    <nav style={{ position:'sticky', top:0, zIndex:200, background:'rgba(10,10,10,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)' }}>
      <div className="container" style={{ display:'flex', alignItems:'center', height:60, gap:8 }}>
        {/* Logo */}
        <div onClick={() => setPage('home')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flexShrink:0 }}>
          <Logo size={32} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:20, letterSpacing:1 }}>
            TUNEZ<span style={{ color:'var(--red)' }}>9JA</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display:'flex', gap:4, marginLeft:24, flex:1 }}>
          {NAV_LINKS.map(l => (
            <button key={l.page} onClick={() => setPage(l.page)}
              style={{ padding:'6px 12px', borderRadius:6, background:'none', border:'none', color: page===l.page ? 'var(--white)' : 'var(--grey-400)', fontWeight: page===l.page ? 700 : 400, cursor:'pointer', fontSize:14, transition:'color 0.2s' }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
          {/* Search */}
          <button onClick={() => setPage('search')} title="Search"
            style={{ background:'none', border:'none', color:'var(--grey-300)', cursor:'pointer', padding:8, display:'flex', borderRadius:8 }}>
            <Search size={18} />
          </button>

          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t==='dark'?'light':'dark')} title="Toggle theme"
            style={{ background:'none', border:'none', color:'var(--grey-300)', cursor:'pointer', padding:8, display:'flex', borderRadius:8 }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          {profile && <NotificationsPanel userId={profile.id} />}

          {/* TUNEZ balance */}
          {profile && balance !== null && (
            <button onClick={() => setPage(getDashboardPage())}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, background:'rgba(255,180,0,0.1)', border:'1px solid rgba(255,180,0,0.3)', color:'#ffb400', cursor:'pointer', fontSize:12, fontFamily:'var(--font-mono)', fontWeight:700 }}>
              <Coins size={12} /> {balance}T
            </button>
          )}

          {/* Dashboard or Sign in */}
          {profile ? (
            <button onClick={() => setPage(getDashboardPage())}
              style={{ padding:'7px 14px', borderRadius:8, background:'var(--red)', border:'none', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
              <Avatar profile={profile} size={24} style={{ border:'none' }} />
            Dashboard
            </button>
          ) : (
            <button onClick={() => setPage('login')}
              style={{ padding:'7px 16px', borderRadius:8, background:'var(--red)', border:'none', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
