"use client"

export interface SpaceMessage {
  id:            string
  body:          string
  author_uid:    string
  created_at:    string
  is_pinned:     boolean
  reply_to_id:   string | null
  reply_preview: string | null
  reaction_count: number
  mentions:      string[]
  author?: {
    username:     string
    display_name: string
    avatar_url:   string | null
    is_verified:  boolean
  }
}

interface MessageBubbleProps {
  message:  SpaceMessage
  onReact:  (msgId: string, emoji: string) => void
  onReply:  (msg: SpaceMessage) => void
}

function timeAgo(isoString: string): string {
  const diffMs  = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60)   return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60)   return `${diffMin}m`
  const diffHr  = Math.floor(diffMin / 60)
  if (diffHr  < 24)   return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30)   return `${diffDay}d`
  const diffMo  = Math.floor(diffDay / 30)
  return `${diffMo}mo`
}

export function MessageBubble({ message, onReact, onReply }: MessageBubbleProps) {
  const author  = message.author
  const initial = (author?.display_name ?? author?.username ?? "?")[0].toUpperCase()

  return (
    <div className={["group flex gap-3 px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-colors", message.is_pinned ? "border-l-2 border-gold/50 bg-gold/[0.03]" : ""].join(" ")}>
      {/* Avatar */}
      {author?.avatar_url ? (
        <img
          src={author.avatar_url}
          alt={author.display_name}
          className="size-8 rounded-full object-cover shrink-0 mt-0.5"
        />
      ) : (
        <span className="size-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0 mt-0.5">
          {initial}
        </span>
      )}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {author?.display_name ?? "Unknown"}
            {author?.is_verified && <span className="ml-1 text-gold text-xs">✓</span>}
          </span>
          <span className="text-[11px] text-muted/40">{timeAgo(message.created_at)}</span>
          {message.is_pinned && (
            <span className="text-[10px] text-gold/70 flex items-center gap-0.5">📌 pinned</span>
          )}
        </div>

        {/* Reply preview */}
        {message.reply_preview && (
          <div className="mt-1 mb-1.5 px-2 py-1 rounded-md bg-surface-2 border-l-2 border-gold/40 text-xs text-muted/60 line-clamp-1">
            {message.reply_preview}
          </div>
        )}

        {/* Body */}
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
          {message.body}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onReact(message.id, "👍")}
            className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-gold transition-colors"
          >
            <span>👍</span>
            {message.reaction_count > 0 && <span>{message.reaction_count}</span>}
          </button>
          <button
            onClick={() => onReply(message)}
            className="text-[11px] text-muted/50 hover:text-foreground transition-colors"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}
