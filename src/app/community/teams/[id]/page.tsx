"use client"

import { useEffect, useState }  from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth }              from "@/contexts/AuthContext"
import type { CommunityTeam }   from "@/components/community/TeamCard"
import type { CommunityProfile } from "@/types/community"

interface TeamMember {
  id:           string
  firebase_uid: string
  role:         string
  custom_title: string | null
  joined_at:    string
  profile?:     CommunityProfile
}

interface TeamInvite {
  id:         string
  invitee_uid: string
  role:        string
  message:     string | null
  status:      "pending" | "accepted" | "declined"
}

interface InviteModalProps {
  teamId:   string
  onClose:  () => void
  onInvite: () => void
}

function InviteModal({ teamId, onClose, onInvite }: InviteModalProps) {
  const { user }           = useAuth()
  const [username, setUsername] = useState("")
  const [role,     setRole]     = useState("Member")
  const [message,  setMessage]  = useState("")
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !username.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const token = await user.getIdToken()
      const res   = await fetch(`/api/community/teams/${teamId}/invite`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ username: username.trim(), role, message: message.trim() || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to invite") }
      onInvite()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to invite member")
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display font-black text-base">Invite Member</h2>
          <button onClick={onClose} className="text-muted/50 hover:text-foreground text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 p-6">
          {err && <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">{err}</p>}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Username</label>
            <input
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Role</label>
            <input
              value={role} onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Editor, Director"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Message (optional)</label>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Why are you inviting them?"
              rows={3}
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-border text-muted/60 hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy || !username.trim()} className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50">
              {busy ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeamDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuth()
  const router   = useRouter()

  const [team,       setTeam]       = useState<CommunityTeam | null>(null)
  const [members,    setMembers]    = useState<TeamMember[]>([])
  const [myInvite,   setMyInvite]   = useState<TeamInvite | null>(null)
  const [isMember,   setIsMember]   = useState(false)
  const [isOwner,    setIsOwner]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  async function getHeaders(): Promise<Record<string, string>> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  async function load() {
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res     = await fetch(`/api/community/teams/${id}`, { headers })
      if (!res.ok) return
      const data    = await res.json()
      setTeam(data.team ?? data)
      setMembers(data.members ?? [])
      if (data.invite) setMyInvite(data.invite)
      if (user && data.team) {
        setIsOwner(data.team.owner_uid === user.uid)
        setIsMember((data.members ?? []).some((m: TeamMember) => m.firebase_uid === user.uid))
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, user])

  async function handleLeave() {
    if (!user) return
    setActionBusy(true)
    try {
      const token = await user.getIdToken()
      const res   = await fetch(`/api/community/teams/${id}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { setIsMember(false); void load() }
    } catch { /* ignore */ } finally { setActionBusy(false) }
  }

  async function respondToInvite(action: "accepted" | "declined") {
    if (!user || !myInvite) return
    setActionBusy(true)
    try {
      const token = await user.getIdToken()
      const res   = await fetch(`/api/community/teams/${id}/invite/${myInvite.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ action }),
      })
      if (res.ok) {
        setMyInvite(null)
        if (action === "accepted") void load()
      }
    } catch { /* ignore */ } finally { setActionBusy(false) }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
        <div className="h-6 w-48 rounded bg-surface-2 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-surface-2 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-4xl">🔍</span>
        <p className="font-semibold text-foreground">Team not found</p>
        <button onClick={() => router.back()} className="text-sm text-gold hover:underline">Go back</button>
      </div>
    )
  }

  const initial = team.name[0]?.toUpperCase() ?? "T"

  return (
    <div className="flex flex-col gap-8">
      {/* Invite banner */}
      {myInvite && myInvite.status === "pending" && (
        <div className="flex items-center gap-4 flex-wrap rounded-2xl border border-gold/30 bg-gold/5 p-4">
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">You&apos;ve been invited to join <span className="text-gold">{team.name}</span></p>
            {myInvite.message && <p className="text-xs text-muted/60 mt-0.5">"{myInvite.message}"</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              disabled={actionBusy}
              onClick={() => respondToInvite("accepted")}
              className="rounded-xl px-4 py-2 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              Accept
            </button>
            <button
              disabled={actionBusy}
              onClick={() => respondToInvite("declined")}
              className="rounded-xl px-4 py-2 text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Team banner / header */}
      <div className="flex items-start gap-5 flex-wrap">
        {team.avatar_url ? (
          <img src={team.avatar_url} alt={team.name} className="size-20 rounded-2xl object-cover shrink-0" />
        ) : (
          <span className="size-20 rounded-2xl bg-gold/20 flex items-center justify-center text-gold font-black text-3xl shrink-0">
            {initial}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-black text-2xl text-foreground">{team.name}</h1>
            {team.visibility === "private" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/50">🔒 Private</span>
            )}
            {team.is_hiring && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-bold">Hiring</span>
            )}
          </div>
          <p className="text-sm text-muted/50 mt-0.5">{team.category} · {team.member_count} members</p>
          {team.description && <p className="text-sm text-muted/70 mt-2">{team.description}</p>}

          <div className="flex gap-2 mt-3 flex-wrap">
            {isOwner && (
              <button
                onClick={() => setShowInvite(true)}
                className="rounded-xl px-4 py-2 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors"
              >
                + Invite Member
              </button>
            )}
            {isMember && !isOwner && (
              <button
                disabled={actionBusy}
                onClick={handleLeave}
                className="rounded-xl px-4 py-2 text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Leave Team
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hiring roles */}
      {team.is_hiring && team.roles_needed.length > 0 && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-sm font-semibold text-green-400 mb-2">🎯 Currently Looking For</p>
          <div className="flex flex-wrap gap-2">
            {team.roles_needed.map((r) => (
              <span key={r} className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div>
        <h2 className="font-display font-black text-lg text-foreground mb-4">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <span className="text-3xl">👥</span>
            <p className="text-sm text-muted/60 mt-2">No members beyond the owner yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((member) => {
              const p       = member.profile
              const initial = (p?.display_name ?? p?.username ?? "?")[0].toUpperCase()
              return (
                <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt={p.display_name} className="size-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="size-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                      {initial}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{p?.display_name ?? "Unknown"}</p>
                    {p?.username && <p className="text-xs text-muted/50">@{p.username}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 font-medium">{member.role}</span>
                      {member.custom_title && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/60">{member.custom_title}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal
          teamId={id}
          onClose={() => setShowInvite(false)}
          onInvite={() => void load()}
        />
      )}
    </div>
  )
}
