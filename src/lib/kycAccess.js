// ── Secure access to KYC identity documents ──────────────────────
// kyc-docs is a PRIVATE storage bucket. Nobody can view a government
// ID by guessing or sharing a URL — every view requires a fresh,
// short-lived signed URL generated server-side via Supabase Storage's
// signed URL API, which itself respects the bucket's RLS-style storage
// policies (see fix_kyc_storage_security.sql for the policy setup).
//
// Signed URLs expire in 5 minutes — long enough to load an image in
// the browser, short enough that a leaked/logged URL is useless soon
// after.

import { supabase } from './supabase.js'

const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes

/**
 * Get a temporary signed URL for a KYC document.
 * @param {string} path - storage path, e.g. "{user_id}/id.jpg"
 * @returns {Promise<string|null>} signed URL, or null on failure
 */
export async function getSignedKycUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('kyc-docs')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) {
    console.error('Failed to generate signed KYC URL:', error.message)
    return null
  }
  return data?.signedUrl || null
}
