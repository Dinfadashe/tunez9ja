import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const LOGO_SRC = "/logo.png"

export function Logo({ size = 40, style = {} }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Tunez9ja"
      width={size}
      height={size}
      style={{ objectFit: 'contain', ...style }}
    />
  )
}

export function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <CheckCircle size={16} color="#00c864" />}
          {t.type === 'error'   && <AlertCircle size={16} color="#c8102e" />}
          {t.type === 'info'    && <Info size={16} color="#00b4dc" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, danger }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>
        <p style={{ color: 'var(--grey-300)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose() }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--grey-500)', flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Avatar({ name, size = 36 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'
  const colors   = ['#c8102e','#7b4fff','#00b4dc','#00c864','#ff6b35']
  const color    = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
      {initials}
    </div>
  )
}

export function MusicArt({ title, size = 120 }) {
  const colors = ['#c8102e33','#7b4fff33','#00b4dc33','#ff6b3533']
  const idx    = title?.charCodeAt(0) % colors.length || 0
  return (
    <div style={{ width: size, height: size, background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 4 }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    </div>
  )
}
