"use client"

import { useState }  from "react"
import Link           from "next/link"
import { useAuth }    from "@/contexts/AuthContext"
import type { PostWithMeta } from "@/types/community"

interface PostCardProps {
  post:       PostWithMeta
  channelId:  string
  onReact?:   (postId: string, reaction: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s    = Math.floor(diff / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)    return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const REACTIONS = [
  { key: "like",       emoji: "👍", label: "Like" },
  { key: "fire",       emoji: "🔥", label: "Fire" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
] as const

export function PostCard({ post, channelId, onReact }: PostCardProps) {
  const { user } = useAuth()

  // Track reaction counts in local state
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({
    like:       post.like_count,
    fire:       0,
    insightful: 0,
  })
  const [activeReaction, setActiveReaction] = useState<string | null>(post.user_reaction ?? null)
  const [reacting, setReacting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const BODY_LIMIT = 280
  const bodyTruncated = !expanded && post.body.length > BODY_LIMIT

  async function handleReact(reaction: string) {
    if (!user || reacting) return
    setReacting(true)

    const isSame    = activeReaction === reaction
    const prevReaction = activeReaction
    const prevCounts   = { ...likeCounts }

    // Optimistic
    setActiveReaction(isSame ? null : reaction)
    setLikeCounts((c) => {
      const next = { ...c }
      if (isSame) {
        next[reaction] = Math.max(0, next[reaction] - 1)
      } else {
        if (prevReaction) next[prevReaction] = Math.max(0, next[prevReaction] - 1)
        next[reaction] = (next[reaction] || 0) + 1
      }
      return next
    })

    try {
      const token = await user.getIdToken()
      const res   = await fetch(
        `/api/community/channels/${channelId}/posts/${post.id}/react`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body:    JSON.stringify({ reaction: isSame ? null : reaction }),
        }
      )
      if (!res.ok) {
        // Revert
        setActiveReaction(prevReaction)
        setLikeCounts(prevCounts)
      } else {
        onReact?.(post.id, reaction)
      }
    } catch {
      setActiveReaction(prevReaction)
      setLikeCounts(prevCounts)
    } finally {
      setReacting(false)
    }
  }

  const initial = (post.author?.display_name || "A")[0].toUpperCase()

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Pinned badge */}
      {post.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs text-gold/80">
          <span>📌</span>
          <span className="font-semibold">Pinned</span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3">
        {post.author?.avatar_url ? (
          <img
            src={post.author.avatar_url}
            alt={post.author.display_name}
            className="size-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="size-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/community/${post.author?.username ?? ""}`}
              className="text-sm font-semibold text-foreground hover:text-gold transition-colors truncate"
            >
              {post.author?.display_name || "Creator"}
            </Link>
            {post.author?.is_verified && (
              <span className="text-gold text-xs shrink-0" title="Verified">✓</span>
            )}
          </div>
          <p className="text-xs text-muted/85">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      {/* Content */}
      <div>
        {post.title && (
          <h3 className="font-display font-bold text-base text-foreground mb-2">{post.title}</h3>
        )}
        <p className="text-sm text-muted/92 leading-relaxed whitespace-pre-wrap">
          {bodyTruncated ? post.body.slice(0, BODY_LIMIT) + "…" : post.body}
        </p>
        {post.body.length > BODY_LIMIT && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs text-gold hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <span key={tag} className="text-[11px] text-gold/70 hover:text-gold cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Reaction bar + comment count */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1">
          {REACTIONS.map(({ key, emoji, label }) => (
            <button
              key={key}
              onClick={() => handleReact(key)}
              disabled={reacting || !user}
              title={label}
              className={[
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
                "disabled:opacity-50",
                activeReaction === key
                  ? "bg-gold/20 text-gold"
                  : "bg-surface-2 text-muted/85 hover:bg-surface-3 hover:text-foreground",
              ].join(" ")}
            >
              <span>{emoji}</span>
              {(likeCounts[key] ?? 0) > 0 && (
                <span>{likeCounts[key]}</span>
              )}
            </button>
          ))}
        </div>

        <Link
          href={`/community/channels/${channelId}?post=${post.id}`}
          className="flex items-center gap-1.5 text-xs text-muted/85 hover:text-gold transition-colors"
        >
          <span>💬</span>
          <span>{post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}</span>
        </Link>
      </div>
    </article>
  )
}
