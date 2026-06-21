// src/hooks/useDashboard.js
// Shared hook used by all 3 dashboards.
// If App passes currentUser as a prop (it does), use that.
// Otherwise fall back to fetching from Supabase.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useDashboard(propUser) {
  const [currentUser, setCurrentUser] = useState(propUser || null)

  useEffect(() => {
    if (propUser) { setCurrentUser(propUser); return }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single()
        if (data) setCurrentUser(data)
      }
    })
  }, [propUser])

  // Keep in sync when App updates the profile (e.g. after role switch)
  useEffect(() => {
    if (propUser) setCurrentUser(propUser)
  }, [propUser])

  return { currentUser, setCurrentUser }
}
