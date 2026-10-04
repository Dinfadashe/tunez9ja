// Supabase Edge Function: verify-tunez-payment
// Verifies a Paystack payment on the server and applies its effect with the
// service role. Handles two purposes:
//   • purpose 'tunez' (default) — TUNEZ package purchase → credit_purchased_tunez
//   • purpose 'kyc_fee'         — ₦2,000 verification fee → profiles.kyc_fee_paid
//
// Security:
//   • The user is taken from the caller's JWT, never from the request body.
//   • Paystack must report success, in NGN, for at least the expected amount,
//     and the payment's metadata must belong to the same user.
//   • A reference can only ever be applied once.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY        = Deno.env.get('SUPABASE_ANON_KEY')!

const PACKAGES: Record<string, { tunez: number; ngn: number }> = {
  starter: { tunez: 100,  ngn: 500   },
  basic:   { tunez: 300,  ngn: 1200  },
  popular: { tunez: 700,  ngn: 2500  },
  pro:     { tunez: 1500, ngn: 5000  },
  max:     { tunez: 3500, ngn: 10000 },
}
const KYC_FEE_NGN = 2000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ success: false, reason: 'Method not allowed' }, 405)
  if (!PAYSTACK_SECRET) return json({ success: false, reason: 'Payments are not configured' }, 500)

  // ── Who is calling? ─────────────────────────────────────────
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await userClient.auth.getUser(token)
  if (!user) return json({ success: false, reason: 'Please log in again and retry.' }, 401)

  let body: { reference?: string; package_id?: string; purpose?: string }
  try { body = await req.json() } catch { return json({ success: false, reason: 'Invalid request' }, 400) }
  const reference = String(body.reference || '')
  const purpose   = body.purpose === 'kyc_fee' ? 'kyc_fee' : 'tunez'
  if (!/^[\w-]{6,100}$/.test(reference)) return json({ success: false, reason: 'Invalid payment reference' }, 400)

  // ── Verify with Paystack ────────────────────────────────────
  const psRes  = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  })
  const ps = await psRes.json().catch(() => null)
  const tx = ps?.data
  if (!ps?.status || tx?.status !== 'success') return json({ success: false, reason: 'Payment not verified by Paystack' }, 400)
  if (tx.currency !== 'NGN') return json({ success: false, reason: 'Unexpected currency' }, 400)

  let meta = tx.metadata
  if (typeof meta === 'string') { try { meta = JSON.parse(meta) } catch { meta = {} } }
  if (meta?.user_id && meta.user_id !== user.id) return json({ success: false, reason: 'This payment belongs to another account' }, 403)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── Verification (KYC) fee ──────────────────────────────────
  if (purpose === 'kyc_fee') {
    if (tx.amount < KYC_FEE_NGN * 100) return json({ success: false, reason: 'Amount mismatch' }, 400)
    const { data: used } = await admin.from('profiles').select('id').eq('kyc_fee_ref', reference).maybeSingle()
    if (used && used.id !== user.id) return json({ success: false, reason: 'Reference already used' }, 409)
    const { error } = await admin.from('profiles')
      .update({ kyc_fee_paid: true, kyc_fee_ref: reference }).eq('id', user.id)
    if (error) return json({ success: false, reason: 'Could not record payment. Contact support with ref ' + reference }, 500)
    return json({ success: true, purpose })
  }

  // ── TUNEZ package purchase ──────────────────────────────────
  const pkg = PACKAGES[String(body.package_id || meta?.package || '')]
  if (!pkg) return json({ success: false, reason: 'Invalid package' }, 400)
  if (tx.amount < pkg.ngn * 100) return json({ success: false, reason: 'Amount mismatch' }, 400)

  const { data: existing } = await admin.from('tunez_purchases')
    .select('id, user_id, status').eq('paystack_ref', reference).maybeSingle()
  if (existing && existing.user_id !== user.id) return json({ success: false, reason: 'Reference already used' }, 409)
  if (existing?.status === 'completed') return json({ success: true, already: true, tunez: pkg.tunez })

  if (!existing) {
    // With the unique index on paystack_ref (see security migration) a
    // concurrent second call fails here instead of crediting twice.
    // Production schema: id, user_id, paystack_ref, amount_ngn,
    // tunze_credited (NOT NULL — old "tunze" spelling), status, created_at.
    // If that column is ever renamed, fall back to the corrected spelling.
    const base = { user_id: user.id, paystack_ref: reference, amount_ngn: pkg.ngn, status: 'pending' }
    let { error: insErr } = await admin.from('tunez_purchases').insert({ ...base, tunze_credited: pkg.tunez })
    if (insErr && (insErr.code === 'PGRST204' || insErr.code === '42703')) {
      ({ error: insErr } = await admin.from('tunez_purchases').insert({ ...base, tunez_credited: pkg.tunez }))
    }
    if (insErr) {
      console.error('tunez_purchases insert failed:', insErr)
      if (insErr.code === '23505') return json({ success: false, reason: 'Payment is already being processed' }, 409)
      return json({ success: false, reason: 'Could not record purchase' }, 500)
    }
  }

  const { error } = await admin.rpc('credit_purchased_tunez', {
    p_user_id: user.id, p_paystack_ref: reference,
    p_amount_ngn: pkg.ngn, p_tunez: pkg.tunez,
  })
  if (error) {
    console.error('credit_purchased_tunez failed:', error)
    return json({ success: false, reason: 'Payment received but crediting failed. Contact support with ref ' + reference }, 500)
  }

  return json({ success: true, tunez: pkg.tunez })
})
