import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const sheetRef = useRef(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [dropTop, setDropTop] = useState(64)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close on outside tap/click. The mobile panel is rendered in a portal
  // (outside panelRef in the DOM), so taps inside it must count as inside.
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current?.contains(e.target) || sheetRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', handler); document.removeEventListener('keydown', onKey) }
  }, [open])

  // Mobile: stop the page scrolling behind the panel (overflow only —
  // position:fixed on <body> made iPhones jump back to the top)
  useEffect(() => {
    if (!(open && isMobile)) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  const handleToggle = () => {
    const willOpen = !open
    if (willOpen) {
      // Drop down from just below the navbar, wherever it currently is
      const nav = panelRef.current?.closest('nav, header, .navbar')
      const bottom = (nav || panelRef.current)?.getBoundingClientRect().bottom
      setDropTop(Math.max(8, Math.round(bottom || 64)))
    }
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
          cursor: 'pointer', padding: 10, margin: -6, borderRadius: 6, display: 'flex',
        }} aria-label="Close notifications">
          <X size={18} />
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

      {/* ── MOBILE: drop-down panel, rendered at <body> level ──
           The navbar uses backdrop-filter, which traps position:fixed
           children inside it — that is why the old sheet never appeared. */}
      {open && isMobile && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)' }}
        >
          <div ref={sheetRef} role="dialog" aria-label="Notifications" style={{
            position: 'absolute', top: dropTop, left: 8, right: 8,
            maxHeight: `calc(100dvh - ${dropTop + 16}px)`,
            background: 'var(--bg-card)',
            borderRadius: 14,
            border: '1px solid var(--border)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 't9NotifDrop 0.18s ease-out',
          }}>
            <PanelHeader />
            <PanelBody />
          </div>
          <style>{`@keyframes t9NotifDrop { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }`}</style>
        </div>,
        document.body
      )}

      {/* ── DESKTOP: dropdown ── */}
      {open && !isMobile && (
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

    </div>
  )
}

export async function sendNotification(userId, type, message, refId = null) {
  if (!userId) return
  await supabase.from('notifications').insert({
    user_id: userId, type, message, ref_id: refId, is_read: false,
  }).catch(() => {})
}
