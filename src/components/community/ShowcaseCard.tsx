"use client"

import { useState }          from "react"
import Link                  from "next/link"
import { motion }            from "framer-motion"
import { cn }                from "@/lib/utils"
import { useAuth }           from "@/contexts/AuthContext"
import type { ShowcaseWithMeta } from "@/types/community"

const TYPE_LABEL: Record<string, string> = {
  photo:        "Photo",
  video:        "Video",
  before_after: "Before / After",
  reel:         "Reel",
  short_film:   "Short Film",
}

const TYPE_ICON: Record<string, string> = {
  photo:        "📷",
  video:        "🎬",
  before_after: "â—",
  reel:         "⟳",
  short_film:   "🎞",
}

interface Props {
  item:      ShowcaseWithMeta
  compact?:  boolean
}

export function ShowcaseCard({ item, compact = false }: Props) {
  const { user } = useAuth()
  const [liked,        setLiked]        = useState(item.is_liked ?? false)
  const [bookmarked,   setBookmarked]   = useState(item.is_bookmarked ?? false)
  const [likeCount,    setLikeCount]    = useState(item.like_count)
  const [bookmarkCount,setBookmarkCount]= useState(item.bookmark_count)
  const [loading,      setLoading]      = useState<"like"|"bookmark"|null>(null)

  async function react(reaction: "like" | "bookmark") {
    if (!user || loading) return
    setLoading(reaction)

    // Optimistic
    if (reaction === "like") {
      setLiked(!liked)
      setLikeCount(c => liked ? c - 1 : c + 1)
    } else {
      setBookmarked(!bookmarked)
      setBookmarkCount(c => bookmarked ? c - 1 : c + 1)
    }

    try {
      const token = await user.getIdToken()
      await fetch(`/api/community/showcase/${item.id}/react`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ reaction }),
      })
    } catch {
      // Revert on error
      if (reaction === "like") {
        setLiked(liked)
        setLikeCount(item.like_count)
      } else {
        setBookmarked(bookmarked)
        setBookmarkCount(item.bookmark_count)
      }
    } finally {
      setLoading(null)
    }
  }

  const thumbnail = item.thumbnail_url ?? item.media_urls[0] ?? item.after_url ?? null

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-surface overflow-hidden",
        "transition-all duration-200 hover:border-gold/25 hover:shadow-[0_0_30px_rgba(255,214,10,0.06)]"
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative bg-surface-2 overflow-hidden",
        compact ? "aspect-video" : "aspect-[4/3]"
      )}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[2rem] text-muted/70">
            {TYPE_ICON[item.item_type] ?? "🖼"}
          </div>
        )}

        {/* Type badge */}
        <span className="absolute top-2 left-2 text-[0.65rem] font-bold tracking-wide uppercase bg-black/70 text-white/92 rounded-full px-2 py-0.5 backdrop-blur-sm">
          {TYPE_LABEL[item.item_type] ?? item.item_type}
        </span>

        {/* Featured badge */}
        {item.is_featured && (
          <span className="absolute top-2 right-2 text-[0.65rem] font-bold text-background bg-gold rounded-full px-2 py-0.5">
            ✦ Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2.5 p-4">
        {/* Title */}
        <h3 className="font-semibold text-[0.9375rem] text-foreground leading-snug line-clamp-2">
          {item.title}
        </h3>

        {/* Author */}
        {item.author && (
          <Link
            href={`/community/${item.author.username}`}
            className="flex items-center gap-2 group/author"
          >
            <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center text-[0.65rem] font-bold text-gold shrink-0 overflow-hidden">
              {item.author.avatar_url ? (
                <img src={item.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                item.author.display_name[0]?.toUpperCase()
              )}
            </div>
            <span className="text-[0.8125rem] text-muted/92 group-hover/author:text-foreground transition-colors">
              {item.author.display_name}
            </span>
          </Link>
        )}

        {/* Software used */}
        {item.software_used.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1">
            {item.software_used.slice(0, 3).map((sw) => (
              <span key={sw} className="text-[0.65rem] text-muted/85 bg-surface-2 rounded px-1.5 py-0.5 border border-border">
                {sw}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-3">
            {/* Like */}
            <button
              type="button"
              onClick={() => react("like")}
              disabled={!user}
              className={cn(
                "flex items-center gap-1 text-[0.8125rem] transition-colors",
                liked ? "text-gold" : "text-muted/85 hover:text-foreground",
                !user && "cursor-default"
              )}
            >
              {liked ? "♥" : "♡"} <span>{likeCount}</span>
            </button>

            {/* Bookmark */}
            <button
              type="button"
              onClick={() => react("bookmark")}
              disabled={!user}
              className={cn(
                "flex items-center gap-1 text-[0.8125rem] transition-colors",
                bookmarked ? "text-gold" : "text-muted/85 hover:text-foreground",
                !user && "cursor-default"
              )}
            >
              {bookmarked ? "◈" : "◇"} <span>{bookmarkCount}</span>
            </button>
          </div>

          <span className="text-[0.75rem] text-muted/70">
            {item.comment_count} comments
          </span>
        </div>
      </div>
    </motion.article>
  )
}

