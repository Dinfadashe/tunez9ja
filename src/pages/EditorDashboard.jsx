import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import Sidebar from '../components/Sidebar.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import { LayoutDashboard, Newspaper, Coins, User, CheckCircle, XCircle, Eye } from 'lucide-react'

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

  // Use propUser for auth check - it's available immediately
  // currentUser (fresh DB fetch) is used for up-to-date stats
  const authUser = currentUser || propUser

  if (!authUser) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  if (authUser.editor_status !== 'approved') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <XCircle size={48} color="var(--red)" style={{ margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8, color: 'white' }}>NOT AUTHORISED</h2>
        <p style={{ color: 'var(--grey-400)', marginBottom: 20, fontSize: 14 }}>Status: {authUser.editor_status || 'not applied'}</p>
        <button onClick={function() { setPage('home') }} className="btn btn-primary">Go Home</button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(function(o) { return !o })}
              className="dashboard-menu-toggle"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
              &#9776;
            </button>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>EDITOR PORTAL</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
                {NAV.find(function(n) { return n.key === active })?.label}
              </h1>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview' && <EditorOverview currentUser={currentUser} setActive={setActive} />}
          {active === 'review'   && <ReviewPosts currentUser={currentUser} />}
          {active === 'activity' && <EditorActivity currentUser={currentUser} />}
          {active === 'wallet'   && <TunezWallet currentUser={currentUser} />}
          {active === 'profile'  && <ProfileEditor currentUser={currentUser} onUpdated={function(u) { setCurrentUser(function(p) { return Object.assign({}, p, u) }) }} />}
        </div>
      </main>
    </div>
  )
}

function EditorOverview({ currentUser, setActive }) {
  const [pending, setPending] = useState(0)
  useEffect(function() {
    supabase.from('blog_posts').select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(function(res) { setPending(res.count || 0) })
  }, [])
  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderTop: '3px solid #00b4dc', padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{currentUser.editor_posts_reviewed || 0}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 6 }}>POSTS REVIEWED</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid #ffb400', padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{Number(currentUser.editor_total_earned || 0).toFixed(1)}T</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 6 }}>TUNEZ EARNED</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid var(--red)', padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{pending}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 6 }}>PENDING REVIEW</div>
        </div>
      </div>
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.8 }}>
          Earn 5 TUNEZ per free post and 15% of price for premium posts. Approved posts go live immediately.
        </p>
      </div>
      <button onClick={function() { setActive('review') }} className="btn btn-primary" style={{ gap: 8 }}>
        Review Pending Posts
      </button>
    </div>
  )
}

function ReviewPosts({ currentUser }) {
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [editedTitle, setEditedTitle]   = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [msg, setMsg]                   = useState(null)
  const [working, setWorking]           = useState(false)
  const [editing, setEditing]           = useState(false)

  function load() {
    setLoading(true)
    supabase.from('blog_posts')
      .select('*, profiles:author_id(name,avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(function(res) { setPosts(res.data || []); setLoading(false) })
  }

  useEffect(function() { load() }, [])

  function openPost(post) {
    setSelected(post)
    setEditedTitle(post.title)
    setEditedContent(post.content || '')
    setEditing(false)
    setRejectReason('')
    setMsg(null)
  }

  function saveEdits() {
    supabase.from('blog_posts')
      .update({ title: editedTitle, content: editedContent })
      .eq('id', selected.id)
      .then(function(res) {
        if (res.error) { setMsg('Save failed: ' + res.error.message); return }
        setSelected(function(p) { return Object.assign({}, p, { title: editedTitle, content: editedContent }) })
        setEditing(false)
        setMsg('Edits saved. You can now approve.')
      })
  }

  function approve() {
    setWorking(true)
    supabase.rpc('editor_approve_post', { p_editor_id: currentUser.id, p_post_id: selected.id })
      .then(function(res) {
        if (res.error || res.data?.success === false) {
          setMsg('Error: ' + (res.error?.message || res.data?.reason || 'Unknown'))
          setWorking(false); return
        }
        var earned = Number(res.data.earned || 0).toFixed(1)
        setMsg('Post approved and live! You earned ' + earned + ' TUNEZ')
        setPosts(function(p) { return p.filter(function(x) { return x.id !== selected.id }) })
        setTimeout(function() { setSelected(null) }, 2000)
        setWorking(false)
      })
  }

  function reject() {
    if (!rejectReason.trim()) { setMsg('Please enter a rejection reason'); return }
    setWorking(true)
    supabase.rpc('editor_reject_post', { p_editor_id: currentUser.id, p_post_id: selected.id, p_reason: rejectReason.trim() })
      .then(function() {
        setMsg('Post rejected. Blogger has been notified.')
        setPosts(function(p) { return p.filter(function(x) { return x.id !== selected.id }) })
        setTimeout(function() { setSelected(null) }, 1500)
        setWorking(false)
      })
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>LOADING...</div>

  if (selected) return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={function() { setSelected(null) }} className="btn btn-secondary">Back</button>
        <button onClick={function() { setEditing(function(e) { return !e }) }} className="btn btn-secondary">
          {editing ? 'Preview' : 'Edit Post'}
        </button>
      </div>
      {msg && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: 'rgba(0,200,100,0.1)', border: '1px solid #00c864', color: '#00c864' }}>
          {msg}
        </div>
      )}
      {editing ? (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, display: 'block', marginBottom: 6 }}>TITLE</label>
            <input value={editedTitle} onChange={function(e) { setEditedTitle(e.target.value) }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 15, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, display: 'block', marginBottom: 6 }}>CONTENT</label>
            <textarea value={editedContent} onChange={function(e) { setEditedContent(e.target.value) }}
              rows={20}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 13, lineHeight: 1.8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <button onClick={saveEdits} className="btn btn-primary">Save Edits</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', letterSpacing: 2, marginBottom: 8 }}>
            {selected.category} by {selected.profiles?.name}
            {selected.is_premium ? ' - Premium ' + selected.tunez_price + 'T' : ''}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 16 }}>{editedTitle}</h2>
          {selected.cover_url && (
            <img src={selected.cover_url} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
          )}
          <div style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: editedContent }} />
        </div>
      )}
      <div className="card" style={{ padding: 20 }}>
        <button onClick={approve} disabled={working} className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 12, background: '#00c864', borderColor: '#00c864', padding: 13 }}>
          {working ? 'Approving...' : 'Approve and Publish'}
        </button>
        <textarea value={rejectReason} onChange={function(e) { setRejectReason(e.target.value) }}
          placeholder="Rejection reason (required to reject)..." rows={2}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--white)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
        <button onClick={reject} disabled={working || !rejectReason.trim()}
          style={{ width: '100%', padding: 11, borderRadius: 8, background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
          Reject Post
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {posts.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey-500)' }}>
          <CheckCircle size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
          No pending posts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(function(post) {
            return (
              <div key={post.id} className="card"
                onClick={function() { openPost(post) }}
                style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{post.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 3 }}>
                    {post.profiles?.name} - {post.category}
                    {post.is_premium ? ' - Premium' : ''}
                  </div>
                </div>
                <div style={{ color: 'var(--grey-500)', fontSize: 12, flexShrink: 0 }}>Review</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EditorActivity({ currentUser }) {
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(function() {
    supabase.from('editor_activity')
      .select('*, post:post_id(title)')
      .eq('editor_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(function(res) { setActivity(res.data || []); setLoading(false) })
      .catch(function() { setLoading(false) })
  }, [currentUser.id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>LOADING...</div>
  if (activity.length === 0) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey-500)' }}>No activity yet</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {activity.map(function(a) {
        return (
          <div key={a.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{a.action === 'approved' ? 'approved' : 'rejected'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.post?.title || 'Unknown'}</div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 2 }}>
                {a.action} - {new Date(a.created_at).toLocaleDateString('en-NG')}
              </div>
            </div>
            {a.action === 'approved' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ffb400', flexShrink: 0 }}>
                +{Number(a.earned).toFixed(1)}T
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
