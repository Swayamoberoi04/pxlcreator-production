"use client"

import { useEffect, useState, use }        from "react"
import { motion, AnimatePresence }          from "framer-motion"
import Link                                 from "next/link"
import { useAuth }                          from "@/contexts/AuthContext"
import { FollowButton }                     from "@/components/community/FollowButton"
import { ShowcaseCard }                     from "@/components/community/ShowcaseCard"
import { CREATOR_ROLES }                    from "@/types/community"
import type {
  CommunityProfile, UserEarnedBadge,
  ShowcaseWithMeta, Availability
} from "@/types/community"

const AVAILABILITY_LABELS: Record<Availability, string> = {
  open_for_work:   "Open for Work",
  open_for_collab: "Open for Collab",
  hiring:          "Hiring",
  unavailable:     "Unavailable",
}

const AVAILABILITY_COLORS: Record<Availability, string> = {
  open_for_work:   "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  open_for_collab: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  hiring:          "text-gold border-gold/30 bg-gold/10",
  unavailable:     "text-muted/50 border-border bg-surface",
}

interface ProfileResponse {
  profile:      CommunityProfile
  badges:       UserEarnedBadge[]
  is_following: boolean
}

export default function CreatorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const { user }     = useAuth()

  const [data,      setData]      = useState<ProfileResponse | null>(null)
  const [showcase,  setShowcase]  = useState<ShowcaseWithMeta[]>([])
  const [tab,       setTab]       = useState<"showcase"|"about">("showcase")
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [showEdit,  setShowEdit]  = useState(false)

  const isOwnProfile = user && data?.profile.firebase_uid === user.uid

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const headers: Record<string,string> = {}
        if (user) {
          try { headers["Authorization"] = `Bearer ${await user.getIdToken()}` } catch { /* ignore */ }
        }
        const [profileRes, showcaseRes] = await Promise.allSettled([
          fetch(`/api/community/profile/${username}`, { headers }),
          fetch(`/api/community/showcase?limit=20`, { headers }),
        ])

        if (profileRes.status === "fulfilled") {
          if (profileRes.value.status === 404) { setNotFound(true); return }
          if (profileRes.value.ok) setData(await profileRes.value.json())
        }
        if (showcaseRes.status === "fulfilled" && showcaseRes.value.ok) {
          // Filter to this user's showcase when we have their uid
          const d = await showcaseRes.value.json()
          setShowcase(d.items ?? [])
        }
      } finally { setLoading(false) }
    }
    void load()
  }, [username, user])

  if (loading) return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-36 rounded-2xl bg-surface border border-border" />
      <div className="flex items-end gap-4">
        <div className="w-20 h-20 rounded-full bg-surface-2 border-4 border-black -mt-10" />
        <div className="flex flex-col gap-2 pb-2">
          <div className="h-5 w-40 rounded-full bg-surface-2" />
          <div className="h-3 w-24 rounded-full bg-surface-2" />
        </div>
      </div>
    </div>
  )

  if (notFound || !data) return (
    <div className="text-center py-20">
      <p className="font-display font-black text-[1.5rem] text-foreground">Creator not found</p>
      <Link href="/community/discover" className="text-gold mt-4 inline-block hover:underline">
        ← Discover Creators
      </Link>
    </div>
  )

  const { profile, badges, is_following } = data
  const roleLabels = profile.roles.map(r => CREATOR_ROLES.find(cr => cr.id === r)?.label ?? r)
  const availability = profile.availability as Availability

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-border">
        <div className="h-40 bg-gradient-to-br from-gold/10 via-black/80 to-black" />
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="absolute inset-0 w-full h-40 object-cover opacity-40" />
        )}
      </div>

      {/* Avatar + name row */}
      <div className="flex items-end justify-between gap-4 -mt-14 px-2">
        <div className="flex items-end gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 shrink-0 rounded-full border-4 border-black bg-gold/20 flex items-center justify-center text-[1.75rem] font-black text-gold overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile.display_name[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-[1.375rem] text-foreground">{profile.display_name}</h1>
              {profile.is_verified && (
                <span className="text-gold text-[0.875rem]" title="Verified">✓</span>
              )}
            </div>
            <p className="text-[0.875rem] text-muted/60">@{profile.username}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pb-1">
          {isOwnProfile ? (
            <button type="button" onClick={() => setShowEdit(true)}
              className="rounded-full border border-border px-4 py-2 text-[0.875rem] font-medium text-muted hover:border-gold/30 hover:text-foreground transition-colors">
              Edit Profile
            </button>
          ) : user && (
            <>
              <FollowButton
                targetUid={profile.firebase_uid}
                initialFollowing={is_following}
                onToggle={(following) => setData(d => d ? { ...d, is_following: following, profile: { ...d.profile, follower_count: d.profile.follower_count + (following ? 1 : -1) } } : d)}
              />
            </>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-col gap-3 px-1">
        {/* Availability */}
        <span className={`self-start text-[0.75rem] font-semibold rounded-full border px-3 py-1 ${AVAILABILITY_COLORS[availability]}`}>
          {availability !== "unavailable" && <span className="mr-1">●</span>}
          {AVAILABILITY_LABELS[availability]}
        </span>

        {/* Bio */}
        {profile.bio && (
          <p className="text-[0.9375rem] text-muted/75 leading-relaxed max-w-xl">{profile.bio}</p>
        )}

        {/* Roles */}
        {roleLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {roleLabels.map(r => (
              <span key={r} className="text-[0.8125rem] text-muted/70 border border-border rounded-full px-3 py-0.5 bg-surface">
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Location + links */}
        <div className="flex flex-wrap items-center gap-4 text-[0.875rem] text-muted/50">
          {profile.location_city && (
            <span>📍 {profile.location_city}{profile.location_country ? `, ${profile.location_country}` : ""}</span>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer"
              className="hover:text-gold transition-colors">🔗 Website</a>
          )}
          {profile.instagram_url && (
            <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"
              className="hover:text-gold transition-colors">Instagram</a>
          )}
          {profile.youtube_url && (
            <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer"
              className="hover:text-gold transition-colors">YouTube</a>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {[
            { label: "Followers",  value: profile.follower_count  },
            { label: "Following",  value: profile.following_count },
            { label: "Showcases",  value: profile.showcase_count  },
            { label: "Rep Score",  value: profile.reputation_score },
          ].map(s => (
            <div key={s.label} className="flex flex-col">
              <span className="font-display font-black text-[1.25rem] text-foreground">{s.value.toLocaleString()}</span>
              <span className="text-[0.75rem] text-muted/50">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map(b => b.badge && (
              <span
                key={b.id}
                title={b.badge.name}
                className="flex items-center gap-1 text-[0.75rem] font-semibold rounded-full border px-2.5 py-0.5"
                style={{ color: b.badge.color, borderColor: `${b.badge.color}40` }}
              >
                {b.badge.icon} {b.badge.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["showcase","about"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 text-[0.875rem] font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-gold text-gold" : "border-transparent text-muted/60 hover:text-foreground"
            }`}>{t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "showcase" ? (
          <motion.div key="showcase" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {showcase.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
                <p className="text-muted/50">No showcase items yet.</p>
                {isOwnProfile && (
                  <Link href="/community/showcase" className="mt-3 inline-block text-gold hover:underline text-[0.875rem]">
                    Share your first work →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {showcase.slice(0, 6).map(item => <ShowcaseCard key={item.id} item={item} compact />)}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-[0.875rem]">
              <div>
                <p className="text-muted/50 text-[0.75rem] uppercase tracking-wider mb-1">Skill Level</p>
                <p className="text-foreground capitalize">{profile.skill_level}</p>
              </div>
              <div>
                <p className="text-muted/50 text-[0.75rem] uppercase tracking-wider mb-1">Member Since</p>
                <p className="text-foreground">{new Date(profile.created_at).toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
              </div>
              {profile.behance_url && (
                <div>
                  <p className="text-muted/50 text-[0.75rem] uppercase tracking-wider mb-1">Behance</p>
                  <a href={profile.behance_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{profile.behance_url}</a>
                </div>
              )}
              {profile.portfolio_url && (
                <div>
                  <p className="text-muted/50 text-[0.75rem] uppercase tracking-wider mb-1">Portfolio</p>
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{profile.portfolio_url}</a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      {showEdit && isOwnProfile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setData(d => d ? { ...d, profile: updated } : d)
            setShowEdit(false)
          }}
        />
      )}
    </div>
  )
}

/* ── Edit Profile Modal ───────────────────────────────────────── */
function EditProfileModal({
  profile, onClose, onSaved
}: { profile: CommunityProfile; onClose: () => void; onSaved: (p: CommunityProfile) => void }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    display_name:     profile.display_name,
    bio:              profile.bio ?? "",
    location_city:    profile.location_city ?? "",
    location_country: profile.location_country ?? "",
    website:          profile.website ?? "",
    instagram_url:    profile.instagram_url ?? "",
    youtube_url:      profile.youtube_url ?? "",
    behance_url:      profile.behance_url ?? "",
    portfolio_url:    profile.portfolio_url ?? "",
    avatar_url:       profile.avatar_url ?? "",
    banner_url:       profile.banner_url ?? "",
    skill_level:      profile.skill_level,
    availability:     profile.availability,
    roles:            profile.roles,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  function toggleRole(id: string) {
    setForm(p => ({
      ...p,
      roles: p.roles.includes(id) ? p.roles.filter(r => r !== id) : [...p.roles, id]
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true); setError("")
    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/community/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const { profile: updated } = await res.json() as { profile: CommunityProfile }
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.")
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.form
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-black/90 p-6 flex flex-col gap-4 my-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-[1.125rem]">Edit Profile</h2>
          <button type="button" onClick={onClose} className="text-muted/40 hover:text-muted text-[1.5rem] leading-none">×</button>
        </div>

        {error && <p className="text-[0.875rem] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-col gap-3">
          <input value={form.display_name} onChange={e => setForm(p=>({...p,display_name:e.target.value}))}
            placeholder="Display name" maxLength={60}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
          <textarea value={form.bio} onChange={e => setForm(p=>({...p,bio:e.target.value}))}
            placeholder="Bio (max 500 chars)" rows={3} maxLength={500}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.location_city} onChange={e => setForm(p=>({...p,location_city:e.target.value}))} placeholder="City"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
            <input value={form.location_country} onChange={e => setForm(p=>({...p,location_country:e.target.value}))} placeholder="Country"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
          </div>
          <input value={form.avatar_url} onChange={e => setForm(p=>({...p,avatar_url:e.target.value}))} placeholder="Avatar URL"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
          <input value={form.website} onChange={e => setForm(p=>({...p,website:e.target.value}))} placeholder="Website URL"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.instagram_url} onChange={e => setForm(p=>({...p,instagram_url:e.target.value}))} placeholder="Instagram URL"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
            <input value={form.youtube_url} onChange={e => setForm(p=>({...p,youtube_url:e.target.value}))} placeholder="YouTube URL"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.skill_level} onChange={e => setForm(p=>({...p,skill_level:e.target.value as never}))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              {["beginner","intermediate","advanced","professional"].map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
            </select>
            <select value={form.availability} onChange={e => setForm(p=>({...p,availability:e.target.value as never}))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:outline-none focus:border-gold/40">
              <option value="open_for_work">Open for Work</option>
              <option value="open_for_collab">Open for Collab</option>
              <option value="hiring">Hiring</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {/* Roles */}
          <div>
            <p className="text-[0.8125rem] text-muted/60 mb-2">Roles (select all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {CREATOR_ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                  className={`text-[0.75rem] rounded-full px-3 py-1 border transition-all ${
                    form.roles.includes(r.id)
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-border text-muted/60 hover:border-gold/30 hover:text-foreground"
                  }`}
                >{r.label}</button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="rounded-full bg-gold py-3 font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </motion.form>
    </div>
  )
}