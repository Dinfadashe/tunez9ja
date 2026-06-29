import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Logo } from './UI.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'
import { Avatar } from './ProfileEditor.jsx'
import { getPageLabel } from '../hooks/useNavigation.js'
import {
  Search, Sun, Moon, Coins, Menu, X,
  ChevronLeft, ChevronRight, Home, Music2, Radio,
  Video, Newspaper, Info, LayoutDashboard,
  ChevronRight as Sep,
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home',   page: 'home',   icon: Home },
  { label: 'Music',  page: 'music',  icon: Music2 },
  { label: 'Videos', page: 'videos', icon: Video },
  { label: 'Blog',   page: 'blog',   icon: Newspaper },
  { label: 'About',  page: 'about',  icon: Info },
]

// Pages where breadcrumb parent is known
const BREADCRUMB_PARENTS = {
  'search':             'home',
  'terms':              'home',
  'privacy':            'home',
  'login':              'home',
  'register':           'home',
  'admin-dashboard':    'home',
  'artist-dashboard':   'home',
  'blogger-dashboard':  'home',
  'user-dashboard':     'home',
  'editor-dashboard':   'home',
}

function Breadcrumb({ history, historyIndex, setPage }) {
  // Build a clean crumb trail from actual navigation history (last 4 unique)
  const seen = new Set()
  const crumbs = []
  for (let i = 0; i <= historyIndex; i++) {
    const p = history[i]
    if (!seen.has(p)) { seen.add(p); crumbs.push(p) }
    else {
      // Reset if we revisited — only show unique recent trail
      seen.clear(); crumbs.length = 0
      seen.add(p); crumbs.push(p)
    }
  }
  // Keep last 4
  const trail = crumbs.slice(-4)
  if (trail.length <= 1) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '0 0 0 2px', overflow: 'hidden', flex: 1,
    }}>
      {trail.map((p, i) => (
        <React.Fragment key={p + i}>
          {i > 0 && <Sep size={12} style={{ color: 'var(--grey-700)', flexShrink: 0 }} />}
          <button onClick={() => setPage(p)}
            style={{
              background: 'none', border: 'none', padding: '2px 6px', borderRadius: 5,
              fontSize: 12, cursor: i === trail.length - 1 ? 'default' : 'pointer',
              color: i === trail.length - 1 ? 'var(--grey-200)' : 'var(--grey-500)',
              fontWeight: i === trail.length - 1 ? 600 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { if (i < trail.length - 1) e.currentTarget.style.color = 'var(--grey-200)' }}
            onMouseLeave={e => { if (i < trail.length - 1) e.currentTarget.style.color = 'var(--grey-500)' }}
          >
            {getPageLabel(p)}
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Dashboard nav items per role (shown in mobile menu when logged in) ──────
const DASHBOARD_NAV = {
  admin: [
    { label: 'Overview',     page: 'admin-dashboard', tab: 'overview',  icon: LayoutDashboard },
    { label: 'Music Review', page: 'admin-dashboard', tab: 'music',     icon: Music2          },
    { label: 'Blog Review',  page: 'admin-dashboard', tab: 'blog',      icon: Newspaper       },
    { label: 'Videos',       page: 'admin-dashboard', tab: 'videos',    icon: Video           },
    { label: 'Users',        page: 'admin-dashboard', tab: 'users',     icon: Users           },
    { label: 'Analytics',    page: 'admin-dashboard', tab: 'analytics', icon: BarChart2       },
  ],
  artist: [
    { label: 'My Dashboard', page: 'artist-dashboard', tab: 'overview',  icon: LayoutDashboard },
    { label: 'My Tracks',    page: 'artist-dashboard', tab: 'tracks',    icon: Music2          },
    { label: 'Upload Track', page: 'artist-dashboard', tab: 'upload',    icon: Upload          },
    { label: 'My Videos',    page: 'artist-dashboard', tab: 'videos',    icon: Video           },
    { label: 'Earnings',     page: 'artist-dashboard', tab: 'earnings',  icon: Coins           },
    { label: 'Verification', page: 'artist-dashboard', tab: 'verify',    icon: BadgeCheck      },
  ],
  blogger: [
    { label: 'My Dashboard', page: 'blogger-dashboard', tab: 'overview', icon: LayoutDashboard },
    { label: 'My Posts',     page: 'blogger-dashboard', tab: 'posts',    icon: Newspaper       },
    { label: 'Write Post',   page: 'blogger-dashboard', tab: 'write',    icon: PenLine         },
    { label: 'Earnings',     page: 'blogger-dashboard', tab: 'earnings', icon: Coins           },
    { label: 'Verification', page: 'blogger-dashboard', tab: 'verify',   icon: BadgeCheck      },
  ],
  editor: [
    { label: 'Editor Portal',page: 'editor-dashboard', tab: 'queue',    icon: LayoutDashboard },
    { label: 'Review Queue', page: 'editor-dashboard', tab: 'queue',    icon: Newspaper       },
    { label: 'Earnings',     page: 'editor-dashboard', tab: 'earnings', icon: Coins           },
  ],
  user: [
    { label: 'My Account',   page: 'user-dashboard', tab: 'overview',   icon: LayoutDashboard },
    { label: 'My Library',   page: 'user-dashboard', tab: 'library',    icon: BookMarked      },
    { label: 'TUNEZ Wallet', page: 'user-dashboard', tab: 'wallet',     icon: Coins           },
    { label: 'Playlists',    page: 'user-dashboard', tab: 'playlists',  icon: ListMusic       },
    { label: 'Referral',     page: 'user-dashboard', tab: 'referral',   icon: Share2          },
    { label: 'My Profile',   page: 'user-dashboard', tab: 'profile',    icon: UserCircle      },
  ],
}

export default function Navbar({
  page, setPage, profile, activeRole, onLogout,
  goBack, goForward, canGoBack, canGoForward,
  history = [], historyIndex = 0, onDJOpen,
}) {
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

  useEffect(() => { setMenuOpen(false) }, [page])

  const getDashPage = () => {
    if (activeRole === 'admin')   return 'admin-dashboard'
    if (activeRole === 'artist')  return 'artist-dashboard'
    if (activeRole === 'blogger') return 'blogger-dashboard'
    return 'user-dashboard'
  }

  const navigate = (p) => { setPage(p); setMenuOpen(false) }

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 300,
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* ── Main nav row ── */}
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: 56, gap: 6 }}>

          {/* Back / Forward buttons */}
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button
              onClick={goBack}
              disabled={!canGoBack}
              title="Go back (Alt + ←)"
              style={{
                background: 'none', border: 'none', borderRadius: 7, padding: '5px 7px',
                color: canGoBack ? 'var(--grey-300)' : 'var(--grey-700)',
                cursor: canGoBack ? 'pointer' : 'default', display: 'flex', alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (canGoBack) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--white)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = canGoBack ? 'var(--grey-300)' : 'var(--grey-700)' }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              title="Go forward (Alt + →)"
              style={{
                background: 'none', border: 'none', borderRadius: 7, padding: '5px 7px',
                color: canGoForward ? 'var(--grey-300)' : 'var(--grey-700)',
                cursor: canGoForward ? 'pointer' : 'default', display: 'flex', alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (canGoForward) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--white)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = canGoForward ? 'var(--grey-300)' : 'var(--grey-700)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Logo */}
          <div onClick={() => navigate('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
            <Logo size={30} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, letterSpacing: 1 }}>
              TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span>
            </span>
          </div>

          {/* Dashboard quick-access badge — replaces logo text when logged in on home */}
          {profile && page === 'home' && (
            <button onClick={() => navigate(getDashPage())}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 11px', borderRadius: 20,
                background: 'rgba(200,16,46,0.12)',
                border: '1px solid rgba(200,16,46,0.35)',
                color: 'var(--red)', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}
              className="hide-mobile">
              <LayoutDashboard size={13} /> Dashboard
            </button>
          )}

          {/* Desktop nav links */}
          <div className="navbar-links" style={{ display: 'flex', gap: 2, marginLeft: 16 }}>
            {NAV_LINKS.map(l => {
              const active = page === l.page
              return (
                <button key={l.page} onClick={() => navigate(l.page)}
                  style={{
                    padding: '6px 11px', borderRadius: 7,
                    background: active ? 'rgba(200,16,46,0.12)' : 'none',
                    border: 'none',
                    color: active ? 'var(--red)' : 'var(--grey-400)',
                    fontWeight: active ? 700 : 400,
                    cursor: 'pointer', fontSize: 13.5,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--white)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--grey-400)' } }}
                >
                  {l.label}
                </button>
              )
            })}
          </div>

          {/* Breadcrumb trail (desktop only, when navigated away from main pages) */}
          <div className="hide-mobile" style={{ flex: 1, overflow: 'hidden', paddingLeft: 8 }}>
            <Breadcrumb history={history} historyIndex={historyIndex} setPage={setPage} />
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', flexShrink: 0 }}>
            {/* AI DJ button */}
            {onDJOpen && (
              <button onClick={onDJOpen}
                title="Launch AI DJ"
                style={{ background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8, color: 'var(--red)', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: 0.5 }}>
                <Radio size={13} /> AI DJ
              </button>
            )}

            <button onClick={() => navigate('search')}
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'flex', borderRadius: 8 }}>
              <Search size={18} />
            </button>

            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="hide-mobile"
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'flex', borderRadius: 8 }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {profile && <NotificationsPanel userId={profile.id} />}

            {profile && balance !== null && (
              <button onClick={() => navigate(getDashPage())}
                className="hide-mobile"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
                  background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)',
                  color: '#ffb400', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700,
                }}>
                <Coins size={12} /> {balance}T
              </button>
            )}

            {profile ? (
              <button onClick={() => navigate(getDashPage())}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px',
                  borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                }}>
                <Avatar profile={profile} size={22} style={{ border: 'none' }} />
                <span className="hide-mobile">Dashboard</span>
              </button>
            ) : (
              <button onClick={() => navigate('login')}
                style={{
                  padding: '7px 14px', borderRadius: 8, background: 'var(--red)',
                  border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                }}>
                Sign In
              </button>
            )}

            {/* Hamburger */}
            <button onClick={() => setMenuOpen(o => !o)}
              className="navbar-hamburger"
              style={{ background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'none', borderRadius: 8 }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'rgba(10,10,10,0.99)', borderBottom: '1px solid var(--border)',
            zIndex: 299, maxHeight: '80vh', overflowY: 'auto',
          }}>
            {profile ? (
              <>
                {/* ── Logged-in header ── */}
                <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--red)' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white', flexShrink: 0 }}>
                        {(profile.name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name || 'My Account'}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-500)', textTransform: 'capitalize', fontFamily: 'var(--font-mono)' }}>{activeRole || 'user'}</div>
                  </div>
                  {balance !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 16, background: 'rgba(255,180,0,0.12)', border: '1px solid rgba(255,180,0,0.3)', color: '#ffb400', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0 }}>
                      <Coins size={11} /> {balance}T
                    </div>
                  )}
                </div>

                {/* ── Dashboard nav items for this role ── */}
                <div style={{ paddingTop: 6 }}>
                  {(DASHBOARD_NAV[activeRole] || DASHBOARD_NAV.user).map(item => {
                    const Icon = item.icon
                    const active = page === item.page
                    return (
                      <button key={item.label} onClick={() => navigate(item.page)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                          padding: '13px 20px',
                          background: active ? 'rgba(200,16,46,0.1)' : 'none',
                          border: 'none',
                          borderLeft: active ? '3px solid var(--red)' : '3px solid transparent',
                          color: active ? 'var(--red)' : 'var(--grey-300)',
                          cursor: 'pointer', fontSize: 14, fontWeight: active ? 700 : 400,
                          textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        <Icon size={18} style={{ flexShrink: 0 }} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>

                {/* ── Divider + public pages ── */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                  <div style={{ padding: '6px 20px 4px', fontSize: 10, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' }}>Explore</div>
                  {NAV_LINKS.filter(l => l.page !== 'home').map(l => {
                    const Icon = l.icon
                    const active = page === l.page
                    return (
                      <button key={l.page} onClick={() => navigate(l.page)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                          padding: '11px 20px', background: 'none',
                          border: 'none', borderLeft: '3px solid transparent',
                          color: active ? 'var(--red)' : 'var(--grey-500)',
                          cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
                          textAlign: 'left',
                        }}>
                        <Icon size={16} style={{ flexShrink: 0 }} />
                        {l.label}
                      </button>
                    )
                  })}
                </div>

                {/* ── Footer: theme + logout ── */}
                <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                  <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-400)', cursor: 'pointer', padding: '7px 12px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                    {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                  {onLogout && (
                    <button onClick={() => { onLogout(); setMenuOpen(false) }}
                      style={{ background: 'none', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8, color: 'var(--red)', cursor: 'pointer', padding: '7px 12px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                      <LogOut size={13} /> Sign out
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* ── Guest: public nav + sign in prompt ── */}
                {NAV_LINKS.map(l => {
                  const active = page === l.page
                  const Icon = l.icon
                  return (
                    <button key={l.page} onClick={() => navigate(l.page)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 20px', background: active ? 'rgba(200,16,46,0.1)' : 'none',
                        border: 'none', borderLeft: active ? '3px solid var(--red)' : '3px solid transparent',
                        color: active ? 'var(--red)' : 'var(--grey-300)',
                        cursor: 'pointer', fontSize: 15, fontWeight: active ? 700 : 400,
                        textAlign: 'left',
                      }}>
                      <Icon size={18} />
                      {l.label}
                    </button>
                  )
                })}
                <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('login')}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    Sign In
                  </button>
                  <button onClick={() => navigate('register')}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    Register
                  </button>
                  <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-400)', cursor: 'pointer', padding: '7px 12px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                    {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <div className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400,
        background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--border)',
        display: 'none', // shown via CSS media query
        alignItems: 'center', justifyContent: 'space-around',
        height: 58, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Back */}
        <button onClick={goBack} disabled={!canGoBack}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 10px', cursor: canGoBack ? 'pointer' : 'default', color: canGoBack ? 'var(--grey-300)' : 'var(--grey-700)' }}>
          <ChevronLeft size={22} />
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Back</span>
        </button>

        {/* Nav links */}
        {NAV_LINKS.map(l => {
          const active = page === l.page
          const Icon = l.icon
          return (
            <button key={l.page} onClick={() => navigate(l.page)}
              style={{
                background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, padding: '6px 8px', cursor: 'pointer',
                color: active ? 'var(--red)' : 'var(--grey-500)',
                transition: 'color 0.15s',
              }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: active ? 700 : 400 }}>{l.label}</span>
            </button>
          )
        })}

        {/* Dashboard / Sign in */}
        {profile ? (
          <button onClick={() => navigate(getDashPage())}
            style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 8px', cursor: 'pointer', color: ['admin-dashboard','artist-dashboard','blogger-dashboard','user-dashboard','editor-dashboard'].includes(page) ? 'var(--red)' : 'var(--grey-500)' }}>
            <LayoutDashboard size={20} />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Dash</span>
          </button>
        ) : (
          <button onClick={() => navigate('login')}
            style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 8px', cursor: 'pointer', color: 'var(--grey-500)' }}>
            <LayoutDashboard size={20} />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Sign In</span>
          </button>
        )}
      </div>

      {/* Bottom nav spacer — prevents content hiding behind tab bar on mobile */}
      <div className="mobile-bottom-spacer" style={{ display: 'none', height: 58 }} />
    </>
  )
}
