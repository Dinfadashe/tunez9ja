// src/lib/audioUrl.js
// ─────────────────────────────────────────────────────────────────────────────
// Where the player should load a track's audio from.
//
//  • Free tracks:   their public 'music-audio' URL, unchanged.
//  • Downloaded:    the canonical URL — the service worker serves it from the
//                   device (no network, no signing needed).
//  • Premium:       stored in the PRIVATE 'music-premium' bucket. Supabase only
//                   issues a short-lived signed link to the artist, an admin,
//                   or a listener who unlocked the track (database policy
//                   'music-premium: entitled read'). Links are fetched ahead of
//                   time for the queue so pressing Next stays instant.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase.js'
import { isDownloadedUrl } from './downloads.js'

export const PREMIUM_BUCKET = 'music-premium'
const SIGN_SECONDS = 3 * 60 * 60          // 3 hours
const REUSE_MARGIN = 10 * 60 * 1000       // refresh links with <10 min left
const cache = new Map()                   // path → { url, expires }

/** Storage path inside the premium bucket, or null for normal tracks. */
export function premiumPath(audioUrl) {
  const m = String(audioUrl || '').match(/\/(?:object\/(?:public|sign|authenticated)\/)?music-premium\/([^?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export const isPremiumAudio = (track) => !!premiumPath(track?.audio_url)

/** A URL the player can use right now, or null if a signed link is needed first. */
export function getPlayableUrl(track) {
  const url = track?.audio_url
  if (!url) return null
  const path = premiumPath(url)
  if (!path) return url                                   // free track
  if (isDownloadedUrl(url)) return url                    // served from the device
  const c = cache.get(path)
  return c && c.expires - Date.now() > REUSE_MARGIN ? c.url : null
}

/** Same as getPlayableUrl, but fetches a signed link if needed. */
export async function resolvePlayableUrl(track) {
  const ready = getPlayableUrl(track)
  if (ready) return ready
  const path = premiumPath(track?.audio_url)
  if (!path) return null
  const { data, error } = await supabase.storage.from(PREMIUM_BUCKET).createSignedUrl(path, SIGN_SECONDS)
  if (error || !data?.signedUrl) return null              // not unlocked / not signed in
  cache.set(path, { url: data.signedUrl, expires: Date.now() + SIGN_SECONDS * 1000 })
  return data.signedUrl
}

/** Fetch signed links for every premium track in a list (e.g. the queue). */
export async function presignTracks(tracks) {
  const paths = [...new Set((tracks || [])
    .filter(t => t?.audio_url && !isDownloadedUrl(t.audio_url))
    .map(t => premiumPath(t.audio_url))
    .filter(p => p && !(cache.get(p)?.expires - Date.now() > REUSE_MARGIN)))]
  if (!paths.length) return
  try {
    const { data } = await supabase.storage.from(PREMIUM_BUCKET).createSignedUrls(paths, SIGN_SECONDS)
    for (const row of data || []) {
      if (row?.signedUrl && row.path) cache.set(row.path, { url: row.signedUrl, expires: Date.now() + SIGN_SECONDS * 1000 })
    }
  } catch { /* offline or not entitled — resolved one by one later */ }
}

/** Forget signed links (e.g. after sign-out). */
export const clearSignedAudio = () => cache.clear()
