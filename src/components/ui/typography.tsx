import { cn } from "@/lib/utils"

/* ──────────────────────────────────────
   Heading
   Renders h1–h4 with the Syne display font.
   Uses the .heading-* utilities from globals.css.
────────────────────────────────────── */
interface HeadingProps {
  level?: 1 | 2 | 3 | 4
  children: React.ReactNode
  className?: string
  gradient?: boolean
}

const headingClasses = {
  1: "heading-1",
  2: "heading-2",
  3: "heading-3",
  4: "heading-4",
} as const

export function Heading({ level = 1, children, className, gradient }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4"

  return (
    <Tag
      className={cn(
        headingClasses[level],
        "text-foreground",
        gradient && "text-gold-gradient",
        className
      )}
    >
      {children}
    </Tag>
  )
}

/* ──────────────────────────────────────
   Text
   Body copy with size and color variants.
────────────────────────────────────── */
interface TextProps {
  variant?: "lead" | "body" | "small" | "label"
  children: React.ReactNode
  className?: string
  muted?: boolean
  as?: React.ElementType
}

const textClasses = {
  lead:  "text-lead",
  body:  "text-body",
  small: "text-small",
  label: "text-label",
} as const

export function Text({
  variant = "body",
  children,
  className,
  muted,
  as: Element = "p",
}: TextProps) {
  /* React 19 TypeScript inference regression — same cast as Container.tsx */
  const El = Element as React.ComponentType<
    React.PropsWithChildren<{ className?: string }>
  >

  return (
    <El
      className={cn(
        textClasses[variant],
        muted ? "text-muted" : "text-foreground",
        className
      )}
    >
      {children}
    </El>
  )
}
