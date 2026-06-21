import React, { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { supabase } from './lib/supabase.js'
import { ToastContainer } from './components/UI.jsx'
import FloatingPlayer from './components/FloatingPlayer.jsx'
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

const DASHBOARD_PAGES = ['admin-dashboard', 'artist-dashboard', 'blogger-dashboard']
const AUTH_PAGES      = ['login', 'register']
const NO_FOOTER       = [...DASHBOARD_PAGES, ...AUTH_PAGES]

function AppInner() {
  const [page, setPage]             = useState('home')
  const [profile, setProfile]       = useState(null)
  const [activeRole, setActiveRole] = useState(null)
  const [authReady, setAuthReady]   = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setAuthReady(true), 4000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) await loadProfile(session.user.id)
      else setAuthReady(true)
    }).catch(() => { clearTimeout(timeout); setAuthReady(true) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setActiveRole(null); setPage('home') }
      if (event === 'SIGNED_IN' && session?.user) await loadProfile(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  const loadProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) {
        const role = data.active_role || data.role || 'artist'
        setProfile({ ...data, active_role: role })
        setActiveRole(role)
      }
    } catch (e) {}
    setAuthReady(true)
  }

  const handleRoleSwitch = async (newRole) => {
    setActiveRole(newRole)
    setProfile(prev => ({ ...prev, active_role: newRole }))
    await supabase.from('profiles').update({ active_role: newRole }).eq('id', profile.id)
    if (newRole === 'admin')        setPage('admin-dashboard')
    else if (newRole === 'artist')  setPage('artist-dashboard')
    else if (newRole === 'blogger') setPage('blogger-dashboard')
  }

  if (!authReady) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <svg width="56" height="56" viewBox="0 0 200 200" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="100" cy="100" r="90" fill="none" stroke="#c8102e" strokeWidth="10" strokeDasharray="180 380" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', letterSpacing: 4 }}>LOADING...</span>
    </div>
  )

  const safePage = (() => {
    if (page === 'admin-dashboard'   && activeRole !== 'admin')   return 'login'
    if (page === 'artist-dashboard'  && activeRole !== 'artist')  return 'login'
    if (page === 'blogger-dashboard' && activeRole !== 'blogger') return 'login'
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
        {safePage === 'terms'             && <TermsPage />}
        {safePage === 'privacy'           && <PrivacyPage />}
        {safePage === 'login'             && <LoginPage setPage={setPage} setProfile={setProfile} setActiveRole={setActiveRole} />}
        {safePage === 'register'          && <RegisterPage setPage={setPage} setProfile={setProfile} setActiveRole={setActiveRole} />}
        {safePage === 'admin-dashboard'   && <AdminDashboard   {...dashboardProps} />}
        {safePage === 'artist-dashboard'  && <ArtistDashboard  {...dashboardProps} />}
        {safePage === 'blogger-dashboard' && <BloggerDashboard {...dashboardProps} />}
      </main>
      {!NO_FOOTER.includes(safePage) && <Footer setPage={setPage} />}

      {/* Floating player â€” renders on ALL pages, survives navigation */}
      <FloatingPlayer currentUser={profile} />
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <PlayerProvider>
        <AppInner />
      </PlayerProvider>
    </AppProvider>
  )
}
