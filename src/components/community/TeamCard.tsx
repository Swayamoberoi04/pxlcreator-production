"use client"

import { useRouter } from "next/navigation"

export interface CommunityTeam {
  id:           string
  name:         string
  description:  string
  avatar_url:   string | null
  category:     string
  member_count: number
  is_hiring:    boolean
  roles_needed: string[]
  owner_uid:    string
  visibility:   "public" | "private"
}

interface TeamCardProps {
  team: CommunityTeam
}

export function TeamCard({ team }: TeamCardProps) {
  const router  = useRouter()
  const initial = team.name[0]?.toUpperCase() ?? "T"

  return (
    <div
      onClick={() => router.push(`/community/teams/${team.id}`)}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 cursor-pointer hover:border-gold/30 hover:bg-surface-2 transition-all duration-150"
    >
      {/* Avatar + name */}
      <div className="flex items-start gap-3">
        {team.avatar_url ? (
          <img
            src={team.avatar_url}
            alt={team.name}
            className="size-12 rounded-xl object-cover shrink-0"
          />
        ) : (
          <span className="size-12 rounded-xl bg-gold/20 flex items-center justify-center text-gold font-bold text-lg shrink-0">
            {initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-sm text-foreground truncate">{team.name}</h3>
            {team.visibility === "private" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-muted/85">🔒 Private</span>
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">{team.category}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted/85 line-clamp-2">{team.description}</p>

      {/* Stats + hiring */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-muted/85">👥 {team.member_count} members</span>
        {team.is_hiring && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
            Hiring
          </span>
        )}
      </div>

      {/* Roles needed */}
      {team.is_hiring && team.roles_needed.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {team.roles_needed.slice(0, 2).map((role) => (
            <span
              key={role}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20"
            >
              {role}
            </span>
          ))}
          {team.roles_needed.length > 2 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/85">
              +{team.roles_needed.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
