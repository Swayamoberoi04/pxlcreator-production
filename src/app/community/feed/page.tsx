"use client"

/**
 * /community/feed — the real, database-backed creator feed (Phase 5.3).
 *
 * Ranking is server-side (see /api/community/feed and src/lib/community/feed.ts)
 * from real signals only: recency, real engagement counts, whether the viewer
 * follows the author, and shared role/style tags. Nothing here is fabricated.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { PostComposer } from "@/components/community/PostComposer"
import { FeedPostCard } from "@/components/community/FeedPostCard"
import { useRealtimeTable } from "@/lib/community/useRealtime"
import type { PostWithMeta } from "@/types/community"

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-64 animate-pulse" />
}

export default function CommunityFeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<PostWithMeta[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`
      const res = await fetch(`/api/community/feed?page=${pageNum}&limit=10`, { headers })
      if (!res.ok) throw new Error("Failed to load feed.")
      const data = await res.json()
      setPosts((prev) => replace ? (data.posts ?? []) : [...prev, ...(data.posts ?? [])])
      setHasMore(!!data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user])

  useEffect(() => {
    setTimeout(() => { setPage(1); void loadPage(1, true) }, 0)
  }, [loadPage])

  // Infinite scroll via IntersectionObserver on a sentinel div.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading || loadingMore) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        const next = page + 1
        setPage(next)
        void loadPage(next, false)
      }
    }, { rootMargin: "400px" })
    observer.observe(el)
    return () => observer.disconnect()
  }, [page, hasMore, loading, loadingMore, loadPage])

  // Realtime: a brand-new public post appearing while the feed is open is
  // worth surfacing, but re-ranking live would jump content under the
  // reader's cursor — so a new post shows as a "N new posts" banner instead
  // of silently reordering the list.
  const [newPostCount, setNewPostCount] = useState(0)
  useRealtimeTable<{ channel_id: string | null; visibility: string }>(
    { table: "channel_posts", event: "INSERT" },
    (payload) => {
      if (payload.new?.channel_id === null && payload.new?.visibility === "public") {
        setNewPostCount((c) => c + 1)
      }
    }
  )

  function refreshForNewPosts() {
    setNewPostCount(0)
    setPage(1)
    void loadPage(1, true)
  }

  function handlePosted(post: PostWithMeta) {
    setPosts((prev) => [post, ...prev])
  }

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Feed</h1>
        <p className="text-sm text-muted/85 mt-1">Real work from real PXL creators — before/afters, breakdowns, recipes, and more.</p>
      </div>

      <PostComposer onPosted={handlePosted} />

      {newPostCount > 0 && (
        <button
          onClick={refreshForNewPosts}
          className="self-center rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors"
        >
          {newPostCount} new post{newPostCount !== 1 ? "s" : ""} — tap to refresh
        </button>
      )}

      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center rounded-2xl border border-border bg-surface">
          <span className="text-4xl">🎞️</span>
          <p className="font-semibold text-foreground">No posts yet</p>
          <p className="text-sm text-muted/85 max-w-sm">
            The feed is empty because nobody has posted yet — not because something&apos;s broken.
            Be the first to share your work.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <FeedPostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loadingMore && <div className="size-6 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />}
        </div>
      )}
    </div>
  )
}
