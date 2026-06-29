import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // Log to console for debugging
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || 'Unknown error'
    const isChunkError = msg.includes('Failed to fetch') || msg.includes('dynamically imported')

    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #0a0a0a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'sans-serif',
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--bg-card, #141414)',
          border: '1px solid rgba(200,16,46,0.3)',
          borderRadius: 16,
          padding: 36,
          textAlign: 'center',
        }}>
          {/* Logo */}
          <div style={{ fontSize: 36, marginBottom: 16 }}>🎵</div>

          <h1 style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 28,
            letterSpacing: 1,
            color: '#f0f0f0',
            marginBottom: 8,
          }}>
            TUNEZ<span style={{ color: '#C8102E' }}>9JA</span>
          </h1>

          <p style={{ fontSize: 15, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
            {isChunkError
              ? 'A new version of Tunez9ja was deployed. Please reload to get the latest.'
              : 'Something went wrong on this page. Don\'t worry — your music and data are safe.'}
          </p>

          {/* Error detail (collapsed by default) */}
          <details style={{ marginBottom: 24, textAlign: 'left' }}>
            <summary style={{ fontSize: 12, color: '#555', cursor: 'pointer', fontFamily: 'monospace' }}>
              Error details
            </summary>
            <pre style={{
              marginTop: 8, padding: 12, background: '#0a0a0a',
              border: '1px solid #222', borderRadius: 8,
              fontSize: 11, color: '#666', overflow: 'auto',
              maxHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {msg}
            </pre>
          </details>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 28px', borderRadius: 8,
                background: '#C8102E', border: 'none',
                color: 'white', fontWeight: 700, fontSize: 14,
                cursor: 'pointer',
              }}>
              Reload Page
            </button>
            <button
              onClick={() => { sessionStorage.clear(); window.location.href = '/' }}
              style={{
                padding: '12px 28px', borderRadius: 8,
                background: 'none', border: '1px solid #333',
                color: '#aaa', fontWeight: 600, fontSize: 14,
                cursor: 'pointer',
              }}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
