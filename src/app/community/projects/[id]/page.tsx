"use client"

import { useEffect, useState, use, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import type { ProjectWithMeta, ApplicationWithMeta, ApplicationStatus } from "@/types/community"

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending", shortlisted: "Shortlisted", accepted: "Accepted",
  rejected: "Rejected", withdrawn: "Withdrawn", closed: "Closed",
}
const STATUS_CLASS: Record<ApplicationStatus, string> = {
  pending:     "bg-surface-2 text-muted/85 border-border",
  shortlisted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  accepted:    "bg-green-500/15 text-green-400 border-green-500/30",
  rejected:    "bg-red-500/10 text-red-400 border-red-500/30",
  withdrawn:   "bg-muted/10 text-muted/70 border-border",
  closed:      "bg-muted/10 text-muted/70 border-border",
}

function formatBudget(p: ProjectWithMeta): string {
  if (p.budget_type === "negotiable") return "Negotiable"
  if (p.budget_min_usd && p.budget_max_usd) return `$${p.budget_min_usd.toLocaleString()}–$${p.budget_max_usd.toLocaleString()}${p.budget_type === "hourly" ? "/hr" : ""}`
  if (p.budget_min_usd) return `From $${p.budget_min_usd.toLocaleString()}${p.budget_type === "hourly" ? "/hr" : ""}`
  return "Budget TBD"
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [project, setProject] = useState<ProjectWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [applications, setApplications] = useState<ApplicationWithMeta[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  const [coverLetter, setCoverLetter] = useState("")
  const [portfolioLink, setPortfolioLink] = useState("")
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState("")

  async function authHeaders(): Promise<Record<string, string>> {
    if (!user) return {}
    return { Authorization: `Bearer ${await user.getIdToken()}` }
  }

  const loadProject = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/community/projects/${id}`, { headers })
      if (res.status === 404) { setNotFound(true); return }
      if (res.ok) setProject((await res.json()).project)
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  useEffect(() => { setTimeout(() => void loadProject(), 0) }, [loadProject])

  // Log a real view once the project resolves (owner views are excluded server-side).
  useEffect(() => {
    if (project) void fetch(`/api/community/projects/${id}/view`, { method: "POST" }).catch(() => {})
  }, [project, id])

  const loadApplications = useCallback(async () => {
    if (!user || !project?.is_owner) return
    setLoadingApps(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/community/projects/${id}/applications`, { headers })
      if (res.ok) setApplications((await res.json()).applications ?? [])
    } finally { setLoadingApps(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, project?.is_owner])

  useEffect(() => { setTimeout(() => void loadApplications(), 0) }, [loadApplications])

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setApplying(true); setApplyError("")
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/community/projects/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ cover_letter: coverLetter, portfolio_link: portfolioLink || undefined }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? d.errors?.[0]?.message ?? "Failed to apply.") }
      setProject((p) => p ? { ...p, has_applied: true, applicant_count: p.applicant_count + 1 } : p)
      setCoverLetter(""); setPortfolioLink("")
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to apply.")
    } finally { setApplying(false) }
  }

  async function withdrawApplication() {
    if (!user) return
    const headers = await authHeaders()
    const res = await fetch(`/api/community/projects/${id}/apply`, { method: "DELETE", headers })
    if (res.ok) setProject((p) => p ? { ...p, has_applied: false } : p)
  }

  async function reviewApplication(appId: string, status: "shortlisted" | "accepted" | "rejected" | "closed") {
    const headers = await authHeaders()
    const res = await fetch(`/api/community/projects/${id}/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const { application } = await res.json()
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, ...application } : a))
    }
  }

  async function updateProjectStatus(status: "open" | "in_progress" | "closed" | "completed") {
    const headers = await authHeaders()
    const res = await fetch(`/api/community/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const { project: updated } = await res.json()
      setProject((p) => p ? { ...p, ...updated } : p)
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto w-full h-64 rounded-2xl bg-surface border border-border animate-pulse" />
  }
  if (notFound || !project) {
    return (
      <div className="max-w-3xl mx-auto w-full text-center py-20">
        <p className="font-display font-bold text-xl text-foreground">Project not found</p>
        <Link href="/community/projects" className="text-gold mt-3 inline-block hover:underline">← Back to Marketplace</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] px-2.5 py-1 rounded-full border font-semibold bg-green-500/15 text-green-400 border-green-500/30">
            {project.status}
          </span>
          {project.visibility === "private" && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted/85">Private</span>
          )}
        </div>

        <div>
          <h1 className="font-display font-bold text-xl text-foreground">{project.title}</h1>
          <p className="text-sm text-muted/85 mt-2 whitespace-pre-wrap">{project.description}</p>
        </div>

        {project.skills_needed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.skills_needed.map((s) => (
              <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/92">{s}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted/85 border-t border-border pt-3">
          <span className="text-gold font-semibold">{formatBudget(project)}</span>
          <span>{project.applicant_count} applicant{project.applicant_count !== 1 ? "s" : ""}</span>
          <span>{project.view_count} view{project.view_count !== 1 ? "s" : ""}</span>
          {project.poster && (
            <Link href={`/community/${project.poster.username}`} className="hover:text-gold transition-colors ml-auto">
              by {project.poster.display_name}
            </Link>
          )}
        </div>

        {/* Owner controls */}
        {project.is_owner && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted/70">Update status:</span>
            {(["open", "in_progress", "completed", "closed"] as const).map((s) => (
              <button key={s} onClick={() => updateProjectStatus(s)}
                disabled={project.status === s}
                className="text-xs rounded-full px-3 py-1 border border-border text-muted/85 hover:border-gold/30 hover:text-foreground disabled:opacity-40 disabled:cursor-default transition-colors">
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Apply section — visible to non-owners only */}
      {user && !project.is_owner && project.status === "open" && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          {project.has_applied ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground">✓ You&apos;ve applied to this project.</p>
              <button onClick={withdrawApplication} className="text-xs text-red-400 hover:text-red-300">Withdraw application</button>
            </div>
          ) : (
            <form onSubmit={submitApplication} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">Apply to this project</h2>
              {applyError && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{applyError}</p>}
              <textarea required value={coverLetter} onChange={(e) => setCoverLetter(e.target.value.slice(0, 1000))}
                placeholder="Why are you a good fit? (max 1000 chars)" rows={4}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none" />
              <input value={portfolioLink} onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="Portfolio link (optional)"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
              <button type="submit" disabled={applying || !coverLetter.trim()}
                className="self-start rounded-full bg-gold px-5 py-2 text-xs font-bold text-black hover:bg-gold/90 disabled:opacity-50 transition-colors">
                {applying ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Owner: review applications */}
      {project.is_owner && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">
            {applications.length} application{applications.length !== 1 ? "s" : ""}
          </h2>
          {loadingApps ? (
            <div className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />
          ) : applications.length === 0 ? (
            <p className="text-sm text-muted/70 py-6 text-center rounded-2xl border border-border bg-surface">
              No applications yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/community/${app.applicant?.username ?? ""}`} className="flex items-center gap-2 group">
                      <span className="size-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xs">
                        {(app.applicant?.display_name ?? "?")[0]?.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-foreground group-hover:text-gold">{app.applicant?.display_name ?? "Creator"}</span>
                    </Link>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${STATUS_CLASS[app.status]}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted/92 whitespace-pre-wrap">{app.cover_letter}</p>
                  {app.portfolio_link && (
                    <a href={app.portfolio_link} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline w-fit">
                      View portfolio →
                    </a>
                  )}
                  {app.status !== "withdrawn" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      {(["shortlisted", "accepted", "rejected", "closed"] as const).map((s) => (
                        <button key={s} onClick={() => reviewApplication(app.id, s)}
                          disabled={app.status === s}
                          className="text-[0.75rem] rounded-full px-3 py-1 border border-border text-muted/85 hover:border-gold/30 hover:text-foreground disabled:opacity-40 disabled:cursor-default transition-colors">
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
