"use client"

import { useState } from "react"
import Link          from "next/link"
import { useAuth }   from "@/contexts/AuthContext"
import type { ChannelWithMeta } from "@/types/community"

interface ChannelCardProps {
  channel: ChannelWithMeta
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const { user }    = useAuth()
  const [isMember,  setIsMember]  = useState(channel.is_member)
  const [loading,   setLoading]   = useState(false)
  const [memberCount, setMemberCount] = useState(channel.member_count)

  async function handleJoinLeave(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    // Optimistic update
    const next = !isMember
    setIsMember(next)
    setMemberCount((c) => c + (next ? 1 : -1))

    try {
      const token = await user.getIdToken()
      const res   = await fetch(`/api/community/channels/${channel.id}/join`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ action: next ? "join" : "leave" }),
      })
      if (!res.ok) {
        // Revert on error
        setIsMember(!next)
        setMemberCount((c) => c + (next ? -1 : 1))
      }
    } catch {
      setIsMember(!next)
      setMemberCount((c) => c + (next ? -1 : 1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Link
      href={`/community/channels/${channel.slug}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-gold/30 hover:bg-surface-2 transition-colors group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{channel.icon || "💬"}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-black text-sm text-foreground group-hover:text-gold transition-colors truncate">
                {channel.name}
              </h3>
              {channel.is_featured && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-semibold shrink-0">
                  Featured
                </span>
              )}
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-3 text-muted/60 capitalize">
              {channel.category}
            </span>
          </div>
        </div>

        {/* Join / Leave */}
        {user && (
          <button
            onClick={handleJoinLeave}
            disabled={loading}
            className={[
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              "disabled:opacity-60 disabled:pointer-events-none",
              isMember
                ? "bg-gold/10 text-gold/80 border border-gold/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                : "bg-gold text-black hover:bg-gold/80",
            ].join(" ")}
          >
            {loading ? "..." : isMember ? "Joined" : "Join"}
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-muted/60 line-clamp-2">{channel.description}</p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted/50 pt-1 border-t border-border/50">
        <span>
          <strong className="text-foreground/70">{memberCount.toLocaleString()}</strong> members
        </span>
        <span>
          <strong className="text-foreground/70">{channel.post_count.toLocaleString()}</strong> posts
        </span>
      </div>
    </Link>
  )
}
