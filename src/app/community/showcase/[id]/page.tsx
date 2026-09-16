"use client"

import { useEffect, useState, use, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import type { ShowcaseWithMeta, ShowcaseEnquiryWithMeta } from "@/types/community"

export default function ShowcaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [item, setItem] = useState<ShowcaseWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarkCount, setBookmarkCount] = useState(0)

  const [showEnquire, setShowEnquire] = useState(false)
  const [enquiryMsg, setEnquiryMsg] = useState("")
  const [enquiryEmail, setEnquiryEmail] = useState("")
  const [sendingEnquiry, setSendingEnquiry] = useState(false)
  const [enquirySent, setEnquirySent] = useState(false)
  const [enquiryError, setEnquiryError] = useState("")

  const [enquiries, setEnquiries] = useState<ShowcaseEnquiryWithMeta[]>([])
  const [showEnquiries, setShowEnquiries] = useState(false)

  async function authHeaders(): Promise<Record<string, string>> {
    if (!user) return {}
    return { Authorization: `Bearer ${await user.getIdToken()}` }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/community/showcase/${id}`, { headers })
      if (res.status === 404) { setNotFound(true); return }
      if (res.ok) {
        const d = (await res.json()).item as ShowcaseWithMeta
        setItem(d)
        setLiked(d.is_liked ?? false)
        setBookmarked(d.is_bookmarked ?? false)
        setLikeCount(d.like_count)
        setBookmarkCount(d.bookmark_count)
      }
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  useEffect(() => { setTimeout(() => void load(), 0) }, [load])

  // Real view — owner's own visits are excluded server-side.
  useEffect(() => {
    if (item) void fetch(`/api/community/showcase/${id}/view`, { method: "POST" }).catch(() => {})
  }, [item, id])

  async function react(reaction: "like" | "bookmark") {
    if (!user) return
    const headers = await authHeaders()
    if (reaction === "like") { setLiked(!liked); setLikeCount((c) => c + (liked ? -1 : 1)) }
    else { setBookmarked(!bookmarked); setBookmarkCount((c) => c + (bookmarked ? -1 : 1)) }
    await fetch(`/api/community/showcase/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ reaction }),
    }).catch(() => {})
  }

  async function sendEnquiry(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSendingEnquiry(true); setEnquiryError("")
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/community/showcase/${id}/enquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ message: enquiryMsg, contact_email: enquiryEmail || undefined }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? d.errors?.[0]?.message ?? "Failed to send.") }
      setEnquirySent(true)
    } catch (err) {
      setEnquiryError(err instanceof Error ? err.message : "Failed to send enquiry.")
    } finally { setSendingEnquiry(false) }
  }

  async function loadEnquiries() {
    if (!item?.is_owner) return
    const headers = await authHeaders()
    const res = await fetch(`/api/community/showcase/${id}/enquiries`, { headers })
    if (res.ok) setEnquiries((await res.json()).enquiries ?? [])
    setShowEnquiries(true)
  }

  async function deleteItem() {
    if (!user || !item) return
    const headers = await authHeaders()
    const res = await fetch(`/api/community/showcase/${id}`, { method: "DELETE", headers })
    if (res.ok) window.location.href = "/community/showcase"
  }

  if (loading) return <div className="max-w-2xl mx-auto w-full h-96 rounded-2xl bg-surface border border-border animate-pulse" />
  if (notFound || !item) {
    return (
      <div className="max-w-2xl mx-auto w-full text-center py-20">
        <p className="font-display font-bold text-xl text-foreground">Showcase item not found</p>
        <Link href="/community/showcase" className="text-gold mt-3 inline-block hover:underline">← Back to Showcase</Link>
      </div>
    )
  }

  const thumbnail = item.thumbnail_url ?? item.media_urls[0] ?? item.after_url ?? null

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {item.item_type === "before_after" && item.before_url && item.after_url ? (
          <div className="grid grid-cols-2">
            <img src={item.before_url} alt="Before" className="w-full aspect-square object-cover" />
            <img src={item.after_url} alt="After" className="w-full aspect-square object-cover" />
          </div>
        ) : thumbnail ? (
          <img src={thumbnail} alt={item.title} className="w-full aspect-[4/3] object-cover" />
        ) : null}

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">{item.title}</h1>
              {(item.project?.title || item.client_name) && (
                <p className="text-xs text-muted/70 mt-1">
                  For {item.project?.title ? (
                    <Link href={`/community/projects/${item.project.id}`} className="text-gold/80 hover:text-gold">{item.project.title}</Link>
                  ) : item.client_name}
                </p>
              )}
            </div>
            {item.author && (
              <Link href={`/community/${item.author.username}`} className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted/85">{item.author.display_name}</span>
              </Link>
            )}
          </div>

          {item.description && <p className="text-sm text-muted/92 whitespace-pre-wrap">{item.description}</p>}

          {item.software_used.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.software_used.map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted/85">{s}</span>)}
            </div>
          )}

          {/* Real insights — views/likes/saves/enquiries, all from actual events */}
          <div className="flex items-center gap-4 text-xs text-muted/70 border-t border-border pt-3">
            <span>{item.view_count} view{item.view_count !== 1 ? "s" : ""}</span>
            <span>{likeCount} like{likeCount !== 1 ? "s" : ""}</span>
            <span>{bookmarkCount} save{bookmarkCount !== 1 ? "s" : ""}</span>
            {item.is_owner && <span>{item.enquiry_count} enquir{item.enquiry_count !== 1 ? "ies" : "y"}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button onClick={() => react("like")} disabled={!user}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${liked ? "bg-gold/20 text-gold" : "bg-surface-2 text-muted/85 hover:bg-surface-3"}`}>
                {liked ? "♥" : "♡"} Like
              </button>
              <button onClick={() => react("bookmark")} disabled={!user}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${bookmarked ? "bg-gold/20 text-gold" : "bg-surface-2 text-muted/85 hover:bg-surface-3"}`}>
                {bookmarked ? "◈" : "◇"} Save
              </button>
            </div>

            {item.is_owner ? (
              <div className="flex items-center gap-3">
                <button onClick={loadEnquiries} className="text-xs text-gold hover:underline">
                  View enquiries ({item.enquiry_count})
                </button>
                <button onClick={deleteItem} className="text-xs text-muted/50 hover:text-red-400 transition-colors">Delete</button>
              </div>
            ) : user ? (
              <button onClick={() => setShowEnquire(true)}
                className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-black hover:bg-gold/90 transition-colors">
                💬 Enquire / Hire
              </button>
            ) : (
              <Link href="/sign-in" className="text-xs text-gold hover:underline">Sign in to enquire</Link>
            )}
          </div>
        </div>
      </div>

      {/* Enquiry modal */}
      {showEnquire && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setShowEnquire(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-black/90 p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            {enquirySent ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✓</p>
                <p className="font-semibold text-foreground">Enquiry sent</p>
                <p className="text-sm text-muted/85 mt-1">{item.author?.display_name} will see your message.</p>
                <button onClick={() => setShowEnquire(false)} className="mt-4 text-xs text-gold hover:underline">Close</button>
              </div>
            ) : (
              <form onSubmit={sendEnquiry} className="flex flex-col gap-3">
                <h2 className="font-display font-bold text-base">Enquire about &quot;{item.title}&quot;</h2>
                {enquiryError && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{enquiryError}</p>}
                <textarea required value={enquiryMsg} onChange={(e) => setEnquiryMsg(e.target.value.slice(0, 1000))}
                  placeholder="Describe the work you have in mind…" rows={4}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none" />
                <input value={enquiryEmail} onChange={(e) => setEnquiryEmail(e.target.value)} type="email"
                  placeholder="Contact email (optional)"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
                <div className="flex items-center gap-2 justify-end">
                  <button type="button" onClick={() => setShowEnquire(false)} className="text-xs text-muted/70 hover:text-foreground px-3 py-2">Cancel</button>
                  <button type="submit" disabled={sendingEnquiry || !enquiryMsg.trim()}
                    className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-black hover:bg-gold/90 disabled:opacity-50 transition-colors">
                    {sendingEnquiry ? "Sending…" : "Send Enquiry"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Owner: enquiries list */}
      {showEnquiries && (
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Enquiries</h2>
          {enquiries.length === 0 ? (
            <p className="text-sm text-muted/70 py-4 text-center">No enquiries yet.</p>
          ) : (
            enquiries.map((e) => (
              <div key={e.id} className="rounded-xl bg-surface-2 p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Link href={`/community/${e.enquirer?.username ?? ""}`} className="text-xs font-semibold text-foreground hover:text-gold">
                    {e.enquirer?.display_name ?? "Someone"}
                  </Link>
                  <span className="text-[0.6875rem] text-muted/70">{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted/92">{e.message}</p>
                {e.contact_email && <p className="text-xs text-gold/80">{e.contact_email}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
