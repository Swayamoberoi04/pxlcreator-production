"use client"

import { useRouter }         from "next/navigation"
import type { ProjectWithMeta, ProjectStatus, WorkType } from "@/types/community"

interface ProjectCardProps {
  project: ProjectWithMeta
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  open:        { label: "Open",        className: "bg-green-500/15 text-green-400 border-green-500/30" },
  in_progress: { label: "In Progress", className: "bg-gold/15 text-gold border-gold/30" },
  closed:      { label: "Closed",      className: "bg-muted/10 text-muted/85 border-border" },
}

const WORK_TYPE_CONFIG: Record<WorkType, { label: string; className: string }> = {
  remote:  { label: "Remote",   className: "bg-blue-500/10 text-blue-400" },
  on_site: { label: "On-Site",  className: "bg-orange-500/10 text-orange-400" },
  hybrid:  { label: "Hybrid",   className: "bg-purple-500/10 text-purple-400" },
}

function formatBudget(project: ProjectWithMeta): string {
  if (project.budget_type === "negotiable") return "Negotiable"
  if (project.budget_type === "hourly") {
    if (project.budget_min_usd && project.budget_max_usd) {
      return `$${project.budget_min_usd}–$${project.budget_max_usd}/hr`
    }
    if (project.budget_min_usd) return `From $${project.budget_min_usd}/hr`
    return "Hourly rate"
  }
  if (project.budget_min_usd && project.budget_max_usd) {
    return `$${project.budget_min_usd.toLocaleString()}–$${project.budget_max_usd.toLocaleString()}`
  }
  if (project.budget_min_usd) return `From $${project.budget_min_usd.toLocaleString()}`
  return "Budget TBD"
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return ""
  const d    = new Date(deadline)
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return "Deadline passed"
  if (diff === 0) return "Due today"
  if (diff === 1) return "Due tomorrow"
  if (diff < 7)  return `${diff} days left`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const status   = STATUS_CONFIG[project.status]
  const workType = WORK_TYPE_CONFIG[project.work_type]

  const initial = (project.poster?.display_name || "P")[0].toUpperCase()

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 hover:border-gold/30 transition-colors cursor-pointer"
      onClick={() => router.push(`/community/projects/${project.id}`)}
    >
      {/* Status + work type row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${status.className}`}>
          {status.label}
        </span>
        <span className={`text-[11px] px-2.5 py-1 rounded-full ${workType.className}`}>
          {workType.label}
        </span>
      </div>

      {/* Title + description */}
      <div>
        <h3 className="font-display font-bold text-base text-foreground line-clamp-1">{project.title}</h3>
        <p className="mt-1 text-xs text-muted/85 line-clamp-2">{project.description}</p>
      </div>

      {/* Skills needed */}
      {project.skills_needed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.skills_needed.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-[11px] px-2 py-0.5 rounded-full bg-surface-3 border border-border text-muted/92"
            >
              {skill}
            </span>
          ))}
          {project.skills_needed.length > 3 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-3 border border-border text-muted/85">
              +{project.skills_needed.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Budget + deadline */}
      <div className="flex items-center justify-between text-xs text-muted/85">
        <span className="text-gold font-semibold">{formatBudget(project)}</span>
        {project.deadline && (
          <span className="text-muted/85">{formatDeadline(project.deadline)}</span>
        )}
      </div>

      {/* Footer: poster + applicants + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          {project.poster?.avatar_url ? (
            <img
              src={project.poster.avatar_url}
              alt={project.poster.display_name}
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <span className="size-7 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
              {initial}
            </span>
          )}
          <span className="text-xs text-muted/85 truncate max-w-[100px]">
            {project.poster?.display_name || "Creator"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted/85">
            {project.applicant_count} applicant{project.applicant_count !== 1 ? "s" : ""}
          </span>
          {project.status === "open" && (
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/community/projects/${project.id}`) }}
              className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-black hover:bg-gold/80 transition-colors"
            >
              Apply Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
