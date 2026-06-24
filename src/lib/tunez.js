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

// ── Check cooldown ─────────────────────────────────────────────
async function isOnCooldown(userId, contentId, action) {
  const { data } = await supabase
    .from('tunez_cooldowns')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('action', action)
    .single()
  if (!data) return false
  return new Date(data.expires_at) > new Date()
}

async function setCooldown(userId, contentId, action, hours) {
  const expires = new Date()
  expires.setHours(expires.getHours() + hours)
  await supabase.from('tunez_cooldowns').upsert({
    user_id: userId, content_id: contentId, action,
    expires_at: expires.toISOString(),
  })
}

// ── Check daily cap ────────────────────────────────────────────
async function getDailyEarned(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('tunez_daily_caps')
    .select('earned')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  return data?.earned || 0
}

async function addDailyEarned(userId, amount) {
  const today = new Date().toISOString().slice(0, 10)
  await supabase.rpc('increment_daily_tunez', {
    p_user_id: userId, p_date: today, p_amount: amount
  })
}

// ── Core mint function ─────────────────────────────────────────
async function mintTunez({ userId, ownerId, action, amount, description, refId }) {
  const userAmt  = parseFloat((amount * SPLIT.user).toFixed(4))
  const ownerAmt = ownerId ? parseFloat((amount * SPLIT.owner).toFixed(4)) : 0
  const adminAmt = parseFloat((amount - userAmt - ownerAmt).toFixed(4))

  // Get admin ID
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .single()
  const adminId = adminProfile?.id

  // Credit user
  // Multiplier handled server-side in add_tunez RPC
  await supabase.rpc('add_tunez', {
    p_user_id: userId, p_amount: userAmt,
    p_type: 'earn_' + action, p_description: description, p_ref_id: refId || null
  })

  // Credit owner
  if (ownerId && ownerAmt > 0) {
    // Multiplier handled server-side in add_tunez RPC
  await supabase.rpc('add_tunez', {
      p_user_id: ownerId, p_amount: ownerAmt,
      p_type: 'earn_content_owner', p_description: 'Content earnings: ' + description, p_ref_id: refId || null
    })
  }

  // Credit admin
  if (adminId && adminAmt > 0) {
    // Multiplier handled server-side in add_tunez RPC
  await supabase.rpc('add_tunez', {
      p_user_id: adminId, p_amount: adminAmt,
      p_type: 'earn_admin', p_description: 'Admin share: ' + description, p_ref_id: refId || null
    })
  }

  await addDailyEarned(userId, userAmt)
  return { userAmt, ownerAmt, adminAmt }
}

// ── Public earn functions ──────────────────────────────────────
export async function earnStream(userId, track) {
  if (!userId || !track) return null
  const onCooldown = await isOnCooldown(userId, track.id, 'stream')
  if (onCooldown) return null
  const daily = await getDailyEarned(userId)
  if (daily >= DAILY_CAPS.total) return null

  const result = await mintTunez({
    userId, ownerId: track.artist_id,
    action: 'stream', amount: TUNEZ_RATES.stream,
    description: 'Streamed: ' + track.title, refId: track.id
  })
  await setCooldown(userId, track.id, 'stream', COOLDOWNS.stream)
  return result
}

export async function earnRead(userId, post) {
  if (!userId || !post) return null
  const onCooldown = await isOnCooldown(userId, post.id, 'read')
  if (onCooldown) return null
  const daily = await getDailyEarned(userId)
  if (daily >= DAILY_CAPS.total) return null

  const result = await mintTunez({
    userId, ownerId: post.author_id,
    action: 'read', amount: TUNEZ_RATES.read,
    description: 'Read: ' + post.title, refId: post.id
  })
  await setCooldown(userId, post.id, 'read', COOLDOWNS.read)
  return result
}

export async function earnWatch(userId, video) {
  if (!userId || !video?.id) return null

  try {
    const onCooldown = await isOnCooldown(userId, video.id, 'watch')
    if (onCooldown) { console.log('watch cooldown active'); return null }

    const daily = await getDailyEarned(userId)
    if (daily >= DAILY_CAPS.total) { console.log('daily cap reached:', daily); return null }

    const result = await mintTunez({
      userId,
      ownerId: video.uploader_id || null,
      action: 'watch',
      amount: TUNEZ_RATES.watch,
      description: 'Watched: ' + (video.title || 'video'),
      refId: video.id
    })

    if (result) await setCooldown(userId, video.id, 'watch', COOLDOWNS.watch)
    return result
  } catch(e) {
    console.error('earnWatch failed:', e)
    return null
  }
}

export async function earnReact(userId, ownerId, contentId, contentTitle) {
  if (!userId) return null
  const onCooldown = await isOnCooldown(userId, contentId, 'react')
  if (onCooldown) return null

  const result = await mintTunez({
    userId, ownerId,
    action: 'react', amount: TUNEZ_RATES.react,
    description: 'Reacted to: ' + contentTitle, refId: contentId
  })
  await setCooldown(userId, contentId, 'react', COOLDOWNS.react)
  return result
}

export async function earnComment(userId, ownerId, contentId, contentTitle) {
  if (!userId) return null
  const onCooldown = await isOnCooldown(userId, contentId, 'comment')
  if (onCooldown) return null

  const result = await mintTunez({
    userId, ownerId,
    action: 'comment', amount: TUNEZ_RATES.comment,
    description: 'Commented on: ' + contentTitle, refId: contentId
  })
  await setCooldown(userId, contentId, 'comment', COOLDOWNS.comment)
  return result
}

export async function earnDailyLogin(userId) {
  if (!userId) return null

  const today = new Date().toISOString().slice(0, 10)

  // Check tunez_daily_caps — most reliable, uses PRIMARY KEY (user_id, date)
  const { data: capData } = await supabase
    .from('tunez_daily_caps')
    .select('earned')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  // If any earnings recorded today, skip (daily cap already hit or bonus already given)
  if (capData && capData.earned >= TUNEZ_RATES.daily) return null

  // Also check transactions for earn_daily today
  const { data: txData } = await supabase
    .from('tunez_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'earn_daily')
    .gte('created_at', today + 'T00:00:00.000Z')
    .maybeSingle()

  if (txData) return null // already claimed today

  const { error } = await supabase.rpc('add_tunez', {
    p_user_id: userId,
    p_amount: TUNEZ_RATES.daily,
    p_type: 'earn_daily',
    p_description: 'Daily login bonus',
    p_ref_id: null
  })
  if (error) { console.error('Daily login RPC error:', error); return null }

  // Record in daily caps to prevent double-credit
  await supabase.rpc('increment_daily_tunez', {
    p_user_id: userId,
    p_date: today,
    p_amount: TUNEZ_RATES.daily
  })

  return { userAmt: TUNEZ_RATES.daily }
}

// ── Premium unlock ─────────────────────────────────────────────
export async function unlockPremium(userId, content, contentType) {
  // Check already unlocked
  const { data: existing } = await supabase
    .from('tunez_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', content.id)
    .single()
  if (existing) return { success: true, alreadyUnlocked: true }

  // Check balance
  const bal = await getBalance(userId)
  if (bal.balance < content.tunez_price) {
    return { success: false, reason: 'insufficient_balance', needed: content.tunez_price, have: bal.balance }
  }

  // Admin gets 30% of premium spend
  const { data: adminProfile } = await supabase.from('profiles').select('id').eq('role', 'admin').single()
  const ownerAmt = parseFloat((content.tunez_price * 0.70).toFixed(4))
  const adminAmt = parseFloat((content.tunez_price * 0.30).toFixed(4))
  const ownerId  = content.artist_id || content.author_id || content.uploader_id

  // Debit user
  await supabase.rpc('spend_tunez', {
    p_user_id: userId, p_amount: content.tunez_price,
    p_type: 'spend_premium',
    p_description: 'Unlocked premium: ' + content.title,
    p_ref_id: content.id
  })
  // Credit owner
  if (ownerId) await supabase.rpc('add_tunez', {
    p_user_id: ownerId, p_amount: ownerAmt,
    p_type: 'earn_content_owner',
    p_description: 'Premium unlock: ' + content.title, p_ref_id: content.id
  })
  // Credit admin
  if (adminProfile?.id) await supabase.rpc('add_tunez', {
    p_user_id: adminProfile.id, p_amount: adminAmt,
    p_type: 'earn_admin',
    p_description: 'Premium admin share: ' + content.title, p_ref_id: content.id
  })
  // Record unlock
  await supabase.from('tunez_unlocks').insert({
    user_id: userId, content_id: content.id,
    content_type: contentType, tunez_paid: content.tunez_price
  })

  return { success: true, ownerAmt, adminAmt }
}

export async function isUnlocked(userId, contentId) {
  if (!userId) return false
  const { data } = await supabase
    .from('tunez_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .single()
  return !!data
}

export async function getMyLibrary(userId) {
  const { data } = await supabase
    .from('tunez_unlocks')
    .select('*, track:content_id(id,title,genre,audio_url,cover_url,duration,artist_id,profiles:artist_id(name)), post:content_id(id,title,category,cover_url,excerpt,author_id,profiles:author_id(name)), video:content_id(id,title,youtube_url,video_url,uploader_id,profiles:uploader_id(name))')
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
