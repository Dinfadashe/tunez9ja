// src/hooks/useDashboard.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useDashboard(propUser) {
  const [currentUser, setCurrentUser] = useState(propUser || null)

  useEffect(() => {
    // If prop provided, use it immediately — no delay
    if (propUser) {
      setCurrentUser(propUser)
      return
    }
    // Only fetch if no prop (direct URL navigation)
    let cancelled = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session?.user) return
      const { data } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (!cancelled && data) setCurrentUser(data)
    })
    return () => { cancelled = true }
  }, [propUser?.id]) // only re-run if user ID changes

  return { currentUser, setCurrentUser }
}
