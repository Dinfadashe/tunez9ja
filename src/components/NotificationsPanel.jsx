import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { Bell, X, Check } from 'lucide-react'

const TYPE_META = {
  content_approved: { icon: '✅', color: '#22c55e', label: 'Approved' },
  content_rejected: { icon: '❌', color: '#ef4444', label: 'Rejected' },
  tunez_earned:     { icon: '🪙', color: '#ffb400', label: 'Earned' },
  new_comment:      { icon: '💬', color: '#3b82f6', label: 'Comment' },
  new_follower:     { icon: '👤', color: '#8b5cf6', label: 'Follower' },
  referral_bonus:   { icon: '👥', color: '#06b6d4', label: 'Referral' },
  daily_bonus:      { icon: '☀️', color: '#f59e0b', label: 'Daily' },
  premium_unlock:   { icon: '🔓', color: '#ec4899', label: 'Unlock' },
  general:          { icon: '📢', color: '#6b7280', label: 'Info' },
}

export function useNotifications(userId) {
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)

  const fetchNotifs = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    setNotifs(data || [])
    setUnread((data || []).filter(n => !n.is_read).length)
  }

  useEffect(() => {
    fetchNotifs()
    if (!userId) return
    const sub = supabase
      .channel('notif:' + userId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, p => {
        setNotifs(prev => [p.new, ...prev])
        setUnread(prev => prev + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId])

  const markAllRead = async () => {
    if (!userId) return
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return { notifs, unread, markAllRead, refetch: fetchNotifs }
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  return Math.floor(hrs / 24) + 'd ago'
}

function NotifItem({ n }) {
  const meta = TYPE_META[n.type] || TYPE_META.general
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 14px',
      background: n.is_read ? 'transparent' : 'rgba(200,16,46,0.04)',
      borderBottom: '1px solid var(--border)',
      borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--red)',
      alignItems: 'flex-start',
    }}>
      {/* Icon circle */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: meta.color + '18',
        border: '1px solid ' + meta.color + '44',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, marginTop: 1,
      }}>
        {meta.icon}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, lineHeight: 1.5,
          color: n.is_read ? 'var(--grey-400)' : 'var(--grey-100)',
          fontWeight: n.is_read ? 400 : 500,
          wordBreak: 'break-word',
        }}>
          {n.message}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            background: meta.color + '18', color: meta.color,
            padding: '1px 6px', borderRadius: 10, letterSpacing: 0.3,
          }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>
            {timeAgo(n.created_at)}
          </span>
          {!n.is_read && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPanel({ userId }) {
  const [open, setOpen] = useState(false)
  const { notifs, unread, markAllRead } = useNotifications(userId)
  const panelRef = useRef(null)
  const isMobile = () => window.innerWidth < 640

  // Close on outside click (desktop)
  useEffect(() => {
    const handler = (e) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (open && isMobile()) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [open])

  const handleToggle = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unread > 0) setTimeout(markAllRead, 2000)
  }

  const PanelHeader = () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 14px 11px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-card)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bell size={16} style={{ color: 'var(--red)' }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--grey-100)' }}>Notifications</span>
        {unread > 0 && (
          <span style={{
            background: 'var(--red)', color: 'white',
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
            padding: '1px 6px', borderRadius: 10,
          }}>{unread}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {unread > 0 && (
          <button onClick={markAllRead} style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--grey-400)', cursor: 'pointer',
            fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Check size={11} /> All read
          </button>
        )}
        <button onClick={() => setOpen(false)} style={{
          background: 'none', border: 'none', color: 'var(--grey-500)',
          cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex',
        }}>
          <X size={16} />
        </button>
      </div>
    </div>
  )

  const PanelBody = () => (
    <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
      {notifs.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--grey-600)' }}>
          <Bell size={28} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 13 }}>No notifications yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Activity will appear here</p>
        </div>
      ) : notifs.map(n => <NotifItem key={n.id} n={n} />)}
    </div>
  )

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* ── Bell button ── */}
      <button
        onClick={handleToggle}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        style={{
          position: 'relative', background: 'none', border: 'none',
          color: open ? 'var(--white)' : 'var(--grey-300)',
          cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center',
          borderRadius: 8, transition: 'color 0.15s',
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--red)', border: '2px solid var(--bg-base)',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-mono)',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── MOBILE: bottom sheet ── */}
      {open && (
        <div
          className="notif-mobile-only"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)',
          }}
        >
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--bg-card)',
            borderRadius: '16px 16px 0 0',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            maxHeight: '82vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <PanelHeader />
            <PanelBody />
            <div style={{ height: 'env(safe-area-inset-bottom, 12px)', minHeight: 12, flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* ── DESKTOP: dropdown ── */}
      {open && (
        <div
          className="notif-desktop-only"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 'min(380px, 90vw)',
            maxHeight: '75vh',
            minHeight: 120,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            zIndex: 600,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <PanelHeader />
          <PanelBody />
        </div>
      )}

      <style>{`
        @media (max-width: 639px) {
          .notif-desktop-only { display: none !important; }
        }
        @media (min-width: 640px) {
          .notif-mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export async function sendNotification(userId, type, message, refId = null) {
  if (!userId) return
  await supabase.from('notifications').insert({
    user_id: userId, type, message, ref_id: refId, is_read: false,
  }).catch(() => {})
}
