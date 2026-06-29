import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { MusicArt } from './UI.jsx'
import { UserPlus, UserMinus, Music2, Video, Newspaper, Users, Play } from 'lucide-react'

// ── SQL needed in Supabase Dashboard ────────────────────────
// CREATE TABLE IF NOT EXISTS follows (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
//   following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
//   created_at timestamptz DEFAULT now(),
//   UNIQUE(follower_id, following_id)
// );
// CREATE INDEX IF NOT EXISTS follows_follower ON follows(follower_id);
// CREATE INDEX IF NOT EXISTS follows_following ON follows(following_id);

function getYtId(url) {
  if (!url) return null
  if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0]
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0]
  if (url.includes('/shorts/')) return url.split('/shorts/')[1].split('?')[0]
  if (url.includes('/embed/')) return url.split('/embed/')[1].split('?')[0]
  return null
}

function Avatar({ profile, size = 56 }) {
  const initials = (profile?.name || profile?.username || '?').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-red)' }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: 'white', border: '2px solid var(--border-red)', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function StatPill({ value, label }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 64 }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--white)', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
}

function FollowButton({ profileId, currentUser, onFollowChange }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentUser?.id || !profileId) return
    supabase.from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profileId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data))
  }, [currentUser?.id, profileId])

  if (!currentUser || currentUser.id === profileId) return null

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    if (following) {
      await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId)
      setFollowing(false)
      onFollowChange && onFollowChange(-1)
    } else {
      await supabase.from('follows')
        .insert({ follower_id: currentUser.id, following_id: profileId })
      setFollowing(true)
      onFollowChange && onFollowChange(1)
      // Notify the profile owner
      supabase.from('notifications').insert({
        user_id: profileId,
        type: 'new_follower',
        message: (currentUser.name || 'Someone') + ' started following you',
        is_read: false,
      }).catch(() => {})
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 20,
        background: following ? 'transparent' : 'var(--red)',
        border: following ? '1px solid var(--border)' : '1px solid var(--red)',
        color: following ? 'var(--grey-300)' : 'white',
        cursor: 'pointer', fontSize: 13, fontWeight: 700,
        transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (following) { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' } }}
      onMouseLeave={e => { if (following) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--grey-300)' } }}
    >
      {following ? <><UserMinus size={14} /> Unfollow</> : <><UserPlus size={14} /> Follow</>}
    </button>
  )
}

export default function ProfilePage({ profileId, currentUser, setPage }) {
  const [profile, setProfile]       = useState(null)
  const [tracks, setTracks]         = useState([])
  const [videos, setVideos]         = useState([])
  const [posts, setPosts]           = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [tab, setTab]               = useState('music')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!profileId) return
    setLoading(true)
    setTab('music')

    // Fetch profile
    supabase.from('profiles').select('*').eq('id', profileId).single()
      .then(({ data }) => { setProfile(data); setLoading(false) })

    // Follower / following counts
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId)
      .then(({ count }) => setFollowerCount(count || 0))
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId)
      .then(({ count }) => setFollowingCount(count || 0))

    // Content
    supabase.from('music_tracks').select('*, profiles:artist_id(name,avatar_url,is_verified)')
      .eq('artist_id', profileId).eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTracks(data || []))

    supabase.from('videos').select('*')
      .eq('uploader_id', profileId).eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setVideos(data || []))

    supabase.from('blog_posts').select('*')
      .eq('author_id', profileId).eq('status', 'approved')
      .order('published_at', { ascending: false })
      .then(({ data }) => setPosts(data || []))
  }, [profileId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--grey-500)', fontSize: 14 }}>
      Loading profile…
    </div>
  )

  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--grey-500)', fontSize: 14 }}>
      Profile not found.
    </div>
  )

  const role = profile.role || 'user'
  const roleLabel = role === 'artist' ? '🎤 Artist' : role === 'blogger' ? '✍️ Blogger' : role === 'editor' ? '📋 Editor' : '👤 User'

  // Which tabs to show per role
  const TABS = [
    role === 'artist' && { key: 'music',  label: 'Music',   icon: Music2,    count: tracks.length },
    role === 'artist' && { key: 'videos', label: 'Videos',  icon: Video,     count: videos.length },
    role === 'blogger' && { key: 'posts', label: 'Articles', icon: Newspaper, count: posts.length },
    { key: 'followers', label: 'Followers', icon: Users, count: followerCount },
  ].filter(Boolean)

  const activeTab = TABS.find(t => t.key === tab) ? tab : (TABS[0] ? TABS[0].key : 'followers')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 80px' }}>
      {/* ── Profile header ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(200,16,46,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '32px 0 24px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar profile={profile} size={80} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--white)', letterSpacing: 0.5 }}>
                {profile.name || profile.username || 'Unknown'}
              </h1>
              {profile.is_verified && <span title="Verified" style={{ fontSize: 18 }}>✅</span>}
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(200,16,46,0.15)', color: 'var(--red)', padding: '2px 8px', borderRadius: 10, letterSpacing: 0.5 }}>
                {roleLabel}
              </span>
            </div>
            {profile.bio && (
              <p style={{ fontSize: 13, color: 'var(--grey-400)', lineHeight: 1.6, marginBottom: 12, maxWidth: 480 }}>
                {profile.bio}
              </p>
            )}
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 14 }}>
              <StatPill value={followerCount} label="Followers" />
              <StatPill value={followingCount} label="Following" />
              {role === 'artist' && <StatPill value={tracks.length} label="Tracks" />}
              {role === 'blogger' && <StatPill value={posts.length} label="Articles" />}
            </div>
            <FollowButton profileId={profileId} currentUser={currentUser}
              onFollowChange={delta => setFollowerCount(c => c + delta)} />
          </div>
        </div>
      </div>

      {/* ── Content tabs ── */}
      {TABS.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
            {TABS.map(t => {
              const Icon = t.icon
              const isActive = activeTab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', background: 'none', border: 'none',
                    borderBottom: isActive ? '2px solid var(--red)' : '2px solid transparent',
                    color: isActive ? 'var(--red)' : 'var(--grey-500)',
                    cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 400,
                    transition: 'all 0.15s', marginBottom: -1,
                  }}>
                  <Icon size={14} />
                  {t.label}
                  <span style={{ fontSize: 10, background: 'var(--bg-surface)', color: 'var(--grey-500)', padding: '1px 5px', borderRadius: 8, fontFamily: 'var(--font-mono)' }}>
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Music tab ── */}
          {activeTab === 'music' && (
            tracks.length === 0
              ? <EmptyState icon={<Music2 size={36} />} text="No approved tracks yet" />
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {tracks.map(t => <TrackCard key={t.id} track={t} />)}
                </div>
          )}

          {/* ── Videos tab ── */}
          {activeTab === 'videos' && (
            videos.length === 0
              ? <EmptyState icon={<Video size={36} />} text="No approved videos yet" />
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {videos.map(v => <VideoCard key={v.id} video={v} />)}
                </div>
          )}

          {/* ── Posts tab ── */}
          {activeTab === 'posts' && (
            posts.length === 0
              ? <EmptyState icon={<Newspaper size={36} />} text="No published articles yet" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {posts.map(p => <PostCard key={p.id} post={p} setPage={setPage} />)}
                </div>
          )}

          {/* ── Followers tab ── */}
          {activeTab === 'followers' && (
            <FollowersList profileId={profileId} />
          )}
        </>
      )}
    </div>
  )
}

function TrackCard({ track }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ position: 'relative', paddingBottom: '100%', background: '#111' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {track.cover_url
            ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <MusicArt title={track.title} size={120} />
          }
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
            </div>
          </div>
          {track.is_premium && (
            <div style={{ position: 'absolute', top: 8, right: 8, background: '#ffb400', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#000' }}>PREMIUM</div>
          )}
        </div>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--white)' }}>{track.title}</div>
        <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{track.genre} · {track.duration || '—'}</div>
      </div>
    </div>
  )
}

function VideoCard({ video }) {
  const ytId = getYtId(video.youtube_url)
  const thumb = ytId ? 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg' : null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#111' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {thumb ? <img src={thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={32} style={{ opacity: 0.3 }} /></div>}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--white)' }}>{video.title}</div>
      </div>
    </div>
  )
}

function PostCard({ post, setPage }) {
  return (
    <div onClick={() => setPage('blog')}
      style={{ display: 'flex', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {post.cover_url && (
        <img src={post.cover_url} alt={post.title} style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{post.category}</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.title}</div>
        <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>
          {post.published_at ? post.published_at.slice(0, 10) : '—'}
          {post.is_premium && <span style={{ marginLeft: 8, background: '#ffb400', color: '#000', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>PREMIUM</span>}
        </div>
      </div>
    </div>
  )
}

function FollowersList({ profileId }) {
  const [followers, setFollowers] = useState([])
  useEffect(() => {
    supabase.from('follows')
      .select('follower:follower_id(id,name,avatar_url,role,is_verified)')
      .eq('following_id', profileId)
      .limit(50)
      .then(({ data }) => setFollowers((data || []).map(f => f.follower).filter(Boolean)))
  }, [profileId])

  if (followers.length === 0) return <EmptyState icon={<Users size={36} />} text="No followers yet" />
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {followers.map(f => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
          <Avatar profile={f} size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name || 'Unknown'} {f.is_verified ? '✅' : ''}
            </div>
            <div style={{ fontSize: 10, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>{f.role || 'user'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--grey-600)' }}>
      <div style={{ opacity: 0.3, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 14 }}>{text}</p>
    </div>
  )
}
