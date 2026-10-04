import React, { useState, useEffect } from 'react'
import { getBalance, unlockPremium } from '../lib/tunez.js'
import { Lock, Coins, AlertTriangle, Check, ShoppingCart } from 'lucide-react'

export default function PremiumUnlockModal({ content, contentType, currentUser, onClose, onUnlocked, setPage }) {
  const [balance,  setBalance]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)

  useEffect(() => {
    if (currentUser) getBalance(currentUser.id).then(setBalance)
  }, [currentUser])

  const canAfford = balance && balance.balance >= content.tunez_price
  const shortfall = balance ? (content.tunez_price - balance.balance).toFixed(2) : 0

  const handleUnlock = async () => {
    if (!currentUser) { onClose(); setPage('login'); return }
    setLoading(true)
    const res = await unlockPremium(currentUser.id, content, contentType)
    setLoading(false)
    if (res?.success) {
      setResult('success')
      setTimeout(() => { onUnlocked(); onClose() }, 1800)
    } else {
      setResult(res?.reason || 'unlock_failed')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>

        {result === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,200,100,0.15)', border: '2px solid rgba(0,200,100,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={32} color="#00c864" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>Unlocked!</h3>
            <p style={{ color: 'var(--grey-300)', fontSize: 14 }}>"{content.title}" is now in your Library forever.</p>
          </div>
        ) : (
          <>
            {/* Lock icon */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'flex-start' }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--red-glow)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={24} color="var(--red)" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', letterSpacing: 2, marginBottom: 4 }}>PREMIUM CONTENT</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.2 }}>{content.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--grey-300)', marginTop: 4 }}>
                  by {content.profiles?.name || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Price */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--grey-300)' }}>Unlock price</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--red)' }}>
                  {content.tunez_price} <span style={{ fontSize: 14 }}>TUNEZ</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--grey-300)' }}>Your balance</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: canAfford ? '#00c864' : 'var(--red)' }}>
                  {balance?.balance?.toFixed(2) || '...'} <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>TUNEZ</span>
                </span>
              </div>
              {!canAfford && balance && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--red-glow)', borderRadius: 6, fontSize: 12, color: '#ff6b6b' }}>
                  You need {shortfall} more TUNEZ. Buy more or keep earning!
                </div>
              )}
            </div>

            {/* Once unlocked note */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(0,200,100,0.06)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 8, marginBottom: 20 }}>
              <Check size={14} color="#00c864" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--grey-300)', lineHeight: 1.6 }}>
                Once unlocked, you can access this content <strong>forever, free</strong> — no repeat payments needed.
              </span>
            </div>

            {/* Actions */}
            {!currentUser ? (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                onClick={() => { onClose(); setPage('login') }}>
                Sign in to unlock
              </button>
            ) : canAfford ? (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
                onClick={handleUnlock} disabled={loading}>
                <Lock size={16} /> {loading ? 'Unlocking...' : `Unlock for ${content.tunez_price} TUNEZ`}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    // Signal the UserDashboard to open on the wallet tab
                    sessionStorage.setItem('t9_dashboard_tab', 'wallet')
                    onClose()
                    setPage('user-dashboard')
                  }}>
                  <ShoppingCart size={15} /> Buy TUNEZ
                </button>
              </div>
            )}

            {canAfford && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }} onClick={onClose}>
                Cancel
              </button>
            )}

            {/* Disclaimer */}
            <div style={{ marginTop: 16, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <AlertTriangle size={12} color="var(--grey-500)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: 'var(--grey-500)', lineHeight: 1.6 }}>
                TUNEZ is a virtual in-app token. Not a cryptocurrency or investment. For use within Tunez9ja only.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
