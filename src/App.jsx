import React, { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { supabase } from './lib/supabase.js'
import { ToastContainer } from './components/UI.jsx'
import FloatingPlayer from './components/FloatingPlayer.jsx'
import FloatingVideoPlayer from './components/FloatingVideoPlayer.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import MusicPage from './pages/Music.jsx'
import VideosPage from './pages/Videos.jsx'
import BlogPage from './pages/Blog.jsx'
import AboutPage from './pages/About.jsx'
import TermsPage from './pages/Terms.jsx'
import PrivacyPage from './pages/Privacy.jsx'
import { LoginPage, RegisterPage } from './pages/Auth.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ArtistDashboard from './pages/ArtistDashboard.jsx'
import BloggerDashboard from './pages/BloggerDashboard.jsx'
import UserDashboard    from './pages/UserDashboard.jsx'
import SearchPage       from './pages/SearchPage.jsx'

const DASHBOARD_PAGES = ['admin-dashboard', 'artist-dashboard', 'blogger-dashboard', 'user-dashboard']
const AUTH_PAGES      = ['login', 'register']
const NO_FOOTER       = [...DASHBOARD_PAGES, ...AUTH_PAGES]


// ── Telegram Community Popup ───────────────────────────────────
function TelegramPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const stored = JSON.parse(localStorage.getItem('tg_popup') || '{}')

    // Reset count if it's a new day
    if (stored.date !== today) {
      localStorage.setItem('tg_popup', JSON.stringify({ date: today, count: 0 }))
      stored.date  = today
      stored.count = 0
    }

    // Only show if shown less than 2 times today
    if (stored.count >= 2) return

    const timer = setTimeout(() => setShow(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = (joined = false) => {
    const today = new Date().toISOString().slice(0, 10)
    const stored = JSON.parse(localStorage.getItem('tg_popup') || '{}')
    const count = (stored.date === today ? stored.count : 0) + 1
    localStorage.setItem('tg_popup', JSON.stringify({ date: today, count, joined }))
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1800,
      background: 'var(--bg-card)',
      border: '1px solid rgba(0,136,204,0.5)',
      borderRadius: 14,
      padding: '20px 22px',
      maxWidth: 320,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,136,204,0.2)',
      animation: 'slideUpIn 0.4s ease',
    }}>
      <style>{`
        @keyframes slideUpIn {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Close */}
      <button onClick={dismiss} style={{
        position: 'absolute', top: 10, right: 12,
        background: 'none', border: 'none', color: 'var(--grey-500)',
        cursor: 'pointer', fontSize: 18, lineHeight: 1,
      }}>✕</button>

      {/* Telegram icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0088cc, #00b4e6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 24,
        }}>
          ✈️
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1.2 }}>
            Join the Community
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>
            Tunez9ja on Telegram
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.7, marginBottom: 16 }}>
        Get exclusive drops, connect with artists, discuss music and earn bonus TUNEZ from community activities. 🎵
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <a href="https://t.me/+BpaRRvm53U1kZGM0" target="_blank" rel="noopener noreferrer"
          onClick={() => dismiss(true)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, textAlign: 'center',
            background: 'linear-gradient(135deg,#0088cc,#00b4e6)',
            color: 'white', fontWeight: 700, fontSize: 13,
            textDecoration: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          ✈️ Join Now
        </a>
        <button onClick={dismiss} style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--grey-400)', cursor: 'pointer', fontSize: 13,
        }}>
          Later
        </button>
      </div>
    </div>
  )
}

function AppInner() {
  const [page, setPage]             = useState('home')
  const [profile, setProfile]       = useState(null)
  const [activeRole, setActiveRole] = useState(null)
  const [authReady, setAuthReady]   = useState(false)
  const [deepLink, setDeepLink]     = useState(null)


  // ── Deep link handler — reads URL params on load ──────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const track   = params.get('track')
    const post    = params.get('post')
    const video   = params.get('video')
    const artist  = params.get('artist')
    const ref     = params.get('ref')
    const signup  = params.get('signup')

    if (track)  { setPage('music');  setDeepLink({ type: 'track',  id: track  }) }
    if (post)   { setPage('blog');   setDeepLink({ type: 'post',   id: post   }) }
    if (video)  { setPage('videos'); setDeepLink({ type: 'video',  id: video  }) }
    if (artist) { setPage('music');  setDeepLink({ type: 'artist', id: artist }) }
    if (ref) sessionStorage.setItem('t9_ref', ref) // save before URL clean
    if (ref || signup) { setPage('register'); setDeepLink(prev => ({ ...prev, ref })) }

    // Clean URL without reloading
    if (track || post || video || artist || ref || signup) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setAuthReady(true), 5000) // longer fallback

    // Check localStorage immediately for instant persistent login
    // This prevents the flash of "logged out" state on page refresh
    try {
      const keys = Object.keys(localStorage).filter(k => k.includes('t9ja_session') || k.includes('supabase'))
      const hasStoredSession = keys.length > 0
      if (!hasStoredSession) {
        // No stored session — show page immediately without waiting
        clearTimeout(timeout)
        setAuthReady(true)
      }
    } catch (e) {}

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) await loadProfile(session.user.id)
      else setAuthReady(true)
    }).catch(() => { clearTimeout(timeout); setAuthReady(true) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only act on explicit signout — ignore TOKEN_REFRESHED, INITIAL_SESSION etc
      if (event === 'SIGNED_OUT') {
        // Verify session is truly gone (ignore spurious SIGNED_OUT events)
        await new Promise(r => setTimeout(r, 500)) // small delay
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (!currentSession) {
          sessionStorage.removeItem('t9_profile')
          setProfile(null)
          setActiveRole(null)
          setPage('home')
        }
        // If session still exists → false SIGNED_OUT (token refresh artifact), ignore
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Only reload if we don't have a profile yet
        setProfile(prev => {
          if (!prev) {
            loadProfile(session.user.id)
          }
          return prev
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  const loadProfile = async (userId) => {
    try {
      // Try cache first for instant load
      const cached = sessionStorage.getItem('t9_profile')
      if (cached) {
        const p = JSON.parse(cached)
        if (p.id === userId) {
          setProfile(p)
          setActiveRole(p.active_role || p.role || 'user')
          setAuthReady(true)
          // Refresh in background silently
          supabase.from('profiles').select('*').eq('id', userId).single()
            .then(({ data }) => {
              if (data) {
                const updated = { ...data, active_role: data.active_role || data.role || 'user' }
                setProfile(updated)
                setActiveRole(updated.active_role)
                sessionStorage.setItem('t9_profile', JSON.stringify(updated))
              }
            }).catch(() => {})
          return
        }
      }
      // No cache — fetch fresh
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) {
        const role = data.active_role || data.role || 'user'
        const p = { ...data, active_role: role }
        setProfile(p)
        setActiveRole(role)
        sessionStorage.setItem('t9_profile', JSON.stringify(p))
      }
    } catch (e) { console.error('loadProfile error:', e) }
    setAuthReady(true)
  }

  const handleRoleSwitch = async (newRole) => {
    // Update local state first for instant response
    setActiveRole(newRole)
    setProfile(prev => ({ ...prev, active_role: newRole }))
    // Update cache and DB in background
    const updated = { ...profile, active_role: newRole }
    sessionStorage.setItem('t9_profile', JSON.stringify(updated))
    supabase.from('profiles').update({ active_role: newRole }).eq('id', profile.id)
      .then(() => {}).catch(() => {})
    // Navigate to correct dashboard
    if (newRole === 'admin')        setPage('admin-dashboard')
    else if (newRole === 'artist')  setPage('artist-dashboard')
    else if (newRole === 'blogger') setPage('blogger-dashboard')
    else if (newRole === 'user')    setPage('user-dashboard')
  }

  // Show home page immediately while auth resolves in background
  if (!authReady && !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 200 200" fill="none" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 12px' }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="#c8102e" strokeWidth="12" strokeDasharray="180 380" strokeLinecap="round" />
          </svg>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  const safePage = (() => {
    // Only redirect to login if user is not authenticated at all
    if (DASHBOARD_PAGES.includes(page) && !profile) return 'login'
    return page
  })()

  const isDashboard = DASHBOARD_PAGES.includes(safePage)
  const isAuth      = AUTH_PAGES.includes(safePage)
  const dashboardProps = { setPage, currentUser: profile, setCurrentUser: setProfile, onRoleSwitch: handleRoleSwitch }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isDashboard && !isAuth && (
        <Navbar page={safePage} setPage={setPage} profile={profile} activeRole={activeRole}
          onLogout={async () => { await supabase.auth.signOut() }} />
      )}
      <main style={{ flex: 1 }}>
        {safePage === 'home'              && <Home setPage={setPage} />}
        {safePage === 'music'             && <MusicPage currentUser={profile} />}
        {safePage === 'videos'            && <VideosPage currentUser={profile} />}
        {safePage === 'blog'              && <BlogPage currentUser={profile} />}
        {safePage === 'about'             && <AboutPage setPage={setPage} />}
        {safePage === 'search'            && <SearchPage setPage={setPage} currentUser={profile} />}
        {safePage === 'terms'             && <TermsPage />}
        {safePage === 'privacy'           && <PrivacyPage />}
        {safePage === 'login'             && <LoginPage setPage={setPage} setProfile={setProfile} setActiveRole={setActiveRole} />}
        {safePage === 'register'          && <RegisterPage setPage={setPage} setProfile={setProfile} setActiveRole={setActiveRole} />}
        {safePage === 'admin-dashboard'   && <AdminDashboard   {...dashboardProps} />}
        {safePage === 'artist-dashboard'  && <ArtistDashboard  {...dashboardProps} />}
        {safePage === 'blogger-dashboard' && <BloggerDashboard {...dashboardProps} />}
        {safePage === 'user-dashboard'    && <UserDashboard    {...dashboardProps} />}
      </main>
      {!NO_FOOTER.includes(safePage) && <Footer setPage={setPage} />}

      {/* Floating player — renders on ALL pages, survives navigation */}
      <FloatingPlayer currentUser={profile} />
      <FloatingVideoPlayer />
      <TelegramPopup />
      <ToastContainer />
    </div>
  )
}


const ALLOWED_PAGES = new Set([
  'home','music','videos','blog','about','login','terms','privacy','search',
  'admin-dashboard','artist-dashboard','blogger-dashboard','user-dashboard'
])

export default function App() {
  return (
    <AppProvider>
      <PlayerProvider>
        <AppInner />
      </PlayerProvider>
    </AppProvider>
  )
}
