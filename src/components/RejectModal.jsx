import React, { useState } from 'react'
import { Modal } from './UI.jsx'
import { XCircle } from 'lucide-react'

const MUSIC_REASONS = [
  'Copyright infringement — track appears to be owned by a third party',
  'Sample not cleared — contains uncleared samples or interpolations',
  'Stolen cover art — artwork appears to belong to someone else',
  'Audio quality too low — please re-record or re-master',
  'Explicit content not tagged — please mark as explicit and resubmit',
  'Incomplete submission — missing cover art or description',
  'Does not fit our platform — not a music upload',
  'Other (see note below)',
]

const POST_REASONS = [
  'Copyright infringement — content appears to be copied from another source',
  'Plagiarism detected — article is not original',
  'Defamatory content — contains unverified or harmful claims about individuals',
  'Fake news or misinformation — claims are not factual',
  'Inappropriate content — violates community guidelines',
  'Poor quality — article needs significant editing before resubmission',
  'Duplicate post — similar content already published',
  'Other (see note below)',
]

export function RejectMusicModal({ open, track, onClose, onReject }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customNote, setCustomNote] = useState('')

  const handleReject = () => {
    const note = selectedReason === 'Other (see note below)'
      ? customNote
      : selectedReason + (customNote ? '. ' + customNote : '')
    onReject(track, note)
    setSelectedReason(''); setCustomNote(''); onClose()
  }

  return (
    <Modal open={open} onClose={() => { setSelectedReason(''); setCustomNote(''); onClose() }} title="Reject Track">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 6 }}>
        <XCircle size={16} color="var(--red)" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{track?.title}</span>
        <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>by {track?.artist_name}</span>
      </div>

      <div className="form-group">
        <label className="form-label">Reason for rejection *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MUSIC_REASONS.map(reason => (
            <label key={reason} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: selectedReason === reason ? 'var(--red-glow)' : 'var(--bg-surface)', border: `1px solid ${selectedReason === reason ? 'var(--border-red)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}>
              <input type="radio" name="music-reason" value={reason} checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)} style={{ marginTop: 2, accentColor: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--grey-100)', lineHeight: 1.5 }}>{reason}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Additional note (optional)</label>
        <textarea className="form-control" rows={3} placeholder="Add specific details to help the artist fix their submission..."
          value={customNote} onChange={e => setCustomNote(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={() => { setSelectedReason(''); setCustomNote(''); onClose() }}>Cancel</button>
        <button className="btn btn-danger" onClick={handleReject} disabled={!selectedReason}>
          <XCircle size={15} /> Reject Track
        </button>
      </div>
    </Modal>
  )
}

export function RejectPostModal({ open, post, onClose, onReject }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customNote, setCustomNote] = useState('')

  const handleReject = () => {
    const note = selectedReason === 'Other (see note below)'
      ? customNote
      : selectedReason + (customNote ? '. ' + customNote : '')
    onReject(post, note)
    setSelectedReason(''); setCustomNote(''); onClose()
  }

  return (
    <Modal open={open} onClose={() => { setSelectedReason(''); setCustomNote(''); onClose() }} title="Reject Post">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 6 }}>
        <XCircle size={16} color="var(--red)" />
        <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post?.title}</span>
      </div>

      <div className="form-group">
        <label className="form-label">Reason for rejection *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {POST_REASONS.map(reason => (
            <label key={reason} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: selectedReason === reason ? 'var(--red-glow)' : 'var(--bg-surface)', border: `1px solid ${selectedReason === reason ? 'var(--border-red)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}>
              <input type="radio" name="post-reason" value={reason} checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)} style={{ marginTop: 2, accentColor: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--grey-100)', lineHeight: 1.5 }}>{reason}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Additional note (optional)</label>
        <textarea className="form-control" rows={3} placeholder="Add specific feedback to help the blogger fix their submission..."
          value={customNote} onChange={e => setCustomNote(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={() => { setSelectedReason(''); setCustomNote(''); onClose() }}>Cancel</button>
        <button className="btn btn-danger" onClick={handleReject} disabled={!selectedReason}>
          <XCircle size={15} /> Reject Post
        </button>
      </div>
    </Modal>
  )
}
