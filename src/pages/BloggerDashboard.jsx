import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// ─── Draft auto-save key (per-user) ─────────────────────────────────────────────
const DRAFT_KEY = (userId) => `t9j_blog_draft_${userId}`

// ─── Empty form state ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: '',
  content: '',
  excerpt: '',
  cover_url: '',
  tags: '',
  is_premium: false,
  premium_price: 0,
  backlinks: [],   // [{ label, url }]
}

// ─── Stable backlink row — NO inline arrow functions on props ─────────────────────
// The blinking/crash was caused by adding backlinks via inline handlers that
// recreated the array reference and triggered infinite re-renders. Fixed by:
// 1. useCallback for all handlers
// 2. Functional setForm updates (reads prev state, not stale closure)
// 3. React key={index} — stable while user edits
function BacklinkRow({ index, link, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Label (e.g. Source: BBC)"
        value={link.label}
        onChange={e => onChange(index, 'label', e.target.value)}
        style={S.input}
      />
      <input
        type="url"
        placeholder="https://..."
        value={link.url}
        onChange={e => onChange(index, 'url', e.target.value)}
        style={{ ...S.input, flex: 2 }}
      />
      <button type="button" onClick={() => onRemove(index)} style={S.removeBtn} title="Remove">✕</button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────────
export default function BloggerDashboard({ currentUser, setPage }) {
  const [tab, setTab]           = useState('write')
  const [posts, setPosts]       = useState([])
  const [drafts, setDrafts]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [submitMsg, setSubmitMsg]   = useState('')
  const [editingId, setEditingId]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [coverFile, setCoverFile]   = useState(null)
  const [stats, setStats]       = useState({ total: 0, approved: 0, views: 0, drafts: 0 })
  const saveTimerRef            = useRef(null)
  const userId                  = currentUser?.id

  // ── Restore draft on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY(userId))
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.title || saved.content) {
          setForm({
            ...EMPTY_FORM,
            ...saved,
            backlinks: Array.isArray(saved.backlinks) ? saved.backlinks : [],
          })
          setEditingId(saved._draftId || null)
          setSaveStatus('Restored from last session')
          setTimeout(() => setSaveStatus(''), 3000)
        }
      }
    } catch { /* corrupt localStorage — ignore */ }
    fetchPosts()
    fetchStats()
  }, [userId])

  // ── Fetch posts from Supabase ─────────────────────────────────────────────────
  async function fetchPosts() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, status, created_at, views, is_premium, premium_price')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
    if (data) {
      setDrafts(data.filter(p => p.status === 'draft'))
      setPosts(data.filter(p => p.status !== 'draft'))
    }
    setLoading(false)
  }

  async function fetchStats() {
    if (!userId) return
    const { data } = await supabase
      .from('blog_posts')
      .select('status, views')
      .eq('author_id', userId)
    if (data) {
      setStats({
        total:    data.length,
        approved: data.filter(p => p.status === 'approved').length,
        views:    data.reduce((s, p) => s + (p.views || 0), 0),
        drafts:   data.filter(p => p.status === 'draft').length,
      })
    }
  }

  // ── Save draft (localStorage first, then Supabase) ────────────────────────────
  const saveDraft = useCallback(async (formData, draftId) => {
    if (!userId) return
    setSaveStatus('saving')

    // Always persist to localStorage immediately (survives refresh/crash)
    try {
      localStorage.setItem(DRAFT_KEY(userId), JSON.stringify({
        ...formData,
        _draftId: draftId,
        _savedAt: Date.now(),
      }))
    } catch { /* storage full */ }

    // Skip Supabase if truly empty
    if (!formData.title.trim() && !formData.content.trim()) {
      setSaveStatus('')
      return
    }

    const payload = {
      author_id:     userId,
      title:         formData.title || '(Untitled draft)',
      content:       formData.content,
      excerpt:       formData.excerpt,
      cover_url:     formData.cover_url || null,
      tags:          formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      is_premium:    formData.is_premium,
      premium_price: formData.premium_price || 0,
      backlinks:     formData.backlinks || [],
      status:        'draft',
      updated_at:    new Date().toISOString(),
    }

    try {
      if (draftId) {
        await supabase.from('blog_posts').update(payload).eq('id', draftId).eq('author_id', userId)
        setSaveStatus('saved')
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('id')
          .single()
        if (!error && data?.id) {
          setEditingId(data.id)
          // Update localStorage with the new id
          localStorage.setItem(DRAFT_KEY(userId), JSON.stringify({
            ...formData, _draftId: data.id, _savedAt: Date.now(),
          }))
          setSaveStatus('saved')
        }
      }
    } catch {
      setSaveStatus('error')
    }
    setTimeout(() => setSaveStatus(''), 3000)
  }, [userId])

  // ── Debounced save (1.5s after last keystroke) ────────────────────────────────
  function triggerAutoSave(formData, draftId) {
    clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => saveDraft(formData, draftId), 1500)
  }

  // ── Form field change ─────────────────────────────────────────────────────────
  function handleChange(field, value) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      triggerAutoSave(updated, editingId)
      return updated
    })
  }

  // ── Backlink handlers — all useCallback, all use functional setState ──────────
  const handleAddBacklink = useCallback(() => {
    setForm(prev => {
      const updated = { ...prev, backlinks: [...(prev.backlinks || []), { label: '', url: '' }] }
      triggerAutoSave(updated, editingId)
      return updated
    })
  }, [editingId, saveDraft])

  const handleBacklinkChange = useCallback((index, field, value) => {
    setForm(prev => {
      const links = [...(prev.backlinks || [])]
      links[index] = { ...links[index], [field]: value }
      const updated = { ...prev, backlinks: links }
      triggerAutoSave(updated, editingId)
      return updated
    })
  }, [editingId, saveDraft])

  const handleRemoveBacklink = useCallback((index) => {
    setForm(prev => {
      const updated = { ...prev, backlinks: (prev.backlinks || []).filter((_, i) => i !== index) }
      triggerAutoSave(updated, editingId)
      return updated
    })
  }, [editingId, saveDraft])

  // ── Load a draft from Supabase into the editor ────────────────────────────────
  async function loadDraft(draft) {
    const { data } = await supabase.from('blog_posts').select('*').eq('id', draft.id).single()
    if (data) {
      setForm({
        title:         data.title || '',
        content:       data.content || '',
        excerpt:       data.excerpt || '',
        cover_url:     data.cover_url || '',
        tags:          Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        is_premium:    data.is_premium || false,
        premium_price: data.premium_price || 0,
        backlinks:     Array.isArray(data.backlinks) ? data.backlinks : [],
      })
      setEditingId(data.id)
      setTab('write')
    }
  }

  // ── Upload cover ──────────────────────────────────────────────────────────────
  async function uploadCover() {
    if (!coverFile) return form.cover_url
    const ext  = coverFile.name.split('.').pop()
    const path = `blog_covers/${userId}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, coverFile, { upsert: true })
    if (error) return form.cover_url
    const { data: url } = supabase.storage.from('covers').getPublicUrl(path)
    return url?.publicUrl || form.cover_url
  }

  // ── Submit for review ─────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setSubmitMsg('Please add a title and content before submitting.')
      return
    }
    setSaving(true)
    setSubmitMsg('')
    try {
      const coverUrl = await uploadCover()
      const payload  = {
        author_id:     userId,
        title:         form.title.trim(),
        content:       form.content,
        excerpt:       form.excerpt.trim() || form.content.substring(0, 200),
        cover_url:     coverUrl || null,
        tags:          form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        is_premium:    form.is_premium,
        premium_price: form.is_premium ? (Number(form.premium_price) || 0) : 0,
        backlinks:     (form.backlinks || []).filter(b => b.url.trim()),
        status:        'pending',
        updated_at:    new Date().toISOString(),
      }
      if (editingId) {
        await supabase.from('blog_posts').update(payload).eq('id', editingId).eq('author_id', userId)
      } else {
        await supabase.from('blog_posts').insert({ ...payload, created_at: new Date().toISOString() })
      }
      localStorage.removeItem(DRAFT_KEY(userId))
      setForm(EMPTY_FORM)
      setEditingId(null)
      setCoverFile(null)
      setSubmitMsg('✅ Post submitted for review!')
      fetchPosts()
      fetchStats()
      setTimeout(() => setTab('posts'), 1500)
    } catch {
      setSubmitMsg('❌ Submission failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Discard draft ─────────────────────────────────────────────────────────────
  async function discardDraft() {
    if (!window.confirm('Discard this draft?')) return
    if (editingId) await supabase.from('blog_posts').delete().eq('id', editingId).eq('author_id', userId)
    localStorage.removeItem(DRAFT_KEY(userId))
    setForm(EMPTY_FORM)
    setEditingId(null)
    setCoverFile(null)
    fetchPosts()
    fetchStats()
  }

  const hasContent = form.title || form.content

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #333', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Blogger Dashboard</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#888', marginTop: 4 }}>Welcome, {currentUser?.name || 'Blogger'}</p>
        </div>
        <button onClick={() => setPage?.('home')} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          ← Back to site
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 24px', background: '#111', borderBottom: '1px solid #222', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Posts',  value: stats.total },
          { label: 'Approved',     value: stats.approved },
          { label: 'Total Views',  value: stats.views.toLocaleString() },
          { label: 'Drafts',       value: stats.drafts },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '12px 20px', minWidth: 90, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#c8102e' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#141414' }}>
        {[
          { id: 'write',  label: '✍️ Write Post' },
          { id: 'drafts', label: `📋 Drafts (${drafts.length})` },
          { id: 'posts',  label: '📰 My Posts' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '14px 24px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #c8102e' : '2px solid transparent', color: tab === t.id ? '#c8102e' : '#888', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

        {/* ─── WRITE ─── */}
        {tab === 'write' && (
          <form onSubmit={handleSubmit}>

            {/* Auto-save status bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'saving' ? '#facc15' : saveStatus === 'error' ? '#ef4444' : '#666' }}>
                {saveStatus === 'saved'  && '✓ Draft auto-saved'}
                {saveStatus === 'saving' && '⏳ Saving…'}
                {saveStatus === 'error'  && '⚠ Could not save — check connection'}
                {!saveStatus && hasContent && '● Changes are auto-saved as you type'}
                {editingId && !saveStatus && <span style={{ fontSize: 11, color: '#444', marginLeft: 8 }}>ID {editingId.slice(0, 8)}</span>}
              </span>
              {hasContent && (
                <button type="button" onClick={discardDraft}
                  style={{ background: 'none', border: '1px solid #555', color: '#888', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  Discard draft
                </button>
              )}
            </div>

            {/* Title */}
            <div style={S.group}>
              <label style={S.label}>Post Title *</label>
              <input value={form.title} onChange={e => handleChange('title', e.target.value)}
                placeholder="Enter your post title…"
                style={{ ...S.input, fontSize: 18, fontWeight: 600 }} />
            </div>

            {/* Content */}
            <div style={S.group}>
              <label style={S.label}>Content *</label>
              <textarea value={form.content} onChange={e => handleChange('content', e.target.value)}
                placeholder="Write your post here…" rows={16}
                style={{ ...S.input, resize: 'vertical', lineHeight: 1.8 }} />
              <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
                {form.content.length} chars · ~{Math.ceil((form.content.match(/\S+/g) || []).length / 200)} min read
              </div>
            </div>

            {/* Excerpt */}
            <div style={S.group}>
              <label style={S.label}>Excerpt <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
              <textarea value={form.excerpt} onChange={e => handleChange('excerpt', e.target.value)}
                placeholder="Short summary for the blog listing (max 250 chars)…"
                rows={3} maxLength={250} style={{ ...S.input, resize: 'vertical' }} />
            </div>

            {/* Cover image */}
            <div style={S.group}>
              <label style={S.label}>Cover Image</label>
              {form.cover_url && (
                <img src={form.cover_url} alt="Cover preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
              )}
              <input type="file" accept="image/*" onChange={e => { setCoverFile(e.target.files[0]); handleChange('cover_url', form.cover_url) }}
                style={{ color: '#aaa', fontSize: 13 }} />
              {coverFile && <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>✓ Ready: {coverFile.name}</div>}
            </div>

            {/* Tags */}
            <div style={S.group}>
              <label style={S.label}>Tags <span style={{ color: '#555', fontWeight: 400 }}>(comma-separated)</span></label>
              <input value={form.tags} onChange={e => handleChange('tags', e.target.value)}
                placeholder="e.g. Afrobeats, Review, Burna Boy" style={S.input} />
            </div>

            {/* ─── BACKLINKS ─── Fixed: useCallback + functional setState */}
            <div style={S.group}>
              <label style={S.label}>Backlinks / References</label>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px' }}>
                External links shown as references at the end of the post.
              </p>
              {(form.backlinks || []).map((link, i) => (
                <BacklinkRow
                  key={i}
                  index={i}
                  link={link}
                  onChange={handleBacklinkChange}
                  onRemove={handleRemoveBacklink}
                />
              ))}
              <button type="button" onClick={handleAddBacklink}
                style={{ width: '100%', padding: '9px 0', background: 'none', border: '1px dashed #444', color: '#888', borderRadius: 6, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                + Add Backlink
              </button>
            </div>

            {/* Premium */}
            <div style={{ ...S.group, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_premium}
                  onChange={e => handleChange('is_premium', e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ color: '#aaa', fontSize: 14 }}>Premium post (readers pay TUNEZ to unlock)</span>
              </label>
              {form.is_premium && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ color: '#888', fontSize: 13 }}>Price (TUNEZ):</label>
                  <input type="number" min="1" max="9999" value={form.premium_price}
                    onChange={e => handleChange('premium_price', Number(e.target.value))}
                    style={{ ...S.input, width: 80 }} />
                </div>
              )}
            </div>

            {/* Submit feedback */}
            {submitMsg && (
              <div style={{ padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14,
                background: submitMsg.startsWith('✅') ? '#0a2e18' : '#2e0a0a',
                color:      submitMsg.startsWith('✅') ? '#22c55e'  : '#ef4444' }}>
                {submitMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => saveDraft(form, editingId)}
                style={{ flex: 1, padding: '12px 0', background: '#1a1a1a', border: '1px solid #444', color: '#aaa', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
                💾 Save Draft
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 2, padding: '12px 0', background: saving ? '#555' : '#c8102e', border: 'none', color: '#fff', borderRadius: 8, cursor: saving ? 'default' : 'pointer', fontSize: 15, fontWeight: 600 }}>
                {saving ? 'Submitting…' : '🚀 Submit for Review'}
              </button>
            </div>
          </form>
        )}

        {/* ─── DRAFTS ─── */}
        {tab === 'drafts' && (
          <div>
            <h3 style={{ marginBottom: 16, color: '#aaa' }}>Saved Drafts</h3>
            {loading ? (
              <p style={{ color: '#666' }}>Loading…</p>
            ) : drafts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#555' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
                No drafts yet. Start writing!
              </div>
            ) : drafts.map(d => (
              <div key={d.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.title || '(Untitled)'}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => loadDraft(d)}
                    style={{ background: '#c8102e', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    Edit
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm('Delete this draft?')) return
                    await supabase.from('blog_posts').delete().eq('id', d.id).eq('author_id', userId)
                    if (editingId === d.id) { setForm(EMPTY_FORM); setEditingId(null); localStorage.removeItem(DRAFT_KEY(userId)) }
                    fetchPosts(); fetchStats()
                  }} style={{ background: '#2a2a2a', border: '1px solid #444', color: '#888', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── POSTS ─── */}
        {tab === 'posts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#aaa' }}>Submitted Posts</h3>
              <button onClick={() => setTab('write')}
                style={{ background: '#c8102e', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                + New Post
              </button>
            </div>
            {loading ? (
              <p style={{ color: '#666' }}>Loading…</p>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#555' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📰</div>
                No posts submitted yet.
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => setTab('write')} style={{ background: '#c8102e', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 6, cursor: 'pointer' }}>
                    Write your first post
                  </button>
                </div>
              </div>
            ) : posts.map(p => (
              <div key={p.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {new Date(p.created_at).toLocaleDateString()} · {(p.views || 0).toLocaleString()} views
                    {p.is_premium && <span style={{ marginLeft: 8, color: '#facc15' }}>⭐ {p.premium_price}T</span>}
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 12,
                  background: p.status === 'approved' ? '#0a2e18' : p.status === 'pending' ? '#1a1500' : '#2a0a0a',
                  color:      p.status === 'approved' ? '#22c55e'  : p.status === 'pending' ? '#facc15'  : '#ef4444',
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared style tokens ──────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 6,
    color: '#fff',
    padding: '10px 12px',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#aaa',
    fontWeight: 600,
    marginBottom: 6,
  },
  group: {
    marginBottom: 20,
  },
  removeBtn: {
    background: '#2a0a0a',
    border: '1px solid #5a1a1a',
    color: '#ef4444',
    borderRadius: 4,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 13,
    flexShrink: 0,
  },
}
