import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { sendNotification } from './NotificationsPanel.jsx'
import { earnReact, earnComment } from '../lib/tunez.js'
import { ThumbsUp, ThumbsDown, MessageCircle, Reply, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react'

const sanitizeText = (s) => s?.trim().replace(/<[^>]*>/g, '') || ''


// ── Reaction bar (likes/dislikes) ─────────────────────────────
export function ReactionBar({ targetType, targetId, currentUser, compact = false }) {
  const [likes,    setLikes]    = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [myReaction, setMyReaction] = useState(null) // 'like' | 'dislike' | null
  const [loading,  setLoading]  = useState(false)
  const [needLogin, setNeedLogin] = useState(false)

  const col = targetType === 'post' ? 'post_id'
            : targetType === 'track' ? 'track_id'
            : targetType === 'video' ? 'video_id'
            : 'comment_id'

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from('reactions')
      .select('id, type, user_id')
      .eq(col, targetId)
    if (!data) return
    setLikes(data.filter(r => r.type === 'like').length)
    setDislikes(data.filter(r => r.type === 'dislike').length)
    if (currentUser) {
      const mine = data.find(r => r.user_id === currentUser.id)
      setMyReaction(mine?.type || null)
    }
  }, [targetId, currentUser, col])

  useEffect(() => { fetchReactions() }, [fetchReactions])

  const react = async (type) => {
    if (!currentUser) { setNeedLogin(true); setTimeout(() => setNeedLogin(false), 2500); return }
    setLoading(true)
    const paramMap = { post_id: 'p_post_id', track_id: 'p_track_id', video_id: 'p_video_id', comment_id: 'p_comment_id' }
    const rpcArgs = { p_user_id: currentUser.id, p_type: type }
    rpcArgs[paramMap[col]] = targetId
    await supabase.rpc('toggle_reaction', rpcArgs)
    await fetchReactions()
    // Earn TUNEZ for reacting (first time only — handled by cooldown in tunez.js)
    await earnReact(currentUser.id, null, targetId, 'content').catch(() => {})
    setLoading(false)
  }

  const size = compact ? 13 : 15

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={() => react('like')}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: compact ? '4px 10px' : '6px 14px',
          borderRadius: 20, border: '1px solid',
          background: myReaction === 'like' ? 'rgba(0,200,100,0.15)' : 'transparent',
          borderColor: myReaction === 'like' ? 'rgba(0,200,100,0.5)' : 'var(--border)',
          color: myReaction === 'like' ? '#00c864' : 'var(--grey-300)',
          cursor: 'pointer', fontSize: compact ? 12 : 13, fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        <ThumbsUp size={size} />
        {likes > 0 && <span>{likes}</span>}
      </button>

      <button
        onClick={() => react('dislike')}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: compact ? '4px 10px' : '6px 14px',
          borderRadius: 20, border: '1px solid',
          background: myReaction === 'dislike' ? 'var(--red-glow)' : 'transparent',
          borderColor: myReaction === 'dislike' ? 'var(--border-red)' : 'var(--border)',
          color: myReaction === 'dislike' ? 'var(--red)' : 'var(--grey-300)',
          cursor: 'pointer', fontSize: compact ? 12 : 13, fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        <ThumbsDown size={size} />
        {dislikes > 0 && <span>{dislikes}</span>}
      </button>

      {needLogin && (
        <span style={{
          fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)',
          animation: 'fadeUp 0.3s ease', background: 'var(--red-glow)',
          padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border-red)',
        }}>
          Sign in to react
        </span>
      )}
    </div>
  )
}

// ── Single comment ────────────────────────────────────────────
function Comment({ comment, currentUser, onReply, onDelete, depth = 0 }) {
  const [showReplies, setShowReplies] = useState(depth === 0)
  const isOwner = currentUser?.id === comment.user_id
  const isAdmin = currentUser?.role === 'admin'
  const date    = new Date(comment.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })

  return (
    <div style={{ marginLeft: depth > 0 ? 32 : 0 }}>
      <div style={{
        background: depth === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px', marginBottom: 10,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--red)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'var(--font-display)',
              fontSize: 16, flexShrink: 0, color: 'white',
            }}>
              {comment.profiles?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{comment.profiles?.name || 'Anonymous'}</div>
              <div style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>{date}</div>
            </div>
          </div>
          {(isOwner || isAdmin) && (
            <button onClick={() => onDelete(comment.id)}
              style={{ background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', padding: 4 }}
              title="Delete comment">
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Content */}
        <p style={{ fontSize: 14, color: 'var(--grey-100)', lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {comment.content}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ReactionBar targetType="comment" targetId={comment.id} currentUser={currentUser} compact />
          {depth === 0 && (
            <button onClick={() => onReply(comment)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
              <Reply size={13} /> Reply
            </button>
          )}
          {comment.replies?.length > 0 && depth === 0 && (
            <button onClick={() => setShowReplies(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
              {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && comment.replies?.map(reply => (
        <Comment key={reply.id} comment={reply} currentUser={currentUser}
          onReply={onReply} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  )
}

// ── Comment input box ─────────────────────────────────────────
function CommentInput({ currentUser, onSubmit, placeholder = 'Write a comment...', buttonLabel = 'Post', autoFocus = false }) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    if (!currentUser) { alert('Sign in to comment'); return }
    setLoading(true)
    await onSubmit(text.trim())
    setText('')
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, flexShrink: 0, color: 'white' }}>
        {currentUser?.name?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1 }}>
        <textarea
          autoFocus={autoFocus}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
          placeholder={currentUser ? placeholder : 'Sign in to comment...'}
          disabled={!currentUser || loading}
          maxLength={1000}
          rows={3}
          style={{
            width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', color: 'var(--white)', fontSize: 14,
            lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)',
            transition: 'border-color 0.2s', opacity: currentUser ? 1 : 0.6,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--red)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>
            {text.length}/1000 · Ctrl+Enter to post
          </span>
          <button
            onClick={submit}
            disabled={!text.trim() || loading || !currentUser}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', background: 'var(--red)', border: 'none',
              borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 13,
              fontWeight: 600, opacity: !text.trim() || !currentUser ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <Send size={13} /> {loading ? 'Posting...' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main CommentsSection ──────────────────────────────────────
export default function CommentsSection({ targetType, targetId, currentUser }) {
  const [comments,    setComments]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [replyingTo,  setReplyingTo]  = useState(null)
  const [count,       setCount]       = useState(0)

  const col = targetType === 'post'  ? 'post_id'
            : targetType === 'track' ? 'track_id'
            : 'video_id'

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(name, avatar_url)')
      .eq(col, targetId)
      .order('created_at', { ascending: false })
    if (!data) { setLoading(false); return }

    // Build tree: top-level + replies
    const top     = data.filter(c => !c.parent_id)
    const replies = data.filter(c =>  c.parent_id)
    const tree    = top.map(c => ({
      ...c,
      replies: replies.filter(r => r.parent_id === c.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }))

    // Deduplicate by id
    const seen = new Set()
    const unique = tree.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
    setComments(unique)
    setCount(data.length)
    setLoading(false)
  }, [targetId, col])

  useEffect(() => { fetchComments() }, [fetchComments])

  const postComment = async (content, parentId = null) => {
    const payload = {
      user_id:   currentUser.id,
      content,
      parent_id: parentId || null,
      [col]:     targetId,
    }
    await supabase.from('comments').insert(payload)
    await fetchComments()
    // Earn TUNEZ for commenting
    await earnComment(currentUser.id, null, targetId, 'content').catch(() => {})
    if (parentId) setReplyingTo(null)
  }

  const deleteComment = async (id) => {
    if (!confirm('Delete this comment?')) return
    await supabase.from('comments').delete().eq('id', id)
    await fetchComments()
  }

  return (
    <div style={{ marginTop: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <MessageCircle size={20} color="var(--red)" />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 0.5 }}>
          {count > 0 ? count + ' COMMENT' + (count !== 1 ? 'S' : '') : 'COMMENTS'}
        </h3>
      </div>

      {/* New comment input */}
      <div style={{ marginBottom: 32 }}>
        {currentUser ? (
          <CommentInput currentUser={currentUser} onSubmit={content => postComment(content)} />
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', fontSize: 14, color: 'var(--grey-300)', textAlign: 'center' }}>
            <MessageCircle size={18} style={{ display: 'inline', marginRight: 8, opacity: 0.5 }} />
            Sign in to join the conversation
          </div>
        )}
      </div>

      {/* Comments list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 2 }}>
          LOADING COMMENTS...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--grey-500)' }}>
          <MessageCircle size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 15 }}>No comments yet. Be the first!</div>
        </div>
      ) : (
        <div>
          {comments.map(comment => (
            <div key={comment.id}>
              <Comment
                comment={comment}
                currentUser={currentUser}
                onDelete={deleteComment}
                onReply={(c) => setReplyingTo(replyingTo?.id === c.id ? null : c)}
              />
              {/* Reply input for this comment */}
              {replyingTo?.id === comment.id && (
                <div style={{ marginLeft: 32, marginBottom: 16, padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 10 }}>
                    REPLYING TO {replyingTo.profiles?.name?.toUpperCase()}
                  </div>
                  <CommentInput
                    currentUser={currentUser}
                    autoFocus
                    placeholder={'Reply to ' + (replyingTo.profiles?.name || 'comment') + '...'}
                    buttonLabel="Reply"
                    onSubmit={content => postComment(content, comment.id)}
                  />
                  <button onClick={() => setReplyingTo(null)}
                    style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--grey-500)', cursor: 'pointer', fontSize: 12 }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
