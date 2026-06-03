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

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-44 animate-pulse" />
}

interface ResourceCardProps {
  resource: CommunityResource
}

function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div className={[
      "flex flex-col gap-3 rounded-2xl border bg-surface p-5 hover:bg-surface-2 transition-all duration-150 group",
      resource.is_featured ? "border-gold/30 bg-gold/[0.02]" : "border-border",
    ].join(" ")}>
      {/* Header */}
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

      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs font-semibold text-gold hover:text-gold/80 transition-colors flex items-center gap-1"
      >
        Visit <span className="text-[10px]">→</span>
      </a>
    </div>
  )
}

export default function ResourcesPage() {
  const [resources,   setResources]   = useState<CommunityResource[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")

  async function fetchResources() {
    setLoading(true)
    try {
      const res  = await fetch("/api/community/resources")
      if (res.ok) {
        const data = await res.json()
        setResources(data.resources ?? data ?? [])
      }
    } catch { setResources([]) } finally { setLoading(false) }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchResources()
  }, [])

  const filtered = activeCategory === "all"
    ? resources
    : resources.filter((r) => r.category === activeCategory)

  const featured = filtered.filter((r) => r.is_featured)
  const regular  = filtered.filter((r) => !r.is_featured)

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-black text-3xl text-foreground">Creator Resources</h1>
        <p className="text-sm text-muted/60 mt-1">
          Curated tools, communities, and learning platforms for creators
        </p>
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
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat.id
                ? "bg-gold/15 text-gold border border-gold/30"
                : "bg-surface border border-border text-muted/60 hover:border-gold/20 hover:text-foreground",
            ].join(" ")}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-4xl">📚</span>
          <p className="font-semibold text-foreground">No resources found</p>
          <p className="text-sm text-muted/50">Try a different category</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {featured.length > 0 && (
            <div>
              <h2 className="font-display font-black text-base text-foreground mb-3 flex items-center gap-2">
                <span className="text-gold">⭐</span> Featured
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((r) => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regular.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
