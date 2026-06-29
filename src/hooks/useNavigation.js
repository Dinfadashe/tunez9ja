import { useState, useCallback, useEffect } from 'react'

// Browser-style page history for Tunez9ja
// Returns { page, setPage, goBack, goForward, canGoBack, canGoForward, history, historyIndex }

const PAGE_LABELS = {
  'home':               'Home',
  'music':              'Music',
  'videos':             'Videos',
  'blog':               'Blog',
  'about':              'About',
  'search':             'Search',
  'terms':              'Terms',
  'privacy':            'Privacy',
  'login':              'Sign In',
  'register':           'Register',
  'admin-dashboard':    'Admin Dashboard',
  'artist-dashboard':   'Artist Dashboard',
  'blogger-dashboard':  'Blogger Dashboard',
  'user-dashboard':     'My Account',
  'editor-dashboard':   'Editor Dashboard',
}

export function getPageLabel(page) {
  return PAGE_LABELS[page] || page
}

export default function useNavigation(initialPage = 'home') {
  const [history, setHistory]       = useState([initialPage])
  const [historyIndex, setIndex]    = useState(0)

  const page = history[historyIndex]

  const setPage = useCallback((newPage) => {
    if (!newPage) return
    setHistory(prev => {
      // Drop forward history when navigating to a new page
      const base = prev.slice(0, historyIndex + 1)
      // Don't add duplicate consecutive pages
      if (base[base.length - 1] === newPage) return prev
      return [...base, newPage]
    })
    setIndex(prev => {
      const base = history.slice(0, prev + 1)
      if (base[base.length - 1] === newPage) return prev
      return prev + 1
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [history, historyIndex])

  const goBack = useCallback(() => {
    setIndex(prev => Math.max(0, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goForward = useCallback(() => {
    setIndex(prev => Math.min(history.length - 1, prev + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [history.length])

  const canGoBack    = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1

  // Keyboard shortcuts: Alt+Left / Alt+Right
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key === 'ArrowLeft'  && canGoBack)    { e.preventDefault(); goBack() }
      if (e.altKey && e.key === 'ArrowRight' && canGoForward) { e.preventDefault(); goForward() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canGoBack, canGoForward, goBack, goForward])

  return { page, setPage, goBack, goForward, canGoBack, canGoForward, history, historyIndex }
}
