// src/pages/DownloadsPage.jsx
// Downloaded music — works with no internet. Everything shown here comes from
// this device (localStorage records + Cache API), never from the server.
import React, { useEffect, useState } from 'react'
import { Download, Play, Pause, Trash2, WifiOff, ListMusic, HardDrive } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useDownloads, removeDownload, removeAllDownloads, formatBytes } from '../lib/downloads.js'

const asTrack = (d) => ({
  id: d.id, title: d.title, audio_url: d.audio_url, cover_url: d.cover_url,
  artist_id: d.artist_id, duration: d.duration, genre: d.genre,
  profiles: { name: d.artist }, _offline: true,
})

const fmtTime = (s) => {
  const n = Number(s)
  if (!n || !Number.isFinite(n)) return ''
  return Math.floor(n / 60) + ':' + String(Math.round(n % 60)).padStart(2, '0')
}

export default function DownloadsPage({ setPage }) {
  const { downloads, totalSize } = useDownloads()
  const { playTrack, nowPlaying, isPlaying, togglePlay } = usePlayer()
  const [online, setOnline] = useState(navigator.onLine)
  const [free, setFree] = useState(null)
  const [confirmAll, setConfirmAll] = useState(false)

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    navigator.storage?.estimate?.().then(e => setFree(e.quota && e.usage != null ? e.quota - e.usage : null)).catch(() => {})
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [downloads.length])

  const tracks = downloads.map(asTrack)
  const play = (t) => {
    if (nowPlaying?.id === t.id) { togglePlay(); return }
    playTrack(t, tracks)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: 3, marginBottom: 6 }}>YOUR MUSIC, OFFLINE</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 9vw, 56px)', lineHeight: 1, margin: 0 }}>DOWNLOADS</h1>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--grey-500)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{downloads.length} {downloads.length === 1 ? 'track' : 'tracks'} · {formatBytes(totalSize)}</span>
            {free != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><HardDrive size={12} /> {formatBytes(free)} free</span>}
          </div>
        </div>
        {downloads.length > 0 && (
          <button className="btn btn-primary" onClick={() => playTrack(tracks[0], tracks)}
            style={{ minHeight: 44, gap: 8 }}>
            <Play size={16} fill="currentColor" /> Play all
          </button>
        )}
      </div>

      {!online && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 16, background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.3)', color: '#ffcf66', fontSize: 13 }}>
          <WifiOff size={16} style={{ flexShrink: 0 }} /> You're offline — your downloads still play.
        </div>
      )}

      {downloads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 14 }}>
          <Download size={40} color="var(--grey-700)" />
          <h3 style={{ margin: '14px 0 6px' }}>No downloads yet</h3>
          <p style={{ color: 'var(--grey-500)', fontSize: 14, maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.6 }}>
            Tap <strong>⋮</strong> on any track and choose <strong>Download for offline</strong>. Downloaded music plays anywhere, even with no data.
          </p>
          {online && <button className="btn btn-secondary" onClick={() => setPage?.('music')} style={{ minHeight: 44 }}>Browse music</button>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tracks.map((t, i) => {
            const active = nowPlaying?.id === t.id
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderTop: i ? '1px solid var(--border)' : 'none', background: active ? 'rgba(200,16,46,0.08)' : 'none' }}>
                <button onClick={() => play(t)} aria-label={active && isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                  style={{ position: 'relative', width: 48, height: 48, borderRadius: 6, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, background: 'var(--bg-surface)' }}>
                  {t.cover_url
                    ? <img src={t.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                    : <ListMusic size={18} color="var(--grey-500)" />}
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', color: '#fff' }}>
                    {active && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </span>
                </button>
                <div onClick={() => play(t)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: active ? 'var(--red)' : 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.profiles?.name}{t.duration ? ' · ' + fmtTime(t.duration) : ''} · {formatBytes(downloads[i].size)}
                  </div>
                </div>
                <button onClick={() => removeDownload(t.id)} aria-label={`Remove download ${t.title}`}
                  style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {downloads.length > 1 && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {confirmAll ? (
            <span style={{ fontSize: 13, color: 'var(--grey-300)' }}>
              Remove all {downloads.length} downloads?{' '}
              <button className="btn btn-secondary" style={{ minHeight: 40, marginLeft: 8 }} onClick={() => { removeAllDownloads(); setConfirmAll(false) }}>Yes, remove</button>{' '}
              <button className="btn btn-ghost" style={{ minHeight: 40 }} onClick={() => setConfirmAll(false)}>Cancel</button>
            </span>
          ) : (
            <button className="btn btn-ghost" style={{ minHeight: 40, color: 'var(--grey-500)' }} onClick={() => setConfirmAll(true)}>Remove all downloads</button>
          )}
        </div>
      )}
    </div>
  )
}
