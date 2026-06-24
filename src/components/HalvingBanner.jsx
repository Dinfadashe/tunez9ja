import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Zap, Users, TrendingDown, ChevronRight } from 'lucide-react'

// Small banner shown on homepage and dashboards
export function HalvingBanner({ compact = false }) {
  const [era, setEra] = useState(null)

  useEffect(() => {
    supabase.rpc('get_current_era')
      .then(({ data }) => setEra(data))
      .catch(() => {})
  }, [])

  if (!era) return null

  const isGenesis = era.era === 0
  const pct       = Math.min(100, era.pct_to_next || 0)
  const urgency   = pct > 80

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 12px', borderRadius: 20,
        background: isGenesis ? 'rgba(0,200,100,0.1)' : 'rgba(255,180,0,0.1)',
        border: `1px solid ${isGenesis ? 'rgba(0,200,100,0.3)' : 'rgba(255,180,0,0.3)'}`,
        fontSize: 12, fontFamily: 'var(--font-mono)',
        color: isGenesis ? '#00c864' : '#ffb400',
      }}>
        <Zap size={11} />
        {era.name} · {(era.multiplier * 100).toFixed(0)}% earn rate
        {urgency && <span style={{ color: 'var(--red)', marginLeft: 4 }}>⚠️ Halving soon</span>}
      </div>
    )
  }

  return (
    <div style={{
      background: isGenesis
        ? 'linear-gradient(135deg, rgba(0,200,100,0.08), rgba(0,180,220,0.05))'
        : urgency
          ? 'linear-gradient(135deg, rgba(200,16,46,0.08), rgba(255,180,0,0.05))'
          : 'linear-gradient(135deg, rgba(255,180,0,0.08), rgba(123,79,255,0.05))',
      border: `1px solid ${isGenesis ? 'rgba(0,200,100,0.2)' : urgency ? 'rgba(200,16,46,0.3)' : 'rgba(255,180,0,0.2)'}`,
      borderRadius: 12, padding: '20px 24px', marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Zap size={16} color={isGenesis ? '#00c864' : '#ffb400'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2,
              color: isGenesis ? '#00c864' : '#ffb400' }}>
              TUNEZ MINTING — {era.name.toUpperCase()}
            </span>
            {urgency && (
              <span style={{ fontSize: 10, background: 'rgba(200,16,46,0.15)', color: 'var(--red)',
                borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                ⚠️ HALVING SOON
              </span>
            )}
          </div>

          <div style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.7 }}>
            {isGenesis ? (
              <>You're earning at <strong style={{ color: '#00c864' }}>Genesis rate (100%)</strong> — the highest TUNEZ earn rate ever. Rates halve when the platform reaches 1,000 users.</>
            ) : (
              <>Current earn rate: <strong style={{ color: '#ffb400' }}>{(era.multiplier * 100).toFixed(1)}%</strong> of Genesis. Daily cap: <strong style={{ color: '#ffb400' }}>{era.daily_cap} TUNEZ</strong>.</>
            )}
          </div>

          {/* Progress to next halving */}
          {era.next_threshold && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: 'var(--grey-500)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={11} /> {era.user_count?.toLocaleString()} users
                </span>
                <span>{era.users_to_next?.toLocaleString()} until {era.next_era_name}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.8s ease',
                  width: pct + '%',
                  background: urgency
                    ? 'linear-gradient(90deg, #ffb400, var(--red))'
                    : isGenesis
                      ? 'linear-gradient(90deg, #00c864, #00b4dc)'
                      : 'linear-gradient(90deg, #ffb400, #7b4fff)',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Era stats */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36,
            color: isGenesis ? '#00c864' : '#ffb400', lineHeight: 1 }}>
            {(era.multiplier * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)',
            letterSpacing: 1, marginTop: 4 }}>EARN RATE</div>
        </div>
      </div>
    </div>
  )
}

// Full page halving info — for About page or dedicated section
export function HalvingInfo() {
  const [era, setEra] = useState(null)

  const ERAS = [
    { era: 0, name: 'Genesis',  threshold: '0',       mult: '1.0×', cap: 80,  color: '#00c864' },
    { era: 1, name: 'Era 1',    threshold: '1,000',   mult: '0.75×', cap: 60, color: '#00b4dc' },
    { era: 2, name: 'Era 2',    threshold: '5,000',   mult: '0.5×',  cap: 40, color: '#7b4fff' },
    { era: 3, name: 'Era 3',    threshold: '20,000',  mult: '0.25×', cap: 20, color: '#ffb400' },
    { era: 4, name: 'Era 4',    threshold: '100,000', mult: '0.125×',cap: 10, color: 'var(--red)' },
    { era: 5, name: 'Era 5+',   threshold: '500,000', mult: '0.0625×',cap: 5, color: 'var(--grey-500)' },
  ]

  useEffect(() => {
    supabase.rpc('get_current_era').then(({ data }) => setEra(data)).catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 12 }}>
        TUNEZ HALVING
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,34px)', marginBottom: 8 }}>
        The Harder It Gets, The More You're Worth
      </h2>
      <p style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.8, maxWidth: 560, marginBottom: 28 }}>
        As Tunez9ja grows, TUNEZ becomes harder to earn — making your early tokens increasingly valuable.
        Earn rates halve at each user milestone. There's no final cap — it just keeps getting harder.
      </p>

      {era && (
        <div style={{ padding: '12px 16px', background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 8, marginBottom: 24, fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span><strong style={{ color: '#00c864' }}>Current Era:</strong> {era.name}</span>
          <span><strong style={{ color: '#00c864' }}>Earn Rate:</strong> {(era.multiplier * 100).toFixed(1)}%</span>
          <span><strong style={{ color: '#00c864' }}>Users:</strong> {era.user_count?.toLocaleString()}</span>
          {era.next_threshold && <span><strong style={{ color: '#ffb400' }}>Next halving at:</strong> {era.next_threshold?.toLocaleString()} users</span>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ERAS.map((e, i) => {
          const isCurrent = era?.era === e.era
          return (
            <div key={e.era} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
              background: isCurrent ? 'var(--bg-card)' : 'transparent',
              border: `1px solid ${isCurrent ? e.color : 'var(--border)'}`,
              borderRadius: 10, transition: 'all 0.2s',
              opacity: era && e.era > era.era ? 0.5 : 1,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%',
                background: isCurrent ? e.color : 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 14, flexShrink: 0,
                color: isCurrent ? 'white' : e.color }}>
                {isCurrent ? '◉' : e.era}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {e.name}
                  {isCurrent && <span style={{ fontSize: 10, background: e.color, color: 'white', borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--font-mono)' }}>CURRENT</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 2 }}>
                  {e.threshold === '0' ? 'From launch' : `Unlocks at ${e.threshold} users`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: e.color }}>{e.mult}</div>
                <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>
                  {e.cap}T / day cap
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HalvingBanner
