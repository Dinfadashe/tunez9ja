import React, { useState, useEffect } from 'react'
import CommentsSection, { ReactionBar } from '../components/CommentsSection.jsx'
import ShareButton from '../components/ShareButton.jsx'
import { earnRead, isUnlocked } from '../lib/tunez.js'
import PremiumUnlockModal from '../components/PremiumUnlockModal.jsx'
import { supabase } from '../lib/supabase.js'

import { SearchBar, EmptyState } from '../components/UI.jsx'
import { Newspaper, Clock, User, ArrowLeft, Eye } from 'lucide-react'

// Simple HTML sanitizer — strips dangerous tags/attrs before render
function sanitizeHTML(html) {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
}



const CATEGORIES = ['Music Review','News','Feature','Gossip','Playlist','Interview','Opinion','Events']

export default function BlogPage({ currentUser }) {
  const [unlockTarget, setUnlockTarget] = useState(null)
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedPost, setSelectedPost] = useState(null)

  // Open post from deep link
  useEffect(() => {
    if (!deepLink?.type === 'post' || !deepLink?.id) return
    supabase.from('blog_posts').select('*,profiles:author_id(name,is_verified,verified_type)')
      .eq('id', deepLink.id).single()
      .then(({ data }) => { if (data) setSelectedPost(data) })
  }, [deepLink])

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('*, profiles:author_id ( name, avatar_url )')
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Blog fetch error:', error)
        setPosts(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = posts.filter(p => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.name?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'All' || p.category === activeCategory
    return matchSearch && matchCategory
  })

  const categories = ['All', ...new Set(posts.map(p => p.category).filter(Boolean))]

  const [featured, ...rest] = filtered

  if (selectedPost) return <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} currentUser={currentUser} />

  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#0a0d1a 0%,var(--bg-deep) 100%)', padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-label">Entertainment Desk</div>
          <h1 className="page-title">THE BLOG</h1>
          <p style={{ color: 'var(--grey-300)', marginTop: 12, fontSize: 15 }}>
            {loading ? 'Loading...' : `${posts.length} article${posts.length !== 1 ? 's' : ''} published`}
          </p>
        </div>
      </div>

      <div className="container section">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', maxWidth: 360 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search posts..." />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-mono)', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', background: activeCategory === c ? 'var(--red)' : 'transparent', borderColor: activeCategory === c ? 'var(--red)' : 'var(--border)', color: activeCategory === c ? 'white' : 'var(--grey-300)' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
            LOADING POSTS...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Newspaper size={48} />}
            title={posts.length === 0 ? 'No posts published yet' : 'No posts found'}
            message={posts.length === 0 ? 'Check back soon for the latest entertainment news.' : 'Try adjusting your search or category filter.'}
          />
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <div onClick={() => setSelectedPost(featured)}
                style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: 32, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,180,220,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ background: 'linear-gradient(135deg,#0a0d1a,#1a1a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
                  {featured.cover_url
                    ? <img src={featured.cover_url} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Newspaper size={64} style={{ opacity: 0.12 }} />
                  }
                </div>
                <div style={{ padding: 36 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-blog">{featured.category}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />{featured.published_at?.slice(0,10) || featured.created_at?.slice(0,10)}
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, letterSpacing: 0.5, marginBottom: 16, lineHeight: 1.15 }}>{featured.title}</h2>
                  <p style={{ color: 'var(--grey-300)', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>{featured.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--grey-500)' }}>
                    <User size={13} /> {featured.profiles?.name || 'Tunez9ja'}
                  </div>
                </div>
              </div>
            )}

            {/* Rest of posts */}
            {rest.length > 0 && (
              <div className="grid-3">
                {rest.map(post => (
                  <div key={post.id} className="blog-card" onClick={async () => {
                  if (post.is_premium) {
                    const unlocked = await isUnlocked(currentUser?.id, post.id)
                    if (!unlocked) { setUnlockTarget(post); return }
                  }
                  setSelectedPost(post)
                }} style={{ cursor: 'pointer' }}>
                    <div className="blog-card-img">
                      {post.cover_url
                        ? <img src={post.cover_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--bg-surface),#0a0d1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Newspaper size={32} style={{ opacity: 0.2 }} />
                          </div>
                      }
                    </div>
                    <div className="blog-card-body">
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                        <div className="blog-card-category" style={{margin:0}}>{post.category}</div>
                        {post.is_premium && <span style={{ fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 8px', borderRadius:20, background:'rgba(255,180,0,0.15)', color:'#ffb400', border:'1px solid rgba(255,180,0,0.3)' }}>💎 {post.tunez_price}T</span>}
                      </div>
                      <h3 className="blog-card-title">{post.title}</h3>
                      <p className="blog-card-excerpt">{post.excerpt}</p>
      <div className="blog-card-meta">
                        <span>{post.profiles?.name || 'Tunez9ja'}</span>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}>👁 {post.view_count?.toLocaleString() || 0}</span>
                        <span>{post.published_at?.slice(0,10) || post.created_at?.slice(0,10)}</span>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <ReactionBar targetType="post" targetId={post.id} currentUser={currentUser} compact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {unlockTarget && (
        <PremiumUnlockModal
          content={unlockTarget}
          contentType="post"
          currentUser={currentUser}
          onClose={() => setUnlockTarget(null)}
          onUnlocked={() => { setSelectedPost(unlockTarget); setUnlockTarget(null) }}
          setPage={() => {}}
        />
      )}
    </div>
  )
}

function PostDetail({ post, onBack, currentUser }) {
  useEffect(() => {
    window.scrollTo(0, 0)
    supabase.rpc('increment_view_count', { p_post_id: post.id })
      .then(() => {}).catch(() => {})

    // Earn TUNEZ after 15s of reading
    if (!currentUser?.id) return
    const timer = setTimeout(async () => {
      try {
        const result = await earnRead(currentUser.id, post)
        if (result) console.log('✅ TUNEZ earned from read:', result.userAmt)
        else console.log('ℹ️ No TUNEZ earned (cooldown/cap)')
      } catch(e) { console.error('❌ earnRead error:', e) }
    }, 15000)
    return () => clearTimeout(timer)
  }, [post.id])

  if (!post) return null

  const date    = post.published_at?.slice(0,10) || post.created_at?.slice(0,10) || ''
  const author  = post.profiles?.name || 'Tunez9ja'
  const content = post.content || ''
  const excerpt = post.excerpt || ''

  return (
    <div style={{ minHeight: '80vh', background: 'var(--bg-deep)' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#0a0d1a 0%,var(--bg-deep) 100%)', padding: '48px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <button onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0 }}>
            <ArrowLeft size={15} /> Back to Blog
          </button>

          {/* Category + tags */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            {post.category && <span className="badge badge-blog">{post.category}</span>}
            {post.tags?.filter(Boolean).map(tag => (
              <span key={tag} style={{ fontSize: 12, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>#{tag}</span>
            ))}
          </div>

          {/* Title */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:20 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,44px)', letterSpacing: 0.5, lineHeight: 1.08, color: 'var(--white)' }}>
              {post.title}
            </h1>
            <ShareButton url={window.location.origin + '/?post=' + post.id} text={'Read ' + post.title + ' on Tunez9ja!'} title={post.title} />
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: 'var(--grey-500)', fontSize: 13, fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={13} /> {author}
            </span>
            {date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> {date}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={13} /> {post.view_count?.toLocaleString() || 0} views
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container" style={{ maxWidth: 800, padding: '40px 24px 80px' }}>

        {/* Cover image */}
        {post.cover_url ? (
          <img src={post.cover_url} alt={post.title}
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 12, marginBottom: 36, display: 'block' }} />
        ) : (
          <div style={{ height: 200, background: 'linear-gradient(135deg,#0a0d1a,#1a0a0d)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
            <Newspaper size={56} style={{ opacity: 0.08 }} />
          </div>
        )}

        {/* Excerpt lead */}
        {excerpt && (
          <p style={{ fontSize: 18, color: 'var(--grey-100)', lineHeight: 1.85, marginBottom: 28, fontWeight: 500, borderLeft: '3px solid var(--red)', paddingLeft: 20 }}>
            {excerpt}
          </p>
        )}

        {(excerpt && content) && <div className="divider" />}

        {/* Full HTML content */}
        {content ? (
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
            style={{ fontSize: 16, color: 'var(--grey-300)', lineHeight: 2 }}
          />
        ) : (
          <p style={{ color: 'var(--grey-500)', fontSize: 15, lineHeight: 1.8 }}>
            No content available for this post yet.
          </p>
        )}

        {/* Tags */}
        {post.tags?.filter(Boolean).length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 1 }}>TAGS:</span>
            {post.tags.filter(Boolean).map(tag => (
              <span key={tag} style={{ padding: '4px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grey-300)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Reactions */}
        <div style={{ marginTop: 32, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>Was this helpful?</span>
          <ReactionBar targetType="post" targetId={post.id} currentUser={currentUser} />
        </div>

        {/* Comments */}
        <CommentsSection targetType="post" targetId={post.id} currentUser={currentUser} />

        {/* Reactions */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>Was this helpful?</span>
          <ReactionBar targetType="post" targetId={post.id} currentUser={currentUser} />
        </div>

        <button onClick={onBack}
          style={{ marginTop: 48, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--grey-300)', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.color='var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--grey-300)' }}
        >
          <ArrowLeft size={15} /> Back to Blog
        </button>
      </div>
    </div>
  )
}
