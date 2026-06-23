import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Users, Music, Newspaper, Video, Coins, TrendingUp, Disc } from 'lucide-react'

export default function AdminAnalytics() {
  const [stats,    setStats]    = useState(null)
  const [topUsers, setTopUsers] = useState([])
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id', { count:'exact', head:true }),
      supabase.from('profiles').select('id', { count:'exact', head:true }).eq('role','artist'),
      supabase.from('profiles').select('id', { count:'exact', head:true }).eq('role','blogger'),
      supabase.from('music_tracks').select('id', { count:'exact', head:true }).eq('status','approved'),
      supabase.from('blog_posts').select('id', { count:'exact', head:true }).eq('status','approved'),
      supabase.from('videos').select('id', { count:'exact', head:true }).eq('status','approved'),
      supabase.from('albums').select('id', { count:'exact', head:true }).eq('status','approved'),
      supabase.from('tunez_balances').select('total_earned').order('total_earned', { ascending:false }).limit(500),
      supabase.from('tunez_purchases').select('amount_ngn').eq('status','completed'),
    ]).then(([users, artists, bloggers, tracks, posts, videos, albums, balances, purchases]) => {
      const totalMinted  = (balances.data || []).reduce((s,b) => s + Number(b.total_earned), 0)
      const totalRevenue = (purchases.data || []).reduce((s,p) => s + Number(p.amount_ngn), 0)
      setStats({
        users:    users.count    || 0,
        artists:  artists.count  || 0,
        bloggers: bloggers.count || 0,
        tracks:   tracks.count   || 0,
        posts:    posts.count    || 0,
        videos:   videos.count   || 0,
        albums:   albums.count   || 0,
        minted:   totalMinted.toFixed(0),
        revenue:  totalRevenue.toFixed(2),
      })
    })

    // Top earners
    supabase.from('tunez_balances')
      .select('user_id, total_earned, balance, profiles:user_id(name, role, is_verified)')
      .order('total_earned', { ascending:false })
      .limit(10)
      .then(({ data }) => setTopUsers(data || []))

    // Recent signups
    supabase.from('profiles')
      .select('id, name, role, created_at, is_verified')
      .order('created_at', { ascending:false })
      .limit(8)
      .then(({ data }) => { setRecent(data || []); setLoading(false) })
  }, [])

  if (loading || !stats) return <div style={{ padding:60, textAlign:'center', color:'var(--grey-500)', fontFamily:'var(--font-mono)', letterSpacing:2 }}>LOADING ANALYTICS...</div>

  const STAT_CARDS = [
    { label:'Total Users',     val: stats.users,    icon: <Users size={24} />,     accent:'#00b4dc' },
    { label:'Artists',         val: stats.artists,  icon: <Music size={24} />,     accent:'#7b4fff' },
    { label:'Bloggers',        val: stats.bloggers, icon: <Newspaper size={24} />, accent:'#00b4dc' },
    { label:'Approved Tracks', val: stats.tracks,   icon: <Music size={24} />,     accent:'var(--red)' },
    { label:'Blog Posts',      val: stats.posts,    icon: <Newspaper size={24} />, accent:'#00b4dc' },
    { label:'Videos',          val: stats.videos,   icon: <Video size={24} />,     accent:'#00c864' },
    { label:'Albums',          val: stats.albums,   icon: <Disc size={24} />,      accent:'#7b4fff' },
    { label:'TUNEZ Minted',    val: stats.minted,   icon: <Coins size={24} />,     accent:'#ffb400' },
    { label:'Revenue (₦)',     val: `₦${Number(stats.revenue).toLocaleString()}`, icon: <TrendingUp size={24} />, accent:'#00c864' },
  ]

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', letterSpacing:3, marginBottom:8 }}>OVERVIEW</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:32 }}>ANALYTICS</h2>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:36 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{ background:'var(--bg-card)', border:`1px solid ${s.accent}33`, borderRadius:10, padding:'20px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:14, right:14, color:s.accent, opacity:0.3 }}>{s.icon}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:36, color:'var(--white)', marginBottom:4 }}>{s.val}</div>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--grey-500)', letterSpacing:1 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* Top earners */}
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:16 }}>TOP EARNERS</h3>
          {topUsers.map((u, i) => (
            <div key={u.user_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background: i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--bg-surface)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:14, color: i<3?'#000':'var(--grey-500)', flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{u.profiles?.name}{u.profiles?.is_verified&&' ✅'}</div>
                <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', textTransform:'uppercase' }}>{u.profiles?.role}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'#00c864', fontFamily:'var(--font-mono)' }}>{Number(u.total_earned).toFixed(0)}T</div>
            </div>
          ))}
        </div>

        {/* Recent signups */}
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:16 }}>RECENT SIGNUPS</h3>
          {recent.map(u => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background: u.role==='artist'?'#7b4fff':u.role==='blogger'?'#00b4dc':'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:16, color:'white', flexShrink:0 }}>{u.name?.[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{u.name}{u.is_verified&&' ✅'}</div>
                <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)', textTransform:'uppercase' }}>{u.role}</div>
              </div>
              <div style={{ fontSize:11, color:'var(--grey-500)', fontFamily:'var(--font-mono)' }}>
                {new Date(u.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
