"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams }                from "next/navigation"
import { useAuth }                                   from "@/contexts/AuthContext"
import { CreatorCard }                               from "@/components/community/CreatorCard"
import { CREATOR_ROLES }                             from "@/types/community"
import type { CommunityProfile, SkillLevel, Availability } from "@/types/community"

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "beginner",     label: "Beginner"     },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced"     },
  { value: "professional", label: "Professional" },
]

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "open_for_work",   label: "Open for Work"  },
  { value: "open_for_collab", label: "Open to Collab" },
  { value: "hiring",          label: "Hiring"         },
]

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-60 animate-pulse" />
}

export default function DiscoverPage() {
  const { user }       = useAuth()
  const router         = useRouter()
  const searchParams   = useSearchParams()

  const [query,        setQuery]        = useState(searchParams.get("q") ?? "")
  const [roles,        setRoles]        = useState<string[]>(searchParams.getAll("role"))
  const [skillLevel,   setSkillLevel]   = useState<SkillLevel | "">(
    (searchParams.get("skill") as SkillLevel) ?? ""
  )
  const [availability, setAvailability] = useState<Availability | "">(
    (searchParams.get("avail") as Availability) ?? ""
  )
  const [location,     setLocation]     = useState(searchParams.get("loc") ?? "")

  const [profiles,  setProfiles]  = useState<CommunityProfile[]>([])
  const [total,     setTotal]     = useState<number | null>(null)
  const [loading,   setLoading]   = useState(true)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function getHeaders(): Promise<HeadersInit> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  const search = useCallback(async (q: string, role: string[], skill: string, avail: string, loc: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, type: "profiles" })
      if (skill) params.set("skill_level", skill)
      if (avail) params.set("availability", avail)
      if (loc)   params.set("location",     loc)
      role.forEach((r) => params.append("role", r))

      const headers = await getHeaders()
      const res     = await fetch(`/api/community/search?${params}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles ?? [])
        setTotal(data.total ?? data.profiles?.length ?? 0)
      }
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Sync URL and trigger search with debounce on query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Update URL
      const params = new URLSearchParams()
      if (query)       params.set("q", query)
      if (skillLevel)  params.set("skill", skillLevel)
      if (availability) params.set("avail", availability)
      if (location)    params.set("loc", location)
      roles.forEach((r) => params.append("role", r))
      router.replace(`/community/discover?${params}`, { scroll: false })

      void search(query, roles, skillLevel, availability, location)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, roles, skillLevel, availability, location])

  function toggleRole(roleId: string) {
    setRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display font-black text-3xl text-foreground">Discover Creators</h1>
        {total !== null && (
          <p className="text-sm text-muted/60 mt-1">
            {total.toLocaleString()} result{total !== 1 ? "s" : ""}
            {query ? ` for "${query}"` : ""}
          </p>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators by name, role, or location…"
          className="w-full rounded-xl border border-border bg-surface px-11 py-3 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 focus:bg-surface-2 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/40 hover:text-foreground transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted/50">Filters</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Skill Level */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted/70">Skill Level</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as SkillLevel | "")}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50"
            >
              <option value="">Any level</option>
              {SKILL_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted/70">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Availability | "")}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50"
            >
              <option value="">Any status</option>
              {AVAILABILITY_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted/70">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or country…"
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* Roles */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted/70">Roles</label>
          <div className="flex flex-wrap gap-2">
            {CREATOR_ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={[
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  roles.includes(role.id)
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border bg-surface-2 text-muted/60 hover:border-gold/30 hover:text-foreground",
                ].join(" ")}
              >
                <span>{role.icon}</span>
                <span>{role.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {(roles.length > 0 || skillLevel || availability || location) && (
          <button
            onClick={() => { setRoles([]); setSkillLevel(""); setAvailability(""); setLocation("") }}
            className="self-start text-xs text-muted/50 hover:text-gold transition-colors underline underline-offset-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : profiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <CreatorCard key={p.id} profile={p} showFollowButton />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="text-4xl">🔍</span>
          <p className="text-foreground font-semibold">No creators found</p>
          <p className="text-sm text-muted/50">Try different keywords or clear some filters</p>
        </div>
      )}
    </div>
  )
}
