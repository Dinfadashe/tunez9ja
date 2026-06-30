import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import Sidebar from '../components/Sidebar.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import { LayoutDashboard, Newspaper, Coins, User, Eye, CheckCircle, XCircle, Link } from 'lucide-react'
import ReferralTab from '../components/ReferralTab.jsx'

const NAV = [
  { key: 'overview', label: 'Overview',     icon: LayoutDashboard },
  { key: 'review',   label: 'Review Posts', icon: Newspaper },
  { key: 'activity', label: 'My Activity',  icon: Eye },
  { key: 'wallet',   label: 'TUNEZ Wallet', icon: Coins },
  { key: 'referral', label: 'Referral',     icon: Link  },
  { key: 'profile',  label: 'My Profile',   icon: User },
]

function calcEditorEarning(price) {
  return Math.round(price * 15) / 100
}

export default function EditorDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const [freshUser, setFreshUser] = useState(null)

  useEffect(function() {
    if (!propUser || !propUser.id) return
    supabase.from('profiles').select('*').eq('id', propUser.id).single()
      .then(function(res) { if (res.data) setFreshUser(res.data) })
  }, [propUser && propUser.id])

  var user = freshUser || propUser

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  if (user.editor_status !== 'approved') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>LOCKED</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'white', marginBottom: 8 }}>NOT AUTHORISED</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 14, marginBottom: 4 }}>
          Status: {user.editor_status || 'not applied'}
        </p>
        <button onClick={function() { setPage('home') }} className="btn btn-primary" style={{ marginTop: 20 }}>
          Go Home
        </button>
      </div>
    </div>
  )

  return (
    <div className="dashboard-layout">
      <Sidebar
        items={NAV}
        activePage={active}
        setActivePage={function(key) { setActive(key); setSidebarOpen(false) }}
        setPage={setPage}
        currentUser={user}
        onRoleSwitch={onRoleSwitch}
        isOpen={sidebarOpen}
        onClose={function() { setSidebarOpen(false) }}
      />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={function() { setSidebarOpen(function(o) { return !o }) }}
              className="dashboard-menu-toggle"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
              &#9776;
            </button>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>EDITOR PORTAL</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0 }}>
                {NAV.find(function(n) { return n.key === active }) ? NAV.find(function(n) { return n.key === active }).label : ''}
              </h1>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview' && <Overview user={user} setActive={setActive} />}
          {active === 'review'   && <ReviewPosts user={user} />}
          {active === 'activity' && <Activity user={user} />}
          {active === 'wallet'   && <TunezWallet currentUser={user} />}
          {active === 'referral' && <ReferralTab currentUser={user} />}
          {active === 'profile'  && <ProfileEditor currentUser={user} onUpdated={function(u) { setFreshUser(function(p) { return Object.assign({}, p, u) }) }} />}
        </div>
      </main>
    </div>
  )
}

function Overview({ user, setActive }) {
  var [pending, setPending] = useState(0)
  useEffect(function() {
    supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(function(r) { setPending(r.count || 0) })
  }, [])
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #00b4dc' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{user.editor_posts_reviewed || 0}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 6 }}>POSTS REVIEWED</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #ffb400' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{Number(user.editor_total_earned || 0).toFixed(0)}T</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 6 }}>TUNEZ EARNED</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid var(--red)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{pending}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-500)', letterSpacing: 2, marginTop: 6 }}>PENDING</div>
        </div>
      </div>
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.8, margin: 0 }}>
          Earn 5 TUNEZ per free post and 15% of price for premium posts. Approved posts go live immediately.
        </p>
      </div>
      <button onClick={function() { setActive('review') }} className="btn btn-primary">
        Review Pending Posts ({pending})
      </button>
    </div>
  )
}

function ReviewPosts({ user }) {
  var [posts, setPosts]   = useState([])
  var [loading, setLoading] = useState(true)
  var [selected, setSelected] = useState(null)
  var [title, setTitle]   = useState('')
  var [content, setContent] = useState('')
  var [editing, setEditing] = useState(false)
  var [reason, setReason] = useState('')
  var [msg, setMsg]       = useState('')
  var [busy, setBusy]     = useState(false)

  function load() {
    setLoading(true)
    supabase.from('blog_posts')
      .select('*, profiles:author_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(function(r) { setPosts(r.data || []); setLoading(false) })
  }
  useEffect(function() { load() }, [])

  function open(post) {
    setSelected(post)
    setTitle(post.title)
    setContent(post.content || '')
    setEditing(false)
    setReason('')
    setMsg('')
  }

  function save() {
    supabase.from('blog_posts').update({ title: title, content: content }).eq('id', selected.id)
      .then(function(r) {
        if (r.error) { setMsg('Save failed: ' + r.error.message); return }
        setSelected(Object.assign({}, selected, { title: title, content: content }))
        setEditing(false)
        setMsg('Edits saved.')
      })
  }

  function approve() {
    setBusy(true)
    supabase.rpc('editor_approve_post', { p_editor_id: user.id, p_post_id: selected.id })
      .then(function(r) {
        setBusy(false)
        if (r.error) { setMsg('Error: ' + r.error.message); return }
        var earned = r.data && r.data.earned ? Number(r.data.earned).toFixed(1) : '0.0'
        setMsg('Post approved and live! Earned ' + earned + 'T')
        setPosts(function(p) { return p.filter(function(x) { return x.id !== selected.id }) })
        setTimeout(function() { setSelected(null) }, 2000)
      })
  }

  var rejectBtnStyle = {
    width: '100%', padding: 12, borderRadius: 8,
    background: 'transparent', cursor: 'pointer', fontSize: 13,
    border: '1px solid #c8102e', color: '#c8102e'
  }

  function reject() {
    if (!reason.trim()) { setMsg('Enter rejection reason first'); return }
    setBusy(true)
    supabase.rpc('editor_reject_post', { p_editor_id: user.id, p_post_id: selected.id, p_reason: reason.trim() })
      .then(function() {
        setBusy(false)
        setMsg('Post rejected. Blogger notified.')
        setPosts(function(p) { return p.filter(function(x) { return x.id !== selected.id }) })
        setTimeout(function() { setSelected(null) }, 1500)
      })
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>LOADING...</div>
  )

  if (selected) {
    var earnLabel = selected.is_premium ? (calcEditorEarning(selected.tunez_price).toFixed(1) + 'T') : '5T'
    var rejectDisabled = busy || reason.trim().length === 0
    var rejectOpacity = reason.trim().length > 0 ? 1 : 0.6
    var msgIsError = msg.indexOf('Error') !== -1
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={function() { setSelected(null) }} className="btn btn-secondary">Back</button>
          <button onClick={function() { setEditing(function(e) { return !e }) }} className="btn btn-secondary">
            {editing ? 'Preview' : 'Edit Post'}
          </button>
        </div>

        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: msgIsError ? 'rgba(200,16,46,0.08)' : 'rgba(0,200,100,0.08)',
            border: '1px solid ' + (msgIsError ? 'var(--red)' : '#00c864'),
            color: msgIsError ? 'var(--red)' : '#00c864'
          }}>{msg}</div>
        )}

        {editing ? (
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 6 }}>TITLE</label>
              <input value={title} onChange={function(e) { setTitle(e.target.value) }}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'white', fontSize: 15, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1, marginBottom: 6 }}>CONTENT</label>
              <textarea value={content} onChange={function(e) { setContent(e.target.value) }} rows={18}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'white', fontSize: 13, lineHeight: 1.8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <button onClick={save} className="btn btn-primary">Save Edits</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 28, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 2, marginBottom: 8 }}>
              {selected.category} - by {selected.profiles ? selected.profiles.name : ''}
              {selected.is_premium ? '  PREMIUM ' + selected.tunez_price + 'T' : ''}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 16 }}>{title}</h2>
            {selected.cover_url && (
              <img src={selected.cover_url} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} alt="" />
            )}
            <div style={{ fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}

        <div className="card" style={{ padding: 20 }}>
          <button onClick={approve} disabled={busy} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 14, marginBottom: 12, background: '#00c864', borderColor: '#00c864' }}>
            {busy ? 'Processing...' : 'Approve and Publish (earn ' + earnLabel + ')'}
          </button>
          <textarea value={reason} onChange={function(e) { setReason(e.target.value) }}
            placeholder="Rejection reason (required to reject)..." rows={2}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'white', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
          <button onClick={reject} disabled={rejectDisabled}
            style={{ width: '100%', padding: 12, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13, border: '1px solid #c8102e', color: '#c8102e', opacity: rejectOpacity }}>
            Reject Post
          </button>
        </div>
      </div>
    )
  }

  if (posts.length === 0) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey-500)' }}>
      <CheckCircle size={40} style={{ display: 'block', margin: '0 auto 12px' }} />
      <div>No pending posts - all clear!</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {posts.map(function(post) {
        return (
          <div key={post.id} className="card" onClick={function() { open(post) }}
            style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
            {post.cover_url && (
              <img src={post.cover_url} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} alt="" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
              <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 3 }}>
                {post.profiles ? post.profiles.name : ''} - {post.category}
                {post.is_premium ? ' - Premium' : ''}
              </div>
            </div>
            <div style={{ color: 'var(--grey-500)', fontSize: 12, flexShrink: 0 }}>Review</div>
          </div>
        )
      })}
    </div>
  )
}

function Activity({ user }) {
  var [items, setItems]   = useState([])
  var [loading, setLoading] = useState(true)
  useEffect(function() {
    supabase.from('editor_activity').select('*, post:post_id(title)').eq('editor_id', user.id)
      .order('created_at', { ascending: false }).limit(50)
      .then(function(r) { setItems(r.data || []); setLoading(false) })
      .catch(function() { setLoading(false) })
  }, [user.id])
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>LOADING...</div>
  )
  if (items.length === 0) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey-500)' }}>No activity yet. Start reviewing posts!</div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(function(a) {
        return (
          <div key={a.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{a.action === 'approved' ? 'OK' : 'X'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.post ? a.post.title : 'Unknown post'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 2 }}>
                {a.action} - {new Date(a.created_at).toLocaleDateString('en-NG')}
              </div>
            </div>
            {a.action === 'approved' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ffb400', flexShrink: 0 }}>
                +{Number(a.earned || 0).toFixed(1)}T
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
