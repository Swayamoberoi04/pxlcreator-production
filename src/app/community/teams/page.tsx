"use client"

import { useEffect, useState } from "react"
import { useAuth }             from "@/contexts/AuthContext"
import { TeamCard, type CommunityTeam } from "@/components/community/TeamCard"
import { CREATOR_ROLES }       from "@/types/community"

const TEAM_CATEGORIES = [
  "Photography", "Videography", "Filmmaking", "Editing",
  "Color Grading", "Content Creation", "Social Media", "Other",
]

const HIRING_ROLES = [
  "Director", "Editor", "Colorist", "Cinematographer",
  "Photographer", "Vlogger", "Writer", "Marketer",
]

type FilterTab = "all" | "hiring" | "mine"

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-48 animate-pulse" />
}

interface CreateTeamModalProps {
  onClose:  () => void
  onCreate: (team: CommunityTeam) => void
}

function CreateTeamModal({ onClose, onCreate }: CreateTeamModalProps) {
  const { user }          = useAuth()
  const [name,        setName]        = useState("")
  const [description, setDescription] = useState("")
  const [category,    setCategory]    = useState(TEAM_CATEGORIES[0])
  const [visibility,  setVisibility]  = useState<"public" | "private">("public")
  const [isHiring,    setIsHiring]    = useState(false)
  const [roles,       setRoles]       = useState<string[]>([])
  const [tags,        setTags]        = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  function toggleRole(r: string) {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) { setErr("Team name is required"); return }
    setSubmitting(true)
    setErr(null)
    try {
      const token   = await user.getIdToken()
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean)
      const res     = await fetch("/api/community/teams", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name: name.trim(), description: description.trim(),
          category, visibility, is_hiring: isHiring,
          roles_needed: roles, tags: tagList,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create team") }
      const data = await res.json()
      onCreate(data.team ?? data)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create team")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-black text-lg">Create Team</h2>
          <button onClick={onClose} className="text-muted/50 hover:text-foreground text-xl">✕</button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 p-6 overflow-y-auto">
          {err && <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">{err}</p>}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Team Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cinema Collective"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What is your team about?"
              rows={3}
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/70">Category</label>
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50"
              >
                {TEAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/70">Visibility</label>
              <select
                value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox" checked={isHiring} onChange={(e) => setIsHiring(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-foreground">Currently hiring</span>
          </label>

          {isHiring && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted/70">Roles Needed</label>
              <div className="flex flex-wrap gap-2">
                {HIRING_ROLES.map((r) => (
                  <button
                    key={r} type="button" onClick={() => toggleRole(r)}
                    className={[
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      roles.includes(r)
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-border bg-surface-2 text-muted/60 hover:border-gold/30",
                    ].join(" ")}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Tags (comma separated)</label>
            <input
              value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. wedding, documentary, corporate"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-border text-muted/60 hover:text-foreground hover:border-border/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  const { user }                          = useAuth()
  const [teams,      setTeams]            = useState<CommunityTeam[]>([])
  const [loading,    setLoading]          = useState(true)
  const [activeTab,  setActiveTab]        = useState<FilterTab>("all")
  const [showCreate, setShowCreate]       = useState(false)

  async function getHeaders(): Promise<Record<string, string>> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  async function fetchTeams(tab: FilterTab) {
    setLoading(true)
    try {
      const headers = await getHeaders()
      const params  = new URLSearchParams({ limit: "20" })
      if (tab === "hiring") params.set("is_hiring", "true")
      if (tab === "mine")   params.set("mine", "true")
      const res = await fetch(`/api/community/teams?${params}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams ?? data ?? [])
      }
    } catch { setTeams([]) } finally { setLoading(false) }
  }

  useEffect(() => { void fetchTeams(activeTab) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeTab, user])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all",    label: "All Teams" },
    { id: "hiring", label: "Hiring" },
    { id: "mine",   label: "My Teams" },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-3xl text-foreground">Creator Teams</h1>
          <p className="text-sm text-muted/60 mt-1">Find or build your creative crew</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl px-5 py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors shrink-0"
          >
            + Create Team
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { if (t.id === "mine" && !user) return; setActiveTab(t.id) }}
            disabled={t.id === "mine" && !user}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === t.id
                ? "bg-gold/15 text-gold"
                : "text-muted/60 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-4xl">👥</span>
          <p className="font-semibold text-foreground">No teams found</p>
          <p className="text-sm text-muted/50">
            {activeTab === "mine" ? "You haven't joined or created any teams yet" : "Be the first to create a team"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreate={(team) => setTeams((prev) => [team, ...prev])}
        />
      )}
    </div>
  )
}
