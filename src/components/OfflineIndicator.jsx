import React from 'react'
import useOnlineStatus from '../hooks/useOnlineStatus.js'
import { flushQueue } from '../lib/syncQueue.js'
import { WifiOff, Wifi, RefreshCw, CloudOff } from 'lucide-react'

/**
 * Small, unobtrusive connectivity + sync status indicator.
 * - Hidden entirely when online with nothing pending (the common case).
 * - Shows an offline pill while disconnected.
 * - Shows a "back online, syncing…" toast briefly on reconnect.
 * - Shows a pending-count badge if there are queued mutations.
 * Mount once near the root (e.g. in App.jsx) — fixed position, never
 * blocks interaction with the rest of the UI.
 */
export default function OfflineIndicator() {
  const { isOnline, pendingCount, justReconnected } = useOnlineStatus()

  if (isOnline && pendingCount === 0 && !justReconnected) return null

  const showOffline = !isOnline
  const showReconnected = isOnline && justReconnected
  const showPending = isOnline && !justReconnected && pendingCount > 0

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 24,
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        background: showOffline ? 'rgba(200,16,46,0.92)' : showReconnected ? 'rgba(34,197,94,0.92)' : 'rgba(255,180,0,0.92)',
        color: 'white',
        transition: 'background 0.25s ease',
        cursor: showPending ? 'pointer' : 'default',
      }}
      onClick={() => { if (showPending) flushQueue().catch(() => {}) }}
      title={showPending ? 'Tap to retry now' : undefined}
    >
      {showOffline && (
        <>
          <WifiOff size={14} />
          <span>You're offline — cached music still plays</span>
        </>
      )}
      {showReconnected && (
        <>
          <Wifi size={14} />
          <span>Back online{pendingCount > 0 ? ` — syncing ${pendingCount} update${pendingCount === 1 ? '' : 's'}…` : ''}</span>
        </>
      )}
      {showPending && (
        <>
          <CloudOff size={14} />
          <span>{pendingCount} update{pendingCount === 1 ? '' : 's'} pending sync</span>
          <RefreshCw size={12} style={{ opacity: 0.8 }} />
        </>
      )}
    </div>
  )
}

/**
 * Small "cached for offline" badge — drop onto any track/post/video
 * card to show users which content is available without a connection.
 * Usage: <CachedBadge cached={isCached} />
 */
export function CachedBadge({ cached, size = 11 }) {
  if (!cached) return null
  return (
    <span
      title="Available offline"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: size, fontFamily: 'var(--font-mono, monospace)',
        color: '#22c55e', background: 'rgba(34,197,94,0.12)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 10, padding: '1px 6px', fontWeight: 700,
      }}
    >
      ● OFFLINE
    </span>
  )
}
