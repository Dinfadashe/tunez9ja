import { useState, useEffect } from 'react'
import { getPendingCount } from '../lib/syncQueue.js'

/**
 * Tracks connectivity + pending-sync count for UI indicators.
 * Pure read hook — never throws, never blocks render.
 */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState(0)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 4000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      getPendingCount().then((n) => { if (!cancelled) setPendingCount(n) }).catch(() => {})
    }
    refresh()
    const interval = setInterval(refresh, 15000) // light poll, IndexedDB reads are cheap
    window.addEventListener('online', refresh)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener?.('message', (e) => {
        if (e.data?.type === 'FLUSH_SYNC_QUEUE') setTimeout(refresh, 1500)
      })
    }

    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('online', refresh) }
  }, [])

  return { isOnline, pendingCount, justReconnected }
}
