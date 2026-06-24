import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,          // Store session in localStorage
    autoRefreshToken:  true,          // Auto-refresh before expiry
    detectSessionInUrl: true,         // Handle magic links / OAuth callbacks
    storage:           window.localStorage, // Explicit localStorage
    storageKey:        't9ja_session',      // Custom key to avoid conflicts
    flowType:          'pkce',        // Secure auth flow
  },
  global: {
    headers: { 'x-app-name': 'tunez9ja' }
  }
})
