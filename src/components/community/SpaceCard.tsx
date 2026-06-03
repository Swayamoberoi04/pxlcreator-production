"use client"

import Link from "next/link"

export interface CommunitySpace {
  id:            string
  slug:          string
  name:          string
  description:   string
  icon:          string
  color:         string
  member_count:  number
  message_count: number
  is_featured:   boolean
  is_member?:    boolean
  category?:     string
}

interface SpaceCardProps {
  space:  CommunitySpace
  onJoin: () => void
}

export function SpaceCard({ space, onJoin }: SpaceCardProps) {
  return (
    <div
      className="relative flex flex-col rounded-2xl border bg-surface overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg group"
      style={{ borderColor: `${space.color}33` }}
    >
      {/* Featured badge */}
      {space.is_featured && (
        <span className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
          Featured
        </span>
      )}

      {/* Icon area */}
      <Link href={`/community/spaces/${space.id}`} className="block">
        <div
          className="flex items-center justify-center h-28 text-5xl transition-all duration-200 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${space.color}22, ${space.color}08)`,
            borderBottom: `1px solid ${space.color}22`,
          }}
        >
          {space.icon}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-3 p-4">
        <div>
          <Link href={`/community/spaces/${space.id}`}>
            <h3 className="font-display font-black text-base text-foreground hover:text-gold transition-colors truncate">
              {space.name}
            </h3>
          </Link>
          {space.category && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/50">
              {space.category}
            </span>
          )}
          <p className="text-xs text-muted/60 mt-1 line-clamp-2">{space.description}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-muted/50">
          <span>👥 {space.member_count.toLocaleString()} members</span>
          <span>💬 {space.message_count.toLocaleString()}</span>
        </div>

        {/* Join / Joined */}
        <button
          onClick={(e) => { e.preventDefault(); onJoin() }}
          className={[
            "mt-auto w-full rounded-xl py-2 text-xs font-bold transition-colors",
            space.is_member
              ? "bg-surface-2 border border-border text-muted/60 hover:border-red-500/40 hover:text-red-400"
              : "text-black font-bold",
          ].join(" ")}
          style={space.is_member ? undefined : { backgroundColor: space.color }}
        >
          {space.is_member ? "Joined ✓" : "Join Space"}
        </button>
      </div>
    </div>
  )
}
