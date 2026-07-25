"use client"

import Link from "next/link"
import { FollowButton } from "@/components/community/FollowButton"
import type { CommunityProfile, Availability, SkillLevel } from "@/types/community"

interface CreatorCardProps {
  profile:           CommunityProfile
  showFollowButton?: boolean
  compact?:          boolean
  isFollowing?:      boolean
}

const AVAILABILITY_CONFIG: Record<Availability, { label: string; className: string }> = {
  open_for_work:   { label: "Open for Work",  className: "bg-green-500/15 text-green-400 border-green-500/30" },
  open_for_collab: { label: "Open to Collab", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  hiring:          { label: "Hiring",          className: "bg-gold/15 text-gold border-gold/30" },
  unavailable:     { label: "Unavailable",     className: "bg-muted/10 text-muted/85 border-border" },
}

const SKILL_CONFIG: Record<SkillLevel, { label: string; className: string }> = {
  beginner:     { label: "Beginner",     className: "bg-surface-2 text-muted/92" },
  intermediate: { label: "Intermediate", className: "bg-surface-2 text-muted/92" },
  advanced:     { label: "Advanced",     className: "bg-gold/10 text-gold/90" },
  professional: { label: "Pro",          className: "bg-gold/20 text-gold font-bold" },
}

export function CreatorCard({ profile, showFollowButton = false, compact = false, isFollowing = false }: CreatorCardProps) {
  const avail = AVAILABILITY_CONFIG[profile.availability]
  const skill = SKILL_CONFIG[profile.skill_level]

  const initial = (profile.display_name || profile.username || "?")[0].toUpperCase()

  if (compact) {
    return (
      <Link
        href={`/community/${profile.username}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-gold/30 hover:bg-surface-2 transition-colors"
      >
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="size-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="size-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-base shrink-0">
            {initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate">{profile.display_name}</p>
          <p className="text-xs text-muted/85 truncate">@{profile.username}</p>
        </div>

        {/* Availability dot */}
        {profile.availability !== "unavailable" && (
          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${avail.className}`}>
            {avail.label}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden hover:border-gold/30 transition-colors">
      {/* Card body */}
      <Link href={`/community/${profile.username}`} className="flex-1 p-5 flex flex-col gap-3">
        {/* Top row: avatar + basic info */}
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="size-14 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="size-14 rounded-full bg-gold/20 flex items-center justify-center text-gold font-black text-xl shrink-0">
              {initial}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-black text-base text-foreground truncate">{profile.display_name}</h3>
              {profile.is_verified && (
                <span className="text-gold text-xs" title="Verified">✓</span>
              )}
            </div>
            <p className="text-sm text-muted/85">@{profile.username}</p>

            {/* Skill level */}
            <span className={`mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full ${skill.className}`}>
              {skill.label}
            </span>
          </div>
        </div>

        {/* Roles */}
        {profile.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.roles.slice(0, 2).map((role) => (
              <span
                key={role}
                className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/92"
              >
                {role.replace(/-/g, " ")}
              </span>
            ))}
            {profile.roles.length > 2 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/85">
                +{profile.roles.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {(profile.location_city || profile.location_country) && (
          <p className="text-xs text-muted/85 flex items-center gap-1">
            <span>📍</span>
            {[profile.location_city, profile.location_country].filter(Boolean).join(", ")}
          </p>
        )}

        {/* Availability */}
        <span className={`self-start text-[11px] px-2.5 py-1 rounded-full border ${avail.className}`}>
          {avail.label}
        </span>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted/85 border-t border-border pt-3 mt-auto">
          <span><strong className="text-foreground">{profile.follower_count.toLocaleString()}</strong> followers</span>
          <span><strong className="text-foreground">{profile.reputation_score}</strong> rep</span>
        </div>
      </Link>

      {/* Follow button row */}
      {showFollowButton && (
        <div className="px-5 pb-4">
          <FollowButton
            targetUid={profile.firebase_uid}
            initialFollowing={isFollowing}
          />
        </div>
      )}
    </div>
  )
}
