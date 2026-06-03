"use client"

import { useEffect, useState } from "react"

interface CommunityResource {
  id:          string
  title:       string
  description: string
  url:         string
  category:    string
  icon:        string
  is_featured: boolean
}

const CATEGORIES = [
  { id: "all",           label: "All" },
  { id: "photography",   label: "Photography" },
  { id: "editing",       label: "Editing" },
  { id: "filmmaking",    label: "Filmmaking" },
  { id: "color_grading", label: "Color Grading" },
  { id: "gear",          label: "Gear" },
  { id: "business",      label: "Business" },
  { id: "community",     label: "Community" },
]

// ── Static resource hub — provides immediate value ────────────────
const STATIC_RESOURCES: CommunityResource[] = [
  // Photography
  { id: "r1", icon: "📸", title: "Photography Life",         category: "photography",   is_featured: true,  url: "https://photographylife.com", description: "In-depth guides, reviews, and tutorials covering every aspect of photography — from beginner to professional." },
  { id: "r2", icon: "📷", title: "Strobist",                 category: "photography",   is_featured: false, url: "https://strobist.blogspot.com", description: "The definitive online resource for learning off-camera flash and lighting for photographers." },
  { id: "r3", icon: "🌄", title: "500px Learning",           category: "photography",   is_featured: false, url: "https://iso.500px.com", description: "Articles and inspiration from one of the world's largest photography communities." },
  // Editing
  { id: "r4", icon: "🎛", title: "Premiere Bro",             category: "editing",       is_featured: true,  url: "https://premierebro.com", description: "Free Premiere Pro presets, tutorials, and resources for video editors of all levels." },
  { id: "r5", icon: "✂️", title: "Motion Array Blog",        category: "editing",       is_featured: false, url: "https://motionarray.com/learn", description: "Editing tutorials, workflow tips, and creative guides for video professionals." },
  { id: "r6", icon: "🎬", title: "Resolve School",           category: "editing",       is_featured: false, url: "https://resolveschool.com", description: "Structured DaVinci Resolve courses and workflow breakdowns for professional editors." },
  // Filmmaking
  { id: "r7", icon: "🎥", title: "No Film School",           category: "filmmaking",    is_featured: true,  url: "https://nofilmschool.com", description: "The go-to filmmaking resource: technique breakdowns, camera news, and real-world production insights." },
  { id: "r8", icon: "🎞", title: "Film Riot",                category: "filmmaking",    is_featured: false, url: "https://filmriot.com", description: "Practical filmmaking tutorials covering everything from directing to VFX on a budget." },
  { id: "r9", icon: "🎦", title: "Indie Film Hustle",        category: "filmmaking",    is_featured: false, url: "https://indiefilmhustle.com", description: "Podcast and blog dedicated to independent filmmakers breaking into the industry." },
  // Color Grading
  { id: "r10", icon: "🎨", title: "Mixing Light",            category: "color_grading", is_featured: true,  url: "https://mixinglight.com", description: "Professional colorists share real-world colour grading techniques, tutorials and business insights." },
  { id: "r11", icon: "🌈", title: "Color Grading Central",   category: "color_grading", is_featured: false, url: "https://colorgradingcentral.com", description: "LUTs, presets, and training for DaVinci Resolve, Premiere Pro, and Final Cut Pro." },
  { id: "r12", icon: "🔆", title: "Ground Control Color",    category: "color_grading", is_featured: false, url: "https://groundcontrolcolor.com", description: "Free and paid LUTs crafted by professional colourists for cinematic looks." },
  // Gear
  { id: "r13", icon: "🔭", title: "DPReview",                category: "gear",          is_featured: true,  url: "https://dpreview.com", description: "The world's most detailed camera and lens reviews with extensive side-by-side sample comparisons." },
  { id: "r14", icon: "📱", title: "RTINGS",                  category: "gear",          is_featured: false, url: "https://rtings.com", description: "Objective, measurement-based reviews of monitors, TVs, and audio gear relevant to creators." },
  { id: "r15", icon: "🎤", title: "Filmmaker IQ",            category: "gear",          is_featured: false, url: "https://filmmakeriq.com", description: "Educational deep-dives into camera technology, lenses, and audio equipment for filmmakers." },
  // Business
  { id: "r16", icon: "💼", title: "Creator IQ Blog",         category: "business",      is_featured: true,  url: "https://creatoriq.com/resources", description: "Data-driven insights on creator economy trends, brand partnerships, and monetisation strategies." },
  { id: "r17", icon: "💰", title: "The Futur",               category: "business",      is_featured: false, url: "https://thefutur.com", description: "Business education for creative professionals — pricing, client management, and brand building." },
  { id: "r18", icon: "📊", title: "VidIQ Blog",              category: "business",      is_featured: false, url: "https://vidiq.com/blog", description: "YouTube growth strategies, analytics breakdowns, and monetisation tips for video creators." },
  // Community
  { id: "r19", icon: "🌐", title: "Reddit r/photography",   category: "community",     is_featured: true,  url: "https://reddit.com/r/photography", description: "One of the largest online photography communities for critique, advice, and inspiration." },
  { id: "r20", icon: "💬", title: "Cinema5D Forums",         category: "community",     is_featured: false, url: "https://cinema5d.com", description: "Professional filmmaking community covering cameras, workflow, and industry news." },
  { id: "r21", icon: "📣", title: "Videomakers Forum",       category: "community",     is_featured: false, url: "https://videomaker.com/forum", description: "Long-running forum community for video producers and filmmakers to share knowledge." },
]

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-44 animate-pulse" />
}

interface ResourceCardProps { resource: CommunityResource }

function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div className={[
      "flex flex-col gap-3 rounded-2xl border bg-surface p-5 hover:bg-surface-2 transition-all duration-150 group",
      resource.is_featured ? "border-gold/30 bg-gold/[0.02]" : "border-border",
    ].join(" ")}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{resource.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-black text-sm text-foreground">{resource.title}</h3>
            {resource.is_featured && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                Featured
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/40">
            {CATEGORIES.find((c) => c.id === resource.category)?.label ?? resource.category}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted/60 leading-relaxed flex-1">{resource.description}</p>
      <a href={resource.url} target="_blank" rel="noopener noreferrer"
        className="self-start text-xs font-semibold text-gold hover:text-gold/80 transition-colors flex items-center gap-1">
        Visit <span className="text-[10px]">→</span>
      </a>
    </div>
  )
}

export default function ResourcesPage() {
  const [apiResources,   setApiResources]   = useState<CommunityResource[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")

  async function fetchResources() {
    setLoading(true)
    try {
      const res  = await fetch("/api/community/resources")
      if (res.ok) {
        const data = await res.json()
        setApiResources(data.resources ?? data ?? [])
      }
    } catch { setApiResources([]) } finally { setLoading(false) }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchResources()
  }, [])

  // Merge API resources with static ones (API takes priority, dedup by title)
  const allResources = [
    ...apiResources,
    ...STATIC_RESOURCES.filter((sr) => !apiResources.some((ar) => ar.title === sr.title)),
  ]

  const filtered = activeCategory === "all"
    ? allResources
    : allResources.filter((r) => r.category === activeCategory)

  const featured = filtered.filter((r) => r.is_featured)
  const regular  = filtered.filter((r) => !r.is_featured)

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-black text-3xl text-foreground">Creator Resources</h1>
        <p className="text-sm text-muted/60 mt-1">
          Curated tools, communities, and learning platforms for creators — hand-picked by the PXL team
        </p>
      </div>

      {/* Value proposition */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "📚", title: "Learning Platforms", count: STATIC_RESOURCES.length, desc: "Curated resources" },
          { icon: "🏷", title: "Categories",          count: CATEGORIES.length - 1,   desc: "Disciplines covered" },
          { icon: "✦",  title: "Featured Picks",       count: STATIC_RESOURCES.filter((r) => r.is_featured).length, desc: "Team favourites" },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-surface p-5 text-center">
            <span className="text-3xl">{s.icon}</span>
            <p className="font-display font-black text-2xl text-gold mt-2">{s.count}+</p>
            <p className="font-display font-black text-xs text-foreground">{s.title}</p>
            <p className="text-[10px] text-muted/50">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl border border-border bg-surface/50 px-5 py-3 flex items-start gap-3">
        <span className="text-lg shrink-0">💡</span>
        <p className="text-xs text-muted/60 leading-relaxed">
          These are external communities and tools. Everything you need to showcase your work and connect with other creators is right here on PXL Creator.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={["rounded-full px-4 py-1.5 text-xs font-medium transition-colors", activeCategory === cat.id ? "bg-gold/15 text-gold border border-gold/30" : "bg-surface border border-border text-muted/60 hover:border-gold/20 hover:text-foreground"].join(" ")}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {featured.length > 0 && (
            <div>
              <h2 className="font-display font-black text-base text-foreground mb-3 flex items-center gap-2">
                <span className="text-gold">⭐</span> Featured Picks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((r) => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {featured.length > 0 && <h2 className="font-display font-black text-base text-foreground mb-3">All Resources</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regular.map((r) => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="text-4xl">📚</span>
              <p className="font-semibold text-foreground">No resources in this category</p>
              <p className="text-sm text-muted/50">Try a different category</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
