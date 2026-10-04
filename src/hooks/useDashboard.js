// src/hooks/useDashboard.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchMyProfile } from '../lib/myProfile.js'

export function useDashboard(propUser) {
  const [currentUser, setCurrentUser] = useState(propUser || null)

  useEffect(() => {
    if (!propUser?.id) return
    // Always fetch fresh profile from DB — prop may be stale
    fetchMyProfile()
      .then(({ data }) => { if (data) setCurrentUser(data) })
      .catch(() => setCurrentUser(propUser)) // fallback to prop on error
  }, [propUser?.id])

  return { currentUser, setCurrentUser }
}
