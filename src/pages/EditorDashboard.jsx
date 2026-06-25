import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import Sidebar from '../components/Sidebar.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import { LayoutDashboard, Newspaper, Coins, User, CheckCircle, XCircle, Eye, Clock } from 'lucide-react'

const NAV = [
  { key: 'overview', label: 'Overview',     icon: LayoutDashboard },
  { key: 'review',   label: 'Review Posts', icon: Newspaper       },
  { key: 'activity', label: 'My Activity',  icon: Eye             },
  { key: 'wallet',   label: 'TUNEZ Wallet', icon: Coins           },
  { key: 'profile',  label: 'My Profile',   icon: User            },
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
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:8 }}>NOT AUTHORISED</h2>
        <p style={{ color:'var(--grey-400)', fontSize:14, marginBottom:20 }}>You are not an approved editor.</p>
        <button onClick={() => setPage('home')} className="btn btn-primary">Go Home</button>
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
          {active === 'overview' && <EditorOverview currentUser={currentUser} setActive={setActive} />}
          {active === 'review'   && <ReviewPosts    currentUser={currentUser} />}
          {active === 'activity' && <EditorActivity currentUser={currentUser} />}
          {active === 'wallet'   && <TunezWallet    currentUser={currentUser} />}
          {active === 'profile'  && <ProfileEditor  currentUser={currentUser} onUpdated={u => setCurrentUser(p => ({ ...p, ...u }))} />}
        </div>
      </main>
    </div>
  )
}

// ── Overview ───────────────────────────────────────────────────
function EditorOverview({ currentUser, setActive }) {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    supabase.from('blog_posts').select('id', { count:'exact', head:true })
      .eq('status','pending')
      .then(({ count }) => setPending(count || 0))
  }, [])

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom:28 }}>
        {[
          { label:'Posts Reviewed', value: currentUser.editor_posts_reviewed || 0,                    color:'#00b4dc' },
          { label:'TUNEZ Earned',   value: Number(currentUser.editor_total_earned||0).toFixed(1)+'T', color:'#ffb400' },
          { label:'Pending Review', value: pending,                                                   color:'var(--red)' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ borderTop:`3px solid ${s.color}`, padding:'20px 24px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:36 }}>{s.value}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--grey-500)', letterSpacing:2, marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:20, marginBottom:20 }}>
        <p style={{ fontSize:13, color:'var(--grey-300)', lineHeight:1.8 }}>
          You earn <strong style={{ color:'#ffb400' }}>5 TUNEZ</strong> per free post approved and <strong style={{ color:'#ffb400' }}>15% of price</strong> for premium posts.
          Approved posts go live <strong style={{ color:'white' }}>immediately</strong>.
        </p>
      </div>
      <button onClick={() => setActive('review')} className="btn btn-primary" style={{ gap:8 }}>
        <Newspaper size={15} /> Review Pending Posts ({pending})
      </button>
    </div>
  )
}

// ── Review Posts ───────────────────────────────────────────────
function ReviewPosts({ currentUser }) {
  const [posts,         setPosts]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [editedContent, setEditedContent] = useState('')
  const [editedTitle,   setEditedTitle]   = useState('')
  const [rejectReason,  setRejectReason]  = useState('')
  const [msg,           setMsg]           = useState(null)
  const [working,       setWorking]       = useState(false)
  const [editing,       setEditing]       = useState(false)

  const load = () => {
    setLoading(true)
    supabase.from('blog_posts')
      .select('*, profiles:author_id(name, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const openPost = (post) => {
    setSelected(post)
    setEditedTitle(post.title)
    setEditedContent(post.content || '')
    setEditing(false)
    setRejectReason('')
    setMsg(null)
  }

  const saveEdits = async () => {
    const { error } = await supabase.from('blog_posts').update({
      title:   editedTitle,
      content: editedContent,
    }).eq('id', selected.id)
    if (error) { setMsg('❌ Save failed: ' + error.message); return }
    setSelected(prev => ({ ...prev, title: editedTitle, content: editedContent }))
    setEditing(false)
    setMsg('✅ Edits saved. You can now approve the post.')
  }

  const approve = async () => {
    setWorking(true)
    const { data, error } = await supabase.rpc('editor_approve_post', {
      p_editor_id: currentUser.id,
      p_post_id:   selected.id,
    })
    if (error || data?.success === false) {
      setMsg('❌ ' + (error?.message || data?.reason || 'Error approving post'))
      setWorking(false); return
    }
    setMsg(`✅ Post approved and live! You earned ${Number(data.earned).toFixed(1)} TUNEZ`)
    setPosts(p => p.filter(x => x.id !== selected.id))
    setTimeout(() => setSelected(null), 2000)
    setWorking(false)
  }

  const reject = async () => {
    if (!rejectReason.trim()) { setMsg('❌ Please enter a rejection reason'); return }
    setWorking(true)
    await supabase.rpc('editor_reject_post', {
      p_editor_id: currentUser.id,
      p_post_id:   selected.id,
      p_reason:    rejectReason.trim(),
    })
    setMsg('Post rejected — blogger notified.')
    setPosts(p => p.filter(x => x.id !== selected.id))
    setTimeout(() => setSelected(null), 1500)
    setWorking(false)
  }

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>LOADING...</div>
  )

  if (selected) return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ gap:6 }}>
          ← Back
        </button>
        <button onClick={() => setEditing(e => !e)} className="btn btn-secondary" style={{ gap:6 }}>
          {editing ? '👁 Preview' : '✏️ Edit Post'}
        </button>
      </div>

      {msg && (
        <div style={{ padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:13,
          background: msg.startsWith('✅') ? 'rgba(0,200,100,0.1)' : 'rgba(200,16,46,0.1)',
          border: `1px solid ${msg.startsWith('✅') ? '#00c864' : 'var(--red)'}`,
          color: msg.startsWith('✅') ? '#00c864' : 'var(--red)' }}>
          {msg}
        </div>
      )}

      {/* Edit mode */}
      {editing ? (
        <div className="card" style={{ padding:24, marginBottom:16 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, display:'block', marginBottom:6 }}>TITLE</label>
            <input value={editedTitle} onChange={e => setEditedTitle(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:15, fontWeight:700, boxSizing:'border-box' }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, display:'block', marginBottom:6 }}>CONTENT</label>
            <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)}
              rows={20}
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:13, lineHeight:1.8, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
          </div>
          <button onClick={saveEdits} className="btn btn-primary" style={{ gap:6 }}>
            💾 Save Edits
          </button>
        </div>
      ) : (
        /* Preview mode */
        <div className="card" style={{ padding:28, marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--grey-500)', letterSpacing:2, marginBottom:8 }}>
            {selected.category} · by {selected.profiles?.name}
            {selected.is_premium && <span style={{ marginLeft:12, color:'#ffb400' }}>💎 Premium {selected.tunez_price}T</span>}
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(22px,4vw,36px)', marginBottom:16 }}>
            {editedTitle}
          </h2>
          {selected.cover_url && (
            <img src={selected.cover_url} style={{ width:'100%', maxHeight:320, objectFit:'cover', borderRadius:10, marginBottom:20 }} />
          )}
          <div style={{ fontSize:14, color:'var(--grey-300)', lineHeight:1.9 }}
            dangerouslySetInnerHTML={{ __html: editedContent.replace(/<script[\s\S]*?<\/script>/gi,'') }} />
        </div>
      )}

      {/* Approve / Reject */}
      <div className="card" style={{ padding:20 }}>
        <button onClick={approve} disabled={working} className="btn btn-primary"
          style={{ width:'100%', justifyContent:'center', marginBottom:12, background:'#00c864', borderColor:'#00c864', padding:13 }}>
          <CheckCircle size={16} />
          {working ? 'Approving...' : `✅ Approve & Publish ${selected.is_premium ? `(earn ${(selected.tunez_price*0.15).toFixed(1)}T)` : '(earn 5T)'}`}
        </button>
        <div>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Rejection reason (required)..." rows={2}
            style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:13, resize:'vertical', boxSizing:'border-box', marginBottom:8, fontFamily:'inherit' }} />
          <button onClick={reject} disabled={working || !rejectReason.trim()}
            style={{ width:'100%', padding:11, borderRadius:8, background:'transparent', border:'1px solid var(--red)', color:'var(--red)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <XCircle size={15} /> Reject Post
          </button>
        </div>
      </div>
    </div>
    </div>
  )

  return (
    <div>
      {posts.length === 0 ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--grey-500)' }}>
          <CheckCircle size={40} style={{ opacity:0.2, display:'block', margin:'0 auto 12px' }} />
          <div style={{ fontSize:15 }}>No pending posts — all clear!</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {posts.map(post => (
            <div key={post.id} className="card"
              onClick={() => openPost(post)}
              style={{ padding:'18px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
              {post.cover_url && (
                <img src={post.cover_url} style={{ width:56, height:56, objectFit:'cover', borderRadius:8, flexShrink:0 }} />
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.title}</div>
                <div style={{ fontSize:12, color:'var(--grey-400)', marginTop:3 }}>
                  {post.profiles?.name} · {post.category}
                  {post.is_premium && <span style={{ color:'#ffb400', marginLeft:8 }}>💎 Premium</span>}
                  {' · '}{new Date(post.created_at).toLocaleDateString('en-NG')}
                </div>
              </div>
              <div style={{ color:'var(--grey-500)', fontSize:12, display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <Eye size={13} /> Review
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Activity Log ────────────────────────────────────────────────
function EditorActivity({ currentUser }) {
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('editor_activity')
      .select('*, post:post_id(title)')
      .eq('editor_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setActivity(data || []); setLoading(false) })
  }, [currentUser.id])

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>LOADING...</div>
  )

  if (activity.length === 0) return (
    <div style={{ padding:48, textAlign:'center', color:'var(--grey-500)' }}>No activity yet — start reviewing posts!</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {activity.map(a => (
        <div key={a.id} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{a.action === 'approved' ? '✅' : '❌'}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {a.post?.title || 'Unknown post'}
            </div>
            <div style={{ fontSize:11, color:'var(--grey-500)', marginTop:2 }}>
              {a.action === 'approved' ? 'Approved' : `Rejected — ${a.reason || ''}`}
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
  )
}
