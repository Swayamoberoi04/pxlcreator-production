"use client"

/**
 * /store/for-you — Personalized preset store.
 *
 * Fetches presets ranked by the user's category affinities from
 * /api/presets/personalized. Falls back to featured presets for
 * unauthenticated users.
 */

import { useEffect, useState }  from "react"
import { motion }               from "framer-motion"
import Link                     from "next/link"
import { useAuth }              from "@/contexts/AuthContext"

interface PersonalizedPreset {
  id:             string
  slug:           string
  name:           string
  tagline:        string
  price:          number
  original_price: number | null
  category:       string
  rating:         number
  review_count:   number
  badge:          string | null
  is_featured:    boolean
  is_free:        boolean
  thumbnail_url:  string | null
  price_tier:     string | null
  affinityScore:  number
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface animate-pulse">
      <div className="aspect-[4/3] bg-surface-2 rounded-t-2xl" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-3 w-3/4 rounded bg-surface-2" />
        <div className="h-3 w-1/2 rounded bg-surface-2 opacity-60" />
        <div className="h-3 w-1/4 rounded bg-surface-2 opacity-40 mt-1" />
      </div>
    </div>
  )
}

function PresetCard({ preset, accentColor }: { preset: PersonalizedPreset; accentColor: string }) {
  const discount = preset.original_price && preset.original_price > preset.price
    ? Math.round((1 - preset.price / preset.original_price) * 100)
    : null

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-border bg-surface hover:border-gold/30 hover:bg-surface-2 transition-all duration-200 overflow-hidden">
      <Link href={`/store/${preset.slug}`}>
        <div className="aspect-[4/3] bg-surface-2 relative overflow-hidden">
          {preset.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${accentColor}15, transparent)` }}>
              ◈
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {preset.is_free && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500 text-white">FREE</span>
            )}
            {preset.badge && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold text-background">{preset.badge}</span>
            )}
            {discount && !preset.is_free && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500 text-white">-{discount}%</span>
            )}
          </div>
          {/* Match score */}
          {preset.affinityScore > 0 && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-[9px] font-bold text-white">{preset.affinityScore}% match</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-1.5">
          <p className="font-display font-bold text-sm text-foreground line-clamp-1">{preset.name}</p>
          <p className="text-[0.75rem] text-muted/85 line-clamp-1">{preset.tagline}</p>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-foreground">
                {preset.is_free ? "Free" : `$${preset.price}`}
              </span>
              {preset.original_price && preset.original_price > preset.price && !preset.is_free && (
                <span className="text-[0.7rem] text-muted/70 line-through">${preset.original_price}</span>
              )}
            </div>
            {preset.rating > 0 && (
              <span className="text-[0.7rem] text-muted/85">â­ {preset.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function PersonalizedStorePage() {
  const { user }                            = useAuth()
  const [presets,      setPresets]          = useState<PersonalizedPreset[]>([])
  const [loading,      setLoading]          = useState(true)
  const [personalized, setPersonalized]     = useState(false)
  const [topAffinities, setTopAffinities]   = useState<string[]>([])
  const [accentColor,  setAccentColor]      = useState("#FFD60A")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const headers: Record<string, string> = {}
        if (user) {
          try {
            const token = await user.getIdToken()
            headers["Authorization"] = `Bearer ${token}`
            // Also load DNA color
            const profileRes = await fetch("/api/onboarding/status", { headers })
            if (profileRes.ok) {
              const d = await profileRes.json() as { profile?: { style_dna_color?: string } }
              if (d.profile?.style_dna_color) setAccentColor(d.profile.style_dna_color)
            }
          } catch { /* ignore */ }
        }

        const res  = await fetch("/api/presets/personalized?limit=24", { headers })
        const data = await res.json() as {
          presets: PersonalizedPreset[]
          personalized: boolean
          topAffinities: string[]
        }

        setPresets(data.presets ?? [])
        setPersonalized(data.personalized ?? false)
        setTopAffinities(data.topAffinities ?? [])
      } catch (err) {
        console.error("[PersonalizedStore]", err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user])

  const headline = personalized && topAffinities.length > 0
    ? `Presets for Your ${capitalise(topAffinities[0])} Eye`
    : "Curated Preset Collection"

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-10">
      {/* Hero */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70">
            {personalized ? "Personalized For You" : "Full Collection"}
          </span>
          {personalized && (
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
          )}
        </div>
        <h1 className="font-display font-bold text-[2rem] sm:text-[2.5rem] text-foreground leading-tight">
          {headline}
        </h1>
        {personalized && topAffinities.length > 0 && (
          <p className="text-[0.9375rem] text-muted/85">
            Ranked by your affinity for {topAffinities.slice(0, 3).map(capitalise).join(", ")} aesthetics.
          </p>
        )}
        {!personalized && (
          <p className="text-[0.9375rem] text-muted/85">
            <Link href="/onboarding" className="text-gold hover:underline">Complete your profile</Link> to see presets ranked specifically for your style.
          </p>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : presets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {presets.map((preset) => (
            <PresetCard key={preset.id ?? preset.slug} preset={preset} accentColor={accentColor} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-4xl">◈</span>
          <p className="font-display font-bold text-lg text-foreground">No presets found</p>
          <Link href="/store" className="text-gold hover:underline text-sm">Browse the full store →</Link>
        </div>
      )}

      {/* Browse all CTA */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/40">
        <Link href="/store" className="rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-medium text-muted/92 hover:border-gold/30 hover:text-foreground transition-all">
          Browse Full Collection
        </Link>
        <Link href="/bundles" className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-background hover:bg-gold/90 transition-all">
          Explore Bundles
        </Link>
      </div>
    </div>
  )
}

function capitalise(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

