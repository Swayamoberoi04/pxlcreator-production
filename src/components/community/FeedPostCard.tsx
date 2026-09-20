"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { CONTENT_KINDS } from "@/types/community"
import { ReportMenu } from "@/components/community/ReportMenu"
import type { PostWithMeta } from "@/types/community"

interface FeedPostCardProps {
  post: PostWithMeta
  onDeleted?: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const KIND_LABEL = new Map(CONTENT_KINDS.map((k) => [k.id, k]))

export function FeedPostCard({ post, onDeleted }: FeedPostCardProps) {
  const { user } = useAuth()
  const [reaction, setReaction] = useState<string | null>(post.user_reaction ?? null)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [saved, setSaved] = useState(post.user_saved ?? false)
  const [saveCount, setSaveCount] = useState(post.save_count)
  const [shareCount, setShareCount] = useState(post.share_count)
  const [busy, setBusy] = useState<"like" | "save" | "share" | "delete" | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isOwner = user?.uid === post.author_uid
  const kind = KIND_LABEL.get(post.content_kind)
  const BODY_LIMIT = 320
  const truncated = !expanded && post.body.length > BODY_LIMIT

  const beforeMedia = post.media?.find((m) => m.role === "before")
  const afterMedia = post.media?.find((m) => m.role === "after")
  const galleryMedia = (post.media ?? []).filter((m) => m.role !== "before" && m.role !== "after")

  async function authedFetch(path: string, init?: RequestInit) {
    if (!user) return null
    const token = await user.getIdToken()
    return fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    })
  }

  async function handleLike() {
    if (!user || busy) return
    setBusy("like")
    const wasLiked = reaction === "like"
    setReaction(wasLiked ? null : "like")
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)))
    try {
      const res = await authedFetch(`/api/community/feed/${post.id}/like`, {
        method: "POST",
        body: JSON.stringify({ reaction: "like" }),
      })
      if (res?.ok) {
        const d = await res.json()
        setReaction(d.user_reaction)
        setLikeCount(d.like_count)
      }
    } finally { setBusy(null) }
  }

  async function handleSave() {
    if (!user || busy) return
    setBusy("save")
    const wasSaved = saved
    setSaved(!wasSaved)
    setSaveCount((c) => Math.max(0, c + (wasSaved ? -1 : 1)))
    try {
      const res = await authedFetch(`/api/community/feed/${post.id}/save`, { method: "POST" })
      if (res?.ok) {
        const d = await res.json()
        setSaved(d.saved)
        setSaveCount(d.save_count)
      }
    } finally { setBusy(null) }
  }

  async function handleShare() {
    if (!user || busy) return
    setBusy("share")
    try {
      const res = await authedFetch(`/api/community/feed/${post.id}/share`, {
        method: "POST",
        body: JSON.stringify({ share_type: "link" }),
      })
      if (res?.ok) {
        const d = await res.json()
        setShareCount(d.share_count)
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          void navigator.clipboard.writeText(`${window.location.origin}/community/feed/${post.id}`)
        }
      }
    } finally { setBusy(null) }
  }

  async function handleDelete() {
    if (!user || busy) return
    setBusy("delete")
    try {
      const res = await authedFetch(`/api/community/feed/${post.id}`, { method: "DELETE" })
      if (res?.ok) onDeleted?.(post.id)
    } finally { setBusy(null); setConfirmDelete(false) }
  }

  const initial = (post.author?.display_name || "A")[0]?.toUpperCase() ?? "A"

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Author row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt={post.author.display_name} className="size-9 rounded-full object-cover shrink-0" />
          ) : (
            <span className="size-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">{initial}</span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/community/${post.author?.username ?? ""}`} className="text-sm font-semibold text-foreground hover:text-gold transition-colors truncate">
                {post.author?.display_name || "Creator"}
              </Link>
              {post.author?.is_verified && <span className="text-gold text-xs shrink-0" title="Verified">✓</span>}
            </div>
            <p className="text-xs text-muted/85">{timeAgo(post.created_at)}{post.visibility === "followers" ? " · Followers" : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {kind && kind.id !== "text" && (
            <span className="text-[0.6875rem] rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-gold/90 font-medium whitespace-nowrap">
              {kind.icon} {kind.label}
            </span>
          )}
          {post.ai_assisted && (
            <span className="text-[0.6875rem] rounded-full border border-border bg-surface-2 px-2 py-0.5 text-muted/85 whitespace-nowrap">
              AI-assisted
            </span>
          )}
          <ReportMenu targetType="post" targetId={post.id} targetUid={post.author_uid} />
        </div>
      </div>

      {/* Before/After */}
      {beforeMedia && afterMedia && (
        <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
          <div className="relative">
            <img src={beforeMedia.media_url} alt="Before" className="w-full aspect-square object-cover" />
            <span className="absolute bottom-2 left-2 text-[0.625rem] font-bold uppercase tracking-wide bg-black/70 text-white px-2 py-0.5 rounded-full">Before</span>
          </div>
          <div className="relative">
            <img src={afterMedia.media_url} alt="After" className="w-full aspect-square object-cover" />
            <span className="absolute bottom-2 left-2 text-[0.625rem] font-bold uppercase tracking-wide bg-gold/90 text-black px-2 py-0.5 rounded-full">After</span>
          </div>
        </div>
      )}

      {/* Regular media gallery */}
      {galleryMedia.length > 0 && (
        <div className={`grid gap-2 rounded-xl overflow-hidden ${galleryMedia.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {galleryMedia.slice(0, 4).map((m) => (
            m.media_type === "video" ? (
              <video key={m.id} src={m.media_url} controls className="w-full aspect-video object-cover bg-black" />
            ) : (
              <img key={m.id} src={m.media_url} alt="" className="w-full aspect-square object-cover" />
            )
          ))}
        </div>
      )}

      {/* Text content */}
      <div>
        {post.title && <h3 className="font-display font-bold text-base text-foreground mb-1.5">{post.title}</h3>}
        <p className="text-sm text-muted/92 leading-relaxed whitespace-pre-wrap">
          {truncated ? post.body.slice(0, BODY_LIMIT) + "…" : post.body}
        </p>
        {post.body.length > BODY_LIMIT && (
          <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs text-gold hover:underline">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => <span key={tag} className="text-[11px] text-gold/70">#{tag}</span>)}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            disabled={!user || busy === "like"}
            className={["flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              reaction === "like" ? "bg-gold/20 text-gold" : "bg-surface-2 text-muted/85 hover:bg-surface-3 hover:text-foreground"].join(" ")}
          >
            <span>{reaction === "like" ? "❤️" : "🤍"}</span>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          <Link
            href={`/community/feed/${post.id}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted/85 hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <span>💬</span>
            {post.comment_count > 0 && <span>{post.comment_count}</span>}
          </Link>

          <button
            onClick={handleSave}
            disabled={!user || busy === "save"}
            className={["flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              saved ? "bg-gold/20 text-gold" : "bg-surface-2 text-muted/85 hover:bg-surface-3 hover:text-foreground"].join(" ")}
          >
            <span>{saved ? "🔖" : "📑"}</span>
            {saveCount > 0 && <span>{saveCount}</span>}
          </button>

          <button
            onClick={handleShare}
            disabled={!user || busy === "share"}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-surface-2 text-muted/85 hover:bg-surface-3 hover:text-foreground transition-colors disabled:opacity-50"
            title="Copy link"
          >
            <span>🔗</span>
            {shareCount > 0 && <span>{shareCount}</span>}
          </button>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <>
                <button onClick={handleDelete} disabled={busy === "delete"} className="text-xs text-red-400 hover:text-red-300 font-medium">
                  {busy === "delete" ? "Deleting…" : "Confirm delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted/70 hover:text-muted">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-muted/50 hover:text-red-400 transition-colors">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
