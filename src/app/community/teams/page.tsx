"use client"

import { useEffect, useState } from "react"
import { motion }               from "framer-motion"
import { useAuth }              from "@/contexts/AuthContext"
import { TeamCard, type CommunityTeam } from "@/components/community/TeamCard"
import { CommunityFeaturePreview }      from "@/components/community/CommunityFeaturePreview"

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

// ── Sample teams shown when API is empty ──────────────────────────
const SAMPLE_TEAMS = [
  {
    id: "st1", name: "Short Film Collective", category: "Filmmaking",
    description: "Crafting narrative short films together — from concept to festival submission.",
    member_count: 8, is_hiring: true, roles_needed: ["Director", "Editor", "Colorist"],
    tags: ["shortfilm", "narrative", "festival"], visibility: "public" as const,
    is_member: false, created_at: "", updated_at: "",
  },
  {
    id: "st2", name: "Travel Documentary Crew", category: "Videography",
    description: "Documenting untold stories from every corner of the world.",
    member_count: 5, is_hiring: true, roles_needed: ["Cinematographer", "Editor"],
    tags: ["travel", "documentary"], visibility: "public" as const,
    is_member: false, created_at: "", updated_at: "",
  },
  {
    id: "st3", name: "Wedding Visual Artists", category: "Photography",
    description: "Delivering timeless wedding photography and cinematic films.",
    member_count: 6, is_hiring: false, roles_needed: [],
    tags: ["wedding", "portrait"], visibility: "public" as const,
    is_member: false, created_at: "", updated_at: "",
  },
  {
    id: "st4", name: "YouTube Growth Lab", category: "Content Creation",
    description: "Building audiences and monetising through long-form YouTube content.",
    member_count: 12, is_hiring: true, roles_needed: ["Editor", "Vlogger"],
    tags: ["youtube", "growth"], visibility: "public" as const,
    is_member: false, created_at: "", updated_at: "",
  },
  {
    id: "st5", name: "Commercial Production House", category: "Filmmaking",
    description: "End-to-end commercial and brand content for agencies and startups.",
    member_count: 10, is_hiring: true, roles_needed: ["Director", "Colorist", "Photographer"],
    tags: ["commercial", "brand", "agency"], visibility: "public" as const,
    is_member: false, created_at: "", updated_at: "",
  },
  {
    id: "st6", name: "Color Science Studio", category: "Color Grading",
    description: "Deep-diving into DaVinci Resolve workflows, LUT design, and cinema grades.",
    member_count: 4, is_hiring: false, roles_needed: [],
    tags: ["colorgrade", "davinci", "lut"], visibility: "public" as const,
    is_member: false, created_at: "", updated_at: "",
  },
]

function SampleTeamCard({ team }: { team: typeof SAMPLE_TEAMS[0] }) {
  return (
    <div className="relative rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4 hover:border-gold/30 hover:bg-surface-2 transition-all duration-200">
      <div className="absolute top-3 right-3">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">Preview</span>
      </div>
      <div className="flex items-start gap-3 pr-16">
        <div className="size-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-lg shrink-0">
          👥
        </div>
        <div>
          <p className="font-display font-bold text-sm text-foreground">{team.name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 mt-0.5">{team.category}</p>
        </div>
      </div>
      <p className="text-xs text-muted/85 leading-relaxed line-clamp-2">{team.description}</p>
      {team.is_hiring && team.roles_needed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {team.roles_needed.map((r) => (
            <span key={r} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {r}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted/85">👥 {team.member_count} members</span>
        {team.is_hiring && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Hiring
          </span>
        )}
      </div>
    </div>
  )
}

interface CreateTeamModalProps { onClose: () => void; onCreate: (team: CommunityTeam) => void }

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
    setSubmitting(true); setErr(null)
    try {
      const token   = await user.getIdToken()
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean)
      const res     = await fetch("/api/community/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:   JSON.stringify({ name: name.trim(), description: description.trim(), category, visibility, is_hiring: isHiring, roles_needed: roles, tags: tagList }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create team") }
      const data = await res.json()
      onCreate(data.team ?? data); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to create team") }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-lg">Create Team</h2>
          <button onClick={onClose} className="text-muted/85 hover:text-foreground text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 p-6 overflow-y-auto">
          {err && <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">{err}</p>}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/92">Team Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cinema Collective"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/92">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is your team about?" rows={3}
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/92">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50">
                {TEAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/92">Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isHiring} onChange={(e) => setIsHiring(e.target.checked)} className="rounded" />
            <span className="text-sm text-foreground">Currently hiring</span>
          </label>
          {isHiring && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted/92">Roles Needed</label>
              <div className="flex flex-wrap gap-2">
                {HIRING_ROLES.map((r) => (
                  <button key={r} type="button" onClick={() => toggleRole(r)}
                    className={["text-xs px-3 py-1 rounded-full border transition-colors", roles.includes(r) ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-surface-2 text-muted/85 hover:border-gold/30"].join(" ")}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/92">Tags (comma separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. wedding, documentary, corporate"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-border text-muted/85 hover:text-foreground hover:border-border/70 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50">
              {submitting ? "Creating…" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  const { user }                  = useAuth()
  const [teams,      setTeams]    = useState<CommunityTeam[]>([])
  const [loading,    setLoading]  = useState(true)
  const [activeTab,  setActiveTab] = useState<FilterTab>("all")
  const [showCreate, setShowCreate] = useState(false)

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
      if (res.ok) { const data = await res.json(); setTeams(data.teams ?? data ?? []) }
    } catch { setTeams([]) } finally { setLoading(false) }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTeams(activeTab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all",    label: "All Teams" },
    { id: "hiring", label: "Hiring" },
    { id: "mine",   label: "My Teams" },
  ]

  const isEmpty = !loading && teams.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground">Creator Teams</h1>
          <p className="text-sm text-muted/85 mt-1">Find your creative crew or build one from scratch</p>
        </div>
        {user && (
          <button onClick={() => setShowCreate(true)}
            className="rounded-xl px-5 py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors shrink-0">
            + Create Team
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface border border-border p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { if (t.id === "mine" && !user) return; setActiveTab(t.id) }}
            disabled={t.id === "mine" && !user}
            className={["rounded-lg px-4 py-2 text-sm font-medium transition-colors", activeTab === t.id ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"].join(" ")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Roles quick-reference */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted/85 mb-3">Roles Joining Teams</p>
        <div className="flex flex-wrap gap-2">
          {["Director", "Editor", "Colorist", "Cinematographer", "Photographer", "Drone Operator", "Vlogger", "Writer", "Marketer"].map((r) => (
            <span key={r} className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2 text-muted/92 font-semibold">{r}</span>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => <TeamCard key={team.id} team={team} />)}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
          <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-display font-bold text-sm text-foreground">Team collaboration tools are in development</p>
              <p className="text-xs text-muted/85 mt-0.5">Preview what teams will look like in the PXL Creator ecosystem</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_TEAMS.map((team) => <SampleTeamCard key={team.id} team={team} />)}
          </div>
        </motion.div>
      )}

      {isEmpty && (
        <CommunityFeaturePreview
          variant="globe"
          featureKey="teams"
          launch="Q3 2026"
          roadmap={[
            { quarter: "Q1 2026", label: "Team data model & APIs", done: true },
            { quarter: "Q2 2026", label: "Invite & hiring workflow", done: true },
            { quarter: "Q3 2026", label: "Public team discovery launch", done: false },
            { quarter: "Q4 2026", label: "Project collaboration tools", done: false },
          ]}
          benefits={[
            "Create the first teams in the ecosystem",
            "Founding team badge on your profile",
            "Priority placement in team discovery",
            "Direct influence on collaboration features",
          ]}
        />
      )}

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreate={(team) => setTeams((prev) => [team, ...prev])} />
      )}
    </div>
  )
}
