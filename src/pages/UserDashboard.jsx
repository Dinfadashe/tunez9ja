import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { earnDailyLogin } from '../lib/tunez.js'
import Sidebar from '../components/Sidebar.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import MyLibrary from '../components/MyLibrary.jsx'
import Playlists from '../components/Playlists.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import HalvingBanner from '../components/HalvingBanner.jsx'
import EditorApplication from '../components/EditorApplication.jsx'
import {
  LayoutDashboard, Coins, BookMarked, ListMusic,
  Link, User, Music, Newspaper, Video
} from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard.js'

const NAV = [
  { key: 'overview',  label: 'Overview',      icon: LayoutDashboard },
  { key: 'wallet',    label: 'TUNEZ Wallet',  icon: Coins           },
  { key: 'library',   label: 'My Library',    icon: BookMarked      },
  { key: 'playlists', label: 'Playlists',     icon: ListMusic       },
  { key: 'referral',  label: 'Referral',      icon: Link            },
  { key: 'profile',   label: 'My Profile',    icon: User            },
  { key: 'editor',    label: 'Become Editor', icon: Newspaper       },
]

export default function UserDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const { currentUser, setCurrentUser } = useDashboard(propUser)

  if (!currentUser) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)', letterSpacing:2 }}>
      LOADING...
    </div>
  )

  return (
    <div className="dashboard-layout">
      <Sidebar
        items={NAV.map(n => n.key === 'editor' ? { ...n, label: currentUser?.editor_status === 'approved' ? 'Editor Dashboard' : 'Become Editor' } : n)}
        activePage={active}
        setActivePage={(key) => { setActive(key); setSidebarOpen(false) }}
        setPage={setPage}
        currentUser={currentUser}
        onRoleSwitch={onRoleSwitch}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="dashboard-menu-toggle"
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--grey-300)', cursor:'pointer', fontSize:18, lineHeight:1 }}>
              ☰
            </button>
            <div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', letterSpacing:2 }}>USER PORTAL</span>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>
                {NAV.find(n => n.key === active)?.label}
              </h1>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview'  && <UserOverview  currentUser={currentUser} setActive={setActive} setPage={setPage} />}
          {active === 'wallet'    && <TunezWallet   currentUser={currentUser} />}
          {active === 'library'   && <MyLibrary     currentUser={currentUser} />}
          {active === 'playlists' && <Playlists     currentUser={currentUser} />}
          {active === 'referral'  && <ReferralTab   currentUser={currentUser} />}
          {active === 'profile'   && <ProfileEditor currentUser={currentUser} onUpdated={(u) => setCurrentUser(prev => ({ ...prev, ...u }))} />}
          {active === 'editor'    && <EditorApplication currentUser={currentUser} />}
        </div>
      </main>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function UserOverview({ currentUser, setActive, setPage }) {
  const [balance, setBalance] = useState(null)
  const [dailyEarned, setDailyEarned] = useState(false)

  useEffect(() => {
    if (!currentUser?.id) return
    earnDailyLogin(currentUser.id).then(r => { if (r) setDailyEarned(true) }).catch(() => {})
    supabase.from('tunez_balances')
      .select('balance, total_earned, total_spent, total_purchased')
      .eq('user_id', currentUser.id)
      .single()
      .then(({ data }) => setBalance(data || { balance:0, total_earned:0, total_spent:0, total_purchased:0 }))
      .catch(() => setBalance({ balance:0, total_earned:0, total_spent:0, total_purchased:0 }))
  }, [currentUser.id])

  return (
    <div>
      {/* Welcome card */}
      <div style={{ background:'linear-gradient(135deg,#1a0a0d,#0f0a1a)', border:'1px solid var(--border-red)', borderRadius:12, padding:24, marginBottom:24, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:24, color:'white', flexShrink:0 }}>
          {currentUser.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:24 }}>{currentUser.name}</div>
          <div style={{ color:'var(--grey-400)', fontSize:13, marginTop:2 }}>
            {currentUser.is_verified ? '✅ Verified Member' : 'Standard Member'}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:32, color:'var(--red)' }}>
            {balance !== null ? Number(balance?.balance || 0).toFixed(0) : '…'}
          </div>
          <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1 }}>TUNEZ</div>
        </div>
      </div>

      {/* Daily bonus */}
      {dailyEarned && (
        <div style={{ background:'rgba(0,200,100,0.08)', border:'1px solid rgba(0,200,100,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#00c864' }}>
          ☀️ <strong>+5 TUNEZ</strong> daily login bonus added!
        </div>
      )}

      <HalvingBanner compact />

      {/* Quick actions */}
      <div style={{ display:'flex', gap:10, marginTop:20, flexWrap:'wrap' }}>
        <button className="btn btn-primary" onClick={() => setPage('music')} style={{ gap:8 }}>
          <Music size={15} /> Stream Music
        </button>
        <button className="btn btn-secondary" onClick={() => setActive('wallet')} style={{ gap:8 }}>
          <Coins size={15} /> My Wallet
        </button>
        <button className="btn btn-secondary" onClick={() => setActive('library')} style={{ gap:8 }}>
          <BookMarked size={15} /> My Library
        </button>
      </div>
    </div>
  )
}

// ── Referral ──────────────────────────────────────────────────
function ReferralTab({ currentUser }) {
  const [copied, setCopied] = useState(false)
  const refCode = currentUser?.referral_code || currentUser?.id?.slice(0,8).toUpperCase()
  const refLink = `${window.location.origin}/?ref=${refCode}&signup=1`

  const copy = () => {
    navigator.clipboard.writeText(refLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ maxWidth:480 }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:8 }}>REFER FRIENDS</h2>
      <p style={{ color:'var(--grey-300)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
        Share your link. You both earn <strong style={{ color:'#ffb400' }}>+15 TUNEZ</strong> when they sign up.
      </p>
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--grey-300)', wordBreak:'break-all', marginBottom:16 }}>
        {refLink}
      </div>
      <button onClick={copy} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
        {copied ? '✅ Copied!' : '📋 Copy Referral Link'}
      </button>
    </div>
  )
}
