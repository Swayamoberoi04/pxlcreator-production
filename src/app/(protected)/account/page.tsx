"use client"

import { useRouter }   from "next/navigation"
import { useAuth }     from "@/contexts/AuthContext"
import { Container }   from "@/components/layout/Container"
import Link            from "next/link"
import { useState, useEffect, useCallback } from "react"
import type { OrderSummary }   from "@/types/commerce"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import {
  PROFESSIONS, GOALS, AESTHETICS, SKILL_LEVELS, PLATFORMS,
  type ProfessionId, type GoalId, type AestheticId, type SkillLevelId, type PlatformId,
  type CreatorProfileRow,
} from "@/types/onboarding"

interface SubStatus {
  plan_id:            string | null
  current_period_end: string | null
}

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [subStatus,  setSubStatus]  = useState<SubStatus | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user.getIdToken().then((token) =>
      fetch("/api/subscriptions/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.subscription) {
          setSubStatus({
            plan_id:            data.subscription.plan_id,
            current_period_end: data.subscription.current_period_end,
          })
        }
      })
      .catch(() => null)
    return () => { cancelled = true }
  }, [user])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push("/")
  }

  if (!user) return null

  const isPremium   = !!subStatus?.plan_id
  const planLabel   = subStatus?.plan_id
    ? subStatus.plan_id.charAt(0).toUpperCase() + subStatus.plan_id.slice(1) + " Plan"
    : "Free Plan"
  const renewsDate  = subStatus?.current_period_end
    ? new Date(subStatus.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email?.charAt(0).toUpperCase() ?? "U"

  const provider     = user.providerData[0]?.providerId === "google.com" ? "Google" : "Email & Password"
  const memberSince  = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—"

  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="gold" intensity={0.75} />
        <GrainOverlay opacity={0.015} animated zIndex={1} />
        <Container className="relative z-10 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

            <div className="flex items-center gap-5">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="Avatar" width={56} height={56} className="rounded-full object-cover border-2 border-gold/20" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 border-2 border-gold/20 font-display font-bold text-[1.25rem] text-gold">
                  {initials}
                </div>
              )}
              <div>
                <h1 className="font-display font-bold text-[1.375rem] text-foreground leading-tight">
                  {user.displayName ?? "Creator"}
                </h1>
                <p className="text-[0.875rem] text-muted/85 mt-0.5">{user.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              suppressHydrationWarning
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-[0.875rem] font-medium text-muted transition-all hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {signingOut
                ? <div className="h-3.5 w-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                : <LogOutIcon />
              }
              {signingOut ? "Signing out…" : "Sign out"}
            </button>

          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-14">
        <div className="flex flex-col gap-10 max-w-3xl">

          {/* ── Account info cards ── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoCard label="Email"          value={user.email ?? "—"}  icon={<MailIcon />}     />
            <InfoCard label="Sign-in method" value={provider}           icon={<ShieldIcon />}   />
            <InfoCard label="Member since"   value={memberSince}        icon={<CalendarIcon />} />

            <div className={`sm:col-span-2 lg:col-span-3 rounded-2xl border p-6 flex items-center justify-between gap-4 ${isPremium ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-gold/15 bg-gold/[0.04]"}`}>
              <div className="flex flex-col gap-1">
                <p className={`text-label tracking-widest ${isPremium ? "text-emerald-400/70" : "text-gold/70"}`}>Subscription</p>
                <p className="font-display font-bold text-foreground text-[1rem]">{planLabel}</p>
                <p className="text-[0.8125rem] text-muted/85">
                  {isPremium && renewsDate
                    ? `Active until ${renewsDate} · renew anytime from Plans`
                    : "Upgrade to unlock all preset packs, courses, and early access drops."
                  }
                </p>
              </div>
              <Link
                href="/premium"
                className={`shrink-0 rounded-xl px-5 py-2.5 text-[0.875rem] font-semibold transition-all active:scale-[0.97] ${isPremium ? "border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10" : "bg-gold text-background hover:bg-gold-dim"}`}
              >
                {isPremium ? "Manage Plan" : "View Plans"}
              </Link>
            </div>
          </div>

          {/* ── My Library ── */}
          <MyLibrary />

          {/* ── Creative Preferences ── */}
          <CreativePreferences />

        </div>
      </Container>

    </div>
  )
}

/* ─────────────────────────────────────────
   My Library section
───────────────────────────────────────── */
function MyLibrary() {
  const { user }  = useAuth()
  const [orders,  setOrders]  = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    user.getIdToken().then((token) =>
      fetch("/api/account/orders", {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) setError(data.error)
        else setOrders(data.orders ?? [])
      })
      .catch(() => { if (!cancelled) setError("Failed to load library") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user])

  const allItems = orders.flatMap((o) => o.items)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-[1.125rem] text-foreground">My Library</h2>
        {allItems.length > 0 && (
          <span className="text-small text-muted">{allItems.length} preset{allItems.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-[72px] rounded-2xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5 text-center">
          <p className="text-small text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && allItems.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-10 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 border border-border text-muted">
            <LibraryIcon />
          </div>
          <div>
            <p className="font-medium text-foreground">No purchases yet</p>
            <p className="text-small text-muted mt-1">
              Your purchased presets will appear here with download links.
            </p>
          </div>
          <Link
            href="/store"
            className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-background hover:bg-gold-dim transition-colors"
          >
            Browse Store
          </Link>
        </div>
      )}

      {!loading && !error && allItems.length > 0 && (
        <div className="flex flex-col gap-3">
          {allItems.map((item) => {
            const dl = item.download
            const isExpired  = dl ? new Date(dl.expires_at) < new Date() : false
            const isExhausted = dl ? dl.download_count >= dl.max_downloads : false
            const canDownload = dl && !isExpired && !isExhausted

            return (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
                  <PresetIcon />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.preset_title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {dl
                      ? isExpired   ? "Link expired"
                      : isExhausted ? "Download limit reached"
                      : `${dl.download_count}/${dl.max_downloads} downloads used`
                      : "Preparing download…"
                    }
                  </p>
                </div>

                {canDownload ? (
                  <a
                    href={`/api/downloads/${dl!.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-background hover:bg-gold-dim transition-colors active:scale-95"
                  >
                    <DownloadIcon />
                    Download
                  </a>
                ) : (
                  <span className="shrink-0 rounded-xl border border-border px-4 py-2.5 text-sm text-muted cursor-not-allowed">
                    {dl ? (isExpired ? "Expired" : "Limit reached") : "Pending"}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Order history footer */}
      {orders.length > 0 && (
        <div className="rounded-xl border border-border bg-surface/50 px-4 py-3">
          <p className="text-small text-muted text-center">
            {orders.length} order{orders.length !== 1 ? "s" : ""} total ·{" "}
            ₹{orders.reduce((s, o) => s + o.total_inr, 0).toLocaleString("en-IN")} spent
          </p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Creative Preferences section
───────────────────────────────────────── */
function CreativePreferences() {
  const { user } = useAuth()

  const [profile,  setProfile]  = useState<CreatorProfileRow | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  /* Editable state */
  const [profs,    setProfs]    = useState<ProfessionId[]>([])
  const [goals,    setGoals]    = useState<GoalId[]>([])
  const [aesth,    setAesth]    = useState<AestheticId[]>([])
  const [skill,    setSkill]    = useState<SkillLevelId>("intermediate")
  const [plats,    setPlats]    = useState<PlatformId[]>([])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data  = await res.json()
      if (data.profile) {
        const p: CreatorProfileRow = data.profile
        setProfile(p)
        setProfs(p.professions ?? [])
        setGoals(p.goals ?? [])
        setAesth(p.aesthetics ?? [])
        setSkill((p.skill_level ?? "intermediate") as SkillLevelId)
        setPlats(p.platforms ?? [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [user])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/onboarding/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          professions: profs,
          goals,
          aesthetics:  aesth,
          skillLevel:  skill,
          platforms:   plats,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to save."); return }
      setProfile(data.profile)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  function toggle<T extends string>(arr: T[], val: T, max?: number): T[] {
    if (arr.includes(val)) return arr.filter((x) => x !== val)
    if (max && arr.length >= max) return arr
    return [...arr, val]
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-6 w-48 rounded bg-surface animate-pulse" />
        <div className="h-40 rounded-2xl border border-border bg-surface animate-pulse" />
      </div>
    )
  }

  if (!profile) return null

  const dnaColor = profile.style_dna_color ?? "#FFD700"
  const dnaBadge = profile.style_dna_badge ?? "Creator"
  const dnaTitle = profile.style_dna_title ?? "Your Style"

  return (
    <div className="flex flex-col gap-5" id="preferences">

      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-[1.125rem] text-foreground">Creative Preferences</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setSaved(false) }}
            className="text-[0.8125rem] font-medium text-gold hover:text-gold/80 transition-colors"
          >
            Edit Preferences
          </button>
        )}
      </div>

      {/* Style DNA card */}
      {!editing && (
        <div
          className="rounded-2xl border p-5 flex items-center gap-4"
          style={{ borderColor: `${dnaColor}25`, background: `${dnaColor}08` }}
        >
          <div
            className="shrink-0 size-12 rounded-full flex items-center justify-center font-display font-bold text-[1.125rem]"
            style={{ background: `${dnaColor}20`, color: dnaColor }}
          >
            ◈
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[0.65rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: `${dnaColor}20`, color: dnaColor }}
              >
                {dnaBadge}
              </span>
            </div>
            <p className="font-display font-bold text-[1rem] text-foreground leading-tight">{dnaTitle}</p>
            {profile.style_dna_tagline && (
              <p className="text-[0.8125rem] text-muted/85 mt-0.5 leading-snug">{profile.style_dna_tagline}</p>
            )}
          </div>
        </div>
      )}

      {/* Read-only preference chips */}
      {!editing && (
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
          {profile.professions?.length > 0 && (
            <PrefRow label="Profession">
              {profile.professions.map((id) => {
                const p = PROFESSIONS.find((x) => x.id === id)
                return p ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.75rem] font-medium text-foreground/92">
                    {p.label}
                  </span>
                ) : null
              })}
            </PrefRow>
          )}
          {profile.goals?.length > 0 && (
            <PrefRow label="Goals">
              {profile.goals.map((id) => {
                const g = GOALS.find((x) => x.id === id)
                return g ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.75rem] font-medium text-foreground/92">
                    {g.label}
                  </span>
                ) : null
              })}
            </PrefRow>
          )}
          {profile.aesthetics?.length > 0 && (
            <PrefRow label="Aesthetics">
              {profile.aesthetics.map((id) => {
                const a = AESTHETICS.find((x) => x.id === id)
                return a ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.75rem] font-medium text-foreground/92">
                    {a.label}
                  </span>
                ) : null
              })}
            </PrefRow>
          )}
          {profile.skill_level && (
            <PrefRow label="Skill Level">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.75rem] font-medium text-foreground/92 capitalize">
                {profile.skill_level}
              </span>
            </PrefRow>
          )}
          {profile.platforms?.length > 0 && (
            <PrefRow label="Platforms">
              {profile.platforms.map((id) => {
                const pl = PLATFORMS.find((x) => x.id === id)
                return pl ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.75rem] font-medium text-foreground/92">
                    {pl.label}
                  </span>
                ) : null
              })}
            </PrefRow>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-6">

          {/* Profession */}
          <EditSection label="Profession" hint="Select all that apply">
            <div className="flex flex-wrap gap-2">
              {PROFESSIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfs((v) => toggle(v, p.id as ProfessionId))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-all",
                    profs.includes(p.id as ProfessionId)
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border bg-surface-2 text-muted/92 hover:border-border/80 hover:text-foreground",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </EditSection>

          {/* Goals */}
          <EditSection label="Goals" hint="Up to 3">
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoals((v) => toggle(v, g.id as GoalId, 3))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-all",
                    goals.includes(g.id as GoalId)
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border bg-surface-2 text-muted/92 hover:border-border/80 hover:text-foreground",
                  ].join(" ")}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </EditSection>

          {/* Aesthetics */}
          <EditSection label="Aesthetics" hint="Up to 3">
            <div className="flex flex-wrap gap-2">
              {AESTHETICS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAesth((v) => toggle(v, a.id as AestheticId, 3))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-all",
                    aesth.includes(a.id as AestheticId)
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border bg-surface-2 text-muted/92 hover:border-border/80 hover:text-foreground",
                  ].join(" ")}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </EditSection>

          {/* Skill Level */}
          <EditSection label="Skill Level" hint="Select one">
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSkill(s.id as SkillLevelId)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-all",
                    skill === s.id
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border bg-surface-2 text-muted/92 hover:border-border/80 hover:text-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </EditSection>

          {/* Platforms */}
          <EditSection label="Platforms" hint="Select all that apply">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setPlats((v) => toggle(v, pl.id as PlatformId))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-all",
                    plats.includes(pl.id as PlatformId)
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border bg-surface-2 text-muted/92 hover:border-border/80 hover:text-foreground",
                  ].join(" ")}
                >
                  {pl.label}
                </button>
              ))}
            </div>
          </EditSection>

          {/* Error */}
          {error && (
            <p className="text-[0.8125rem] text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !profs.length}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-[0.875rem] font-bold text-background hover:bg-gold/90 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="size-3.5 rounded-full border-2 border-background/40 border-t-background animate-spin" />
                  Saving…
                </>
              ) : "Save Preferences"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null) }}
              className="text-[0.875rem] font-medium text-muted/85 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved toast */}
      {saved && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-[0.8125rem] text-emerald-400 font-medium">
            ✓ Preferences saved — your recommendations have been refreshed.
          </p>
        </div>
      )}
    </div>
  )
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function EditSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <p className="text-[0.8125rem] font-semibold text-foreground">{label}</p>
        {hint && <p className="text-[0.7rem] text-muted/70">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted/85">{icon}<span className="text-label tracking-widest">{label}</span></div>
      <p className="text-[0.9375rem] font-medium text-foreground leading-snug truncate">{value}</p>
    </div>
  )
}

/* ── Icons ── */
function LogOutIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function MailIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg> }
function ShieldIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function LibraryIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function PresetIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }

