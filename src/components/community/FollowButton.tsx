"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

interface FollowButtonProps {
  targetUid:        string
  initialFollowing: boolean
  onToggle?:        (following: boolean) => void
}

export function FollowButton({ targetUid, initialFollowing, onToggle }: FollowButtonProps) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading,   setLoading]   = useState(false)

  async function handleClick() {
    if (!user) return
    setLoading(true)
    const action = following ? "unfollow" : "follow"

    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/community/follow", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ target_uid: targetUid, action }),
      })
      if (res.ok) {
        const next = !following
        setFollowing(next)
        onToggle?.(next)
      }
    } catch (err) {
      console.error("[FollowButton] error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
        "disabled:opacity-60 disabled:pointer-events-none",
        following
          ? "bg-gold text-black hover:bg-gold/80"
          : "border border-gold/40 text-gold hover:bg-gold/10",
      ].join(" ")}
    >
      {loading ? (
        <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : null}
      {following ? "Following" : "Follow"}
    </button>
  )
}
