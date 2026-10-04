// ── TUNEZ Token Engine ─────────────────────────────────────────
// Central module for all TUNEZ earning, spending, and balance ops

import { supabase } from './supabase.js'

// Mint rates
export const TUNEZ_RATES = {
  stream:   10,
  read:     6,
  watch:    8,
  react:    2,
  comment:  4,
  reply:    3,
  daily:    5,
  profile:  20,
  referral: 15,
}

// Split percentages
export const SPLIT = { user: 0.5, owner: 0.3, admin: 0.2 }

// Daily caps
export const DAILY_CAPS = {
  stream: 50,
  read:   30,
  react:  20,
  total:  80,
}

// Cooldown hours
export const COOLDOWNS = {
  stream:  6,
  read:    24,
  watch:   6,
  react:   999999, // once ever
  comment: 999999,
}

// Buy packages
export const TUNEZ_PACKAGES = [
  { id: 'starter',  tunez: 100,  ngn: 500,   label: 'Starter'  },
  { id: 'basic',    tunez: 300,  ngn: 1200,  label: 'Basic'    },
  { id: 'popular',  tunez: 700,  ngn: 2500,  label: 'Popular', highlight: true },
  { id: 'pro',      tunez: 1500, ngn: 5000,  label: 'Pro'      },
  { id: 'max',      tunez: 3500, ngn: 10000, label: 'Max'      },
]

// ── Fetch balance ──────────────────────────────────────────────
export async function getBalance(userId) {
  const { data } = await supabase
    .from('tunez_balances')
    .select('balance, total_earned, total_spent, total_purchased')
    .eq('user_id', userId)
    .single()
  return data || { balance: 0, total_earned: 0, total_spent: 0, total_purchased: 0 }
}

// ── Earning & spending ─────────────────────────────────────────
// All amounts, splits, cooldowns and caps are enforced by database functions
// (see supabase/migrations/20261004_security_hardening.sql). The browser only
// says *what* happened; the server decides what it's worth. The userId
// arguments are kept for compatibility — the server uses the login token.

function unwrap({ data, error }) {
  if (error) { console.warn('TUNEZ:', error.message); return null }
  return data
}

async function earn(action, contentId) {
  if (!contentId) return null
  const res = unwrap(await supabase.rpc('earn_tunez', { p_action: action, p_content_id: contentId }))
  return res?.success ? { userAmt: Number(res.userAmt) || 0, ownerAmt: Number(res.ownerAmt) || 0, adminAmt: Number(res.adminAmt) || 0 } : null
}

export async function earnStream(userId, track)  { return userId ? earn('stream', track?.id) : null }
export async function earnRead(userId, post)     { return userId ? earn('read', post?.id) : null }
export async function earnWatch(userId, video)   { return userId ? earn('watch', video?.id) : null }
export async function earnReact(userId, _ownerId, contentId)   { return userId ? earn('react', contentId) : null }
export async function earnComment(userId, _ownerId, contentId) { return userId ? earn('comment', contentId) : null }

export async function earnDailyLogin(userId) {
  if (!userId) return null
  const res = unwrap(await supabase.rpc('claim_daily_login'))
  return res?.success ? { userAmt: Number(res.userAmt) || 0 } : null
}

export async function claimReferralBonus(code) {
  if (!code) return null
  return unwrap(await supabase.rpc('claim_referral_bonus', { p_code: code }))
}

// ── Premium unlock ─────────────────────────────────────────────
export async function unlockPremium(userId, content, contentType) {
  if (!userId || !content?.id) return { success: false, reason: 'not_logged_in' }
  const { data, error } = await supabase.rpc('unlock_premium', {
    p_content_id: content.id, p_content_type: contentType || null,
  })
  if (error) { console.error('unlock_premium failed:', error); return { success: false, reason: 'unlock_failed' } }
  return data
}

export async function isUnlocked(userId, contentId) {
  if (!userId || !contentId) return false
  try {
    const { data, error } = await supabase
      .from('tunez_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .maybeSingle()
    if (error) { console.error('isUnlocked error:', error); return false }
    return !!data
  } catch(e) {
    return false
  }
}

export async function getMyLibrary(userId) {
  const { data } = await supabase
    .from('tunez_unlocks')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
  return data || []
}

// ── Transactions history ───────────────────────────────────────
export async function getTransactions(userId, limit = 20) {
  const { data } = await supabase
    .from('tunez_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── Leaderboard ────────────────────────────────────────────────
export async function getLeaderboard(limit = 10) {
  const { data } = await supabase
    .from('tunez_balances')
    .select('user_id, total_earned, profiles:user_id(name, is_verified)')
    .order('total_earned', { ascending: false })
    .limit(limit)
  return data || []
}
