"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { FeedPostCard } from "@/components/community/FeedPostCard"
import type { PostWithMeta } from "@/types/community"

interface CommentNode {
  id: string
  author_uid: string
  body: string
  created_at: string
  author: { username: string; display_name: string; avatar_url: string | null } | null
  replies: CommentNode[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function CommentItem({ comment, onDeleted }: { comment: CommentNode; onDeleted: (id: string) => void }) {
  const { user } = useAuth()
  const isOwner = user?.uid === comment.author_uid
  const [confirming, setConfirming] = useState(false)

  async function del() {
    if (!user) return
    const token = await user.getIdToken()
    const res = await fetch(`/api/community/comments/${comment.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) onDeleted(comment.id)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2.5">
        <span className="size-7 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xs shrink-0">
          {(comment.author?.display_name ?? "?")[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <Link href={`/community/${comment.author?.username ?? ""}`} className="text-xs font-semibold text-foreground hover:text-gold">
              {comment.author?.display_name ?? "Creator"}
            </Link>
            <p className="text-sm text-muted/92 whitespace-pre-wrap">{comment.body}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[0.6875rem] text-muted/70">{timeAgo(comment.created_at)}</span>
            {isOwner && (
              confirming ? (
                <>
                  <button onClick={del} className="text-[0.6875rem] text-red-400 hover:text-red-300">Confirm</button>
                  <button onClick={() => setConfirming(false)} className="text-[0.6875rem] text-muted/70">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirming(true)} className="text-[0.6875rem] text-muted/60 hover:text-red-400">Delete</button>
              )
            )}
          </div>
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div className="ml-9 flex flex-col gap-2 mt-1">
          {comment.replies.map((r) => <CommentItem key={r.id} comment={r} onDeleted={onDeleted} />)}
        </div>
      )}
    </div>
  )
}

export default function FeedPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [post, setPost] = useState<PostWithMeta | null>(null)
  const [comments, setComments] = useState<CommentNode[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [commentBody, setCommentBody] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const headers: Record<string, string> = {}
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`
        const [postRes, commentsRes] = await Promise.all([
          fetch(`/api/community/feed/${id}`, { headers }),
          fetch(`/api/community/feed/${id}/comments`),
        ])
        if (postRes.status === 404) { if (!cancelled) setNotFound(true); return }
        if (postRes.ok && !cancelled) setPost((await postRes.json()).post)
        if (commentsRes.ok && !cancelled) setComments((await commentsRes.json()).comments ?? [])
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [id, user])

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !commentBody.trim()) return
    setSubmitting(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/community/feed/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: commentBody.trim() }),
      })
      if (res.ok) {
        const { comment } = await res.json()
        setComments((prev) => [...prev, { ...comment, replies: [] }])
        setCommentBody("")
        setPost((p) => p ? { ...p, comment_count: p.comment_count + 1 } : p)
      }
    } finally { setSubmitting(false) }
  }

  function handleCommentDeleted(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId).map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) })))
    setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p)
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto w-full h-64 rounded-2xl bg-surface border border-border animate-pulse" />
  }

  if (notFound || !post) {
    return (
      <div className="max-w-2xl mx-auto w-full text-center py-20">
        <p className="font-display font-bold text-xl text-foreground">Post not found</p>
        <Link href="/community/feed" className="text-gold mt-3 inline-block hover:underline">← Back to Feed</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <FeedPostCard post={post} onDeleted={() => { window.location.href = "/community/feed" }} />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}
        </h2>

        {user && (
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value.slice(0, 2000))}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40"
            />
            <button type="submit" disabled={submitting || !commentBody.trim()} className="rounded-full bg-gold px-4 py-2 text-xs font-bold text-black disabled:opacity-50">
              Post
            </button>
          </form>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-muted/70 text-center py-6">No comments yet — be the first.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map((c) => <CommentItem key={c.id} comment={c} onDeleted={handleCommentDeleted} />)}
          </div>
        )}
      </div>
    </div>
  )
}
