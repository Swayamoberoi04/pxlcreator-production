"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { CONTENT_KINDS } from "@/types/community"
import type { ContentKind, PostWithMeta } from "@/types/community"

interface PostComposerProps {
  onPosted: (post: PostWithMeta) => void
}

/**
 * Feed post composer. Media is added by URL, matching the existing Showcase
 * upload flow's convention (paste a hosted image/video URL) rather than
 * introducing a second, inconsistent upload mechanism.
 */
export function PostComposer({ onPosted }: PostComposerProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<ContentKind>("text")
  const [aiAssisted, setAiAssisted] = useState(false)
  const [visibility, setVisibility] = useState<"public" | "followers">("public")
  const [hashtags, setHashtags] = useState("")
  const [mediaUrls, setMediaUrls] = useState("")
  const [beforeUrl, setBeforeUrl] = useState("")
  const [afterUrl, setAfterUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  function reset() {
    setBody(""); setTitle(""); setKind("text"); setAiAssisted(false)
    setVisibility("public"); setHashtags(""); setMediaUrls(""); setBeforeUrl(""); setAfterUrl("")
    setOpen(false); setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (body.trim().length === 0) { setError("Write something first."); return }
    if (kind === "before_after" && (!beforeUrl.trim() || !afterUrl.trim())) {
      setError("A Before/After post needs both a before and an after image URL.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const media: { media_url: string; media_type: string; role?: string }[] = []
      if (kind === "before_after") {
        media.push({ media_url: beforeUrl.trim(), media_type: "image", role: "before" })
        media.push({ media_url: afterUrl.trim(), media_type: "image", role: "after" })
      } else {
        for (const url of mediaUrls.split("\n").map((u) => u.trim()).filter(Boolean).slice(0, 10)) {
          media.push({ media_url: url, media_type: /\.(mp4|mov|webm)(\?|$)/i.test(url) ? "video" : "image" })
        }
      }

      const token = await user.getIdToken()
      const res = await fetch("/api/community/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          body: body.trim(),
          title: title.trim() || undefined,
          content_kind: kind,
          ai_assisted: aiAssisted,
          visibility,
          hashtags: hashtags.split(",").map((h) => h.trim().replace(/^#/, "")).filter(Boolean),
          media,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? d.errors?.[0]?.message ?? "Failed to post.")
      }
      const { post } = await res.json()
      onPosted(post)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted/70 hover:border-gold/30 transition-colors"
      >
        Share your work — a before/after, an editing breakdown, a Lightroom recipe…
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {CONTENT_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={[
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              kind === k.id ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-surface-2 text-muted/85 hover:text-foreground",
            ].join(" ")}
          >
            <span>{k.icon}</span><span>{k.label}</span>
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 200))}
        placeholder="Title (optional)"
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 5000))}
        placeholder="What did you make? Describe your edit, gear, or process…"
        rows={4}
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none"
      />

      {kind === "before_after" ? (
        <div className="grid grid-cols-2 gap-3">
          <input value={beforeUrl} onChange={(e) => setBeforeUrl(e.target.value)} placeholder="Before image URL"
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          <input value={afterUrl} onChange={(e) => setAfterUrl(e.target.value)} placeholder="After image URL"
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
        </div>
      ) : (
        <textarea
          value={mediaUrls}
          onChange={(e) => setMediaUrls(e.target.value)}
          placeholder="Image/video URLs, one per line (optional)"
          rows={2}
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none"
        />
      )}

      <input
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
        placeholder="Hashtags, comma-separated (optional)"
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted/85">
            <input type="checkbox" checked={aiAssisted} onChange={(e) => setAiAssisted(e.target.checked)} />
            AI-assisted
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "public" | "followers")}
            className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-gold/40"
          >
            <option value="public">Public</option>
            <option value="followers">Followers only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="text-xs text-muted/70 hover:text-foreground transition-colors px-3 py-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-black hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  )
}
