import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function ReferralTab({ currentUser }) {
  const [copied, setCopied]       = useState(false)
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading]     = useState(true)
  const refCode = currentUser?.referral_code || currentUser?.id?.slice(0,8).toUpperCase()
  const refLink = `${window.location.origin}/?ref=${refCode}&signup=1`

  useEffect(() => {
    if (!currentUser?.id) return
    supabase.from('referrals')
      .select('id, referred_id, referrer_credited, referred_credited, referrer_amount, created_at, referred:referred_id(name, avatar_url, role, is_verified)')
      .eq('referrer_id', currentUser.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('❌ Failed to load referrals:', error.message) }
        setReferrals(data || [])
        setLoading(false)
      })
  }, [currentUser?.id])

  const copy = () => {
    navigator.clipboard.writeText(refLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const totalCredited = referrals.filter(r => r.referrer_credited).length
  const totalEarned   = referrals.filter(r => r.referrer_credited).reduce((s, r) => s + Number(r.referrer_amount || 15), 0)
  const pending       = referrals.filter(r => !r.referrer_credited).length

  return (
    <div style={{ maxWidth:560 }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:8 }}>REFER FRIENDS</h2>
      <p style={{ color:'var(--grey-300)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
        Share your link. You both earn <strong style={{ color:'#ffb400' }}>+15 TUNEZ</strong> when they sign up.
      </p>
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--grey-300)', wordBreak:'break-all', marginBottom:16 }}>
        {refLink}
      </div>
      <button onClick={copy} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:28 }}>
        {copied ? '✅ Copied!' : '📋 Copy Referral Link'}
      </button>

      {/* ── Stats row ── */}
      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        <div style={{ flex:1, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:24, color:'var(--white)' }}>{referrals.length}</div>
          <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', marginTop:2 }}>Total Referred</div>
        </div>
        <div style={{ flex:1, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:24, color:'#ffb400' }}>{totalEarned}T</div>
          <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', marginTop:2 }}>TUNEZ Earned</div>
        </div>
        {pending > 0 && (
          <div style={{ flex:1, background:'var(--bg-card)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:24, color:'#f59e0b' }}>{pending}</div>
            <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', marginTop:2 }}>Pending Credit</div>
          </div>
        )}
      </div>

      {/* ── People you referred ── */}
      <h3 style={{ fontSize:14, fontWeight:700, color:'var(--grey-200)', marginBottom:12, fontFamily:'var(--font-mono)', letterSpacing:0.5, textTransform:'uppercase' }}>
        People You Referred
      </h3>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ height:56, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, opacity:0.4 }} />
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--grey-600)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10 }}>
          <p style={{ fontSize:13 }}>No referrals yet. Share your link above to start earning.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {referrals.map(r => (
            <div key={r.id} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:10, padding:'12px 14px',
            }}>
              {r.referred?.avatar_url
                ? <img src={r.referred.avatar_url} alt={r.referred.name} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} loading="lazy" decoding="async" />
                : <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'white', flexShrink:0 }}>
                    {(r.referred?.name || '?').slice(0,1).toUpperCase()}
                  </div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--white)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {r.referred?.name || 'Unknown user'}{r.referred?.is_verified ? ' ✅' : ''}
                </div>
                <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>
                  Joined {new Date(r.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                  {r.referred?.role && <span style={{ marginLeft:6, textTransform:'capitalize' }}>· {r.referred.role}</span>}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                {r.referrer_credited ? (
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'#22c55e', background:'rgba(34,197,94,0.12)', padding:'3px 8px', borderRadius:12, fontWeight:700 }}>
                    +{r.referrer_amount}T ✅
                  </span>
                ) : (
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'#f59e0b', background:'rgba(245,158,11,0.12)', padding:'3px 8px', borderRadius:12, fontWeight:700 }}>
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
