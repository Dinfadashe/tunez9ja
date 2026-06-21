import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useDashboard } from '../hooks/useDashboard.js'
import { CATEGORIES } from '../context/AppContext.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { StatusBadge, Modal, ConfirmModal, EmptyState } from '../components/UI.jsx'
import { BlogCopyrightAgreement, DMCANotice } from '../components/CopyrightCheckbox.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import CoverImagePicker from '../components/CoverImagePicker.jsx'
import VideoUpload from '../components/VideoUpload.jsx'
import MyVideos from '../components/MyVideos.jsx'
import { LayoutDashboard, Newspaper, PenSquare, User, Trash2, Edit3, Eye, CheckCircle, Clock, XCircle, Video, Youtube } from 'lucide-react'

const NAV = [
  { key: 'overview',    label: 'Overview',      icon: LayoutDashboard },
  { key: 'my-posts',    label: 'My Posts',      icon: Newspaper       },
  { key: 'write',       label: 'Write Post',    icon: PenSquare       },
  { key: 'my-videos',   label: 'My Videos',     icon: Video           },
  { key: 'video-upload',label: 'Upload Video',  icon: Youtube         },
  { key: 'profile',     label: 'My Profile',    icon: User            },
]

export default function BloggerDashboard({ setPage, currentUser: propUser, onRoleSwitch }) {
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
      <Sidebar items={NAV} activePage={active}
        setActivePage={(k) => { if (k !== 'write') setEditingPost(null); setActive(k) }}
        setPage={setPage} currentUser={currentUser} onRoleSwitch={onRoleSwitch} />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>BLOGGER PORTAL</span>
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
          {active === 'my-videos'    && <MyVideos currentUser={currentUser} />}
          {active === 'video-upload'  && <VideoUpload currentUser={currentUser} onSuccess={() => setActive('my-videos')} />}
        </div>
      </main>
    </div>
  )
}

function BloggerOverview({ setActive, currentUser }) {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('blog_posts').select('*').eq('author_id', currentUser.id)
      .order('created_at', { ascending: false })
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
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{p.category} Â· {p.created_at?.slice(0,10)}</div>
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
    const { data } = await supabase.from('blog_posts').select('*').eq('author_id', currentUser.id).order('created_at', { ascending: false })
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
                        {p.review_note && <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 4 }}>ðŸ“ {p.review_note}</div>}
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
  } : { title: '', category: '', excerpt: '', content: '', tags: '', cover_url: '' })
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.category || !form.excerpt || !form.content) {
      setMessage('âŒ Please fill all required fields'); return
    }
    if (!copyrightAgreed) {
      setMessage('âŒ Please confirm the originality declaration before submitting'); return
    }
    setLoading(true); setMessage('')
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { ...form, tags, cover_url: form.cover_url || null, author_id: currentUser.id, status: 'pending' }

    let error
    if (editingPost) {
      const res = await supabase.from('blog_posts').update({ ...payload, slug: null }).eq('id', editingPost.id)
      error = res.error
    } else {
      const res = await supabase.from('blog_posts').insert(payload)
      error = res.error
    }

    setLoading(false)
    if (error) { setMessage('âŒ ' + error.message); return }
    setMessage('âœ… ' + (editingPost ? 'Post updated and resubmitted for review!' : 'Post submitted for review!'))
    setTimeout(() => onSuccess(), 1500)
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ background: 'rgba(0,180,220,0.08)', border: '1px solid rgba(0,180,220,0.25)', borderRadius: 8, padding: 14, marginBottom: 24, fontSize: 13, lineHeight: 1.6 }}>
        ðŸ“ {editingPost ? 'Editing will re-submit the post for admin review.' : 'All posts require admin approval before appearing on the blog.'}
      </div>
      {message && (
        <div style={{ background: message.startsWith('âœ…') ? 'rgba(0,200,100,0.1)' : 'var(--red-glow)', border: `1px solid ${message.startsWith('âœ…') ? 'rgba(0,200,100,0.3)' : 'var(--border-red)'}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
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
            <textarea className="form-control" rows={3} placeholder="A compelling 1â€“2 sentence summary shown on the blog listing..." value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} required />
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

          {/* â”€â”€ COPYRIGHT DECLARATION â”€â”€ */}
          <BlogCopyrightAgreement agreed={copyrightAgreed} onChange={setCopyrightAgreed} />

          <button className="btn btn-primary" type="submit"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: copyrightAgreed ? 1 : 0.6 }}
            disabled={loading || !copyrightAgreed}>
            {loading ? 'Submitting...' : editingPost ? 'âœ… Update & Resubmit' : 'ðŸ“ Submit for Review'}
          </button>

          {/* â”€â”€ DMCA NOTICE â”€â”€ */}
          <DMCANotice />
        </form>
      </div>
    </div>
  )
}

function BloggerProfile({ currentUser, setCurrentUser }) {
  const [form, setForm]       = useState({ name: currentUser.name || '', bio: currentUser.bio || '' })
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true)
    const { data } = await supabase.from('profiles').update(form).eq('id', currentUser.id).select().single()
    if (data) setCurrentUser(prev => ({ ...prev, ...data }))
    setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#00b4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 32 }}>{currentUser.name?.[0]}</div>
          <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>{currentUser.name}</div><div style={{ color: '#00b4dc', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>BLOGGER</div></div>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Display Name</label><input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Bio</label><textarea className="form-control" rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell readers about yourself..." /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-control" value={currentUser.email} disabled style={{ opacity: 0.5 }} /></div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: 13 }} disabled={loading}>{saved ? 'âœ… Saved!' : loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  )
}
