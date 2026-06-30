// ════════════════════════════════════════════════════════════════
// TUNEZ9JA SERVICE WORKER REGISTRATION — safe update flow
//
// The classic refresh-loop bug: SW A calls skipWaiting() → becomes
// active → page calls location.reload() on 'controllerchange' →
// the reloaded page registers SW A again (no change) → if anything
// in that chain fires controllerchange a second time, you get an
// infinite reload loop.
//
// This module avoids it entirely: it NEVER force-reloads. Instead it
// tracks "a new version is waiting" and exposes that via a callback,
// so the UI can show a non-intrusive "Update available — Refresh"
// toast. The user (or the next natural navigation) decides when to
// actually pick up the new version. controllerchange is listened to
// exactly once and only used to know the swap completed, never to
// trigger a reload itself.
// ════════════════════════════════════════════════════════════════

let updateAvailableCallback = null
let registrationRef = null
let reloadingGuard = false // belt-and-braces: even if something else
                            // calls reload, this prevents a second one

export function onUpdateAvailable(callback) {
  updateAvailableCallback = callback
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  // Don't fight startup — register after load so it never competes
  // with the initial render for bandwidth/CPU.
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      registrationRef = reg

      // A new worker may already be waiting from a previous visit
      if (reg.waiting && navigator.serviceWorker.controller) {
        notifyUpdateAvailable()
      }

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // There's an existing controller, so this is an UPDATE
            // (not the very first install) — surface it, don't force it.
            notifyUpdateAvailable()
          }
        })
      })

      // Check for updates opportunistically (cheap HEAD-equivalent request,
      // browser dedupes if checked too recently) whenever the tab regains
      // focus, so long-lived tabs eventually offer the new version too.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && registrationRef) {
          registrationRef.update().catch(() => {})
        }
      })
    } catch {
      // Registration failed (unsupported, blocked, served over non-HTTPS in
      // dev, etc.) — the app must work fully without a SW, so this is silent.
    }
  })

  // controllerchange fires exactly once per actual SW swap. We use it only
  // to confirm the swap happened — NOT to reload. If the user clicked
  // "Refresh" in the update toast, applyUpdate() already triggered the
  // reload itself with a guard; this listener is otherwise a no-op.
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    // Intentionally do nothing further here — see module docblock.
  })
}

function notifyUpdateAvailable() {
  if (typeof updateAvailableCallback === 'function') {
    updateAvailableCallback()
  }
}

/**
 * Call this from the "Refresh" button in the update-available toast.
 * Tells the waiting worker to activate, then reloads exactly once.
 */
export function applyUpdate() {
  if (reloadingGuard) return
  if (!registrationRef || !registrationRef.waiting) {
    // Nothing actually waiting — just do a normal reload.
    window.location.reload()
    return
  }
  reloadingGuard = true
  registrationRef.waiting.postMessage({ type: 'SKIP_WAITING' })
  // Reload once the new SW has actually taken control, not immediately —
  // otherwise the reloaded page can race the old worker for one frame.
  const onControllerChange = () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    window.location.reload()
  }
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
  // Safety net: if controllerchange never fires for some reason, don't
  // leave the user stuck on a "Refresh" button that does nothing.
  setTimeout(() => {
    if (reloadingGuard) {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.location.reload()
    }
  }, 3000)
}

/** Send a message to the active SW (used by useOfflineAudioSync, etc). */
export async function postToServiceWorker(message) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    if (reg.active) reg.active.postMessage(message)
  } catch { /* SW not ready yet — caller can retry on next cycle */ }
}
