import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import Sidebar from '../components/Sidebar.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import {
  LayoutDashboard, Newspaper, Coins, User, CheckCircle, XCircle, Clock, Eye
} from 'lucide-react'

const NAV = [
  { key: 'overview',  label: 'Overview',        icon: LayoutDashboard },
  { key: 'review',    label: 'Review Posts',     icon: Newspaper       },
  { key: 'activity',  label: 'My Activity',      icon: Eye             },
  { key: 'wallet',    label: 'TUNEZ Wallet',     icon: Coins           },
  { key: 'profile',   label: 'My Profile',       icon: User            },
]

export default function EditorDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const { currentUser, setCurrentUser } = useDashboard(propUser)

  if (!currentUser) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)', letterSpacing:2 }}>
      LOADING...
    </div>
  )

  if (currentUser.editor_status !== 'approved') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <XCircle size={48} color="var(--red)" style={{ margin:'0 auto 16px', display:'block' }} />
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:8 }}>ACCESS DENIED</h2>
        <p style={{ color:'var(--grey-400)', fontSize:14 }}>Your editor role has not been approved yet.</p>
        <button onClick={() => setPage('home')} className="btn btn-primary" style={{ marginTop:20 }}>Go Home</button>
      </div>
    </div>
  )

  return (
    <div className="dashboard-layout">
      <Sidebar
        items={NAV}
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
            <button onClick={() => setSidebarOpen(o => !o)}
              className="dashboard-menu-toggle"
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--grey-300)', cursor:'pointer', fontSize:18, lineHeight:1 }}>
              ☰
            </button>
            <div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', letterSpacing:2 }}>EDITOR PORTAL</span>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>
                {NAV.find(n => n.key === active)?.label}
              </h1>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview'  && <EditorOverview currentUser={currentUser} setActive={setActive} />}
          {active === 'review'    && <ReviewPosts    currentUser={currentUser} />}
          {active === 'activity'  && <EditorActivity currentUser={currentUser} />}
          {active === 'wallet'    && <TunezWallet    currentUser={currentUser} />}
          {active === 'profile'   && <ProfileEditor  currentUser={currentUser} onUpdated={u => setCurrentUser(p => ({ ...p, ...u }))} />}
        </div>
      </main>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function EditorOverview({ currentUser, setActive }) {
  return (
    <div>
      <div className="stat-grid" style={{ marginBottom:28 }}>
        {[
          { label:'Posts Reviewed', value: currentUser.editor_posts_reviewed || 0, color:'#00b4dc', icon: <Newspaper size={20} /> },
          { label:'TUNEZ Earned',   value: Number(currentUser.editor_total_earned || 0).toFixed(0) + 'T', color:'#ffb400', icon: <Coins size={20} /> },
        ].map((s,i) => (
          <div key={i} className="card stat-card" style={{ borderTop:`3px solid ${s.color}`, padding:'20px 24px' }}>
            <div style={{ color:s.color, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:36 }}>{s.value}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--grey-500)', letterSpacing:2, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:20, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--grey-500)', letterSpacing:2, marginBottom:12 }}>EDITOR EARNINGS</div>
        <p style={{ fontSize:13, color:'var(--grey-300)', lineHeight:1.7 }}>
          You earn <strong style={{ color:'#ffb400' }}>5 TUNEZ</strong> per free post approved, and <strong style={{ color:'#ffb400' }}>15% of the post price</strong> for premium posts. This is 50% of admin's share.
        </p>
      </div>
      <button onClick={() => setActive('review')} className="btn btn-primary" style={{ gap:8 }}>
        <Newspaper size={15} /> Review Pending Posts
      </button>
    </div>
  )
}

// ── Review Posts ──────────────────────────────────────────────
function ReviewPosts({ currentUser }) {
  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [msg, setMsg]             = useState(null)
  const [working, setWorking]     = useState(false)

  const load = () => {
    setLoading(true)
    supabase.from('blog_posts')
      .select('*, profiles:author_id(name, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const approve = async (post) => {
    setWorking(true)
    const { data, error } = await supabase.rpc('editor_approve_post', {
      p_editor_id: currentUser.id,
      p_post_id: post.id,
    })
    if (data?.success) {
      setMsg(`✅ Post approved! You earned ${data.earned} TUNEZ`)
      setPosts(p => p.filter(x => x.id !== post.id))
      setSelected(null)
    } else {
      setMsg('❌ Error: ' + (error?.message || data?.reason || 'Unknown error'))
    }
    setWorking(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const reject = async (post) => {
    if (!rejectReason.trim()) { setMsg('❌ Please enter a rejection reason'); return }
    setWorking(true)
    await supabase.rpc('editor_reject_post', {
      p_editor_id: currentUser.id,
      p_post_id: post.id,
      p_reason: rejectReason.trim(),
    })
    setMsg('Post rejected — blogger has been notified.')
    setPosts(p => p.filter(x => x.id !== post.id))
    setSelected(null)
    setRejectReason('')
    setWorking(false)
    setTimeout(() => setMsg(null), 3000)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>LOADING...</div>

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ marginBottom:20, gap:8 }}>
        ← Back to list
      </button>

      <div className="card" style={{ padding:28, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--grey-500)', letterSpacing:2, marginBottom:8 }}>
          {selected.category} · by {selected.profiles?.name}
        </div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:16 }}>{selected.title}</h2>
        {selected.cover_url && (
          <img src={selected.cover_url} style={{ width:'100%', maxHeight:300, objectFit:'cover', borderRadius:8, marginBottom:16 }} />
        )}
        <div style={{ fontSize:14, color:'var(--grey-300)', lineHeight:1.8 }}
          dangerouslySetInnerHTML={{ __html: selected.content?.replace(/<script[^>]*>.*?<\/script>/gi,'') || '' }} />
      </div>

      {msg && <div style={{ padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:13,
        background: msg.startsWith('✅') ? 'rgba(0,200,100,0.1)' : 'rgba(200,16,46,0.1)',
        border: `1px solid ${msg.startsWith('✅') ? '#00c864' : 'var(--red)'}`,
        color: msg.startsWith('✅') ? '#00c864' : 'var(--red)' }}>{msg}</div>}

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
        <button onClick={() => approve(selected)} disabled={working} className="btn btn-primary"
          style={{ background:'#00c864', borderColor:'#00c864', gap:8, flex:1, justifyContent:'center' }}>
          <CheckCircle size={16} /> Approve Post {selected.is_premium ? `(earn ${(selected.tunez_price*0.15).toFixed(1)}T)` : '(earn 5T)'}
        </button>
      </div>
      <div>
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="Rejection reason (required before rejecting)..."
          rows={3}
          style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:13, resize:'vertical', boxSizing:'border-box', marginBottom:10 }}
        />
        <button onClick={() => reject(selected)} disabled={working || !rejectReason.trim()}
          className="btn btn-secondary"
          style={{ borderColor:'var(--red)', color:'var(--red)', gap:8, width:'100%', justifyContent:'center' }}>
          <XCircle size={16} /> Reject Post
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {msg && <div style={{ padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:13,
        background:'rgba(0,200,100,0.1)', border:'1px solid #00c864', color:'#00c864' }}>{msg}</div>}

      {posts.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)' }}>
          <CheckCircle size={40} style={{ opacity:0.2, display:'block', margin:'0 auto 12px' }} />
          <div>No pending posts to review</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {posts.map(post => (
            <div key={post.id} className="card" style={{ padding:20, display:'flex', gap:16, alignItems:'center', cursor:'pointer' }}
              onClick={() => setSelected(post)}>
              {post.cover_url && (
                <img src={post.cover_url} style={{ width:64, height:64, objectFit:'cover', borderRadius:8, flexShrink:0 }} />
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{post.title}</div>
                <div style={{ fontSize:12, color:'var(--grey-400)' }}>
                  {post.profiles?.name} · {post.category} · {new Date(post.created_at).toLocaleDateString('en-NG')}
                  {post.is_premium && <span style={{ marginLeft:8, color:'#ffb400' }}>💎 Premium</span>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--grey-500)', flexShrink:0, fontSize:13 }}>
                Review <Eye size={14} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Activity Log ──────────────────────────────────────────────
function EditorActivity({ currentUser }) {
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('editor_activity')
      .select('*, post:post_id(title)')
      .eq('editor_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setActivity(data || []); setLoading(false) })
  }, [currentUser.id])

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>LOADING...</div>

  return (
    <div>
      {activity.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)' }}>No activity yet</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {activity.map(a => (
            <div key={a.id} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
              {a.action === 'approved'
                ? <CheckCircle size={18} color="#00c864" style={{ flexShrink:0 }} />
                : <XCircle    size={18} color="var(--red)" style={{ flexShrink:0 }} />
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {a.post?.title || 'Unknown post'}
                </div>
                <div style={{ fontSize:11, color:'var(--grey-500)', marginTop:2 }}>
                  {a.action === 'approved' ? 'Approved' : 'Rejected'}
                  {a.reason ? ` — ${a.reason}` : ''}
                  {' · '}{new Date(a.created_at).toLocaleDateString('en-NG')}
                </div>
              </div>
              {a.action === 'approved' && (
                <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#ffb400', flexShrink:0 }}>
                  +{Number(a.earned).toFixed(1)}T
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
