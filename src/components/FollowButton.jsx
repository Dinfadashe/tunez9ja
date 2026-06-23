import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { sendNotification } from './NotificationsPanel.jsx'
import { UserPlus, UserCheck } from 'lucide-react'

export default function FollowButton({ targetId, targetName, currentUser, size = 'md' }) {
  const [following, setFollowing] = useState(false)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!currentUser?.id || !targetId || currentUser.id === targetId) return
    supabase.from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetId)
      .then(({ count }) => setFollowing(count > 0))
  }, [currentUser?.id, targetId])

  if (!currentUser || currentUser.id === targetId) return null

  const toggle = async () => {
    setLoading(true)
    if (following) {
      await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId)
      setFollowing(false)
    } else {
      await supabase.from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetId })
      setFollowing(true)
      // Notify the person being followed
      sendNotification(
        targetId, 'new_follower',
        `${currentUser.name} started following you`
      )
    }
    setLoading(false)
  }

  const pad = size === 'sm' ? '5px 12px' : '8px 18px'
  const fz  = size === 'sm' ? 12 : 13

  return (
    <button onClick={toggle} disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: pad, borderRadius: 20, fontSize: fz, fontWeight: 700,
        cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s',
        background:   following ? 'transparent' : 'var(--red)',
        border:       following ? '1px solid var(--border)' : '1px solid var(--red)',
        color:        following ? 'var(--grey-300)' : 'white',
      }}
      onMouseEnter={e => { if (following) { e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.color='var(--red)' } }}
      onMouseLeave={e => { if (following) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--grey-300)' } }}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}

// Hook to get follower/following counts for a profile
export function useFollowCounts(userId) {
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id',  userId),
    ]).then(([f1, f2]) => setCounts({ followers: f1.count || 0, following: f2.count || 0 }))
  }, [userId])
  return counts
}
