import React, { useRef, useEffect, useCallback, useState } from 'react'
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus,
  Link, ImagePlus, Film, Code, Type,
  Undo, Redo, RemoveFormatting
} from 'lucide-react'

export default function RichTextEditor({ value, onChange, placeholder = 'Write your article here...' }) {
  const editorRef   = useRef(null)
  const savedRange  = useRef(null)
  const [activeFormats, setActiveFormats] = useState({})
  const [wordCount,     setWordCount]     = useState(0)
  const [linkModal,     setLinkModal]     = useState(false)
  const [linkUrl,       setLinkUrl]       = useState('')
  const [linkText,      setLinkText]      = useState('')
  const [imgModal,      setImgModal]      = useState(false)
  const [imgUrl,        setImgUrl]        = useState('')
  const [imgAlt,        setImgAlt]        = useState('')
  const [imgUploading,  setImgUploading]  = useState(false)
  const [vidModal,      setVidModal]      = useState(false)
  const [vidMode,       setVidMode]       = useState('youtube')
  const [vidUrl,        setVidUrl]        = useState('')
  const [vidCaption,    setVidCaption]    = useState('')
  const [vidUploading,  setVidUploading]  = useState(false)

  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
      countWords()
    }
  }, [])

  const countWords = () => {
    const t = editorRef.current?.innerText || ''
    setWordCount(t.trim().split(/\s+/).filter(Boolean).length)
  }

  const updateFormats = () => {
    setActiveFormats({
      bold:               document.queryCommandState('bold'),
      italic:             document.queryCommandState('italic'),
      underline:          document.queryCommandState('underline'),
      strikeThrough:      document.queryCommandState('strikeThrough'),
      justifyLeft:        document.queryCommandState('justifyLeft'),
      justifyCenter:      document.queryCommandState('justifyCenter'),
      justifyRight:       document.queryCommandState('justifyRight'),
      justifyFull:        document.queryCommandState('justifyFull'),
      insertOrderedList:  document.queryCommandState('insertOrderedList'),
      insertUnorderedList:document.queryCommandState('insertUnorderedList'),
    })
  }

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    onChange(editorRef.current?.innerHTML || '')
    updateFormats()
    countWords()
  }, [onChange])

  const saveRange = () => {
    const sel = window.getSelection()
    if (sel?.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange()
  }

  const restoreRange = () => {
    if (!savedRange.current) return
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedRange.current)
  }

  const getYtId = (url) => {
    const pats = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/shorts\/([^?]+)/]
    for (const p of pats) { const m = url?.match(p); if (m) return m[1] }
    return null
  }

  // â”€â”€ Image â”€â”€
  const openImgModal  = () => { saveRange(); setImgUrl(''); setImgAlt(''); setImgModal(true) }

  const uploadImage = async (file) => {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      alert('Please upload JPG, PNG, WebP or GIF'); return
    }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setImgUploading(true)
    const { supabase } = await import('../lib/supabase.js')
    const ext  = file.name.split('.').pop()
    const path = 'blog/' + Date.now() + '.' + ext
    const { data, error } = await supabase.storage.from('post-images').upload(path, file)
    if (error) { alert('Upload failed: ' + error.message); setImgUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
    setImgUrl(publicUrl)
    setImgUploading(false)
  }

  const insertImage = () => {
    restoreRange()
    const alt = imgAlt || 'Image'
    const cap = imgAlt
      ? '<figcaption style="font-size:13px;color:#666;margin-top:8px;font-style:italic;">' + imgAlt + '</figcaption>'
      : ''
    exec('insertHTML',
      '<figure style="margin:24px 0;text-align:center;">' +
        '<img src="' + imgUrl + '" alt="' + alt + '" style="max-width:100%;height:auto;border-radius:8px;display:inline-block;" />' +
        cap +
      '</figure>'
    )
    setImgModal(false)
  }

  // â”€â”€ Video â”€â”€
  const openVidModal = () => { saveRange(); setVidUrl(''); setVidCaption(''); setVidModal(true) }

  const uploadVideo = async (file) => {
    if (!['video/mp4','video/quicktime','video/webm'].includes(file.type)) {
      alert('Please upload MP4, MOV or WebM'); return
    }
    if (file.size > 200 * 1024 * 1024) { alert('Video must be under 200MB'); return }
    setVidUploading(true)
    const { supabase } = await import('../lib/supabase.js')
    const ext  = file.name.split('.').pop()
    const path = 'blog-videos/' + Date.now() + '.' + ext
    const { data, error } = await supabase.storage.from('post-images').upload(path, file)
    if (error) { alert('Upload failed: ' + error.message); setVidUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
    setVidUrl(publicUrl)
    setVidUploading(false)
  }

  const insertVideo = () => {
    restoreRange()
    const cap = vidCaption
      ? '<figcaption style="font-size:13px;color:#666;margin-top:8px;font-style:italic;">' + vidCaption + '</figcaption>'
      : ''
    const ytId = getYtId(vidUrl)
    let html = ''
    if (ytId) {
      html = '<figure style="margin:24px 0;">' +
        '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">' +
          '<iframe src="https://www.youtube.com/embed/' + ytId + '?rel=0" ' +
            'style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:8px;" ' +
            'allowfullscreen title="YouTube video"></iframe>' +
        '</div>' + cap + '</figure>'
    } else if (vidUrl) {
      html = '<figure style="margin:24px 0;">' +
        '<video controls style="width:100%;border-radius:8px;max-height:480px;" src="' + vidUrl + '"></video>' +
        cap + '</figure>'
    }
    if (html) exec('insertHTML', html)
    setVidModal(false)
  }

  // â”€â”€ Link â”€â”€
  const openLinkModal = () => {
    saveRange()
    const sel = window.getSelection()
    setLinkText(sel?.toString() || '')
    setLinkUrl('')
    setLinkModal(true)
  }

  const insertLink = () => {
    restoreRange()
    editorRef.current?.focus()
    if (linkText && !window.getSelection()?.toString()) {
      exec('insertHTML', '<a href="' + linkUrl + '" target="_blank" rel="noopener" style="color:#c8102e;text-decoration:underline;">' + linkText + '</a>')
    } else {
      exec('createLink', linkUrl)
    }
    setLinkModal(false)
  }

  const handlePaste = (e) => {
    e.preventDefault()
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
  }

  // â”€â”€ Toolbar button â”€â”€
  const ToolBtn = ({ cmd, icon: Icon, label, active, onClick }) => (
    <button type="button" title={label}
      onMouseDown={e => { e.preventDefault(); onClick ? onClick() : exec(cmd) }}
      style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', background: active ? 'var(--red)' : 'transparent', border:'none', borderRadius:4, cursor:'pointer', color: active ? 'white' : 'var(--grey-300)', transition:'all 0.15s', flexShrink:0 }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'var(--red)' : 'transparent' }}
    >
      <Icon size={15} />
    </button>
  )

  const Sep = () => <div style={{ width:1, height:24, background:'var(--border)', margin:'0 4px', flexShrink:0 }} />

  const HeadBtn = ({ tag }) => (
    <button type="button" title={'Heading ' + tag[1]}
      onMouseDown={e => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('formatBlock', false, tag); onChange(editorRef.current?.innerHTML || '') }}
      style={{ height:32, padding:'0 8px', display:'flex', alignItems:'center', background:'transparent', border:'none', borderRadius:4, cursor:'pointer', color:'var(--grey-300)', fontFamily:'var(--font-display)', fontSize:13, letterSpacing:0.5, flexShrink:0 }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {tag.toUpperCase()}
    </button>
  )

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', background:'var(--bg-surface)' }}>

      {/* TOOLBAR */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:2, padding:'8px 10px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
        <ToolBtn cmd="undo" icon={Undo} label="Undo" active={false} />
        <ToolBtn cmd="redo" icon={Redo} label="Redo" active={false} />
        <Sep />
        <HeadBtn tag="h1" /><HeadBtn tag="h2" /><HeadBtn tag="h3" />
        <Sep />
        <ToolBtn cmd="bold"          icon={Bold}          label="Bold"          active={activeFormats.bold} />
        <ToolBtn cmd="italic"        icon={Italic}        label="Italic"        active={activeFormats.italic} />
        <ToolBtn cmd="underline"     icon={Underline}     label="Underline"     active={activeFormats.underline} />
        <ToolBtn cmd="strikeThrough" icon={Strikethrough} label="Strikethrough" active={activeFormats.strikeThrough} />
        <Sep />
        <ToolBtn cmd="justifyLeft"   icon={AlignLeft}    label="Align Left"    active={activeFormats.justifyLeft} />
        <ToolBtn cmd="justifyCenter" icon={AlignCenter}  label="Align Center"  active={activeFormats.justifyCenter} />
        <ToolBtn cmd="justifyRight"  icon={AlignRight}   label="Align Right"   active={activeFormats.justifyRight} />
        <ToolBtn cmd="justifyFull"   icon={AlignJustify} label="Justify"       active={activeFormats.justifyFull} />
        <Sep />
        <ToolBtn cmd="insertUnorderedList" icon={List}        label="Bullet List"   active={activeFormats.insertUnorderedList} />
        <ToolBtn cmd="insertOrderedList"   icon={ListOrdered} label="Numbered List" active={activeFormats.insertOrderedList} />
        <Sep />
        <ToolBtn cmd="bq"   icon={Quote} label="Blockquote"   active={false} onClick={() => { editorRef.current?.focus(); document.execCommand('formatBlock',false,'blockquote'); onChange(editorRef.current?.innerHTML||'') }} />
        <ToolBtn cmd="code" icon={Code}  label="Inline Code"  active={false} onClick={() => { const s=window.getSelection()?.toString()||'code'; exec('insertHTML','<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">'+s+'</code>') }} />
        <ToolBtn cmd="hr"   icon={Minus} label="Divider"      active={false} onClick={() => exec('insertHTML','<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:24px 0;">')} />
        <Sep />
        <ToolBtn cmd="link"  icon={Link}     label="Insert Link"  active={false} onClick={openLinkModal} />
        <ToolBtn cmd="img"   icon={ImagePlus} label="Insert Image" active={false} onClick={openImgModal} />
        <ToolBtn cmd="vid"   icon={Film}      label="Insert Video" active={false} onClick={openVidModal} />
        <Sep />
        <select onMouseDown={e => e.stopPropagation()} onChange={e => exec('fontSize', e.target.value)}
          style={{ height:28, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:4, color:'var(--grey-300)', fontSize:12, padding:'0 4px', cursor:'pointer', flexShrink:0 }}>
          <option value="">Size</option>
          {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>Size {s}</option>)}
        </select>
        <div style={{ position:'relative', display:'flex', alignItems:'center' }} title="Text Color">
          <Type size={13} color="var(--grey-300)" style={{ position:'absolute', left:5, pointerEvents:'none', zIndex:1 }} />
          <input type="color" defaultValue="#ffffff" onChange={e => exec('foreColor', e.target.value)}
            style={{ width:32, height:28, paddingLeft:18, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:4, cursor:'pointer' }} />
        </div>
        <ToolBtn cmd="removeFormat" icon={RemoveFormatting} label="Clear Formatting" active={false} />
      </div>

      {/* EDITOR */}
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={() => { onChange(editorRef.current?.innerHTML||''); countWords(); updateFormats() }}
        onKeyUp={updateFormats} onMouseUp={updateFormats} onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{ minHeight:320, padding:'20px 24px', outline:'none', fontSize:15, lineHeight:1.85, color:'var(--white)', caretColor:'var(--red)' }}
      />

      {/* WORD COUNT */}
      <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
        <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1 }}>{wordCount} WORDS</span>
      </div>

      {/* LINK MODAL */}
      {linkModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:24, width:'100%', maxWidth:400 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:20 }}>Insert Link</h3>
            <div className="form-group">
              <label className="form-label">Link Text</label>
              <input className="form-control" value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Click here" />
            </div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-control" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setLinkModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={insertLink} disabled={!linkUrl}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE MODAL */}
      {imgModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:28, width:'100%', maxWidth:480 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:20 }}>Insert Image</h3>
            <div className="form-group">
              <label className="form-label">Upload Image</label>
              <div style={{ border:'2px dashed var(--border)', borderRadius:8, padding:20, textAlign:'center', cursor:'pointer', background: imgUrl?'rgba(0,200,100,0.06)':'transparent' }}
                onClick={() => document.getElementById('rte-img-upload').click()}>
                <input id="rte-img-upload" type="file" accept="image/*" style={{ display:'none' }} onChange={e => uploadImage(e.target.files[0])} />
                {imgUploading ? <div style={{ color:'var(--grey-300)', fontSize:14 }}>â³ Uploading...</div>
                  : imgUrl
                    ? <div><img src={imgUrl} alt="preview" style={{ maxHeight:100, margin:'0 auto 8px', borderRadius:6 }} /><div style={{ fontSize:12, color:'#00c864' }}>âœ… Uploaded</div></div>
                    : <div style={{ color:'var(--grey-300)', fontSize:14 }}>ðŸ–¼ Click to upload (JPG, PNG, WebP, GIF â€” max 5MB)</div>
                }
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'4px 0 16px', color:'var(--grey-500)', fontSize:13 }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />or paste URL<div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input className="form-control" value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
            </div>
            <div className="form-group">
              <label className="form-label">Caption (optional)</label>
              <input className="form-control" value={imgAlt} onChange={e => setImgAlt(e.target.value)} placeholder="Describe the image..." />
            </div>
            {imgUrl && <div style={{ marginBottom:16, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
              <img src={imgUrl} alt="preview" style={{ width:'100%', maxHeight:160, objectFit:'cover', display:'block' }} />
            </div>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setImgModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={insertImage} disabled={!imgUrl||imgUploading}>Insert Image</button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {vidModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:28, width:'100%', maxWidth:520 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:20 }}>Insert Video</h3>
            <div style={{ display:'flex', gap:0, marginBottom:20, background:'var(--bg-surface)', borderRadius:8, padding:4 }}>
              {[{k:'youtube',l:'YouTube Link'},{k:'upload',l:'Upload Video'}].map(m => (
                <button key={m.k} type="button" onClick={() => { setVidMode(m.k); setVidUrl('') }}
                  style={{ flex:1, padding:'9px 12px', borderRadius:6, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.2s', background: vidMode===m.k?'var(--bg-card)':'transparent', color: vidMode===m.k?'var(--white)':'var(--grey-500)' }}>
                  {m.l}
                </button>
              ))}
            </div>
            {vidMode === 'youtube' ? (
              <div className="form-group">
                <label className="form-label">YouTube URL</label>
                <input className="form-control" value={vidUrl} onChange={e => setVidUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                {vidUrl && getYtId(vidUrl) && (
                  <div style={{ marginTop:10, borderRadius:8, overflow:'hidden', position:'relative', paddingBottom:'56.25%', height:0 }}>
                    <iframe src={'https://www.youtube.com/embed/' + getYtId(vidUrl) + '?rel=0'}
                      style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} allowFullScreen title="preview" />
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Upload Video (MP4, MOV, WebM â€” max 200MB)</label>
                <div style={{ border:'2px dashed var(--border)', borderRadius:8, padding:24, textAlign:'center', cursor:'pointer', background: vidUrl?'rgba(0,200,100,0.06)':'transparent' }}
                  onClick={() => document.getElementById('rte-vid-upload').click()}>
                  <input id="rte-vid-upload" type="file" accept="video/mp4,video/quicktime,video/webm" style={{ display:'none' }} onChange={e => uploadVideo(e.target.files[0])} />
                  {vidUploading ? <div style={{ color:'var(--grey-300)', fontSize:14 }}>â³ Uploading video...</div>
                    : vidUrl ? <div style={{ color:'#00c864', fontSize:14 }}>âœ… Video uploaded</div>
                    : <div style={{ color:'var(--grey-300)', fontSize:14 }}>ðŸŽ¬ Click to upload video</div>}
                </div>
              </div>
            )}
            <div className="form-group" style={{ marginTop:12 }}>
              <label className="form-label">Caption (optional)</label>
              <input className="form-control" value={vidCaption} onChange={e => setVidCaption(e.target.value)} placeholder="Describe the video..." />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-secondary" onClick={() => setVidModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={insertVideo} disabled={!vidUrl||vidUploading}>Insert Video</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: var(--grey-500); pointer-events: none; }
        [contenteditable] h1 { font-family: var(--font-display); font-size: 36px; letter-spacing: 1px; margin: 20px 0 10px; }
        [contenteditable] h2 { font-family: var(--font-display); font-size: 28px; margin: 18px 0 8px; }
        [contenteditable] h3 { font-family: var(--font-display); font-size: 22px; margin: 16px 0 8px; }
        [contenteditable] p  { margin: 0 0 12px; }
        [contenteditable] ul, [contenteditable] ol { margin: 12px 0 12px 24px; }
        [contenteditable] li { margin-bottom: 6px; line-height: 1.7; }
        [contenteditable] blockquote { border-left: 3px solid var(--red); margin: 16px 0; padding: 12px 20px; background: var(--red-glow); border-radius: 0 6px 6px 0; font-style: italic; }
        [contenteditable] hr  { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 24px 0; }
        [contenteditable] a   { color: var(--red); text-decoration: underline; }
        [contenteditable] img { max-width: 100%; height: auto; border-radius: 8px; }
        [contenteditable] figure { margin: 24px 0; text-align: center; }
        [contenteditable] video { max-width: 100%; border-radius: 8px; }
        .post-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
        .post-content figure { margin: 24px 0; text-align: center; }
        .post-content figcaption { font-size: 13px; color: var(--grey-500); margin-top: 8px; font-style: italic; }
        .post-content h1 { font-family: var(--font-display); font-size: 36px; margin: 24px 0 12px; }
        .post-content h2 { font-family: var(--font-display); font-size: 28px; margin: 20px 0 10px; }
        .post-content h3 { font-family: var(--font-display); font-size: 22px; margin: 16px 0 8px; }
        .post-content p  { margin: 0 0 14px; }
        .post-content ul, .post-content ol { margin: 12px 0 12px 24px; }
        .post-content li { margin-bottom: 6px; line-height: 1.7; }
        .post-content blockquote { border-left: 3px solid var(--red); margin: 16px 0; padding: 12px 20px; background: var(--red-glow); border-radius: 0 6px 6px 0; font-style: italic; }
        .post-content a   { color: var(--red); text-decoration: underline; }
        .post-content code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .post-content hr  { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
        .post-content video { max-width: 100%; border-radius: 8px; }
        .post-content iframe { max-width: 100%; border-radius: 8px; }
      `}</style>
    </div>
  )
}
