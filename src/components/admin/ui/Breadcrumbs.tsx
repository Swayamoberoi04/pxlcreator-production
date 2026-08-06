"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export interface Crumb {
  label: string
  href?: string
}

/** Shared breadcrumb trail for admin detail/edit pages. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-[0.75rem]", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/20" aria-hidden="true">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-white/45 hover:text-gold transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-white/80 font-medium" : "text-white/45"}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
