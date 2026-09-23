"use client"

import type { FeaturedCreator } from "@/types/community"

/**
 * Card for an external "Featured Creator / Inspiration" entity.
 *
 * Deliberately distinct from CreatorCard:
 *  - links OUT to source_url (never to /community/[username] — they have no
 *    such page, because they are not a PXL member)
 *  - always shows an "Inspiration" badge so it can never be mistaken for a
 *    real member card
 *  - no follow button — there is no account here to follow
 */
export function FeaturedCreatorCard({ creator }: { creator: FeaturedCreator }) {
  const initial = (creator.name || "?")[0].toUpperCase()

  return (
    <a
      href={creator.source_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-gold/30 transition-colors relative"
    >
      <span className="absolute top-3 right-3 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.625rem] font-bold text-gold/90 uppercase tracking-wide">
        Inspiration
      </span>

      <div className="flex items-center gap-3">
        {creator.avatar_url ? (
          <img src={creator.avatar_url} alt={creator.name} loading="lazy" decoding="async" className="size-12 rounded-full object-cover shrink-0" />
        ) : (
          <span className="size-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg shrink-0">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-display font-bold text-sm text-foreground truncate">{creator.name}</p>
          <p className="text-xs text-muted/85 truncate">
            {creator.handle ? `@${creator.handle}` : creator.platform || "External creator"}
          </p>
        </div>
      </div>

      {creator.bio && (
        <p className="text-xs text-muted/85 line-clamp-2">{creator.bio}</p>
      )}

      <span className="text-[0.75rem] text-gold/90 font-medium mt-auto">
        View on {creator.platform || "their site"} →
      </span>
    </a>
  )
}
