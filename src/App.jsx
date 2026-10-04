import React, { useState, useEffect } from 'react'
const WhitepaperWidget = React.lazy(() => import('./components/WhitepaperWidget.jsx'))
const AIDJPlayer = React.lazy(() => import('./components/AIDJPlayer.jsx'))
import ErrorBoundary from './components/ErrorBoundary.jsx'
const ChartsPage = React.lazy(() => import('./pages/ChartsPage.jsx'))
const AlbumsPage = React.lazy(() => import('./components/Albums.jsx'))
import { AppProvider } from './context/AppContext.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { dashboardPageForRole, getAvailableRoles } from './components/RoleSwitcher.jsx'
import { supabase } from './lib/supabase.js'
import { parseLocation, navigateToPage, openItem, onUrlChange } from './lib/urlState.js'
import { ToastContainer } from './components/UI.jsx'
import FloatingPlayer from './components/FloatingPlayer.jsx'
import FloatingVideoPlayer from './components/FloatingVideoPlayer.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import OfflineIndicator from './components/OfflineIndicator.jsx'
import { registerServiceWorker, onUpdateAvailable, applyUpdate, postToServiceWorker } from './lib/swRegister.js'
import { initSyncQueue, flushQueue } from './lib/syncQueue.js'
const Home = React.lazy(() => import('./pages/Home.jsx'))
const MusicPage = React.lazy(() => import('./pages/Music.jsx'))
const VideosPage = React.lazy(() => import('./pages/Videos.jsx'))
const BlogPage = React.lazy(() => import('./pages/Blog.jsx'))
const AboutPage = React.lazy(() => import('./pages/About.jsx'))
const TermsPage = React.lazy(() => import('./pages/Terms.jsx'))
const PrivacyPage = React.lazy(() => import('./pages/Privacy.jsx'))
const LoginPage    = React.lazy(() => import('./pages/Auth.jsx').then(m => ({ default: m.LoginPage })))
const RegisterPage = React.lazy(() => import('./pages/Auth.jsx').then(m => ({ default: m.RegisterPage })))
const ResetPasswordPage = React.lazy(() => import('./pages/Auth.jsx').then(m => ({ default: m.ResetPasswordPage })))
const SearchPage = React.lazy(() => import('./pages/SearchPage.jsx'))
const ProfilePage = React.lazy(() => import('./components/ProfilePage.jsx'))

// ── Offline audio cache: sync saved + library tracks every 5min ──
function useOfflineAudioSync(currentUser) {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let interval = null

    async function syncAudio() {
      if (!navigator.onLine) return
      try {
        const urls = []

        if (currentUser?.id) {
          // Saved tracks
          const { data: saved } = await supabase
            .from('saved_tracks')
            .select('track:track_id(audio_url)')
            .eq('user_id', currentUser.id)
            .limit(50)
          ;(saved || []).forEach(s => { if (s.track?.audio_url) urls.push(s.track.audio_url) })

          // Unlocked premium tracks
          const { data: unlocks } = await supabase
            .from('tunez_unlocks')
            .select('content_id')
            .eq('user_id', currentUser.id)
            .eq('content_type', 'track')
            .limit(20)
          if (unlocks?.length) {
            const ids = unlocks.map(u => u.content_id)
            const { data: tracks } = await supabase
              .from('music_tracks')
              .select('audio_url')
              .in('id', ids)
            ;(tracks || []).forEach(t => { if (t.audio_url) urls.push(t.audio_url) })
          }
        }

        // Latest 10 free tracks always cached — gives every visitor,
        // logged in or not, something playable offline.
        const { data: latest } = await supabase
          .from('music_tracks')
          .select('audio_url')
          .eq('status', 'approved')
          .eq('is_premium', false)
          .order('created_at', { ascending: false })
          .limit(10)
        ;(latest || []).forEach(t => { if (t.audio_url) urls.push(t.audio_url) })

        if (urls.length > 0) {
          postToServiceWorker({ type: 'CACHE_AUDIO_URLS', urls: [...new Set(urls)] })
        }
      } catch { /* silently fail — never block the UI for a background cache pass */ }
    }

    // SW asks the page to resend URLs (from its periodicsync handler)
    const handler = (e) => {
      if (e.data?.type === 'REQUEST_AUDIO_URLS') syncAudio()
    }
    navigator.serviceWorker.addEventListener('message', handler)

    // Initial sync + every 5 minutes, per spec
    syncAudio()
    interval = setInterval(syncAudio, 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
      navigator.serviceWorker.removeEventListener('message', handler)
    }
  }, [currentUser?.id])
}
const AdminDashboard   = React.lazy(() => import('./pages/AdminDashboard.jsx'))
const ArtistDashboard  = React.lazy(() => import('./pages/ArtistDashboard.jsx'))
const BloggerDashboard = React.lazy(() => import('./pages/BloggerDashboard.jsx'))
const UserDashboard    = React.lazy(() => import('./pages/UserDashboard.jsx'))
const EditorDashboard  = React.lazy(() => import('./pages/EditorDashboard.jsx'))

const DASHBOARD_PAGES = ['admin-dashboard', 'artist-dashboard', 'blogger-dashboard', 'user-dashboard', 'editor-dashboard']
const AUTH_PAGES      = ['login', 'register']
const NO_FOOTER       = [...DASHBOARD_PAGES, ...AUTH_PAGES]


// ── Telegram Community Popup ───────────────────────────────────
function TelegramPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('tg_popup') || '{}')

    // If user already joined — never show again
    if (stored.joined) return

    // If shown in last 24 hours — skip
    if (stored.lastShown) {
      const hoursSince = (Date.now() - stored.lastShown) / 1000 / 3600
      if (hoursSince < 24) return
    }

    // Show after 10 seconds
    const timer = setTimeout(() => setShow(true), 10000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = (joined = false) => {
    localStorage.setItem('tg_popup', JSON.stringify({
      lastShown: Date.now(),
      joined,
    }))
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))',
      right: 'max(1rem, env(safe-area-inset-right, 0px))',
      left: 'max(1rem, env(safe-area-inset-left, 0px))',
      zIndex: 1800,
      background: 'var(--bg-card)',
      border: '1px solid rgba(0,136,204,0.5)',
      borderRadius: 14,
      padding: 'clamp(1rem, 0.9rem + 0.5vw, 1.375rem)',
      maxWidth: '20rem',
      width: 'auto',
      marginLeft: 'auto', /* right-aligns within the left/right bounds on wide screens */
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
      <button onClick={() => dismiss(false)} style={{
        position: 'absolute', top: '0.625rem', right: '0.75rem',
        background: 'none', border: 'none', color: 'var(--grey-400)',
        cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: '0.25rem 0.375rem',
        borderRadius: 6, minWidth: '2.75rem', minHeight: '2.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} title="Close" aria-label="Dismiss">✕</button>

      {/* Telegram icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <div style={{
          width: '3rem', height: '3rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #0088cc, #00b4e6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '1.5rem',
        }}>
          ✈️
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', lineHeight: 1.2 }}>
            Join the Community
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--grey-400)', marginTop: '0.125rem' }}>
            Tunez9ja on Telegram
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--grey-300)', lineHeight: 1.7, marginBottom: '1rem' }}>
        Get exclusive drops, connect with artists, discuss music and earn bonus TUNEZ from community activities. 🎵
      </p>

      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <a href="https://t.me/+BpaRRvm53U1kZGM0" target="_blank" rel="noopener noreferrer"
          onClick={() => dismiss(true)}
          style={{
            flex: 1, padding: '0.625rem 0', borderRadius: 8, textAlign: 'center',
            minHeight: '2.75rem',
            background: 'linear-gradient(135deg,#0088cc,#00b4e6)',
            color: 'white', fontWeight: 700, fontSize: '0.8125rem',
            textDecoration: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
          }}>
          ✈️ Join Now
        </a>
        <button onClick={dismiss} style={{
          padding: '0.625rem 0.875rem', borderRadius: 8, minHeight: '2.75rem',
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--grey-400)', cursor: 'pointer', fontSize: '0.8125rem',
        }}>
          Later
        </button>
      </div>
    </div>
  )
}

function AppInner() {
  // The address bar is the source of truth for what's on screen, so every
  // page and item has a copyable link (see src/lib/urlState.js).
  const [profileId, setProfileId] = React.useState(() => {
    const { item } = parseLocation()
    return item?.type === 'profile' ? item.id : null
  })
  const [djOpen, setDjOpen] = React.useState(false)
  const [page, rawSetPage]          = useState(() => parseLocation().page)
  const setPage = React.useCallback((p) => {
    if (!p) return
    rawSetPage(p)
    setDeepLink(null)
    navigateToPage(p)
  }, [])
  const [profile, setProfile]       = useState(null)
  const [activeRole, setActiveRole] = useState(null)
  const [authReady, setAuthReady]   = useState(false)
  const [deepLink, setDeepLink]     = useState(() => parseLocation().item)
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false)

  // ── Offline support: register SW once, init the sync queue, wire
  //    the audio pre-cache loop. All three are no-ops in unsupported
  //    browsers and never throw, so they can't affect existing flows. ──
  useEffect(() => {
    registerServiceWorker()
    onUpdateAvailable(() => setSwUpdateAvailable(true))
    initSyncQueue(supabase)
  }, [])

  useOfflineAudioSync(profile)


  // ── Referral code saved at signup (email-confirmation flow) ──
  useEffect(() => {
    if (!profile?.id) return
    const code = localStorage.getItem('t9_ref_pending')
    if (!code) return
    import('./lib/tunez.js').then(({ claimReferralBonus }) => claimReferralBonus(code))
      .finally(() => localStorage.removeItem('t9_ref_pending'))
  }, [profile?.id])

  // ── Keep page / open item in sync with the address bar ──────
  // Fires on in-app navigation and on browser back/forward.
  useEffect(() => onUrlChange(() => {
    const { page: p, item } = parseLocation()
    rawSetPage(p)
    setDeepLink(item)
    if (item?.type === 'profile') setProfileId(item.id)
  }), [])

  // ── Referral / signup links → registration ─────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref    = params.get('ref')
    const signup = params.get('signup')
    if (ref) sessionStorage.setItem('t9_ref', ref)
    if (ref || signup) { rawSetPage('register'); navigateToPage('register', { replace: true }) }
  }, [])

  // ── "Open this track" requests from anywhere (player bar, home cards…) ──
  useEffect(() => {
    const handler = (e) => { if (e.detail?.id) openItem('track', e.detail.id, e.detail) }
    window.addEventListener('openTrackPage', handler)
    return () => window.removeEventListener('openTrackPage', handler)
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
      if (event === 'PASSWORD_RECOVERY') { navigateToPage('reset-password', { replace: true }); return }
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
          supabase.rpc('my_profile').maybeSingle()
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
      const { data } = await supabase.rpc('my_profile').maybeSingle()
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
      .then(({ error }) => { if (error) console.warn('active_role not saved:', error.message) })
    // Navigate to correct dashboard
    setPage(dashboardPageForRole(newRole))
  }


  // Listen for profile open events from any component
  React.useEffect(() => {
    const handler = (e) => { if (e.detail?.profileId) openItem('profile', e.detail.profileId) }
    window.addEventListener('openProfile', handler)
    return () => window.removeEventListener('openProfile', handler)
  }, [])

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
    if (!ALLOWED_PAGES.has(page)) return 'home'   // unknown ?page= value
    if (page === 'profile' && !profileId) return 'home'
    if (DASHBOARD_PAGES.includes(page) && !profile) return 'login'
    // Dashboards only for roles this account actually holds (UI guard —
    // the database's RLS remains the real enforcement)
    if (DASHBOARD_PAGES.includes(page)) {
      const allowed = getAvailableRoles(profile).map(r => r.page)
      if (!allowed.includes(page)) return allowed.includes('user-dashboard') ? 'user-dashboard' : 'home'
    }
    return page
  })()

  const isDashboard = DASHBOARD_PAGES.includes(safePage)
  const isAuth      = AUTH_PAGES.includes(safePage)
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } catch (e) { console.error('Sign out error:', e) }
    sessionStorage.removeItem('t9_profile')
    setProfile(null)
    setActiveRole(null)
    setPage('home')
  }
  const dashboardProps = { setPage, currentUser: profile, setCurrentUser: setProfile, onRoleSwitch: handleRoleSwitch, activeRole, onSignOut: handleSignOut }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <OfflineIndicator />
      {swUpdateAvailable && (
        <div style={{
          position: 'fixed', bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2100, display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(20,20,20,0.96)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
          padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          fontSize: 13, color: 'white', fontFamily: 'var(--font-mono, monospace)',
        }}>
          <span>A new version of Tunez9ja is ready.</span>
          <button onClick={applyUpdate} style={{
            background: 'var(--red, #c8102e)', border: 'none', color: 'white',
            borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 12.5,
            cursor: 'pointer', minHeight: 36,
          }}>
            Refresh
          </button>
        </div>
      )}
      {!isDashboard && !isAuth && (
        <Navbar page={safePage} setPage={setPage} profile={profile} activeRole={activeRole} onRoleSwitch={handleRoleSwitch} onDJOpen={() => setDjOpen(true)}
          onLogout={async () => { await supabase.auth.signOut() }} />
      )}
      <main style={{ flex: 1 }}>
        <React.Suspense fallback={<div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--grey-500)',fontFamily:'var(--font-mono)',letterSpacing:2}}>LOADING...</div>}>
        {safePage === 'home'              && <Home setPage={setPage} />}
        {safePage === 'music'             && <MusicPage currentUser={profile} setPage={setPage} deepLink={deepLink} />}
        {safePage === 'videos'            && <VideosPage currentUser={profile} setPage={setPage} deepLink={deepLink} />}
        {safePage === 'blog'              && <BlogPage currentUser={profile} setPage={setPage} deepLink={deepLink} />}
        {safePage === 'about'             && <AboutPage setPage={setPage} />}
        {safePage === 'search'            && <SearchPage setPage={setPage} currentUser={profile} />}
        {safePage === 'charts'           && <ChartsPage currentUser={profile} />}
        {safePage === 'albums'           && <AlbumsPage currentUser={profile} setPage={setPage} />}
        {safePage === 'profile'           && <ProfilePage profileId={profileId} currentUser={profile} setPage={setPage} />}
        {safePage === 'terms'             && <TermsPage />}
        {safePage === 'privacy'           && <PrivacyPage />}
        {safePage === 'login'             && <LoginPage setPage={setPage} setProfile={setProfile} setActiveRole={setActiveRole} />}
        {safePage === 'reset-password'    && <ResetPasswordPage setPage={setPage} />}
        {safePage === 'register'          && <RegisterPage setPage={setPage} setProfile={setProfile} setActiveRole={setActiveRole} />}
        {safePage === 'admin-dashboard'   && <AdminDashboard   {...dashboardProps} />}
        {safePage === 'artist-dashboard'  && <ArtistDashboard  {...dashboardProps} />}
        {safePage === 'blogger-dashboard' && <BloggerDashboard {...dashboardProps} />}
        {safePage === 'user-dashboard'    && <UserDashboard    {...dashboardProps} />}
        {safePage === 'editor-dashboard'  && <EditorDashboard  {...dashboardProps} />}
        </React.Suspense>
      </main>
      {!NO_FOOTER.includes(safePage) && <Footer setPage={setPage} />}

      {/* Floating player — renders on ALL pages, survives navigation */}
      {!isDashboard && (
        <React.Suspense fallback={null}>
          <WhitepaperWidget />
        </React.Suspense>
      )}
      {djOpen && (
        <React.Suspense fallback={null}>
          <AIDJPlayer currentUser={profile} onClose={() => setDjOpen(false)} />
        </React.Suspense>
      )}
      <FloatingPlayer currentUser={profile} />
      <FloatingVideoPlayer />
      {!isDashboard && <TelegramPopup />}
      <ToastContainer />
    </div>
  )
}


const ALLOWED_PAGES = new Set([
  'home','music','videos','blog','about','login','register','reset-password','terms','privacy','search',
  'charts','albums','profile',
  'admin-dashboard','artist-dashboard','blogger-dashboard','user-dashboard','editor-dashboard'
])

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <PlayerProvider>
          <AppInner />
        </PlayerProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}
