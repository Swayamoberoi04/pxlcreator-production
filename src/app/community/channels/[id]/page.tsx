"use client"

import { useEffect, useState, use } from "react"
import Link                          from "next/link"
import { useAuth }                   from "@/contexts/AuthContext"
import { PostCard }                  from "@/components/community/PostCard"
import type { ChannelWithMeta, PostWithMeta } from "@/types/community"

export default function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params)
  const { user } = useAuth()

  const [channel, setChannel] = useState<ChannelWithMeta | null>(null)
  const [posts,   setPosts]   = useState<PostWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [newPost, setNewPost] = useState("")
  const [posting, setPosting] = useState(false)
  const [tab,     setTab]     = useState<"posts"|"about">("posts")

  async function getHeaders(): Promise<Record<string,string>> {
    if (!user) return {}
    try { return { Authorization: `Bearer ${await user.getIdToken()}` } } catch { return {} }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      const h = await getHeaders()
      const [cr, pr] = await Promise.allSettled([
        fetch(`/api/community/channels/${id}`, { headers: h }),
        fetch(`/api/community/channels/${id}/posts?limit=20`, { headers: h }),
      ])
      if (cr.status === "fulfilled" && cr.value.ok) setChannel((await cr.value.json()).channel)
      if (pr.status === "fulfilled" && pr.value.ok) setPosts((await pr.value.json()).posts ?? [])
      setLoading(false)
    }
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  async function toggleJoin() {
    if (!user || !channel) return
    setJoining(true)
    const h = await getHeaders()
    const res = await fetch(`/api/community/channels/${id}/join`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ action: channel.is_member ? "leave" : "join" }),
    })
    if (res.ok) {
      const d = await res.json() as { is_member: boolean; member_count: number }
      setChannel(c => c ? { ...c, is_member: d.is_member, member_count: d.member_count } : c)
    }
    setJoining(false)
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newPost.trim()) return
    setPosting(true)
    const h = await getHeaders()
    const res = await fetch(`/api/community/channels/${id}/posts`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ body: newPost.trim(), post_type: "text" }),
    })
    if (res.ok) {
      const d = await res.json() as { post: PostWithMeta }
      setPosts(p => [d.post, ...p])
      setNewPost("")
    }
    setPosting(false)
  }

  if (loading) return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-24 rounded-2xl bg-surface border border-border" />
      {[0,1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-surface border border-border" />)}
    </div>
  )

  if (!channel) return (
    <div className="text-center py-20">
      <p className="font-display font-black text-[1.5rem] text-foreground">Channel not found</p>
      <Link href="/community/channels" className="text-gold mt-4 inline-block hover:underline">← Back to Channels</Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Channel header */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="h-16 bg-gradient-to-br from-gold/10 via-black to-black" />
        <div className="px-6 pb-4 pt-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[1.75rem] w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center">
              {channel.icon ?? "📡"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-[1.25rem] text-foreground">{channel.name}</h1>
                {channel.is_verified && <span className="text-gold">✓</span>}
              </div>
              <p className="text-[0.8125rem] text-muted/60">
                {channel.member_count.toLocaleString()} members · {channel.post_count} posts
              </p>
            </div>
          </div>
          {user && (
            <button type="button" onClick={toggleJoin} disabled={joining}
              className={`rounded-full px-5 py-2 text-[0.875rem] font-semibold transition-all disabled:opacity-50 ${
                channel.is_member
                  ? "border border-border text-muted hover:border-gold/30 hover:text-foreground"
                  : "bg-gold text-background hover:bg-gold/90"
              }`}>
              {joining ? "…" : channel.is_member ? "Joined ✓" : "Join Channel"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["posts","about"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 text-[0.875rem] font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-gold text-gold" : "border-transparent text-muted/60 hover:text-foreground"
            }`}>{t}
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        <div className="flex flex-col gap-4">
          {/* Post composer */}
          {user && (channel.is_member || channel.visibility === "public") && (
            <form onSubmit={submitPost} className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
              <textarea
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                placeholder={`Share something in ${channel.name}…`}
                rows={3}
                maxLength={5000}
                className="w-full bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none resize-none"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={posting || !newPost.trim()}
                  className="rounded-full bg-gold px-5 py-1.5 text-[0.875rem] font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          )}

          {/* Private gate */}
          {!channel.is_member && channel.visibility === "private" ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
              <p className="font-bold text-foreground mb-2">🔒 Private Channel</p>
              <p className="text-[0.875rem] text-muted/60 mb-4">Join to see discussions.</p>
              {user && (
                <button onClick={toggleJoin} disabled={joining}
                  className="rounded-full bg-gold px-6 py-2 font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
                  {joining ? "…" : "Join Channel"}
                </button>
              )}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
              <p className="text-muted/50">No posts yet — start the conversation!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map(post => <PostCard key={post.id} post={post} channelId={id} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
          <p className="text-foreground/80 leading-relaxed">{channel.long_description ?? channel.description}</p>
          {channel.rules && (
            <div>
              <p className="text-[0.8125rem] font-bold text-muted/50 uppercase tracking-wider mb-2">Rules</p>
              <p className="text-[0.875rem] text-muted/70 whitespace-pre-wrap">{channel.rules}</p>
            </div>
          )}
          {channel.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {channel.tags.map(tag => (
                <span key={tag} className="text-[0.75rem] text-muted/60 bg-surface-2 border border-border rounded-full px-2.5 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}