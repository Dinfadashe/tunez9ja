import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         't9ja_session',
    storage:            window.localStorage,
  },
})

// If the stored refresh token is invalid (400), clear it silently
// so the user sees the app without being stuck in a broken auth loop
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Refresh returned null session — token is dead, clear it
    localStorage.removeItem('t9ja_session')
  }
})

// Catch stale token on init — if refresh fails with 400, sign out cleanly
supabase.auth.getSession().then(({ data, error }) => {
  if (error?.status === 400 || error?.message?.includes('refresh_token')) {
    localStorage.removeItem('t9ja_session')
    supabase.auth.signOut().catch(() => {})
  }
})
