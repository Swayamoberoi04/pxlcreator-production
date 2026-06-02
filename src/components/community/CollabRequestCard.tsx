"use client"

import { useState } from "react"
import { useAuth }  from "@/contexts/AuthContext"
import type { CommunityProfile } from "@/types/community"

export interface CollabRequest {
  id:          string
  collab_type: string
  role_needed: string
  message:     string
  status:      "pending" | "accepted" | "declined" | "withdrawn"
  budget:      string | null
  created_at:  string
  requester?:  CommunityProfile
  recipient?:  CommunityProfile
}

interface CollabRequestCardProps {
  request:        CollabRequest
  viewType:       "sent" | "received"
  onStatusChange: (id: string, status: string) => void
}

const STATUS_CONFIG = {
  pending:   { label: "Pending",   className: "bg-gold/15 text-gold border-gold/30" },
  accepted:  { label: "Accepted",  className: "bg-green-500/15 text-green-400 border-green-500/30" },
  declined:  { label: "Declined",  className: "bg-red-500/15 text-red-400 border-red-500/30" },
  withdrawn: { label: "Withdrawn", className: "bg-muted/10 text-muted/60 border-border" },
}

export function CollabRequestCard({ request, viewType, onStatusChange }: CollabRequestCardProps) {
  const { user }    = useAuth()
  const [busy, setBusy] = useState(false)
  const status      = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending
  const counterpart = viewType === "received" ? request.requester : request.recipient
  const initial     = (counterpart?.display_name ?? counterpart?.username ?? "?")[0].toUpperCase()

  async function act(newStatus: string) {
    if (!user) return
    setBusy(true)
    try {
      const token = await user.getIdToken()
      const res   = await fetch(`/api/community/collab-requests/${request.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onStatusChange(request.id, newStatus)
    } catch { /* ignore */ } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        {counterpart?.avatar_url ? (
          <img src={counterpart.avatar_url} alt={counterpart.display_name} className="size-10 rounded-full object-cover shrink-0" />
        ) : (
          <span className="size-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
            {initial}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">
            {counterpart?.display_name ?? "Unknown"}
          </p>
          <p className="text-xs text-muted/50">@{counterpart?.username ?? "—"}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/70">
          {request.collab_type}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
          {request.role_needed}
        </span>
        {request.budget && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            💰 {request.budget}
          </span>
        )}
      </div>

      {/* Message */}
      <p className="text-xs text-muted/70 line-clamp-3 leading-relaxed">{request.message}</p>

      {/* Actions */}
      {request.status === "pending" && (
        <div className="flex gap-2 pt-1">
          {viewType === "received" && (
            <>
              <button
                disabled={busy}
                onClick={() => act("accepted")}
                className="flex-1 rounded-xl py-2 text-xs font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                disabled={busy}
                onClick={() => act("declined")}
                className="flex-1 rounded-xl py-2 text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </>
          )}
          {viewType === "sent" && (
            <button
              disabled={busy}
              onClick={() => act("withdrawn")}
              className="rounded-xl px-4 py-2 text-xs font-semibold border border-border text-muted/60 hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              Withdraw
            </button>
          )}
        </div>
      )}
    </div>
  )
}
