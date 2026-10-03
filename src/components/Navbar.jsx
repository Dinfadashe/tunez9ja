import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Logo } from './UI.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'
import { Avatar } from './ProfileEditor.jsx'
import { getPageLabel } from '../hooks/useNavigation.js'
import RoleSwitcher, { dashboardPageForRole, getAvailableRoles } from './RoleSwitcher.jsx'
import {
  Search, Sun, Moon, Coins, Menu, X,
  Home, Music2, Radio,
  Video, Newspaper, Info, LayoutDashboard, TrendingUp,
  ChevronRight as Sep, Users, BarChart2,
  Upload, BadgeCheck, PenLine, BookMarked,
  ListMusic, Share2, UserCircle, LogOut,
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home',   page: 'home',   icon: Home },
  { label: 'Music',  page: 'music',  icon: Music2 },
  { label: 'Videos', page: 'videos', icon: Video },
  { label: 'Blog',   page: 'blog',   icon: Newspaper },
  { label: 'Charts', page: 'charts', icon: TrendingUp },
  { label: 'About',  page: 'about',  icon: Info },
]

function Breadcrumb({ history, historyIndex, setPage }) {
  const seen = new Set()
  const crumbs = []
  for (let i = 0; i <= historyIndex; i++) {
    const p = history[i]
    if (!seen.has(p)) { seen.add(p); crumbs.push(p) }
    else {
      seen.clear(); crumbs.length = 0
      seen.add(p); crumbs.push(p)
    }
  }
  const trail = crumbs.slice(-4)
  if (trail.length <= 1) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '0 0 0 0.125rem', overflow: 'hidden', flex: 1, minWidth: 0,
    }}>
      {trail.map((p, i) => (
        <React.Fragment key={p + i}>
          {i > 0 && <Sep size={12} style={{ color: 'var(--grey-700)', flexShrink: 0 }} />}
          <button onClick={() => setPage(p)}
            style={{
              background: 'none', border: 'none', padding: '0.125rem 0.375rem', borderRadius: 5,
              fontSize: 'clamp(0.7rem, 0.65rem + 0.1vw, 0.8rem)', cursor: i === trail.length - 1 ? 'default' : 'pointer',
              color: i === trail.length - 1 ? 'var(--grey-200)' : 'var(--grey-500)',
              fontWeight: i === trail.length - 1 ? 600 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '6.25rem',
              transition: 'color 0.15s', minHeight: '1.5rem',
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
  page, setPage, profile, activeRole, onRoleSwitch, onLogout,
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

  const getDashPage = () => dashboardPageForRole(activeRole)

  const navigate = (p) => { setPage(p); setMenuOpen(false) }

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 300,
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center',
          minHeight: 'clamp(3rem, 2.7rem + 1vw, 3.5rem)',
          gap: 'clamp(0.25rem, 0.2rem + 0.3vw, 0.5rem)',
          padding: '0 clamp(0.5rem, 0.4rem + 0.5vw, 1rem)',
        }}>

          <div onClick={() => navigate('home')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0, minWidth: 0 }}>
            <Logo size={28} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 0.9rem + 0.4vw, 1.2rem)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
              TUNEZ<span style={{ color: 'var(--red)' }}>9JA</span>
            </span>
          </div>

          {profile && page === 'home' && (
            <button onClick={() => navigate(getDashPage())}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.3rem 0.7rem', borderRadius: 20,
                background: 'rgba(200,16,46,0.12)',
                border: '1px solid rgba(200,16,46,0.35)',
                color: 'var(--red)', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                minHeight: '2rem',
              }}
              className="hide-mobile">
              <LayoutDashboard size={13} /> Dashboard
            </button>
          )}

          <div className="navbar-links" style={{ display: 'flex', gap: 2, marginLeft: '0.5rem', flexShrink: 0 }}>
            {NAV_LINKS.map(l => {
              const active = page === l.page
              return (
                <button key={l.page} onClick={() => navigate(l.page)}
                  style={{
                    padding: '0.4rem 0.7rem', borderRadius: 7,
                    background: active ? 'rgba(200,16,46,0.12)' : 'none',
                    border: 'none',
                    color: active ? 'var(--red)' : 'var(--grey-400)',
                    fontWeight: active ? 700 : 400,
                    cursor: 'pointer', fontSize: 'clamp(0.8rem, 0.75rem + 0.15vw, 0.875rem)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                    minHeight: '2.25rem', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--white)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--grey-400)' } }}
                >
                  {l.label}
                </button>
              )
            })}
          </div>

          <div className="hide-mobile" style={{ flex: 1, overflow: 'hidden', paddingLeft: '0.5rem', minWidth: 0 }}>
            <Breadcrumb history={history} historyIndex={historyIndex} setPage={setPage} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', flexShrink: 0 }}>
            {onDJOpen && (
              <button onClick={onDJOpen}
                title="Launch AI DJ"
                className="hide-xs"
                style={{
                  background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8,
                  color: 'var(--red)', cursor: 'pointer', padding: '0.35rem 0.6rem',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: 0.5,
                  minHeight: '2.25rem', whiteSpace: 'nowrap',
                }}>
                <Radio size={13} /> AI DJ
              </button>
            )}

            <button onClick={() => navigate('search')}
              aria-label="Search"
              style={{
                background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer',
                width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, flexShrink: 0,
              }}>
              <Search size={18} />
            </button>

            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="hide-mobile"
              style={{
                background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer',
                width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
              }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {profile && <NotificationsPanel userId={profile.id} />}

            {profile && balance !== null && (
              <button onClick={() => navigate(getDashPage())}
                className="hide-mobile"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.6rem', borderRadius: 20,
                  background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)',
                  color: '#ffb400', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                  minHeight: '2.25rem', whiteSpace: 'nowrap',
                }}>
                <Coins size={12} /> {balance}T
              </button>
            )}

            {profile && (
              <div className="hide-mobile" style={{ marginRight: 4 }}>
                <RoleSwitcher profile={profile} activeRole={activeRole} onRoleSwitch={onRoleSwitch} compact />
              </div>
            )}

            {profile ? (
              <button onClick={() => window.dispatchEvent(new CustomEvent('openProfile', { detail: { profileId: profile.id } }))}
                className="hide-xs"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '0.3rem 0.6rem',
                  borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, minHeight: '2.25rem',
                  whiteSpace: 'nowrap',
                }}>
                <Avatar profile={profile} size={22} style={{ border: 'none' }} />
                <span className="hide-mobile">Profile</span>
              </button>
            ) : (
              <button onClick={() => navigate('login')}
                className="hide-xs"
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: 8, background: 'var(--red)',
                  border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                  minHeight: '2.25rem', whiteSpace: 'nowrap',
                }}>
                Sign In
              </button>
            )}

            <button onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="navbar-hamburger"
              style={{
                background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer',
                width: '2.75rem', height: '2.75rem', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, flexShrink: 0,
              }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'rgba(10,10,10,0.99)', borderBottom: '1px solid var(--border)',
            zIndex: 299, maxHeight: 'min(80vh, 100dvh - 3.5rem)', overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            {profile ? (
              <>
                <div style={{ padding: '0.9rem 1.25rem 0.6rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.name} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--red)', flexShrink: 0 }} loading="lazy" decoding="async" />
                    : <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: 'white', flexShrink: 0 }}>
                        {(profile.name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name || 'My Account'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--grey-500)', textTransform: 'capitalize', fontFamily: 'var(--font-mono)' }}>{activeRole || 'user'}</div>
                  </div>
                  {balance !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.6rem', borderRadius: 16, background: 'rgba(255,180,0,0.12)', border: '1px solid rgba(255,180,0,0.3)', color: '#ffb400', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0 }}>
                      <Coins size={11} /> {balance}T
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: 6 }}>
                  {(DASHBOARD_NAV[activeRole] || DASHBOARD_NAV.user).map(item => {
                    const Icon = item.icon
                    const active = page === item.page
                    return (
                      <button key={item.label} onClick={() => navigate(item.page)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.8rem 1.25rem', minHeight: '2.75rem',
                          background: active ? 'rgba(200,16,46,0.1)' : 'none',
                          border: 'none',
                          borderLeft: active ? '3px solid var(--red)' : '3px solid transparent',
                          color: active ? 'var(--red)' : 'var(--grey-300)',
                          cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 700 : 400,
                          textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        <Icon size={18} style={{ flexShrink: 0 }} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>

                {onRoleSwitch && getAvailableRoles(profile).length > 1 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                    <RoleSwitcher profile={profile} activeRole={activeRole} onRoleSwitch={onRoleSwitch}
                      variant="list" onDone={() => setMenuOpen(false)} />
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                  <div style={{ padding: '0.375rem 1.25rem 0.25rem', fontSize: '0.625rem', color: 'var(--grey-700)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' }}>Explore</div>
                  {NAV_LINKS.filter(l => l.page !== 'home').map(l => {
                    const Icon = l.icon
                    const active = page === l.page
                    return (
                      <button key={l.page} onClick={() => navigate(l.page)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.7rem 1.25rem', minHeight: '2.75rem', background: 'none',
                          border: 'none', borderLeft: '3px solid transparent',
                          color: active ? 'var(--red)' : 'var(--grey-500)',
                          cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 400,
                          textAlign: 'left',
                        }}>
                        <Icon size={16} style={{ flexShrink: 0 }} />
                        {l.label}
                      </button>
                    )
                  })}
                </div>

                <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                  <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-400)', cursor: 'pointer', padding: '0.45rem 0.75rem', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', minHeight: '2.5rem' }}>
                    {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                  {onLogout && (
                    <button onClick={() => { onLogout(); setMenuOpen(false) }}
                      style={{ background: 'none', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8, color: 'var(--red)', cursor: 'pointer', padding: '0.45rem 0.75rem', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', minHeight: '2.5rem' }}>
                      <LogOut size={13} /> Sign out
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {NAV_LINKS.map(l => {
                  const active = page === l.page
                  const Icon = l.icon
                  return (
                    <button key={l.page} onClick={() => navigate(l.page)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.8rem 1.25rem', minHeight: '2.75rem', background: active ? 'rgba(200,16,46,0.1)' : 'none',
                        border: 'none', borderLeft: active ? '3px solid var(--red)' : '3px solid transparent',
                        color: active ? 'var(--red)' : 'var(--grey-300)',
                        cursor: 'pointer', fontSize: '0.9rem', fontWeight: active ? 700 : 400,
                        textAlign: 'left',
                      }}>
                      <Icon size={18} />
                      {l.label}
                    </button>
                  )
                })}
                <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid var(--border)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('login')}
                    style={{ flex: 1, minWidth: '7rem', padding: '0.6rem 1rem', minHeight: '2.75rem', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--grey-300)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                    Sign In
                  </button>
                  <button onClick={() => navigate('register')}
                    style={{ flex: 1, minWidth: '7rem', padding: '0.6rem 1rem', minHeight: '2.75rem', borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}>
                    Register
                  </button>
                  <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--grey-400)', cursor: 'pointer', padding: '0.45rem 0.75rem', minHeight: '2.75rem', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem' }}>
                    {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
