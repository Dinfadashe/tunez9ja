import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { Bell } from 'lucide-react'

const NOTIF_ICONS = {
  content_approved: '✅',
  content_rejected: '❌',
  tunez_earned:     '🪙',
  new_comment:      '💬',
  new_follower:     '👤',
  referral_bonus:   '👥',
  daily_bonus:      '☀️',
  premium_unlock:   '🔓',
  general:          '📢',
}

export function useNotifications(userId) {
  const [notifs,  setNotifs]  = useState([])
  const [unread,  setUnread]  = useState(0)

  const fetch = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs(data || [])
    setUnread((data || []).filter(n => !n.is_read).length)
  }

  useEffect(() => {
    fetch()
    if (!userId) return
    // Realtime subscription
    const sub = supabase
      .channel('notifications:' + userId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, payload => {
        setNotifs(prev => [payload.new, ...prev])
        setUnread(prev => prev + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return { notifs, unread, markAllRead, refetch: fetch }
}

export default function NotificationsPanel({ userId }) {
  const [open, setOpen] = useState(false)
  const { notifs, unread, markAllRead } = useNotifications(userId)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && unread > 0) setTimeout(markAllRead, 1500)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button onClick={handleOpen}
        style={{ position:'relative', background:'none', border:'none', color:'var(--grey-300)', cursor:'pointer', padding:8, display:'flex', alignItems:'center', borderRadius:8, transition:'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color='var(--white)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--grey-300)'}>
        <Bell size={20} />
        {unread > 0 && (
          <span style={{ position:'absolute', top:4, right:4, width:16, height:16, borderRadius:'50%', background:'var(--red)', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'var(--font-mono)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 8px)', width:340,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:12, boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
          zIndex:500, overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18 }}>Notifications</div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:12 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight:400, overflowY:'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--grey-500)' }}>
                <Bell size={28} style={{ opacity:0.2, margin:'0 auto 10px', display:'block' }} />
                <div style={{ fontSize:13 }}>No notifications yet</div>
              </div>
            ) : notifs.map(n => (
              <div key={n.id} style={{
                display:'flex', gap:12, padding:'12px 16px',
                background: n.is_read ? 'transparent' : 'rgba(200,16,46,0.05)',
                borderBottom:'1px solid var(--border)',
                borderLeft: n.is_read ? 'none' : '3px solid var(--red)',
                transition:'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background=n.is_read?'transparent':'rgba(200,16,46,0.05)'}
              >
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg-surface)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {NOTIF_ICONS[n.type] || '📢'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight: n.is_read ? 400 : 600, lineHeight:1.5 }}>{n.message}</div>
                  <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', marginTop:4 }}>
                    {new Date(n.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to send a notification
export async function sendNotification(userId, type, message, refId = null) {
  if (!userId) return
  await supabase.from('notifications').insert({
    user_id: userId, type, message, ref_id: refId, is_read: false
  }).catch(() => {})
}
