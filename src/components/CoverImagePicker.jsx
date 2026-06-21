import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Image, Upload, X, Check } from 'lucide-react'

// Extract all img src values from HTML content
function extractImages(html) {
  if (!html) return []
  const div = document.createElement('div')
  div.innerHTML = html
  const imgs = Array.from(div.querySelectorAll('img'))
  return [...new Set(imgs.map(i => i.src).filter(Boolean))]
}

export default function CoverImagePicker({ value, onChange, postContent }) {
  const [postImages, setPostImages] = useState([])
  const [uploading, setUploading]   = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  // Extract images from post content whenever it changes
  useEffect(() => {
    const imgs = extractImages(postContent)
    setPostImages(imgs)
  }, [postContent])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      alert('Please upload JPG, PNG, or WebP'); return
    }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `covers/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('post-images').upload(path, file)
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
    onChange(publicUrl)
    setUploading(false)
  }

  return (
    <div>
      {/* Current cover preview */}
      {value ? (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <img src={value} alt="Cover" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{ position: 'absolute', bottom: 8, right: 8, padding: '5px 12px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}
          >
            Change
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Upload new */}
          <div
            onClick={() => document.getElementById('cover-upload-input').click()}
            style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: 'var(--bg-surface)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <input id="cover-upload-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            <Upload size={20} style={{ margin: '0 auto 8px', color: 'var(--grey-500)' }} />
            <div style={{ fontSize: 13, color: 'var(--grey-300)' }}>{uploading ? 'â³ Uploading...' : 'Upload cover image'}</div>
            <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 4 }}>JPG, PNG, WebP â€” max 5MB</div>
          </div>

          {/* Pick from post images */}
          {postImages.length > 0 && (
            <div
              onClick={() => setShowPicker(true)}
              style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: 'var(--bg-surface)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#00b4dc'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Image size={20} style={{ margin: '0 auto 8px', color: 'var(--grey-500)' }} />
              <div style={{ fontSize: 13, color: 'var(--grey-300)' }}>Pick from post images</div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 4 }}>{postImages.length} image{postImages.length !== 1 ? 's' : ''} in your post</div>
            </div>
          )}
        </div>
      )}

      {/* Image picker modal */}
      {showPicker && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowPicker(false)}
        >
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>Choose Cover Image</h3>
              <button type="button" onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', fontSize: 20 }}>âœ•</button>
            </div>

            {postImages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--grey-500)', fontSize: 14 }}>
                No images in your post yet. Add images using the editor toolbar first.
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--grey-300)', marginBottom: 16 }}>
                  Select an image from your post to use as the cover:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, overflowY: 'auto', maxHeight: 360 }}>
                  {postImages.map((src, i) => (
                    <div
                      key={i}
                      onClick={() => { onChange(src); setShowPicker(false) }}
                      style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${value === src ? 'var(--red)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = value === src ? 'var(--red)' : 'var(--border)'}
                    >
                      <img src={src} alt={`Image ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {value === src && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,16,46,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={28} color="white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div
                onClick={() => document.getElementById('cover-upload-modal-input').click()}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--grey-300)' }}
              >
                <input id="cover-upload-modal-input" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async (e) => { setShowPicker(false); await handleUpload(e) }} />
                <Upload size={16} /> Or upload a new cover image
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
