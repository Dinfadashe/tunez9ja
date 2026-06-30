import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import ProfileEditor, { Avatar } from '../components/ProfileEditor.jsx'
import HalvingBanner from '../components/HalvingBanner.jsx'
import VerificationPanel from '../components/VerificationPanel.jsx'
import EditorApplication from '../components/EditorApplication.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import Sidebar from '../components/Sidebar.jsx'
import { StatusBadge, Modal, ConfirmModal, EmptyState } from '../components/UI.jsx'
import { BlogCopyrightAgreement, DMCANotice } from '../components/CopyrightCheckbox.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import MyLibrary   from '../components/MyLibrary.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import CoverImagePicker from '../components/CoverImagePicker.jsx'
import VideoUpload from '../components/VideoUpload.jsx'
import MyVideos from '../components/MyVideos.jsx'
import { LayoutDashboard, Newspaper, PenSquare, User, Trash2, Edit3, Eye, CheckCircle, Clock, XCircle, Video, Youtube, Coins, BookMarked, Shield, Pen, Link } from 'lucide-react'
import ReferralTab from '../components/ReferralTab.jsx'

const CATEGORIES = ['Music News','Album Review','Artist Spotlight','Entertainment','Culture','Events','Interviews','Opinion','Tutorials']


const GENRES = ['Afrobeats','Afropop','Highlife','Fuji','Juju','Gospel','Hip-Hop','R&B','Pop','Rap','Reggae','Dancehall','Amapiano','Bongo Flava','Afro-Soul','Jazz','Electronic','Alternative']


const NAV = [
  { key: 'overview',    label: 'Overview',      icon: LayoutDashboard },
  { key: 'my-posts',    label: 'My Posts',      icon: Newspaper       },
  { key: 'write',       label: 'Write Post',    icon: PenSquare       },
  { key: 'my-videos',   label: 'My Videos',     icon: Video           },
  { key: 'video-upload',label: 'Upload Video',  icon: Youtube         },
  { key: 'wallet',      label: 'TUNEZ Wallet',  icon: Coins           },
  { key: 'referral',    label: 'Referral',      icon: Link            },
  { key: 'library',     label: 'My Library',    icon: BookMarked      },
  { key: 'profile',     label: 'My Profile',    icon: User            },
  { key: 'editor',     label: 'Become Editor', icon: Pen             }, // label overridden dynamically
]

export default function BloggerDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive]     = useState('overview')
  const [editingPost, setEditingPost] = useState(null)
  const { currentUser, setCurrentUser } = useDashboard(propUser)

  if (!currentUser) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-300)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  const handleEdit = (post) => { setEditingPost(post); setActive('write') }

  return (
    <div className="dashboard-layout">
      <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          items={NAV.map(n => n.key === 'editor' ? { ...n, label: currentUser?.editor_status === 'approved' ? 'Editor Dashboard' : 'Become Editor' } : n)} activePage={active}
        setActivePage={(k) => { if (k !== 'write') setEditingPost(null); setActive(k) }}
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>BLOGGER PORTAL</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
              {editingPost && active === 'write' ? 'Edit Post' : NAV.find(n => n.key === active)?.label}
            </h1>
          </div>
        </div>
        <div className="dashboard-content">
          {active === 'overview' && <BloggerOverview setActive={setActive} currentUser={currentUser} />}
          {active === 'my-posts' && <MyPosts currentUser={currentUser} onEdit={handleEdit} />}
          {active === 'write'    && <WritePost currentUser={currentUser} editingPost={editingPost} onSuccess={() => { setActive('my-posts'); setEditingPost(null) }} />}
          {active === 'profile'     && <BloggerProfile currentUser={currentUser} setCurrentUser={setCurrentUser} />}
        {active === 'editor'    && <EditorApplication  currentUser={currentUser} onSwitchToEditor={() => { setPage('editor-dashboard') }} />}
          {active === 'my-videos'    && <MyVideos currentUser={currentUser} />}
          {active === 'video-upload'  && <VideoUpload currentUser={currentUser} onSuccess={() => setActive('my-videos')} />}
          {active === 'wallet'        && <TunezWallet currentUser={currentUser} />}
          {active === 'referral'      && <ReferralTab currentUser={currentUser} />}
          {active === 'library'       && <MyLibrary   currentUser={currentUser} />}
        </div>
      </main>
    </div>
  )
}

function BloggerOverview({ setActive, currentUser }) {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('blog_posts').select('id,title,category,cover_url,status,is_premium,tunez_price,created_at,view_count').eq('author_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [currentUser.id])

  const approved = posts.filter(p => p.status === 'approved')
  const pending  = posts.filter(p => p.status === 'pending')
  const rejected = posts.filter(p => p.status === 'rejected')

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,var(--bg-card),#0a0d1a)', border: '1px solid rgba(0,180,220,0.3)', borderRadius: 12, padding: 28, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#00b4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28 }}>{currentUser.name?.[0]}</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>{currentUser.name}</div>
          <div style={{ color: '#00b4dc', fontSize: 13, fontFamily: 'var(--font-mono)' }}>BLOGGER</div>
          {currentUser.bio && <div style={{ color: 'var(--grey-300)', fontSize: 14, marginTop: 4 }}>{currentUser.bio}</div>}
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setActive('write')}><PenSquare size={15} /> Write Post</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card" style={{ '--accent': '#00c864' }}><div className="stat-value">{approved.length}</div><div className="stat-label">Published</div><CheckCircle size={32} className="stat-icon" /></div>
        <div className="stat-card" style={{ '--accent': '#ffb400' }}><div className="stat-value">{pending.length}</div><div className="stat-label">Pending Review</div><Clock size={32} className="stat-icon" /></div>
        <div className="stat-card" style={{ '--accent': 'var(--red)' }}><div className="stat-value">{rejected.length}</div><div className="stat-label">Rejected</div><XCircle size={32} className="stat-icon" /></div>
        <div className="stat-card" style={{ '--accent': '#00b4dc' }}><div className="stat-value">{posts.length}</div><div className="stat-label">Total Posts</div><Newspaper size={32} className="stat-icon" /></div>
      </div>
      {!loading && posts.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20 }}>RECENT POSTS</h3>
          {posts.slice(0,5).map(p => (
            <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{p.category} · {p.created_at?.slice(0,10)}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {p.review_note && <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6, padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 4 }}>Admin note: {p.review_note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MyPosts({ currentUser, onEdit }) {
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [preview, setPreview]         = useState(null)

  const fetchPosts = async () => {
    const { data } = await supabase.from('blog_posts').select('id,title,category,cover_url,status,is_premium,tunez_price,created_at,view_count').eq('author_id', currentUser.id).order('created_at', { ascending: false })
    setPosts(data || []); setLoading(false)
  }
  useEffect(() => { fetchPosts() }, [currentUser.id])
  const handleDelete = async (id) => { await supabase.from('blog_posts').delete().eq('id', id); fetchPosts() }

  if (loading) return <div style={{ color: 'var(--grey-300)', padding: 40, textAlign: 'center' }}>Loading posts...</div>

  return (
    <div>
      {posts.length === 0
        ? <EmptyState icon={<Newspaper size={48} />} title="No posts yet" message="Write your first post to get started." />
        : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.excerpt}</div>
                      </td>
                      <td><span className="badge badge-blog">{p.category}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)' }}>{p.created_at?.slice(0,10)}</td>
                      <td>
                        <StatusBadge status={p.status} />
                        {p.review_note && <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 4 }}>📝 {p.review_note}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost" onClick={() => setPreview(p)} style={{ padding: '6px' }}><Eye size={15} /></button>
                          {(p.status === 'pending' || p.status === 'rejected') && (
                            <button className="btn btn-ghost" onClick={() => onEdit(p)} style={{ padding: '6px', color: '#00b4dc' }}><Edit3 size={15} /></button>
                          )}
                          <button className="btn btn-danger" onClick={() => setConfirmDelete(p.id)} style={{ padding: '6px' }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Post Preview">
        {preview && (
          <div>
            
      {/* Test phase limits banner */}
      <div style={{ padding: '12px 18px', background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 10, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🚀</span>
        <div>
          <strong style={{ color: '#ffb400' }}>Test Phase Active</strong>
          <div style={{ color: 'var(--grey-300)', marginTop: 3, lineHeight: 1.6 }}>
            Upload limits are in place during our test phase: <strong>12 posts · 6 videos</strong>. 
            Reach your verification milestone and get your 🔵 blue tick to unlock unlimited uploads.
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}><span className="badge badge-blog">{preview.category}</span></div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10 }}>{preview.title}</h3>
            <div style={{ fontSize: 13, color: 'var(--grey-300)', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>{preview.created_at?.slice(0,10)}</span><StatusBadge status={preview.status} />
            </div>
            <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>{preview.excerpt}</p>
            {preview.content && <p style={{ color: 'var(--grey-500)', fontSize: 14, marginTop: 12, lineHeight: 1.7 }}>{preview.content}</p>}
            {preview.review_note && (
              <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: 14, marginTop: 16 }}>
                <strong style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>ADMIN FEEDBACK:</strong>
                <p style={{ fontSize: 14, marginTop: 6 }}>{preview.review_note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete)} title="Delete Post" message="Remove this post permanently?" danger />
    </div>
  )
}

function WritePost({ currentUser, onSuccess, editingPost }) {
  const [form, setForm] = useState(editingPost ? {
    title:    editingPost.title,
    category: editingPost.category,
    excerpt:  editingPost.excerpt,
    content:  editingPost.content,
    tags:     editingPost.tags?.join(', ') || '',
    cover_url: editingPost.cover_url || '',
    is_premium: editingPost.is_premium || false,
    tunez_price: editingPost.tunez_price || '',
  } : { title: '', category: '', excerpt: '', content: '', tags: '', cover_url: '', is_premium: false, tunez_price: '' })
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.category || !form.excerpt || !form.content) {
      setMessage('❌ Please fill all required fields'); return
    }
    if (!copyrightAgreed) {
      setMessage('❌ Please confirm the originality declaration before submitting'); return
    }
    setLoading(true); setMessage('')
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { ...form, tags, cover_url: form.cover_url || null, author_id: currentUser.id, status: 'pending', is_premium: form.is_premium, tunez_price: form.is_premium ? parseFloat(form.tunez_price) || null : null }

    // Upload limit check (test phase)
    if (!editingPost) {
      const isVerified = currentUser?.verified_type === 'milestone' || currentUser?.is_verified
      if (!isVerified) {
        const { count } = await supabase.from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', currentUser.id)
        if (count >= 10) {
          setError('❌ Test phase limit: max 10 posts. Get verified to publish more.')
          setSaving(false); return
        }
      }
    }

    let error
    if (editingPost) {
      const res = await supabase.from('blog_posts').update({ ...payload, slug: null }).eq('id', editingPost.id)
      error = res.error
    } else {
      // Duplicate check
      const { data: dup } = await supabase.from('blog_posts')
        .select('id').eq('author_id', currentUser.id).ilike('title', payload.title.trim()).limit(1)
      if (dup?.length > 0) {
        setError('❌ Duplicate: You already have a post with this title.')
        setSaving(false); return
      }
      const res = await supabase.from('blog_posts').insert(payload)
      error = res.error
      if (!error) {
        supabase.rpc('notify_followers', {
          p_author_id: currentUser.id,
          p_message: currentUser.name + ' published a new post: ' + payload.title
        }).then(() => {}).catch(() => {})
      }
    }

    setLoading(false)
    if (error) { setMessage('❌ ' + error.message); return }
    setMessage('✅ ' + (editingPost ? 'Post updated and resubmitted for review!' : 'Post submitted for review!'))
    setTimeout(() => onSuccess(), 1500)
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ background: 'rgba(0,180,220,0.08)', border: '1px solid rgba(0,180,220,0.25)', borderRadius: 8, padding: 14, marginBottom: 24, fontSize: 13, lineHeight: 1.6 }}>
        📝 {editingPost ? 'Editing will re-submit the post for admin review.' : 'All posts require admin approval before appearing on the blog.'}
      </div>
      {message && (
        <div style={{ background: message.startsWith('✅') ? 'rgba(0,200,100,0.1)' : 'var(--red-glow)', border: `1px solid ${message.startsWith('✅') ? 'rgba(0,200,100,0.3)' : 'var(--border-red)'}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {message}
        </div>
      )}
      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Post Title *</label>
            <input className="form-control" placeholder="e.g. Top 10 Afrobeats Songs of 2025" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-control" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cover Image</label>
            <CoverImagePicker
              value={form.cover_url}
              onChange={url => setForm(p => ({ ...p, cover_url: url }))}
              postContent={form.content}
            />
            <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 8, fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
              Upload a cover or pick any image you've added inside your article
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Excerpt / Summary *</label>
            <textarea className="form-control" rows={3} placeholder="A compelling 1–2 sentence summary shown on the blog listing..." value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Full Article Content *</label>
            <RichTextEditor
              value={form.content}
              onChange={val => setForm(p => ({ ...p, content: val }))}
              placeholder="Write your full original article here..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-control" placeholder="e.g. afrobeats, wizkid, 2025" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>

          {/* ── PREMIUM TOGGLE ── */}
          <div style={{ background: 'var(--bg-surface)', border: `1px solid ${form.is_premium ? 'rgba(255,180,0,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: form.is_premium ? 14 : 0 }}>
              <div onClick={() => setForm(p => ({ ...p, is_premium: !p.is_premium }))}
                style={{ width: 44, height: 24, borderRadius: 12, background: form.is_premium ? '#ffb400' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, left: form.is_premium ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Premium Post</div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>Charge TUNEZ tokens to read this post</div>
              </div>
            </label>
            {form.is_premium && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">TUNEZ Price (suggested: 10–100)</label>
                <input className="form-control" type="number" min="1" max="500" placeholder="e.g. 30"
                  value={form.tunez_price} onChange={e => setForm(p => ({ ...p, tunez_price: e.target.value }))} />
                <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 6 }}>
                  You earn 70% · Admin earns 30% of each unlock
                </div>
              </div>
            )}
          </div>

          {/* ── COPYRIGHT DECLARATION ── */}
          <BlogCopyrightAgreement agreed={copyrightAgreed} onChange={setCopyrightAgreed} />

          <button className="btn btn-primary" type="submit"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: copyrightAgreed ? 1 : 0.65 }}
            disabled={loading || !copyrightAgreed}>
            {loading ? 'Submitting...' : editingPost ? '✅ Update & Resubmit' : '📝 Submit for Review'}
          </button>

          {/* ── DMCA NOTICE ── */}
          <DMCANotice />
        </form>
      </div>
    </div>
  )
}

function BloggerProfile({ currentUser, setCurrentUser }) {
  return (
    <ProfileEditor
      currentUser={currentUser}
      onUpdated={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
    />
  )
}

