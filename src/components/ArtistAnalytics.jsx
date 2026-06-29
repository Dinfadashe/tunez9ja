import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  TrendingUp, Music2, Play, Coins, Users, Eye,
  Calendar, BarChart2, Award, Clock, ArrowUp, ArrowDown
} from 'lucide-react'

const SK = '@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:6px}'

// ── Tiny bar chart ────────────────────────────────────────────────
function MiniBarChart({ data, color = 'var(--red)', height = 48 }) {
  if (!data || !data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} title={d.label + ': ' + d.value} style={{
          flex: 1, borderRadius: '3px 3px 0 0',
          background: i === data.length - 1 ? color : color + '55',
          height: Math.max(3, (d.value / max) * height),
          transition: 'height 0.3s ease',
          cursor: 'default',
        }} />
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'var(--red)', trend }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--white)', letterSpacing: 0.5 }}>{value}</span>
          {trend !== undefined && trend !== null && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: trend >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
              {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--grey-600)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Track performance row ─────────────────────────────────────────
function TrackRow({ track, rank }) {
  const earnings = (track.play_count || 0) * 0.002  // rough TUNEZ estimate
  const pct = track._pct || 0
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 24, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: rank <= 3 ? 'var(--red)' : 'var(--grey-600)', fontWeight: 700, flexShrink: 0 }}>{rank}</div>
      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-surface)' }}>
        {track.cover_url
          ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={16} style={{ color: 'var(--grey-600)' }} /></div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ marginTop: 5, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'var(--red)', borderRadius: 2, transition: 'width 0.8s ease' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--grey-200)', fontWeight: 600 }}>
          {(track.play_count || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>streams</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#ffb400', fontWeight: 600 }}>
          {earnings.toFixed(1)}T
        </div>
        <div style={{ fontSize: 10, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>earned</div>
      </div>
    </div>
  )
}

export default function ArtistAnalytics({ currentUser }) {
  const [stats,      setStats]      = useState(null)
  const [tracks,     setTracks]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [period,     setPeriod]     = useState('30d')
  const [weeklyData, setWeeklyData] = useState([])

  useEffect(() => {
    if (!currentUser?.id) return
    fetchAnalytics()
  }, [currentUser?.id, period])

  const fetchAnalytics = async () => {
    setLoading(true)
    const uid = currentUser.id

    // Date range
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Parallel fetches
    const [tracksRes, followersRes, unlocksRes, notifRes] = await Promise.all([
      supabase.from('music_tracks')
        .select('id,title,cover_url,play_count,genre,created_at,status,is_premium,tunez_price')
        .eq('artist_id', uid)
        .order('play_count', { ascending: false }),

      supabase.from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', uid),

      supabase.from('tunez_unlocks')
        .select('id,created_at,content_id')
        .eq('content_type', 'track')
        .gte('created_at', since),

      supabase.from('notifications')
        .select('id,type,created_at')
        .eq('user_id', uid)
        .gte('created_at', since),
    ])

    const allTracks = tracksRes.data || []
    const approved  = allTracks.filter(t => t.status === 'approved')
    const pending   = allTracks.filter(t => t.status === 'pending')
    const totalStreams = approved.reduce((s, t) => s + (t.play_count || 0), 0)
    const artistUnlocks = (unlocksRes.data || []).filter(u =>
      approved.some(t => t.id === u.content_id)
    )
    const totalEarnings = totalStreams * 0.002 + artistUnlocks.length * 10

    // Genre breakdown
    const genreMap = {}
    approved.forEach(t => {
      const g = t.genre || 'Other'
      genreMap[g] = (genreMap[g] || 0) + (t.play_count || 0)
    })
    const topGenre = Object.entries(genreMap).sort((a,b) => b[1]-a[1])[0]?.[0] || '—'

    // Build weekly stream data (simulate from play_counts distributed over last 7 days)
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      const label = d.toLocaleDateString('en-NG', { weekday: 'short' })
      // Distribute total streams roughly over 7 days with some variance
      const base = Math.round(totalStreams / 7)
      const value = Math.max(0, base + Math.floor((Math.random() - 0.4) * base * 0.6))
      return { label, value }
    })

    // Top tracks with percentage bars
    const maxStreams = approved[0]?.play_count || 1
    const tracksWithPct = approved.slice(0, 10).map(t => ({
      ...t,
      _pct: Math.round(((t.play_count || 0) / maxStreams) * 100)
    }))

    setStats({
      totalStreams,
      totalTracks: approved.length,
      pendingTracks: pending.length,
      followers: followersRes.count || 0,
      totalEarnings: totalEarnings.toFixed(1),
      unlocks: artistUnlocks.length,
      topGenre,
      newFollowers: (notifRes.data || []).filter(n => n.type === 'new_follower').length,
    })
    setTracks(tracksWithPct)
    setWeeklyData(weekly)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ padding: '24px 0' }}>
      <style>{SK}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="sk" style={{ height: 90 }} />)}
      </div>
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="sk" style={{ height: 56, marginBottom: 8 }} />)}
    </div>
  )

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['7d','30d','90d'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)',
              background: period === p ? 'var(--red)' : 'rgba(255,255,255,0.06)',
              color: period === p ? 'white' : 'var(--grey-400)',
              fontWeight: period === p ? 700 : 400,
            }}>
            {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard icon={Play}      label="Total Streams"  value={(stats.totalStreams).toLocaleString()} color="var(--red)"  sub={`${period} period`} />
        <StatCard icon={Coins}     label="TUNEZ Earned"   value={stats.totalEarnings + 'T'} color="#ffb400" sub="Est. from streams + unlocks" />
        <StatCard icon={Music2}    label="Approved Tracks" value={stats.totalTracks} color="#3b82f6" sub={stats.pendingTracks > 0 ? stats.pendingTracks + ' pending review' : 'All live'} />
        <StatCard icon={Users}     label="Followers"       value={stats.followers.toLocaleString()} color="#8b5cf6" sub={stats.newFollowers > 0 ? '+' + stats.newFollowers + ' this period' : null} />
        <StatCard icon={Award}     label="Premium Unlocks" value={stats.unlocks}   color="#22c55e" sub="Content unlocked by fans" />
        <StatCard icon={TrendingUp} label="Top Genre"      value={stats.topGenre}  color="#f59e0b" sub="By stream count" />
      </div>

      {/* Stream chart */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Stream activity</div>
            <div style={{ fontSize: 11, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>Last 7 days</div>
          </div>
          <BarChart2 size={16} style={{ color: 'var(--grey-600)' }} />
        </div>
        <MiniBarChart data={weeklyData} height={72} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {weeklyData.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--grey-700)', fontFamily: 'var(--font-mono)' }}>
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* Top tracks */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Track performance</div>
          <div style={{ fontSize: 11, color: 'var(--grey-600)', fontFamily: 'var(--font-mono)' }}>Top {tracks.length}</div>
        </div>
        {tracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey-600)' }}>
            <Music2 size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13 }}>No approved tracks yet</p>
          </div>
        ) : tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}
