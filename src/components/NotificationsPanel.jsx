import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { Bell, X } from 'lucide-react'

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const { notifs, unread, markAllRead } = useNotifications(userId)
  const panelRef = useRef(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close on outside click (desktop only)
  useEffect(() => {
    if (isMobile) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isMobile])

  // Prevent body scroll when mobile panel open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, open])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && unread > 0) setTimeout(markAllRead, 1500)
  }

  const NotifList = () => (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {notifs.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey-500)' }}>
          <Bell size={32} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14 }}>No notifications yet</div>
        </div>
      ) : notifs.map(n => (
        <div key={n.id} style={{
          display: 'flex', gap: 12, padding: '14px 16px',
          background: n.is_read ? 'transparent' : 'rgba(200,16,46,0.05)',
          borderBottom: '1px solid var(--border)',
          borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--red)',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {NOTIF_ICONS[n.type] || '📢'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, lineHeight: 1.6, color: 'var(--grey-200)' }}>
              {n.message}
            </div>
            <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {new Date(n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button onClick={handleOpen}
        style={{ position: 'relative', background: 'none', border: 'none', color: open ? 'var(--white)' : 'var(--grey-300)', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', borderRadius: 8, transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--white)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--grey-300)' }}>
        <Bell size={20} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--red)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-mono)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── MOBILE: full-screen overlay ───────────────────────── */}
      {open && isMobile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px 20px 0 0',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>Notifications</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--grey-400)', cursor: 'pointer', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <NotifList />
            {/* Safe area padding */}
            <div style={{ height: 'env(safe-area-inset-bottom, 16px)', minHeight: 16 }} />
          </div>
        </div>
      )}

      {/* ── DESKTOP/TABLET: dropdown panel ────────────────────── */}
      {open && !isMobile && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: 'clamp(300px, 40vw, 420px)',
          maxHeight: '80vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Notifications</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 2 }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <NotifList />
        </div>
      )}
    </div>
  )
}

export async function sendNotification(userId, type, message, refId = null) {
  if (!userId) return
  await supabase.from('notifications').insert({
    user_id: userId, type, message, ref_id: refId, is_read: false
  }).catch(() => {})
}
