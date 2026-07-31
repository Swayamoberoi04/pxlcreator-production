"use client"

import { useState }     from "react"
import Image            from "next/image"
import { BeforeAfterSlider } from "@/components/studio/BeforeAfterSlider"
import { cn }           from "@/lib/utils"

interface PresetProductGalleryProps {
  images:                  string[]    // all gallery images (thumbnail first)
  beforeUrl?:              string
  afterUrl?:               string
  name:                    string
  beforeAfterExplanation?: string      // caption shown below the before/after slider
}

type ViewMode = "gallery" | "before-after"

export function PresetProductGallery({
  images,
  beforeUrl,
  afterUrl,
  name,
  beforeAfterExplanation,
}: PresetProductGalleryProps) {
  const [active,   setActive]   = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>("gallery")

  const hasBeforeAfter = Boolean(beforeUrl && afterUrl)

  return (
    <div className="flex flex-col gap-4">

      {/* ── View mode toggle ── */}
      {hasBeforeAfter && (
        <div className="flex items-center gap-2 self-start">
          {(["gallery", "before-after"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              suppressHydrationWarning
              className={cn(
                "rounded-full px-4 py-1.5 text-[0.75rem] font-semibold tracking-wide transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === mode
                  ? "bg-gold/12 border border-gold/40 text-gold"
                  : "border border-border text-muted/85 hover:text-foreground"
              )}
            >
              ( {mode === "gallery" ? "Gallery" : "Before / After"} )
            </button>
          ))}
        </div>
      )}

      {/* ── Main display ── */}
      {viewMode === "before-after" && hasBeforeAfter ? (
        <div className="flex flex-col gap-3">
          <BeforeAfterSlider
            beforeUrl={beforeUrl!}
            afterUrl={afterUrl!}
            className="rounded-2xl"
          />
          {beforeAfterExplanation && (
            <p className="text-[0.8125rem] text-muted/85 leading-relaxed border-l-2 border-gold/30 pl-3 italic">
              {beforeAfterExplanation}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Main image */}
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-border bg-surface-2">
            {images[active] ? (
              <Image
                src={images[active]}
                alt={`${name} — sample ${active + 1}`}
                fill
                sizes="(max-width:1024px) 100vw, 55vw"
                className="object-cover"
                priority={active === 0}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-muted/70 text-label tracking-widest">( No preview )</span>
              </div>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-[0.7rem] font-medium text-white/85">
                ( {active + 1} / {images.length} )
              </div>
            )}
          </div>

          {/* Thumbnail row */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActive(i)}
                  suppressHydrationWarning
                  className={cn(
                    "relative aspect-[4/3] rounded-xl overflow-hidden border transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active === i
                      ? "border-gold/60 ring-1 ring-gold/30"
                      : "border-border opacity-60 hover:opacity-100 hover:border-border/80"
                  )}
                >
                  <Image
                    src={src}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    sizes="25vw"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Sample count note ── */}
      <p className="text-[0.75rem] text-muted/70 text-center">
        ( Sample images — actual preset results vary by photo )
      </p>

    </div>
  )
}
