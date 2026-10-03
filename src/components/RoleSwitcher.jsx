import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Shield, Mic2, Newspaper, PenLine, User as UserIcon } from 'lucide-react'

// Single source of truth for role metadata and where each role lands.
export const ROLES = [
  { key: 'admin',   label: 'Admin',   icon: Shield,    color: 'var(--red)', page: 'admin-dashboard'   },
  { key: 'artist',  label: 'Artist',  icon: Mic2,      color: '#7b4fff',    page: 'artist-dashboard'  },
  { key: 'blogger', label: 'Blogger', icon: Newspaper, color: '#00b4dc',    page: 'blogger-dashboard' },
  { key: 'editor',  label: 'Editor',  icon: PenLine,   color: '#f59e0b',    page: 'editor-dashboard'  },
  { key: 'user',    label: 'User',    icon: UserIcon,  color: '#00c864',    page: 'user-dashboard'    },
]

export const dashboardPageForRole = (role) =>
  (ROLES.find(r => r.key === role) || ROLES[ROLES.length - 1]).page

export function getAvailableRoles(profile) {
  if (!profile) return []
  const keys = new Set(profile.available_roles?.length ? profile.available_roles : [profile.role])
  if (profile.editor_status === 'approved') keys.add('editor')
  return ROLES.filter(r => keys.has(r.key))
}

/**
 * variant:
 *   'dropdown' — button that opens a menu. `placement` is 'up' or 'down'.
 *   'list'     — always-visible list of roles (for mobile menus).
 * Renders nothing when the person has only one role.
 */
export default function RoleSwitcher({
  profile, activeRole, onRoleSwitch,
  variant = 'dropdown', placement = 'down', compact = false, onDone,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const roles = getAvailableRoles(profile)
  const currentKey = activeRole || profile?.active_role || profile?.role || 'user'
  const current = ROLES.find(r => r.key === currentKey) || ROLES[ROLES.length - 1]

  // Close the dropdown on outside tap/click
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  if (!onRoleSwitch || roles.length < 2) return null

  const pick = (key) => {
    setOpen(false)
    onDone?.()
    if (key !== currentKey) onRoleSwitch(key)
  }

  const item = (role) => {
    const isActive = role.key === currentKey
    return (
      <button key={role.key} type="button" onClick={() => pick(role.key)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.7rem 1rem', minHeight: '2.75rem',
          background: isActive ? 'var(--bg-hover, rgba(255,255,255,0.06))' : 'transparent',
          border: 'none', borderLeft: `3px solid ${isActive ? role.color : 'transparent'}`,
          color: isActive ? 'var(--white, #fff)' : 'var(--grey-300, #bbb)',
          fontSize: 13, cursor: 'pointer', textAlign: 'left',
        }}>
        <role.icon size={15} style={{ color: role.color, flexShrink: 0 }} />
        {role.label}
        {isActive && <span style={{ marginLeft: 'auto', fontSize: 10, color: role.color, fontFamily: 'var(--font-mono)' }}>● ACTIVE</span>}
      </button>
    )
  }

  if (variant === 'list') {
    return (
      <div>
        <div style={{ padding: '0.375rem 1.25rem 0.25rem', fontSize: '0.625rem', color: 'var(--grey-700)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' }}>
          Switch role
        </div>
        <div style={{ paddingLeft: '0.25rem' }}>{roles.map(item)}</div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: compact ? 'auto' : '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        aria-haspopup="menu" aria-expanded={open}
        title="Switch role"
        style={{
          width: compact ? 'auto' : '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? '0.3rem 0.6rem' : '8px 12px', minHeight: compact ? '2.25rem' : 36,
          background: 'var(--bg-surface, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: 8,
          color: 'var(--grey-300, #bbb)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'var(--font-mono)', letterSpacing: 1, whiteSpace: 'nowrap',
        }}>
        <current.icon size={13} style={{ color: current.color }} />
        {compact ? current.label.toUpperCase() : 'SWITCH ROLE'}
        <ChevronDown size={13} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', zIndex: 1000,
          ...(placement === 'up' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          ...(compact ? { right: 0, minWidth: 190 } : { left: 0, right: 0 }),
          background: 'var(--bg-card, #141414)', border: '1px solid var(--border, #333)', borderRadius: 8,
          overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
          {roles.map(item)}
        </div>
      )}
    </div>
  )
}
