import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadPaystack } from '../lib/paystack.js'
import { TUNEZ_PACKAGES } from '../lib/tunez.js'
import { Coins, TrendingUp, ShoppingCart, History, Trophy, AlertTriangle, ExternalLink, Check } from 'lucide-react'

const DISCLAIMER = `TUNEZ is a virtual in-app reward token and is NOT a cryptocurrency, security, investment product, or financial instrument of any kind. TUNEZ has no monetary value outside the Tunez9ja platform and cannot be withdrawn, exchanged for cash, or transferred to external wallets. Users may earn, purchase, and spend TUNEZ only within the Tunez9ja app. If Tunez9ja decides to deploy TUNEZ on any blockchain in the future, all necessary legal, regulatory, and compliance documentation will be obtained before any such transition.`

const TX_LABELS = {
  earn_stream:        '🎵 Streamed music',
  earn_read:          '📰 Read blog post',
  earn_watch:         '🎬 Watched video',
  earn_react:         '👍 Reacted to content',
  earn_comment:       '💬 Posted a comment',
  earn_reply:         '↩️ Replied to comment',
  earn_daily:         '☀️ Daily login bonus',
  earn_referral:      '👥 Referral bonus',
  earn_content_owner: '🎤 Content earnings',
  earn_admin:         '⚙️ Admin share',
  spend_premium:      '🔓 Unlocked premium content',
  purchase:           '💳 Purchased TUNEZ',
}

export default function TunezWallet({ currentUser, setPage }) {
  const [tab,          setTab]          = useState('wallet')
  const [balance,      setBalance]      = useState(null)
  const [transactions, setTransactions] = useState([])
  const [leaderboard,  setLeaderboard]  = useState([])
  const [buying,       setBuying]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [buySuccess,   setBuySuccess]   = useState(false)
  const [buyError,     setBuyError]     = useState('')

  useEffect(() => {
    if (!currentUser) return
    // Direct queries for reliability
    supabase.from('tunez_balances')
      .select('balance, total_earned, total_spent, total_purchased')
      .eq('user_id', currentUser.id)
      .single()
      .then(({ data }) => {
        setBalance(data || { balance: 0, total_earned: 0, total_spent: 0, total_purchased: 0 })
      })

    supabase.from('tunez_transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setTransactions(data || []))

    supabase.from('tunez_balances')
      .select('user_id, total_earned, profiles:user_id(name, is_verified)')
      .order('total_earned', { ascending: false })
      .limit(10)
      .then(({ data }) => { setLeaderboard(data || []); setLoading(false) })
  }, [currentUser])

  // ── Unconfirmed payments (kept on this device until the server confirms) ──
  const PENDING_KEY = currentUser?.id ? `t9_pending_payments_${currentUser.id}` : null
  const readPending = () => {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') } catch { return [] }
  }
  const [pendingPayments, setPendingPayments] = useState(() => (PENDING_KEY ? readPending() : []))
  const [retrying, setRetrying] = useState(false)
  const savePending = (list) => {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)) } catch { /* storage full */ }
    setPendingPayments(list)
  }
  const addPending = (reference, packageId) => {
    const list = readPending().filter(p => p.reference !== reference)
    savePending([...list, { reference, packageId, at: Date.now() }])
  }
  const removePending = (reference) => savePending(readPending().filter(p => p.reference !== reference))

  const refreshBalance = () => supabase.from('tunez_balances')
    .select('balance, total_earned, total_spent, total_purchased')
    .eq('user_id', currentUser.id).maybeSingle()
    .then(({ data: bal }) => { if (bal) setBalance(bal) })

  // Asks the server to verify with Paystack and credit. Safe to repeat:
  // a reference is only ever credited once.
  const confirmPayment = async (reference, packageId, { quiet = false } = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-tunez-payment', {
        body: { reference, package_id: packageId, purpose: 'tunez' },
      })
      if (data?.success) {
        removePending(reference)
        refreshBalance()
        if (!quiet) { setBuyError(''); setBuySuccess(true); setTimeout(() => setBuySuccess(false), 4000) }
        return true
      }
      let reason = data?.reason
      try { reason = reason || (await error?.context?.json())?.reason } catch { /* not JSON */ }
      // A definite "this payment is not valid" from the server — stop retrying it
      if (reason && /not verified|amount mismatch|another account|already used|invalid/i.test(reason)) {
        removePending(reference)
        if (!quiet) setBuyError(`${reason}. Reference: ${reference}`)
        return false
      }
      if (!quiet) setBuyError(`Your payment went through, but we couldn't confirm it with our server yet. `
        + `It's saved and will be credited automatically — tap "Retry confirmation" or come back later. Reference: ${reference}`)
      return false
    } catch {
      if (!quiet) setBuyError(`Network problem while confirming your payment. It's saved and will be retried. Reference: ${reference}`)
      return false
    }
  }

  const retryPending = async (quiet = false) => {
    const list = readPending()
    if (!list.length) return
    setRetrying(true)
    let anyOk = false
    for (const p of list) anyOk = (await confirmPayment(p.reference, p.packageId, { quiet: true })) || anyOk
    setRetrying(false)
    if (anyOk) { setBuyError(''); setBuySuccess(true); setTimeout(() => setBuySuccess(false), 4000) }
    else if (!quiet) setBuyError('Still waiting for confirmation. Please try again in a few minutes — your payment is saved.')
  }

  // Retry any unconfirmed payments whenever the wallet opens
  useEffect(() => {
    if (!PENDING_KEY) return
    setPendingPayments(readPending())
    retryPending(true)
  }, [PENDING_KEY])

  // Start fetching Paystack as soon as the wallet opens, so Buy is instant
  useEffect(() => { loadPaystack().catch(() => {}) }, [])

  const initPaystack = async (pkg) => {
    setBuying(pkg)
    try {
      await loadPaystack()
    } catch {
      setBuying(null)
      setBuyError('Could not reach Paystack. Check your connection and try again.')
      return
    }

    // Callback must be a plain function — no async/await
    function onSuccess(response) {
      // Remember the payment BEFORE confirming, so it can never be lost:
      // if confirmation fails it is retried until the server credits it.
      addPending(response.reference, pkg.id)
      setBuyError('')
      confirmPayment(response.reference, pkg.id).finally(() => setBuying(null))
    }

    function onClose() {
      setBuying(null)
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: currentUser.email,
      amount: pkg.ngn * 100,
      currency: 'NGN',
      ref: 'TUNEZ_' + Date.now() + '_' + currentUser.id.slice(0, 8),
      metadata: { user_id: currentUser.id, package: pkg.id, tunez: pkg.tunez },
      callback: onSuccess,
      onClose: onClose,
    })
    handler.openIframe()
  }

  if (!currentUser) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-300)' }}>
      Sign in to access your TUNEZ wallet.
    </div>
  )

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      LOADING WALLET...
    </div>
  )

  return (
    <div>
      {/* Disclaimer banner */}
      <div style={{ background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AlertTriangle size={16} color="#ffb400" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <span style={{ fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6 }}>
            TUNEZ is a virtual in-app token only — not a cryptocurrency or investment.{' '}
            <button onClick={() => setShowDisclaimer(true)} style={{ background: 'none', border: 'none', color: '#ffb400', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: '8px 0', margin: '-8px 0' }}>
              Read full disclaimer
            </button>
          </span>
        </div>
      </div>

      {/* Balance card */}
      <div style={{ background: 'linear-gradient(135deg,#1a0a0d,#0f0a1a)', border: '1px solid var(--border-red)', borderRadius: 16, padding: 28, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.15)' }} />
        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1 }}>IN-APP TOKEN</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 8 }}>YOUR TUNEZ BALANCE</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 10vw, 56px)', letterSpacing: 1, color: 'var(--white)', lineHeight: 1.05, overflowWrap: 'anywhere' }}>
          {balance?.balance?.toFixed(2) || '0.00'}
          <span style={{ fontSize: 'clamp(14px, 4vw, 20px)', color: 'var(--grey-500)', marginLeft: 8, whiteSpace: 'nowrap' }}>TUNEZ</span>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Earned',     val: balance?.total_earned?.toFixed(2) || '0'    },
            { label: 'Total Spent',      val: balance?.total_spent?.toFixed(2) || '0'     },
            { label: 'Total Purchased',  val: balance?.total_purchased?.toFixed(2) || '0' },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 2 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{val} <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>T</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* How to earn quick tips */}
      <div className="wallet-rates" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { icon: '🎵', action: 'Stream a track',    earn: '+5 TUNEZ' },
          { icon: '📰', action: 'Read a post',        earn: '+3 TUNEZ' },
          { icon: '🎬', action: 'Watch a video',      earn: '+4 TUNEZ' },
          { icon: '👍', action: 'React to content',   earn: '+1 TUNEZ' },
          { icon: '💬', action: 'Leave a comment',    earn: '+2 TUNEZ' },
          { icon: '☀️', action: 'Daily login',        earn: '+5 TUNEZ' },
        ].map(({ icon, action, earn }) => (
          <div key={action} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--grey-300)' }}>{action}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00c864' }}>{earn}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="wallet-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          { key: 'wallet',      label: 'Transactions', icon: <History size={14} />    },
          { key: 'buy',         label: 'Buy TUNEZ',    icon: <ShoppingCart size={14} /> },
          { key: 'leaderboard', label: 'Leaderboard',  icon: <Trophy size={14} />      },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'none', border: 'none', color: tab === t.key ? 'var(--white)' : 'var(--grey-500)', borderBottom: tab === t.key ? '2px solid var(--red)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: -1 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {tab === 'wallet' && (
        <div>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey-500)' }}>
              <Coins size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
              <div>No transactions yet. Start streaming to earn TUNEZ!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {transactions.map(tx => {
                const isEarn = tx.type.startsWith('earn')
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: isEarn ? 'rgba(0,200,100,0.1)' : 'var(--red-glow)', border: `1px solid ${isEarn ? 'rgba(0,200,100,0.3)' : 'var(--border-red)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {TX_LABELS[tx.type]?.split(' ')[0] || '🪙'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || TX_LABELS[tx.type] || tx.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isEarn ? '#00c864' : 'var(--red)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                      {isEarn ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)}
                      <span style={{ fontSize: 10, color: 'var(--grey-500)', marginLeft: 4 }}>T</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Buy TUNEZ */}
      {tab === 'buy' && (
        <div>
          {pendingPayments.length > 0 && (
            <div role="status" style={{ background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.35)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#ffcf66', lineHeight: 1.5 }}>
              <strong>{pendingPayments.length === 1 ? '1 payment' : pendingPayments.length + ' payments'} awaiting confirmation.</strong>{' '}
              Your money is safe — TUNEZ will be credited as soon as our server confirms with Paystack.
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.85, margin: '6px 0 10px', overflowWrap: 'anywhere' }}>
                {pendingPayments.map(p => p.reference).join(', ')}
              </div>
              <button onClick={() => retryPending(false)} disabled={retrying}
                style={{ minHeight: 40, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,180,0,0.5)', background: 'rgba(255,180,0,0.15)', color: '#ffcf66', fontWeight: 700, cursor: 'pointer' }}>
                {retrying ? 'Checking…' : 'Retry confirmation'}
              </button>
            </div>
          )}
          {buyError && (
            <div role="alert" style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.35)', borderRadius: 10, padding: '14px 20px', marginBottom: 20, fontSize: 14, color: '#ff6b81' }}>
              {buyError}
            </div>
          )}
          {buySuccess && (
            <div style={{ background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#00c864' }}>
              <Check size={18} /> TUNEZ credited to your wallet successfully!
            </div>
          )}
          <div style={{ background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.7 }}>
            💳 Payments processed securely. TUNEZ will be credited to your wallet instantly after payment confirmation. Larger packages give better value per TUNEZ.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {TUNEZ_PACKAGES.map(pkg => (
              <div key={pkg.id} style={{ background: pkg.highlight ? 'linear-gradient(135deg,#1a0a0d,#0f0a1a)' : 'var(--bg-card)', border: `2px solid ${pkg.highlight ? 'var(--red)' : 'var(--border)'}`, borderRadius: 12, padding: 20, position: 'relative', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform='none'}
              >
                {pkg.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--red)', color: 'white', fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 14px', borderRadius: 20, letterSpacing: 1 }}>
                    BEST VALUE
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: pkg.highlight ? 'var(--red)' : 'var(--grey-500)', letterSpacing: 2, marginBottom: 8 }}>{pkg.label.toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1, marginBottom: 4 }}>{pkg.tunez.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 16 }}>TUNEZ · ₦{(pkg.ngn/pkg.tunez).toFixed(2)}/T</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: pkg.highlight ? 'var(--red)' : 'var(--white)', marginBottom: 16 }}>
                  ₦{pkg.ngn.toLocaleString()}
                </div>
                <button onClick={() => initPaystack(pkg)} disabled={!!buying}
                  style={{ width: '100%', padding: '10px', background: pkg.highlight ? 'var(--red)' : 'transparent', border: `1px solid ${pkg.highlight ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: buying ? 0.6 : 1 }}>
                  {buying?.id === pkg.id ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 8 }}>⚠️ DISCLAIMER</div>
            <p style={{ fontSize: 12, color: 'var(--grey-500)', lineHeight: 1.7 }}>{DISCLAIMER}</p>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div>
          <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--grey-300)' }}>
            Top TUNEZ earners on Tunez9ja. Rankings update in real time.
          </div>
          {leaderboard.map((entry, i) => (
            <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: i < 3 ? 'var(--bg-card)' : 'transparent', border: i < 3 ? '1px solid var(--border)' : '1px solid transparent', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, color: i < 3 ? '#000' : 'var(--grey-500)', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {entry.profiles?.name || 'Anonymous'}
                  {entry.profiles?.is_verified && ' ✅'}
                  {entry.user_id === currentUser?.id && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>YOU</span>}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#00c864', fontFamily: 'var(--font-mono)' }}>
                {entry.total_earned?.toFixed(0)} <span style={{ fontSize: 10, color: 'var(--grey-500)' }}>T</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer modal */}
      {showDisclaimer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowDisclaimer(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 12, padding: 32, maxWidth: 560, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <AlertTriangle size={24} color="#ffb400" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>TUNEZ Disclaimer</h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.8 }}>{DISCLAIMER}</p>
            <button className="btn btn-primary" style={{ marginTop: 24, width: '100%', justifyContent: 'center' }} onClick={() => setShowDisclaimer(false)}>
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
