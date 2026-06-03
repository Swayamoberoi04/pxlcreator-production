"use client"

import { useEffect, useState }                from "react"
import { useAuth }                            from "@/contexts/AuthContext"
import { SpaceCard, type CommunitySpace }     from "@/components/community/SpaceCard"

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-64 animate-pulse" />
}

export default function SpacesPage() {
  const { user }                          = useAuth()
  const [spaces,  setSpaces]              = useState<CommunitySpace[]>([])
  const [loading, setLoading]             = useState(true)
  const [error,   setError]               = useState<string | null>(null)

  async function getHeaders(): Promise<HeadersInit> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  async function fetchSpaces() {
    setLoading(true)
    setError(null)
    try {
      const headers = await getHeaders()
      const res     = await fetch("/api/community/spaces", { headers })
      if (!res.ok) throw new Error("Failed to load spaces")
      const data    = await res.json()
      setSpaces(data.spaces ?? data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load spaces")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSpaces()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleJoin(space: CommunitySpace) {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const method = space.is_member ? "DELETE" : "POST"
      const res    = await fetch(`/api/community/spaces/${space.id}/join`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setSpaces((prev) =>
          prev.map((s) =>
            s.id === space.id
              ? { ...s, is_member: !s.is_member, member_count: s.member_count + (s.is_member ? -1 : 1) }
              : s
          )
        )
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-black text-3xl text-foreground">Creator Spaces</h1>
        <p className="text-sm text-muted/60 mt-1">
          Professional chat rooms for every creative discipline
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="text-foreground font-semibold">Could not load spaces</p>
          <p className="text-sm text-muted/50">{error}</p>
          <button
            onClick={() => void fetchSpaces()}
            className="mt-2 rounded-xl px-5 py-2 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : spaces.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-4xl">💬</span>
          <p className="text-foreground font-semibold">No spaces yet</p>
          <p className="text-sm text-muted/50">Creator spaces are coming soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onJoin={() => handleJoin(space)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
