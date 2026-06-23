// Supabase Edge Function: verify-tunez-payment
// Deploy to: supabase/functions/verify-tunez-payment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')
const SUPABASE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const PACKAGES = {
  starter: { tunez: 100,  ngn: 500   },
  basic:   { tunez: 300,  ngn: 1200  },
  popular: { tunez: 700,  ngn: 2500  },
  pro:     { tunez: 1500, ngn: 5000  },
  max:     { tunez: 3500, ngn: 10000 },
}

serve(async (req) => {
  const { reference, user_id, package_id } = await req.json()

  // 1. Verify with Paystack
  const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
  })
  const psData = await psRes.json()

  if (!psData.status || psData.data?.status !== 'success') {
    return new Response(JSON.stringify({ success: false, reason: 'Payment not verified' }), { status: 400 })
  }

  const pkg = PACKAGES[package_id]
  if (!pkg) {
    return new Response(JSON.stringify({ success: false, reason: 'Invalid package' }), { status: 400 })
  }

  // Verify amount matches
  const paidKobo = psData.data.amount
  const expectedKobo = pkg.ngn * 100
  if (paidKobo < expectedKobo) {
    return new Response(JSON.stringify({ success: false, reason: 'Amount mismatch' }), { status: 400 })
  }

  // 2. Credit via Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Check not already credited (idempotency)
  const { data: existing } = await supabase
    .from('tunez_purchases')
    .select('id, status')
    .eq('paystack_ref', reference)
    .single()

  if (existing?.status === 'completed') {
    return new Response(JSON.stringify({ success: true, already: true }))
  }

  // Record purchase
  await supabase.from('tunez_purchases').upsert({
    user_id, paystack_ref: reference,
    amount_ngn: pkg.ngn, tunez_credited: pkg.tunez, status: 'pending'
  })

  // Credit TUNEZ
  const { error } = await supabase.rpc('credit_purchased_tunez', {
    p_user_id: user_id, p_paystack_ref: reference,
    p_amount_ngn: pkg.ngn, p_tunez: pkg.tunez
  })

  if (error) {
    return new Response(JSON.stringify({ success: false, reason: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, tunez: pkg.tunez }))
})
