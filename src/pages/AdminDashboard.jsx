import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import Sidebar from '../components/Sidebar.jsx'
import { Avatar, StatusBadge, Modal, ConfirmModal, EmptyState, SearchBar, MusicArt } from '../components/UI.jsx'
import { RejectMusicModal, RejectPostModal } from '../components/RejectModal.jsx'
import TunezWallet from '../components/TunezWallet.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import AdminAnalytics from '../components/AdminAnalytics.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { StatusBadge as _SB } from '../components/UI.jsx'
import { LayoutDashboard, Music, Newspaper, Users, CheckCircle, XCircle, Clock, Trash2, Eye, TrendingUp, Mic2, AlertCircle, Video, Youtube, Coins, Disc, BarChart2, Shield } from 'lucide-react'

const NAV = (pending) => [
  { key: 'overview',      label: 'Overview',       icon: LayoutDashboard },
  { key: 'music-review',  label: 'Music Review',   icon: Music,      badge: pending.music || null },
  { key: 'posts-review',  label: 'Blog Review',    icon: Newspaper,  badge: pending.posts || null },
  { key: 'video-review',  label: 'Video Review',   icon: Video,      badge: pending.videos || null },
  { key: 'users',         label: 'Manage Users',   icon: Users },
  { key: 'analytics',     label: 'Analytics',       icon: BarChart2, badge: null },
  { key: 'kyc-review',    label: 'KYC Review 🔵',   icon: Shield,    badge: null },
  { key: 'editor-review', label: 'Editor Review', icon: Newspaper, badge: null },
  { key: 'album-review',  label: 'Albums',          icon: Disc,  badge: null },
  { key: 'wallet',        label: 'TUNEZ Earnings',  icon: Coins, badge: null },
]

export default function AdminDashboard({ setPage, currentUser: propUser, setCurrentUser: propSetUser, onRoleSwitch }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive]           = useState('overview')
  const [currentUser, setCurrentUser] = useState(null)
  const [pending, setPending]         = useState({ music: 0, posts: 0 })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single()
        setCurrentUser(profile)
      }
    })
    fetchPending()
  }, [])

  const fetchPending = async () => {
    const [{ count: music }, { count: posts }, { count: videos }] = await Promise.all([
      supabase.from('music_tracks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('blog_posts').select('*',   { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('videos').select('*',       { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setPending({ music: music || 0, posts: posts || 0, videos: videos || 0 })
  }

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
          items={NAV(pending)} activePage={active} setActivePage={setActive} setPage={setPage} currentUser={currentUser} onRoleSwitch={onRoleSwitch} />
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 2 }}>ADMIN PORTAL</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
              {NAV(pending).find(n => n.key === active)?.label}
            </h1>
          </div>
          {pending.music + pending.posts > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}>
              <AlertCircle size={14} color="var(--red)" />
              {pending.music + pending.posts} items awaiting review
            </div>
          )}
        </div>
        <div className="dashboard-content">
          {active === 'overview'     && <AdminOverview setActive={setActive} fetchPending={fetchPending} />}
          {active === 'music-review' && <MusicReview fetchPending={fetchPending} />}
          {active === 'posts-review' && <PostsReview fetchPending={fetchPending} />}
          {active === 'users'        && <UsersPanel />}
          {active === 'video-review'  && <VideoReview fetchPending={fetchPending} />}
          {active === 'wallet'        && <TunezWallet currentUser={currentUser} />}
          {active === 'analytics'      && <AdminAnalytics />}
          {active === 'kyc-review'    && <KYCReview />}
          {active === 'editor-review' && <EditorReview />}
          {active === 'album-review'   && <AlbumReview />}
        </div>
      </main>
    </div>
  )
}

function AdminOverview({ setActive, fetchPending }) {
  const [stats, setStats] = useState({})
  const [recentMusic, setRecentMusic] = useState([])
  const [recentPosts, setRecentPosts]  = useState([])

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalArtists },
        { count: totalBloggers },
        { count: totalTracks },
        { count: pendingTracks },
        { count: approvedTracks },
        { count: totalPosts },
        { count: pendingPosts },
        { count: approvedPosts },
        { data: music },
        { data: posts },
      ] = await Promise.all([
        supabase.from('profiles').select('*',     { count: 'exact', head: true }).eq('role', 'artist'),
        supabase.from('profiles').select('*',     { count: 'exact', head: true }).eq('role', 'blogger'),
        supabase.from('music_tracks').select('*', { count: 'exact', head: true }),
        supabase.from('music_tracks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('music_tracks').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('blog_posts').select('*',   { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*',   { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('blog_posts').select('*',   { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('music_tracks').select('id,title,artist_id,status').order('created_at', { ascending: false }).limit(4),
        supabase.from('blog_posts').select('id,title,author_id,status,created_at').order('created_at', { ascending: false }).limit(4),
      ])
      setStats({ totalArtists, totalBloggers, totalTracks, pendingTracks, approvedTracks, totalPosts, pendingPosts, approvedPosts })
      setRecentMusic(music || [])
      setRecentPosts(posts || [])
    }
    load()
  }, [])

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card" style={{ '--accent': 'var(--red)' }}>
          <div className="stat-value">{stats.totalArtists ?? '—'}</div>
          <div className="stat-label">Artists</div>
          <Mic2 size={32} className="stat-icon" />
        </div>
        <div className="stat-card" style={{ '--accent': '#00b4dc' }}>
          <div className="stat-value">{stats.totalBloggers ?? '—'}</div>
          <div className="stat-label">Bloggers</div>
          <Newspaper size={32} className="stat-icon" />
        </div>
        <div className="stat-card" style={{ '--accent': '#ffb400' }}>
          <div className="stat-value">{(stats.pendingTracks ?? 0) + (stats.pendingPosts ?? 0)}</div>
          <div className="stat-label">Pending Review</div>
          <Clock size={32} className="stat-icon" />
        </div>
        <div className="stat-card" style={{ '--accent': '#00c864' }}>
          <div className="stat-value">{(stats.approvedTracks ?? 0) + (stats.approvedPosts ?? 0)}</div>
          <div className="stat-label">Published</div>
          <CheckCircle size={32} className="stat-icon" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>RECENT MUSIC</h3>
            <button className="btn btn-ghost" onClick={() => setActive('music-review')} style={{ fontSize: 13 }}>View all →</button>
          </div>
          {recentMusic.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <MusicArt title={m.title} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>RECENT POSTS</h3>
            <button className="btn btn-ghost" onClick={() => setActive('posts-review')} style={{ fontSize: 13 }}>View all →</button>
          </div>
          {recentPosts.map(p => (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{p.title}</div>
                <StatusBadge status={p.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey-300)', marginTop: 4 }}>{p.created_at?.slice(0,10)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MusicReview({ fetchPending }) {
  const [tracks, setTracks]           = useState([])
  const [filter, setFilter]           = useState('pending')
  const [search, setSearch]           = useState('')
  const [preview, setPreview]         = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectPostModal, setRejectPostModal] = useState(null)
  const [rejectNote, setRejectNote]   = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchTracks = async () => {
    let q = supabase.from('v_admin_music_queue').select('*')
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setTracks(data || [])
  }

  useEffect(() => { fetchTracks() }, [filter])

  const filtered = tracks.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.artist_name?.toLowerCase().includes(search.toLowerCase())
  )

  const approve = async (m) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('music_tracks').update({ status: 'approved', review_note: null, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', m.id)
    fetchTracks(); fetchPending()
  }

  const reject = async (m, note) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('music_tracks').update({ status: 'rejected', review_note: note, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', m.id)
    fetchTracks(); fetchPending()
  }

  const remove = async (id) => {
    await supabase.from('music_tracks').delete().eq('id', id)
    fetchTracks(); fetchPending()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px' }}><SearchBar value={search} onChange={setSearch} placeholder="Search tracks..." /></div>
        <div className="tabs" style={{ margin: 0, border: 'none', gap: 4 }}>
          {['pending','approved','rejected','all'].map(f => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '8px 14px', textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Music size={48} />} title="No tracks here" message="Nothing matches the current filter." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Track</th><th>Artist</th><th>Genre</th><th>Uploaded</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MusicArt title={m.title} size={40} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{m.duration}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 14 }}>{m.artist_name}</td>
                    <td><span className="badge badge-music">{m.genre}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)' }}>{m.created_at?.slice(0,10)}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => setPreview(m)} style={{ padding: '6px' }}><Eye size={15} /></button>
                        {m.status === 'pending' && <>
                          <button className="btn" onClick={() => approve(m)} style={{ padding: '6px 10px', background: 'rgba(0,200,100,0.1)', color: '#00c864', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 4 }}><CheckCircle size={15} /></button>
                          <button className="btn" onClick={() => { setRejectModal(m); setRejectNote('') }} style={{ padding: '6px 10px', background: 'var(--red-glow)', color: 'var(--red)', border: '1px solid var(--border-red)', borderRadius: 4 }}><XCircle size={15} /></button>
                        </>}
                        {m.status === 'rejected' && (
                          <button className="btn" onClick={() => approve(m)} style={{ padding: '6px 10px', background: 'rgba(0,200,100,0.1)', color: '#00c864', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 4 }}><CheckCircle size={15} /></button>
                        )}
                        <button className="btn btn-danger" onClick={() => setConfirmDelete(m.id)} style={{ padding: '6px' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''}>
        {preview && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <MusicArt title={preview.title} size={80} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{preview.title}</div>
                <div style={{ color: 'var(--red)', fontSize: 14, margin: '4px 0' }}>{preview.artist_name}</div>
                <div style={{ display: 'flex', gap: 8 }}><span className="badge badge-music">{preview.genre}</span><StatusBadge status={preview.status} /></div>
              </div>
            </div>
            {preview.description && <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>{preview.description}</p>}
            {preview.review_note && <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: 12, marginTop: 16, fontSize: 13 }}><strong>Review note:</strong> {preview.review_note}</div>}
            {preview.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { approve(preview); setPreview(null) }}><CheckCircle size={15} /> Approve</button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setRejectModal(preview); setPreview(null) }}><XCircle size={15} /> Reject</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <RejectMusicModal
        open={!!rejectModal}
        track={rejectModal}
        onClose={() => setRejectModal(null)}
        onReject={(track, note) => reject(track, note)}
      />

      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} title="Delete Track" message="Permanently remove this track?" danger />
    </div>
  )
}

function PostsReview({ fetchPending }) {
  const [posts, setPosts]             = useState([])
  const [filter, setFilter]           = useState('pending')
  const [search, setSearch]           = useState('')
  const [preview, setPreview]         = useState(null)
  const [editModal, setEditModal]     = useState(null)   // post being edited
  const [rejectModal, setRejectModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchPosts = async () => {
    let q = supabase.from('v_admin_post_queue').select('*')
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setPosts(data || [])
  }
  useEffect(() => { fetchPosts() }, [filter])

  const filtered = posts.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(search.toLowerCase())
  )

  const approve = async (p) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('blog_posts').update({ status: 'approved', review_note: null, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', p.id)
    fetchPosts(); fetchPending()
  }

  const reject = async (p, note) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('blog_posts').update({ status: 'rejected', review_note: note, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', p.id)
    fetchPosts(); fetchPending()
  }

  const remove = async (id) => {
    await supabase.from('blog_posts').delete().eq('id', id)
    fetchPosts(); fetchPending()
  }

  const saveEdit = async (id, updated) => {
    await supabase.from('blog_posts').update(updated).eq('id', id)
    fetchPosts()
    setEditModal(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px' }}><SearchBar value={search} onChange={setSearch} placeholder="Search posts..." /></div>
        <div className="tabs" style={{ margin: 0, border: 'none', gap: 4 }}>
          {['pending','approved','rejected','all'].map(f => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '8px 14px', textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Newspaper size={48} />} title="No posts here" message="Nothing matches the current filter." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.excerpt}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={p.author_name} size={28} />{p.author_name}
                      </div>
                    </td>
                    <td><span className="badge badge-blog">{p.category}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)' }}>{p.created_at?.slice(0,10)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => setPreview(p)} style={{ padding: '6px' }} title="Preview"><Eye size={15} /></button>
                        <button className="btn btn-ghost" onClick={() => setEditModal(p)} style={{ padding: '6px', color: '#00b4dc' }} title="Edit post">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {p.status === 'pending' && <>
                          <button className="btn" onClick={() => approve(p)} style={{ padding: '6px 10px', background: 'rgba(0,200,100,0.1)', color: '#00c864', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 4 }} title="Approve"><CheckCircle size={15} /></button>
                          <button className="btn" onClick={() => setRejectModal(p)} style={{ padding: '6px 10px', background: 'var(--red-glow)', color: 'var(--red)', border: '1px solid var(--border-red)', borderRadius: 4 }} title="Reject"><XCircle size={15} /></button>
                        </>}
                        {p.status === 'rejected' && (
                          <button className="btn" onClick={() => approve(p)} style={{ padding: '6px 10px', background: 'rgba(0,200,100,0.1)', color: '#00c864', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 4 }}><CheckCircle size={15} /></button>
                        )}
                        {p.status === 'approved' && (
                          <button className="btn" onClick={() => setEditModal(p)} style={{ padding: '6px 10px', background: 'rgba(0,180,220,0.1)', color: '#00b4dc', border: '1px solid rgba(0,180,220,0.3)', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>EDIT</button>
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

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Post Preview">
        {preview && (
          <div>
            <span className="badge badge-blog" style={{ marginBottom: 12, display: 'inline-block' }}>{preview.category}</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10 }}>{preview.title}</h3>
            <div style={{ fontSize: 13, color: 'var(--grey-300)', marginBottom: 16, display: 'flex', gap: 16 }}>
              <span>By {preview.author_name}</span><span>{preview.created_at?.slice(0,10)}</span><StatusBadge status={preview.status} />
            </div>
            <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7 }}>{preview.excerpt}</p>
            {preview.content && <p style={{ color: 'var(--grey-500)', fontSize: 14, marginTop: 12, lineHeight: 1.7 }}>{preview.content}</p>}
            {preview.review_note && <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: 12, marginTop: 16, fontSize: 13 }}><strong>Review note:</strong> {preview.review_note}</div>}
            {preview.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { approve(preview); setPreview(null) }}><CheckCircle size={15} /> Publish</button>
                <button className="btn btn-ghost" style={{ color: '#00b4dc', border: '1px solid rgba(0,180,220,0.3)' }} onClick={() => { setEditModal(preview); setPreview(null) }}>
                  ✏️ Edit first
                </button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setRejectModal(preview); setPreview(null) }}><XCircle size={15} /> Reject</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <AdminEditPostModal
          post={editModal}
          onClose={() => setEditModal(null)}
          onSave={saveEdit}
          onSaveAndApprove={async (id, updated) => {
            await saveEdit(id, updated)
            const { data: { session } } = await supabase.auth.getSession()
            await supabase.from('blog_posts').update({ status: 'approved', review_note: null, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', id)
            fetchPosts(); fetchPending()
            setEditModal(null)
          }}
        />
      )}

      <RejectPostModal open={!!rejectModal} post={rejectModal} onClose={() => setRejectModal(null)} onReject={(p, note) => reject(p, note)} />
      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} title="Delete Post" message="Permanently remove this post?" danger />
    </div>
  )
}

// ── Admin Edit Post Modal ──────────────────────────────────────
function AdminEditPostModal({ post, onClose, onSave, onSaveAndApprove }) {
  const [form, setForm] = useState({
    title:    post.title    || '',
    category: post.category || '',
    excerpt:  post.excerpt  || '',
    content:  post.content  || '',
    tags:     post.tags?.join(', ') || '',
  })
  const [saving, setSaving] = useState(false)

  const CATEGORIES = ['Music Review','News','Feature','Gossip','Playlist','Interview','Opinion','Events']

  const buildPayload = () => ({
    title:    form.title,
    category: form.category,
    excerpt:  form.excerpt,
    content:  form.content,
    tags:     form.tags.split(',').map(t => t.trim()).filter(Boolean),
    slug:     null, // regenerate slug on save
  })

  const handleSave = async () => {
    setSaving(true)
    await onSave(post.id, buildPayload())
    setSaving(false)
  }

  const handleSaveAndApprove = async () => {
    setSaving(true)
    await onSaveAndApprove(post.id, buildPayload())
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Edit Post</h2>
            <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 2 }}>By {post.author_name} · Changes are saved as admin edits</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'rgba(0,180,220,0.08)', border: '1px solid rgba(0,180,220,0.25)', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: 'var(--grey-300)', lineHeight: 1.6 }}>
          ✏️ As admin you can edit this post before approving. The blogger will see the published version.
        </div>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-control" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Excerpt</label>
          <textarea className="form-control" rows={3} value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Full Content</label>
          <RichTextEditor
            value={form.content}
            onChange={val => setForm(p => ({ ...p, content: val }))}
            placeholder="Edit article content..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input className="form-control" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. afrobeats, review, 2025" />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-ghost" style={{ color: '#00b4dc', border: '1px solid rgba(0,180,220,0.3)' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Only'}
          </button>
          <button className="btn btn-primary" onClick={handleSaveAndApprove} disabled={saving} style={{ gap: 8 }}>
            <CheckCircle size={15} /> {saving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UsersPanel() {
  const [users, setUsers]       = useState([])
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false })
      .then(({ data }) => setUsers(data || []))
  }, [])

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const toggleVerify = async (u) => {
    await supabase.from('profiles').update({ is_verified: !u.is_verified }).eq('id', u.id)
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, is_verified: !p.is_verified } : p))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px' }}><SearchBar value={search} onChange={setSearch} placeholder="Search users..." /></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all','artist','blogger'].map(r => (
            <button key={r} className={`tab-btn ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}
              style={{ padding: '8px 14px', textTransform: 'capitalize', border: '1px solid var(--border)', borderRadius: 4 }}>{r}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Verified</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.name} size={36} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${u.role === 'artist' ? 'badge-music' : 'badge-blog'}`}>{u.role}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)' }}>{u.created_at?.slice(0,10)}</td>
                  <td>
                    {u.role === 'artist'
                      ? <span className={`badge ${u.is_verified ? 'badge-approved' : 'badge-pending'}`}>{u.is_verified ? 'Verified' : 'Unverified'}</span>
                      : <span style={{ color: 'var(--grey-500)', fontSize: 13 }}>N/A</span>}
                  </td>
                  <td>
                    {u.role === 'artist' && (
                      <button className="btn btn-secondary" onClick={() => toggleVerify(u)} style={{ fontSize: 12, padding: '6px 12px' }}>
                        {u.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


function VideoReview({ fetchPending }) {
  const [videos, setVideos]           = useState([])
  const [filter, setFilter]           = useState('pending')
  const [search, setSearch]           = useState('')
  const [preview, setPreview]         = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectNote, setRejectNote]   = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  function getYoutubeId(url) {
    const patterns = [/youtube\.com\/watch\?v=([^&]+)/,/youtu\.be\/([^?]+)/,/youtube\.com\/shorts\/([^?]+)/]
    for (const p of patterns) { const m = url?.match(p); if (m) return m[1] }
    return null
  }

  const fetchVideos = async () => {
    let q = supabase.from('videos').select('*, profiles:uploader_id(name,email)')
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q.order('created_at', { ascending: false })
    setVideos(data || [])
  }
  useEffect(() => { fetchVideos() }, [filter])

  const filtered = videos.filter(v =>
    v.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.profiles?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const approve = async (v) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('videos').update({ status: 'approved', review_note: null, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', v.id)
    fetchVideos(); fetchPending()
  }

  const reject = async (v, note) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('videos').update({ status: 'rejected', review_note: note, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', v.id)
    fetchVideos(); fetchPending()
  }

  const remove = async (id) => {
    await supabase.from('videos').delete().eq('id', id)
    fetchVideos(); fetchPending()
  }

  return (
    <div>
      <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 260px' }}><SearchBar value={search} onChange={setSearch} placeholder="Search videos..." /></div>
        <div className="tabs" style={{ margin:0, border:'none', gap:4 }}>
          {['pending','approved','rejected','all'].map(f => (
            <button key={f} className={`tab-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)} style={{ padding:'8px 14px', textTransform:'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Video size={48} />} title="No videos here" message="Nothing matches the current filter." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Video</th><th>By</th><th>Type</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(v => {
                  const ytId = getYoutubeId(v.youtube_url)
                  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/default.jpg` : null
                  return (
                    <tr key={v.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:64, height:40, borderRadius:4, overflow:'hidden', background:'var(--bg-surface)', flexShrink:0 }}>
                            {thumb ? <img src={thumb} alt={v.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Video size={16} style={{ opacity:0.3 }} /></div>}
                          </div>
                          <div style={{ fontWeight:600, fontSize:14, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.title}</div>
                        </div>
                      </td>
                      <td style={{ fontSize:14 }}>{v.profiles?.name}</td>
                      <td>
                        {v.youtube_url
                          ? <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#ff4444' }}><Youtube size={13} /> YouTube</span>
                          : <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--grey-300)' }}><Video size={13} /> Upload</span>
                        }
                      </td>
                      <td style={{ fontSize:12, color:'var(--grey-300)', fontFamily:'var(--font-mono)' }}>{v.created_at?.slice(0,10)}</td>
                      <td><StatusBadge status={v.status} /></td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost" onClick={() => setPreview(v)} style={{ padding:'6px' }}><Eye size={15} /></button>
                          {v.status === 'pending' && <>
                            <button className="btn" onClick={() => approve(v)} style={{ padding:'6px 10px', background:'rgba(0,200,100,0.1)', color:'#00c864', border:'1px solid rgba(0,200,100,0.3)', borderRadius:4 }}><CheckCircle size={15} /></button>
                            <button className="btn" onClick={() => { setRejectModal(v); setRejectNote('') }} style={{ padding:'6px 10px', background:'var(--red-glow)', color:'var(--red)', border:'1px solid var(--border-red)', borderRadius:4 }}><XCircle size={15} /></button>
                          </>}
                          {v.status === 'rejected' && (
                            <button className="btn" onClick={() => approve(v)} style={{ padding:'6px 10px', background:'rgba(0,200,100,0.1)', color:'#00c864', border:'1px solid rgba(0,200,100,0.3)', borderRadius:4 }}><CheckCircle size={15} /></button>
                          )}
                          <button className="btn btn-danger" onClick={() => setConfirmDelete(v.id)} style={{ padding:'6px' }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal" style={{ maxWidth:680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{preview.title}</h2>
              <button className="btn-ghost" onClick={() => setPreview(null)}>✕</button>
            </div>
            {preview.youtube_url && getYoutubeId(preview.youtube_url) && (
              <div style={{ position:'relative', paddingBottom:'56.25%', height:0, marginBottom:16 }}>
                <iframe src={`https://www.youtube.com/embed/${getYoutubeId(preview.youtube_url)}?rel=0`}
                  style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none', borderRadius:8 }}
                  allowFullScreen title={preview.title} />
              </div>
            )}
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
              <StatusBadge status={preview.status} />
              <span style={{ fontSize:13, color:'var(--grey-300)' }}>By {preview.profiles?.name}</span>
            </div>
            {preview.description && <p style={{ color:'var(--grey-300)', fontSize:14, lineHeight:1.7 }}>{preview.description}</p>}
            {preview.review_note && <div style={{ background:'var(--red-glow)', border:'1px solid var(--border-red)', borderRadius:6, padding:12, marginTop:16, fontSize:13 }}><strong>Review note:</strong> {preview.review_note}</div>}
            {preview.status === 'pending' && (
              <div style={{ display:'flex', gap:10, marginTop:24 }}>
                <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={() => { approve(preview); setPreview(null) }}><CheckCircle size={15} /> Approve</button>
                <button className="btn btn-danger" style={{ flex:1, justifyContent:'center' }} onClick={() => { setRejectModal(preview); setPreview(null) }}><XCircle size={15} /> Reject</button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Video">
        <p style={{ color:'var(--grey-300)', marginBottom:16, fontSize:14 }}>Rejecting: <strong>{rejectModal?.title}</strong></p>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {['Copyright infringement — video appears to belong to a third party','Inappropriate or offensive content','Poor video quality','Misleading title or description','Other (see note below)'].map(r => (
              <label key={r} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 12px', background: rejectNote===r?'var(--red-glow)':'var(--bg-surface)', border:`1px solid ${rejectNote===r?'var(--border-red)':'var(--border)'}`, borderRadius:6, cursor:'pointer' }}>
                <input type="radio" name="vr" checked={rejectNote===r} onChange={() => setRejectNote(r)} style={{ marginTop:2, accentColor:'var(--red)' }} />
                <span style={{ fontSize:13 }}>{r}</span>
              </label>
            ))}
          </div>
          <textarea className="form-control" rows={2} placeholder="Additional details..." value={rejectNote.startsWith('Other') ? '' : ''} onChange={e => setRejectNote(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { reject(rejectModal, rejectNote); setRejectModal(null) }} disabled={!rejectNote}><XCircle size={15} /> Reject Video</button>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} title="Delete Video" message="Permanently remove this video?" danger />
    </div>
  )
}


// ── Admin Edit Content Modal ──────────────────────────────────
function AdminEditModal({ item, table, onClose, onSaved }) {
  const [title,   setTitle]   = useState(item?.title   || '')
  const [desc,    setDesc]    = useState(item?.description || item?.excerpt || item?.bio || '')
  const [genre,   setGenre]   = useState(item?.genre   || '')
  const [saving,  setSaving]  = useState(false)

  const save = async () => {
    setSaving(true)
    const updates = { title: title.trim() }
    if (desc)  updates.description = desc.trim()
    if (genre) updates.genre = genre.trim()
    const { error } = await supabase.from(table).update(updates).eq('id', item.id)
    if (!error) { onSaved(); onClose() }
    else alert('Error: ' + error.message)
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:480 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:20 }}>EDIT CONTENT</h3>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, display:'block', marginBottom:6 }}>TITLE</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:14, outline:'none', boxSizing:'border-box' }} />
        </div>
        {genre !== undefined && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, display:'block', marginBottom:6 }}>GENRE</label>
            <input value={genre} onChange={e=>setGenre(e.target.value)} style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:14, outline:'none', boxSizing:'border-box' }} />
          </div>
        )}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, display:'block', marginBottom:6 }}>DESCRIPTION / EXCERPT</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={4} style={{ width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--white)', fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}


function AlbumReview() {
  const [albums, setAlbums] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.from('albums').select('*, profiles:artist_id(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAlbums(data || []); setLoading(false) })
  }, [])

  const updateStatus = async (id, status) => {
    await supabase.from('albums').update({ status }).eq('id', id)
    setAlbums(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-500)' }}>Loading...</div>

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 20 }}>ALBUM REVIEW</h2>
      {albums.length === 0 ? <div style={{ color: 'var(--grey-500)', padding: 40, textAlign: 'center' }}>No albums submitted yet</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {albums.map(album => (
            <div key={album.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
              {album.cover_url && <img src={album.cover_url} alt={album.title} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{album.title}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-300)' }}>{album.profiles?.name} · {album.genre}</div>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20, background: album.status === 'approved' ? 'rgba(0,200,100,0.1)' : album.status === 'rejected' ? 'var(--red-glow)' : 'rgba(255,180,0,0.1)', color: album.status === 'approved' ? '#00c864' : album.status === 'rejected' ? 'var(--red)' : '#ffb400' }}>
                {album.status.toUpperCase()}
              </span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => updateStatus(album.id, 'approved')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12, gap: 4 }}>
                  <CheckCircle size={12} /> Approve
                </button>
                <button onClick={() => updateStatus(album.id, 'rejected')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, gap: 4, borderColor: 'var(--red)', color: 'var(--red)' }}>
                  <XCircle size={12} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Admin KYC Review ──────────────────────────────────────────
function KYCReview() {
  const [apps,    setApps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [msg,     setMsg]     = useState(null)

  const load = () => {
    supabase.from('profiles')
      .select('id,name,email,role,kyc_status,kyc_submitted_at,kyc_legal_name,kyc_id_url,kyc_social_links,kyc_fee_paid')
      .eq('kyc_status', 'pending')
      .order('kyc_submitted_at', { ascending: true })
      .then(({ data }) => { setApps(data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const approve = async (userId) => {
    await supabase.rpc('approve_verification', { p_user_id: userId })
    setMsg('✅ Approved! Blue tick granted.')
    load()
  }

  const reject = async (userId) => {
    const reason = window.prompt('Enter rejection reason:')
    if (!reason) return
    await supabase.rpc('reject_verification', { p_user_id: userId, p_reason: reason })
    setMsg('❌ Application rejected.')
    load()
  }

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>LOADING KYC APPLICATIONS...</div>

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:30, marginBottom:4 }}>KYC REVIEW</h2>
        <p style={{ color:'var(--grey-400)', fontSize:13 }}>Pending verification applications</p>
      </div>
      {msg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:20, fontSize:13, background:'rgba(0,200,100,0.1)', border:'1px solid #00c864', color:'#00c864' }}>{msg}</div>}
      {apps.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)' }}>
          <Shield size={40} style={{ opacity:0.15, display:'block', margin:'0 auto 12px' }} />
          <div>No pending KYC applications</div>
        </div>
      ) : apps.map(app => (
        <div key={app.id} className="card" style={{ padding:24, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, marginBottom:4 }}>{app.name}</div>
              <div style={{ fontSize:13, color:'var(--grey-400)', marginBottom:8 }}>{app.email} · {app.role?.toUpperCase()}</div>
              <div style={{ fontSize:13, marginBottom:4 }}><strong>Legal Name:</strong> {app.kyc_legal_name}</div>
              {app.kyc_social_links && <div style={{ fontSize:13, marginBottom:4 }}><strong>Social:</strong> {app.kyc_social_links}</div>}
              <div style={{ fontSize:12, color:'var(--grey-500)', fontFamily:'var(--font-mono)', marginTop:8 }}>
                Submitted: {new Date(app.kyc_submitted_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                {app.kyc_fee_paid ? ' · ₦2,000 fee paid ✅' : ' · Fee NOT paid ⚠️'}
              </div>
            </div>
            <div style={{ display:'flex', gap:10, flexShrink:0, flexDirection:'column' }}>
              {app.kyc_id_url && (
                <a href={app.kyc_id_url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ fontSize:13, padding:'8px 14px' }}>
                  View ID Document
                </a>
              )}
              <button onClick={() => approve(app.id)} className="btn btn-primary"
                style={{ fontSize:13, padding:'8px 14px', background:'#1DA1F2', borderColor:'#1DA1F2' }}>
                🔵 Approve — Grant Blue Tick
              </button>
              <button onClick={() => reject(app.id)}
                style={{ fontSize:13, padding:'8px 14px', borderRadius:8, background:'transparent', border:'1px solid var(--red)', color:'var(--red)', cursor:'pointer' }}>
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Admin: Editor Applications Review ────────────────────────
function EditorReview() {
  const [tab,     setTab]     = useState('pending') // pending | active | all
  const [editors, setEditors] = useState([])
  const [selected, setSelected] = useState(null) // selected editor for detail view
  const [activity, setActivity] = useState([])
  const [loading, setLoading]  = useState(true)
  const [msg,     setMsg]      = useState(null)

  const load = (tabName = tab) => {
    setLoading(true)
    const query = supabase.from('profiles')
      .select('id,name,email,role,editor_status,editor_applied_at,editor_approved_at,editor_cv_url,editor_posts_reviewed,editor_total_earned,editor_reject_reason')
      .not('editor_status', 'is', null)
      .order('editor_applied_at', { ascending: false })

    if (tabName === 'pending') query.eq('editor_status', 'applied')
    else if (tabName === 'active') query.eq('editor_status', 'approved')

    query.then(({ data }) => { setEditors(data || []); setLoading(false) })
  }

  const loadActivity = (editorId) => {
    supabase.from('editor_activity')
      .select('*, post:post_id(title)')
      .eq('editor_id', editorId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setActivity(data || []))
  }

  useEffect(() => { load() }, [])

  const approve = async (id) => {
    await supabase.rpc('approve_editor', { p_user_id: id })
    setMsg('✅ Editor approved! They have been notified.')
    setSelected(null)
    load()
  }

  const reject = async (id) => {
    const reason = window.prompt('Enter rejection reason (will be sent to applicant):')
    if (!reason) return
    await supabase.rpc('reject_editor', { p_user_id: id, p_reason: reason })
    setMsg('Application rejected — applicant notified.')
    setSelected(null)
    load()
  }

  const suspend = async (id) => {
    if (!window.confirm('Suspend this editor? They will lose editor access immediately.')) return
    await supabase.from('profiles').update({
      editor_status: 'suspended',
      available_roles: supabase.rpc ? undefined : null
    }).eq('id', id)
    // Remove editor from available_roles
    await supabase.rpc ? null : null
    const { data: prof } = await supabase.from('profiles').select('available_roles').eq('id', id).single()
    if (prof?.available_roles) {
      await supabase.from('profiles').update({
        available_roles: prof.available_roles.filter(r => r !== 'editor'),
        editor_status: 'suspended'
      }).eq('id', id)
    }
    await supabase.from('notifications').insert({
      user_id: id, type: 'general',
      message: '⚠️ Your editor access has been suspended by admin. Please contact us for more information.'
    })
    setMsg('Editor suspended.')
    setSelected(null)
    load()
  }

  const reinstate = async (id) => {
    await supabase.from('profiles').update({ editor_status: 'approved' }).eq('id', id)
    const { data: prof } = await supabase.from('profiles').select('available_roles').eq('id', id).single()
    if (prof?.available_roles && !prof.available_roles.includes('editor')) {
      await supabase.from('profiles').update({
        available_roles: [...prof.available_roles, 'editor']
      }).eq('id', id)
    }
    await supabase.from('notifications').insert({
      user_id: id, type: 'general',
      message: '✅ Your editor access has been reinstated. You can now review posts again.'
    })
    setMsg('✅ Editor reinstated.')
    setSelected(null)
    load()
  }

  const openEditor = (editor) => {
    setSelected(editor)
    loadActivity(editor.id)
  }

  const TAB_LABEL = { pending: 'Pending', active: 'Active Editors', all: 'All' }
  const STATUS_COLOR = { applied: '#ffb400', approved: '#00c864', rejected: 'var(--red)', suspended: 'var(--grey-500)' }

  // ── Detail view ──────────────────────────────────────────────
  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ marginBottom:20, gap:8 }}>
        ← Back
      </button>

      <div className="card" style={{ padding:28, marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:4 }}>{selected.name}</h2>
            <div style={{ fontSize:13, color:'var(--grey-400)', marginBottom:8 }}>{selected.email} · {selected.role?.toUpperCase()}</div>
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', padding:'4px 10px', borderRadius:20,
              background: `${STATUS_COLOR[selected.editor_status]}22`,
              border: `1px solid ${STATUS_COLOR[selected.editor_status]}`,
              color: STATUS_COLOR[selected.editor_status], letterSpacing:1 }}>
              {selected.editor_status?.toUpperCase()}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            {/* CV Button */}
            {selected.editor_cv_url && (
              <a href={selected.editor_cv_url} target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary" style={{ fontSize:13, textAlign:'center' }}>
                📄 View CV / Resume
              </a>
            )}
            {/* Action buttons based on status */}
            {selected.editor_status === 'applied' && <>
              <button onClick={() => approve(selected.id)} className="btn btn-primary"
                style={{ background:'#00c864', borderColor:'#00c864' }}>
                ✅ Approve Editor
              </button>
              <button onClick={() => reject(selected.id)}
                style={{ padding:'9px 16px', borderRadius:8, background:'transparent', border:'1px solid var(--red)', color:'var(--red)', cursor:'pointer', fontSize:13 }}>
                ✕ Reject
              </button>
            </>}
            {selected.editor_status === 'approved' && (
              <button onClick={() => suspend(selected.id)}
                style={{ padding:'9px 16px', borderRadius:8, background:'transparent', border:'1px solid #ffb400', color:'#ffb400', cursor:'pointer', fontSize:13 }}>
                ⚠️ Suspend Editor
              </button>
            )}
            {selected.editor_status === 'suspended' && (
              <button onClick={() => reinstate(selected.id)} className="btn btn-primary">
                ✅ Reinstate Editor
              </button>
            )}
          </div>
        </div>

        {/* Stats for active editors */}
        {selected.editor_status === 'approved' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginTop:20 }}>
            {[
              { label:'Posts Reviewed', value: selected.editor_posts_reviewed || 0 },
              { label:'TUNEZ Earned', value: Number(selected.editor_total_earned||0).toFixed(1)+'T' },
              { label:'Approved Since', value: selected.editor_approved_at ? new Date(selected.editor_approved_at).toLocaleDateString('en-NG') : '—' },
            ].map((s,i) => (
              <div key={i} style={{ background:'var(--bg-surface)', borderRadius:8, padding:'14px 16px' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22 }}>{s.value}</div>
                <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1, marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {selected.editor_reject_reason && (
          <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(200,16,46,0.08)', borderRadius:8, fontSize:13, color:'var(--grey-300)' }}>
            <strong>Rejection reason:</strong> {selected.editor_reject_reason}
          </div>
        )}
      </div>

      {/* Activity log */}
      {selected.editor_status === 'approved' && (
        <div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, marginBottom:14 }}>RECENT ACTIVITY</h3>
          {activity.length === 0 ? (
            <div style={{ color:'var(--grey-500)', fontSize:13 }}>No activity yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {activity.map(a => (
                <div key={a.id} className="card" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:16 }}>{a.action === 'approved' ? '✅' : '❌'}</span>
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
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#ffb400', flexShrink:0 }}>+{Number(a.earned).toFixed(1)}T</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── List view ────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28 }}>EDITOR MANAGEMENT</h2>
        <div style={{ display:'flex', gap:8 }}>
          {['pending','active','all'].map(t => (
            <button key={t} onClick={() => { setTab(t); load(t) }}
              style={{ padding:'7px 14px', borderRadius:8, fontSize:13, cursor:'pointer',
                background: tab === t ? 'var(--red)' : 'transparent',
                border: `1px solid ${tab === t ? 'var(--red)' : 'var(--border)'}`,
                color: tab === t ? 'white' : 'var(--grey-300)' }}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {msg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13,
        background:'rgba(0,200,100,0.1)', border:'1px solid #00c864', color:'#00c864' }}>{msg}</div>}

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>LOADING...</div>
      ) : editors.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--grey-500)' }}>
          No {tab === 'pending' ? 'pending applications' : tab === 'active' ? 'active editors' : 'records'} found
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {editors.map(e => (
            <div key={e.id} className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer' }}
              onClick={() => openEditor(e)}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{e.name}</div>
                <div style={{ fontSize:12, color:'var(--grey-400)', marginTop:2 }}>
                  {e.email} · {e.role?.toUpperCase()}
                  {e.editor_posts_reviewed > 0 && ` · ${e.editor_posts_reviewed} posts reviewed`}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                {e.editor_cv_url && (
                  <a href={e.editor_cv_url} target="_blank" rel="noopener noreferrer"
                    onClick={ev => ev.stopPropagation()}
                    style={{ fontSize:12, color:'var(--grey-400)', textDecoration:'none', padding:'4px 10px', border:'1px solid var(--border)', borderRadius:6 }}>
                    📄 CV
                  </a>
                )}
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', padding:'4px 10px', borderRadius:20,
                  background: `${STATUS_COLOR[e.editor_status]}22`,
                  border: `1px solid ${STATUS_COLOR[e.editor_status]}`,
                  color: STATUS_COLOR[e.editor_status] }}>
                  {e.editor_status?.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}