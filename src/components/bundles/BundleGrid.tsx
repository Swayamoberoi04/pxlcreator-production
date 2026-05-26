/**
 * src/components/bundles/BundleGrid.tsx
 *
 * Responsive grid that renders BundleCard components.
 * Can be used as a server component — it simply passes data to client cards.
 */

import type { Bundle }  from "@/types/bundle"
import { BundleCard }   from "./BundleCard"
import { cn }           from "@/lib/utils"

interface BundleGridProps {
  bundles:    Bundle[]
  className?: string
  /** Card size variant — "default" | "compact" */
  variant?:   "default" | "compact"
}

export function BundleGrid({ bundles, className, variant = "default" }: BundleGridProps) {
  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted/40 text-sm">No bundles available yet.</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid gap-6",
        variant === "default"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {bundles.map((bundle) => (
        <BundleCard key={bundle.id} bundle={bundle} />
      ))}
    </div>
  )
}
