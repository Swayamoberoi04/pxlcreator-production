"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence }           from "framer-motion"
import { useAuth }                           from "@/contexts/AuthContext"
import { ProjectCard }                       from "@/components/community/ProjectCard"
import { PROJECT_CATEGORIES }               from "@/types/community"
import type { ProjectWithMeta, CreatorTag } from "@/types/community"

const WORK_TYPES = [
  { id: "",        label: "All" },
  { id: "remote",  label: "Remote" },
  { id: "on_site", label: "On-site" },
  { id: "hybrid",  label: "Hybrid" },
]

export default function ProjectsPage() {
  const { user }                 = useAuth()
  const [projects, setProjects]  = useState<ProjectWithMeta[]>([])
  const [category, setCategory]  = useState("")
  const [workType, setWorkType]  = useState("")
  const [tags,     setTags]      = useState<string[]>([])
  const [sort,     setSort]      = useState<"newest" | "relevant">("newest")
  const [roleTags, setRoleTags]  = useState<CreatorTag[]>([])
  const [loading,  setLoading]   = useState(true)
  const [showPost, setShowPost]  = useState(false)

  useEffect(() => {
    fetch("/api/community/tags?kind=role")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.roles?.length) setRoleTags(d.roles) })
      .catch(() => { /* keep empty — filter chips are supplementary */ })
  }, [])

  const fetchProjects = useCallback(async (cat: string, wt: string, tagList: string[], sortMode: string) => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (user) { try { headers["Authorization"] = `Bearer ${await user.getIdToken()}` } catch { /* ignore */ } }
      const params = new URLSearchParams({ status: "open", limit: "30", sort: sortMode })
      if (cat) params.set("category", cat)
      if (wt)  params.set("work_type", wt)
      tagList.forEach((t) => params.append("tags", t))
      const res  = await fetch(`/api/community/projects?${params}`, { headers })
      const data = await res.json() as { projects: ProjectWithMeta[] }
      setProjects(data.projects ?? [])
    } catch { setProjects([]) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    setTimeout(() => void fetchProjects(category, workType, tags, sort), 0)
  }, [category, workType, tags, sort, fetchProjects])

  function toggleTag(tagId: string) {
    setTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId])
  }

  const hasFilters = !!category || !!workType || tags.length > 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[1.75rem] text-foreground">Project Marketplace</h1>
          <p className="text-[0.9375rem] text-muted/85 mt-1">Find creative work or hire a creator for your project.</p>
        </div>
        {user && (
          <button type="button" onClick={() => setShowPost(true)}
            className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-background hover:bg-gold/90 transition-colors">
            + Post Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={() => setCategory("")}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[0.8125rem] font-medium transition-all ${!category ? "bg-gold text-background" : "border border-border text-muted/92 hover:border-gold/40 hover:text-foreground"}`}>
            All Categories
          </button>
          {PROJECT_CATEGORIES.map((c) => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[0.8125rem] font-medium transition-all ${category === c.id ? "bg-gold text-background" : "border border-border text-muted/92 hover:border-gold/40 hover:text-foreground"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {WORK_TYPES.map((wt) => (
              <button key={wt.id} type="button" onClick={() => setWorkType(wt.id)}
                className={`rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all ${workType === wt.id ? "bg-gold/20 text-gold border border-gold/40" : "border border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
                {wt.label}
              </button>
            ))}
          </div>
          {user && (
            <div className="flex items-center gap-1.5 text-[0.75rem]">
              <span className="text-muted/70">Sort:</span>
              <button type="button" onClick={() => setSort("newest")}
                className={`rounded-full px-3 py-1 font-medium transition-all ${sort === "newest" ? "bg-gold/20 text-gold" : "text-muted/85 hover:text-foreground"}`}>
                Newest
              </button>
              <button type="button" onClick={() => setSort("relevant")}
                className={`rounded-full px-3 py-1 font-medium transition-all ${sort === "relevant" ? "bg-gold/20 text-gold" : "text-muted/85 hover:text-foreground"}`}>
                Relevant to me
              </button>
            </div>
          )}
        </div>
        {roleTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {roleTags.map((t) => (
              <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-[0.75rem] font-medium border transition-all ${tags.includes(t.id) ? "border-gold/40 bg-gold/10 text-gold" : "border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-surface border border-border animate-pulse" />)}
        </div>
      ) : projects.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-border bg-surface">
          <span className="text-4xl">📋</span>
          <p className="font-semibold text-foreground">
            {hasFilters ? "No open projects match these filters" : "No open projects right now"}
          </p>
          <p className="text-sm text-muted/85 max-w-sm">
            {hasFilters
              ? "Try widening your filters, or check back soon."
              : "Nobody has posted a project yet — this isn't a bug. Be the first to hire a creator."}
          </p>
          {hasFilters ? (
            <button onClick={() => { setCategory(""); setWorkType(""); setTags([]) }} className="mt-1 text-xs text-gold hover:underline">
              Clear all filters
            </button>
          ) : user ? (
            <button onClick={() => setShowPost(true)} className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-gold/90 transition-colors">
              Post a project
            </button>
          ) : null}
        </div>
      )}

      <AnimatePresence>
        {showPost && (
          <PostProjectModal
            onClose={() => setShowPost(false)}
            onPosted={(p) => { setProjects((prev) => [p, ...prev]); setShowPost(false) }}
            roleTags={roleTags}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PostProjectModal({ onClose, onPosted, roleTags }: {
  onClose: () => void
  onPosted: (p: ProjectWithMeta) => void
  roleTags: CreatorTag[]
}) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: "", description: "", category: "photography",
    work_type: "remote", location_city: "", location_country: "",
    budget_min_usd: "", budget_max_usd: "", budget_type: "negotiable",
    deadline: "", skills_needed: "", visibility: "public",
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  function toggleTag(id: string) {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true); setError("")
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/community/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          budget_min_usd: form.budget_min_usd ? parseFloat(form.budget_min_usd) : null,
          budget_max_usd: form.budget_max_usd ? parseFloat(form.budget_max_usd) : null,
          skills_needed:  form.skills_needed.split(",").map((s) => s.trim()).filter(Boolean),
          deadline:       form.deadline || null,
          tags:           selectedTags,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const { project } = await res.json() as { project: ProjectWithMeta }
      onPosted(project)
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to post project.") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-black/90 backdrop-blur-2xl p-6 flex flex-col gap-4 my-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[1.125rem]">Post a Project</h2>
          <button type="button" onClick={onClose} className="text-muted/70 hover:text-muted text-[1.5rem] leading-none">×</button>
        </div>
        {error && <p className="text-[0.875rem] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex flex-col gap-3">
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Project title *" maxLength={100}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          <textarea required value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe the project *" rows={4} maxLength={2000}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              {PROJECT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={form.work_type} onChange={(e) => setForm((p) => ({ ...p, work_type: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              <option value="remote">Remote</option>
              <option value="on_site">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.budget_min_usd} onChange={(e) => setForm((p) => ({ ...p, budget_min_usd: e.target.value }))}
              placeholder="Min $" type="number" min="0"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
            <input value={form.budget_max_usd} onChange={(e) => setForm((p) => ({ ...p, budget_max_usd: e.target.value }))}
              placeholder="Max $" type="number" min="0"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
            <select value={form.budget_type} onChange={(e) => setForm((p) => ({ ...p, budget_type: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              <option value="fixed">Fixed</option>
              <option value="hourly">Hourly</option>
              <option value="negotiable">Negotiable</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.location_city} onChange={(e) => setForm((p) => ({ ...p, location_city: e.target.value }))}
              placeholder="City (optional)"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
            <input value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              type="date"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40" />
          </div>
          <input value={form.skills_needed} onChange={(e) => setForm((p) => ({ ...p, skills_needed: e.target.value }))}
            placeholder="Skills needed (comma-separated)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />

          {roleTags.length > 0 && (
            <div>
              <p className="text-[0.8125rem] text-muted/85 mb-2">Creator type needed</p>
              <div className="flex flex-wrap gap-2">
                {roleTags.map((t) => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    className={`text-[0.75rem] rounded-full px-3 py-1 border transition-all ${selectedTags.includes(t.id) ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted/85 hover:border-gold/30 hover:text-foreground"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-[0.8125rem] text-muted/85">
            <input type="checkbox" checked={form.visibility === "private"}
              onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.checked ? "private" : "public" }))} />
            Private (invite-only — not shown in Project Marketplace discovery)
          </label>
        </div>
        <button type="submit" disabled={saving}
          className="rounded-full bg-gold py-3 font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
          {saving ? "Posting…" : "Post Project"}
        </button>
      </motion.form>
    </div>
  )
}
