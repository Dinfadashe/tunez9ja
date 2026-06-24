import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import HalvingBanner from '../components/HalvingBanner.jsx'
import ProfileEditor, { Avatar } from '../components/ProfileEditor.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import Sidebar from '../components/Sidebar.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import Playlists   from '../components/Playlists.jsx'
import MyLibrary from '../components/MyLibrary.jsx'
import { getBalance, earnDailyLogin } from '../lib/tunez.js'
import {
  LayoutDashboard, Coins, BookMarked, User,
  Copy, Check, Link, TrendingUp, Music, Newspaper, Video, ListMusic
} from 'lucide-react'

const NAV = [
  { key: 'overview', label: 'Overview',     icon: LayoutDashboard },
  { key: 'wallet',   label: 'TUNEZ Wallet', icon: Coins           },
  { key: 'library',  label: 'My Library',   icon: BookMarked      },
  { key: 'playlists',label: 'Playlists',    icon: ListMusic       },
  { key: 'referral', label: 'Referral',     icon: Link            },
  { key: 'profile',  label: 'My Profile',   icon: User            },
]

export default function UserDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const { currentUser, setCurrentUser } = useDashboard(propUser)

  // Daily login bonus handled in UserOverview

  if (!currentUser) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-300)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  return (
    <div className="dashboard-layout">
      <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          items={NAV} activePage={active} setActivePage={setActive}
        setPage={setPage} currentUser={currentUser} onRoleSwitch={onRoleSwitch} />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="dashboard-menu-toggle"
                style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--grey-300)', cursor:'pointer', fontSize:18, lineHeight:1 }}>
                ☰
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>USER PORTAL</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
              {NAV.find(n => n.key === active)?.label}
            </h1>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview' && <UserOverview currentUser={currentUser} setActive={setActive} setPage={setPage} />}
          {active === 'wallet'   && <TunezWallet  currentUser={currentUser} />}
          {active === 'library'   && <MyLibrary  currentUser={currentUser} />}
          {active === 'playlists' && <Playlists currentUser={currentUser} />}
          {active === 'referral' && <ReferralPage currentUser={currentUser} />}
          {active === 'profile'  && <UserProfile  currentUser={currentUser} setCurrentUser={setCurrentUser} />}
        </div>
      </main>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function UserOverview({ currentUser, setActive, setPage }) {
  const [balance,         setBalance]         = useState(null)
  const [stats,           setStats]           = useState({ streams: 0, reads: 0, watches: 0, comments: 0 })
  const [dailyEarned,    setDailyEarned]    = useState(false)
  const [activityModal,  setActivityModal]  = useState(null)

  const fetchBalance = async () => {
    // Direct Supabase query — bypass tunez.js cache
    const { data, error } = await supabase
      .from('tunez_balances')
      .select('balance, total_earned, total_spent, total_purchased')
      .eq('user_id', currentUser.id)
      .single()
    if (error) {
      console.log('No balance record yet:', error.message)
      setBalance({ balance: 0, total_earned: 0, total_spent: 0, total_purchased: 0 })
    } else {
      console.log('Balance fetched:', data)
      setBalance(data)
    }
  }

  useEffect(() => {
    if (!currentUser?.id) return

    // Daily login bonus — fires once per day
    earnDailyLogin(currentUser.id)
      .then(result => {
        if (result) {
          setDailyEarned(true)
          setTimeout(() => fetchBalance(), 800)
        }
      })
      .catch(e => console.error('Daily bonus error:', e))

    fetchBalance()
    // Fetch activity counts
    // Fetch all transactions and count by type
    supabase.from('tunez_transactions')
      .select('type')
      .eq('user_id', currentUser.id)
      .in('type', ['earn_stream','earn_read','earn_watch','earn_comment'])
      .then(({ data }) => {
        const txs = data || []
        setStats({
          streams:  txs.filter(t => t.type === 'earn_stream').length,
          reads:    txs.filter(t => t.type === 'earn_read').length,
          watches:  txs.filter(t => t.type === 'earn_watch').length,
          comments: txs.filter(t => t.type === 'earn_comment').length,
        })
      })
  }, [currentUser.id])

  return (
    <div>
      {/* Welcome */}
      <div style={{ background: 'linear-gradient(135deg,#1a0a0d,#0f0a1a)', border: '1px solid var(--border-red)', borderRadius: 12, padding: 28, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28, color: 'white', flexShrink: 0 }}>
          {currentUser.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{currentUser.name}</div>
          <div style={{ color: 'var(--grey-300)', fontSize: 13, marginTop: 4 }}>
            Tunez9ja Member · {currentUser.is_verified ? '✅ Verified' : 'Standard Account'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--red)' }}>
            {balance !== null ? Number(balance?.balance || 0).toFixed(2) : '...'}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1 }}>TUNEZ BALANCE</div>
        </div>
      </div>

      {/* Daily bonus notice — only show when actually earned */}
      {dailyEarned && (
        <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#00c864', display: 'flex', alignItems: 'center', gap: 10 }}>
          ☀️ <strong>+5 TUNEZ</strong> daily login bonus credited to your wallet!
        </div>
      )}

      {/* Stats — clickable */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        {[
          { key: 'streams',  value: stats.streams,                          label: 'Tracks Streamed',    icon: <Music size={32} />,     accent: 'var(--red)',  type: 'earn_stream'  },
          { key: 'reads',    value: stats.reads,                            label: 'Posts Read',         icon: <Newspaper size={32} />, accent: '#00b4dc',     type: 'earn_read'    },
          { key: 'watches',  value: stats.watches,                          label: 'Videos Watched',     icon: <Video size={32} />,     accent: '#00c864',     type: 'earn_watch'   },
          { key: 'earned',   value: balance?.total_earned?.toFixed(0)||'0', label: 'Total TUNEZ Earned', icon: <Coins size={32} />,     accent: '#ffb400',     type: 'all_earn'     },
        ].map(stat => (
          <div key={stat.key} className="stat-card"
            onClick={() => setActivityModal(stat)}
            style={{ '--accent': stat.accent, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=stat.accent }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='' }}
          >
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            {stat.icon}
            <div style={{ position:'absolute', bottom:10, right:10, fontSize:10, fontFamily:'var(--font-mono)', color: stat.accent, opacity:0.7, letterSpacing:1 }}>TAP TO VIEW →</div>
          </div>
        ))}
      </div>

      {/* Activity modal */}
      {activityModal && (
        <ActivityModal
          type={activityModal.type}
          label={activityModal.label}
          accent={activityModal.accent}
          currentUser={currentUser}
          onClose={() => setActivityModal(null)}
        />
      )}


        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setPage('music')} style={{ gap: 8 }}>
            <Music size={15} /> Stream Music
          </button>
          <button className="btn btn-secondary" onClick={() => setActive('wallet')} style={{ gap: 8 }}>
            <Coins size={15} /> Buy TUNEZ
          </button>
          <button className="btn btn-secondary" onClick={() => setActive('referral')} style={{ gap: 8 }}>
            <Link size={15} /> Refer Friends
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Referral Page ─────────────────────────────────────────────
function ReferralPage({ currentUser }) {
  const [copied,    setCopied]    = useState(false)
  const [referrals, setReferrals] = useState([])
  const [earned,    setEarned]    = useState(0)

  const baseUrl    = window.location.origin
  const refCode    = currentUser.referral_code || currentUser.id.slice(0, 8).toUpperCase()
  const refLink    = `${baseUrl}/?ref=${refCode}&signup=1`

  useEffect(() => {
    // Fetch referral earnings
    supabase.from('tunez_transactions')
      .select('amount, created_at')
      .eq('user_id', currentUser.id)
      .eq('type', 'earn_referral')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReferrals(data || [])
        setEarned((data || []).reduce((s, t) => s + t.amount, 0))
      })
  }, [currentUser.id])

  const copy = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = (platform) => {
    const msg = `Join me on Tunez9ja — Nigeria's #1 music blog! Sign up and we both earn TUNEZ tokens. ${refLink}`
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join Tunez9ja and earn TUNEZ!')}`,
    }
    window.open(urls[platform], '_blank')
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Referral card */}
      <div style={{ background: 'linear-gradient(135deg,#1a0a0d,#0f0a1a)', border: '1px solid var(--border-red)', borderRadius: 16, padding: 32, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 12 }}>YOUR REFERRAL LINK</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--white)', letterSpacing: 2, marginBottom: 8 }}>
          +15 <span style={{ fontSize: 20, color: 'var(--grey-300)' }}>TUNEZ</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--grey-300)', marginBottom: 24 }}>
          You earn <strong style={{ color: 'var(--red)' }}>15 TUNEZ</strong> every time someone signs up using your link. No limit.
        </div>

        {/* Link box */}
        <div style={{ display: 'flex', gap: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ flex: 1, padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--grey-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {refLink}
          </div>
          <button onClick={copy}
            style={{ padding: '12px 20px', background: copied ? 'rgba(0,200,100,0.2)' : 'var(--bg-card)', border: 'none', borderLeft: '1px solid var(--border)', color: copied ? '#00c864' : 'var(--grey-300)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, flexShrink: 0, transition: 'all 0.2s' }}>
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy</>}
          </button>
        </div>

        {/* Your code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>Your code:</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--red)', letterSpacing: 3, background: 'var(--red-glow)', padding: '4px 16px', borderRadius: 6, border: '1px solid var(--border-red)' }}>
            {refCode}
          </div>
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { key: 'whatsapp', label: 'WhatsApp',  color: '#25D366', bg: 'rgba(37,211,102,0.1)' },
            { key: 'twitter',  label: 'Twitter/X', color: '#1DA1F2', bg: 'rgba(29,161,242,0.1)' },
            { key: 'telegram', label: 'Telegram',  color: '#0088cc', bg: 'rgba(0,136,204,0.1)'  },
          ].map(({ key, label, color, bg }) => (
            <button key={key} onClick={() => share(key)}
              style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${color}44`, background: bg, color, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }}>
              Share on {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 8 }}>TOTAL REFERRALS</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40 }}>{referrals.length}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 8 }}>TUNEZ EARNED</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: '#00c864' }}>{earned.toFixed(0)}</div>
        </div>
      </div>

      {/* How it works */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 16 }}>HOW IT WORKS</h3>
        {[
          { n: '1', text: 'Copy your referral link above' },
          { n: '2', text: 'Share it with friends on WhatsApp, Twitter, or anywhere' },
          { n: '3', text: 'When they sign up using your link, you instantly earn 15 TUNEZ' },
          { n: '4', text: 'No limit — refer as many people as you want' },
          { n: '5', text: 'Use your TUNEZ to unlock premium music, posts and videos' },
        ].map(({ n, text }) => (
          <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.7, paddingTop: 4 }}>{text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────
function UserProfile({ currentUser, setCurrentUser }) {
  return (
    <ProfileEditor
      currentUser={currentUser}
      onUpdated={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
    />
  )
}


function ActivityModal({ type, label, accent, currentUser, onClose }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = supabase
      .from('tunez_transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (type !== 'all_earn') {
      query.eq('type', type)
    } else {
      query.like('type', 'earn_%')
    }

    query.then(({ data }) => {
      setItems(data || [])
      setLoading(false)
    })
  }, [type])

  const TYPE_LABELS = {
    earn_stream:        '🎵 Streamed a track',
    earn_read:          '📰 Read a post',
    earn_watch:         '🎬 Watched a video',
    earn_react:         '👍 Reacted to content',
    earn_comment:       '💬 Posted a comment',
    earn_daily:         '☀️ Daily login bonus',
    earn_referral:      '👥 Referral bonus',
    earn_content_owner: '🎤 Content earnings',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', border:`1px solid ${accent}44`, borderRadius:14, width:'100%', maxWidth:520, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22 }}>{label}</div>
            <div style={{ fontSize:12, color:'var(--grey-500)', marginTop:2 }}>Last 50 activities</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--grey-300)', cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
        </div>

        {/* List */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)', letterSpacing:2 }}>LOADING...</div>
          ) : items.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🎵</div>
              <div>No activity yet. Start exploring!</div>
            </div>
          ) : (
            items.map(tx => (
              <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 22px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:`${accent}15`, border:`1px solid ${accent}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
                  {(TYPE_LABELS[tx.type] || '🪙').split(' ')[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {tx.description || TYPE_LABELS[tx.type] || tx.type}
                  </div>
                  <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                    {new Date(tx.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color: tx.amount > 0 ? '#00c864' : 'var(--red)', fontFamily:'var(--font-mono)', flexShrink:0 }}>
                  {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                  <span style={{ fontSize:10, color:'var(--grey-500)', marginLeft:3 }}>T</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 22px', borderTop:'1px solid var(--border)', flexShrink:0, textAlign:'center' }}>
          <div style={{ fontSize:11, color:'var(--grey-500)' }}>
            Total: <span style={{ color: accent, fontWeight:700 }}>
              {items.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)} TUNEZ
            </span> from {items.length} activities
          </div>
        </div>
      </div>
    </div>
  )
}
