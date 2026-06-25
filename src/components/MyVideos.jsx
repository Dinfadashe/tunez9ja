import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { StatusBadge, ConfirmModal, EmptyState } from '../components/UI.jsx'
import { Video, Youtube, Trash2, Eye } from 'lucide-react'

function getYoutubeId(url) {
  // youtube id extraction - no regex
  const getYoutubeId = null
  for (const p of patterns) { const m = url?.match(p); if (m) return m[1] }
  return null
}

export default function MyVideos({ currentUser }) {
  const [videos, setVideos]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [preview, setPreview]         = useState(null)

  const fetchVideos = async () => {
    const { data } = await supabase.from('videos').select('*')
      .eq('uploader_id', currentUser.id).order('created_at', { ascending: false })
    setVideos(data || []); setLoading(false)
  }
  useEffect(() => { fetchVideos() }, [currentUser.id])

  const handleDelete = async (id) => {
    await supabase.from('videos').delete().eq('id', id)
    fetchVideos()
  }

  if (loading) return <div style={{ color: 'var(--grey-300)', padding: 40, textAlign: 'center' }}>Loading videos...</div>

  return (
    <div>
      {videos.length === 0 ? (
        <EmptyState icon={<Video size={48} />} title="No videos yet" message="Upload your first video or paste a YouTube link to get started." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Video</th><th>Type</th><th>Submitted</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {videos.map(v => {
                  const ytId = getYoutubeId(v.youtube_url)
                  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/default.jpg` : null
                  return (
                    <tr key={v.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 56, height: 40, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-surface)', flexShrink: 0 }}>
                            {thumb
                              ? <img src={thumb} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={16} style={{ opacity: 0.3 }} /></div>
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                            {v.review_note && <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 2 }}>📝 {v.review_note}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {v.youtube_url
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#ff4444' }}><Youtube size={13} /> YouTube</span>
                          : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--grey-300)' }}><Upload size={13} /> Upload</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--grey-300)', fontFamily: 'var(--font-mono)' }}>{v.created_at?.slice(0,10)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v.view_count?.toLocaleString() || 0}</td>
                      <td><StatusBadge status={v.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost" onClick={() => setPreview(v)} style={{ padding: '6px' }}><Eye size={15} /></button>
                          <button className="btn btn-danger" onClick={() => setConfirmDelete(v.id)} style={{ padding: '6px' }}><Trash2 size={15} /></button>
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

      {/* Preview modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{preview.title}</h2>
              <button className="btn-ghost" onClick={() => setPreview(null)}>✕</button>
            </div>
            {preview.youtube_url && getYoutubeId(preview.youtube_url) && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: 16 }}>
                <iframe src={`https://www.youtube.com/embed/${getYoutubeId(preview.youtube_url)}?rel=0`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                  allowFullScreen title={preview.title} />
              </div>
            )}
            {preview.video_url && !preview.youtube_url && (
              <video controls style={{ width: '100%', borderRadius: 8, marginBottom: 16 }}>
                <source src={preview.video_url} />
              </video>
            )}
            <StatusBadge status={preview.status} />
            {preview.description && <p style={{ color: 'var(--grey-300)', fontSize: 14, marginTop: 12, lineHeight: 1.7 }}>{preview.description}</p>}
            {preview.review_note && (
              <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 6, padding: 14, marginTop: 16 }}>
                <strong style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>ADMIN FEEDBACK:</strong>
                <p style={{ fontSize: 14, marginTop: 6 }}>{preview.review_note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Video" message="Remove this video permanently?" danger />
    </div>
  )
}
