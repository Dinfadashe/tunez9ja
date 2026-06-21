import React, { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

// ===== SEED DATA =====
const INITIAL_USERS = [
  { id: 'u1', email: 'admin@tunez9ja.com', password: 'admin123', name: 'Admin', role: 'admin', avatar: null, joined: '2021-01-01' },
  { id: 'u2', email: 'burna@tunez9ja.com', password: 'artist123', name: 'Burna Wave', role: 'artist', avatar: null, joined: '2024-01-15', bio: 'Afrobeats sensation from Lagos', genre: 'Afrobeats', verified: true },
  { id: 'u3', email: 'davido@tunez9ja.com', password: 'artist123', name: 'DaViDo NG', role: 'artist', avatar: null, joined: '2024-03-10', bio: 'Superstar vibes always', genre: 'Afropop', verified: false },
  { id: 'u4', email: 'blogger@tunez9ja.com', password: 'blog123', name: 'ChiCity Blogger', role: 'blogger', avatar: null, joined: '2024-06-01', bio: 'Music journalist & culture writer' },
  { id: 'u5', email: 'zara@tunez9ja.com', password: 'blog123', name: 'Zara Writes', role: 'blogger', avatar: null, joined: '2024-08-20', bio: 'Entertainment reporter' },
]

const INITIAL_MUSIC = [
  { id: 'm1', title: 'Lagos Nights', artist: 'Burna Wave', artistId: 'u2', genre: 'Afrobeats', duration: '3:42', fileUrl: null, coverUrl: null, status: 'approved', uploadDate: '2024-11-10', plays: 12400, description: 'A midnight cruise through Lagos energy.' },
  { id: 'm2', title: 'Soro Soke Remix', artist: 'DaViDo NG', artistId: 'u3', genre: 'Afropop', duration: '4:01', fileUrl: null, coverUrl: null, status: 'pending', uploadDate: '2024-12-01', plays: 0, description: 'Fresh remix dropping hard.' },
  { id: 'm3', title: 'Jollof Season', artist: 'Burna Wave', artistId: 'u2', genre: 'Highlife', duration: '3:18', fileUrl: null, coverUrl: null, status: 'approved', uploadDate: '2024-10-22', plays: 8900, description: 'Celebrating Nigerian culture.' },
  { id: 'm4', title: 'Owambe Vibe', artist: 'DaViDo NG', artistId: 'u3', genre: 'Afropop', duration: '2:55', fileUrl: null, coverUrl: null, status: 'rejected', uploadDate: '2024-09-14', plays: 0, description: 'Party starter track.' },
  { id: 'm5', title: 'Street Money', artist: 'Burna Wave', artistId: 'u2', genre: 'Afrobeats', duration: '3:29', fileUrl: null, coverUrl: null, status: 'pending', uploadDate: '2025-01-05', plays: 0, description: 'For the hustlers on the block.' },
]

const INITIAL_POSTS = [
  { id: 'p1', title: 'Burna Wave Drops Heat: Lagos Nights Review', excerpt: 'The debut single from rising star Burna Wave is everything we expected and more — a cinematic journey through Lagos after dark.', content: 'The debut single from rising star Burna Wave is everything we expected and more...', category: 'Music Review', author: 'ChiCity Blogger', authorId: 'u4', status: 'approved', date: '2024-11-12', coverUrl: null, tags: ['afrobeats', 'new music', 'review'] },
  { id: 'p2', title: 'Top 10 Nigerian Artists to Watch in 2025', excerpt: 'From Abuja to Port Harcourt, the next generation of Nigerian music stars is ready to shake the world. Here\'s our definitive list.', content: 'The Nigerian music scene never sleeps...', category: 'Feature', author: 'Zara Writes', authorId: 'u5', status: 'approved', date: '2024-12-20', coverUrl: null, tags: ['feature', '2025', 'spotlight'] },
  { id: 'p3', title: 'Grammy Buzz: Nigerian Acts in the Running', excerpt: 'Multiple Nigerian artists are generating serious Grammy conversation this cycle. We break down who has the best shot.', content: 'Grammy season is here and Nigeria is ready...', category: 'News', author: 'ChiCity Blogger', authorId: 'u4', status: 'pending', date: '2025-01-08', coverUrl: null, tags: ['grammy', 'news'] },
  { id: 'p4', title: 'The Owambe Playlist: Music for Every Party', excerpt: 'From classic highlife to modern afropop, we\'ve curated the ultimate Owambe soundtrack that will keep any party alive till morning.', content: 'Every Nigerian knows that an Owambe is serious business...', category: 'Playlist', author: 'Zara Writes', authorId: 'u5', status: 'pending', date: '2025-01-14', coverUrl: null, tags: ['playlist', 'party', 'owambe'] },
]

// ===== GENRE & CATEGORY OPTIONS =====
export const GENRES = ['Afrobeats', 'Afropop', 'Highlife', 'Amapiano', 'Fuji', 'Juju', 'Hip-Hop', 'R&B', 'Gospel', 'Nollywood OST', 'Trap', 'Street Pop']
export const CATEGORIES = ['Music Review', 'News', 'Feature', 'Gossip', 'Playlist', 'Interview', 'Opinion', 'Events']

export function AppProvider({ children }) {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [music, setMusic] = useState(INITIAL_MUSIC)
  const [posts, setPosts] = useState(INITIAL_POSTS)
  const [currentUser, setCurrentUser] = useState(null)
  const [toasts, setToasts] = useState([])

  // ===== TOAST =====
  const toast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  // ===== AUTH =====
  const login = useCallback((email, password) => {
    const user = users.find(u => u.email === email && u.password === password)
    if (user) { setCurrentUser(user); return { success: true, user } }
    return { success: false, error: 'Invalid email or password' }
  }, [users])

  const register = useCallback((data) => {
    if (users.find(u => u.email === data.email)) return { success: false, error: 'Email already registered' }
    const newUser = { id: 'u' + Date.now(), joined: new Date().toISOString().split('T')[0], ...data }
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
    return { success: true, user: newUser }
  }, [users])

  const logout = useCallback(() => { setCurrentUser(null) }, [])

  // ===== MUSIC ACTIONS =====
  const uploadMusic = useCallback((data) => {
    const track = { id: 'm' + Date.now(), status: 'pending', uploadDate: new Date().toISOString().split('T')[0], plays: 0, ...data }
    setMusic(prev => [...prev, track])
    return track
  }, [])

  const updateMusicStatus = useCallback((id, status, note) => {
    setMusic(prev => prev.map(m => m.id === id ? { ...m, status, reviewNote: note } : m))
  }, [])

  const deleteMusic = useCallback((id) => {
    setMusic(prev => prev.filter(m => m.id !== id))
  }, [])

  // ===== POST ACTIONS =====
  const createPost = useCallback((data) => {
    const post = { id: 'p' + Date.now(), status: 'pending', date: new Date().toISOString().split('T')[0], ...data }
    setPosts(prev => [...prev, post])
    return post
  }, [])

  const updatePostStatus = useCallback((id, status, note) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status, reviewNote: note } : p))
  }, [])

  const deletePost = useCallback((id) => {
    setPosts(prev => prev.filter(p => p.id !== id))
  }, [])

  const updatePost = useCallback((id, data) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...data, status: 'pending' } : p))
  }, [])

  const updateUser = useCallback((id, data) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u))
    if (currentUser?.id === id) setCurrentUser(prev => ({ ...prev, ...data }))
  }, [currentUser])

  // ===== COMPUTED =====
  const approvedMusic = music.filter(m => m.status === 'approved')
  const approvedPosts = posts.filter(p => p.status === 'approved')

  const stats = {
    totalUsers: users.filter(u => u.role !== 'admin').length,
    totalArtists: users.filter(u => u.role === 'artist').length,
    totalBloggers: users.filter(u => u.role === 'blogger').length,
    totalMusic: music.length,
    pendingMusic: music.filter(m => m.status === 'pending').length,
    approvedMusic: approvedMusic.length,
    totalPosts: posts.length,
    pendingPosts: posts.filter(p => p.status === 'pending').length,
    approvedPosts: approvedPosts.length,
  }

  return (
    <AppContext.Provider value={{
      users, music, posts, currentUser, toasts,
      approvedMusic, approvedPosts, stats,
      login, register, logout, toast,
      uploadMusic, updateMusicStatus, deleteMusic,
      createPost, updatePostStatus, deletePost, updatePost,
      updateUser,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
