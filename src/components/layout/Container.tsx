import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  /**
   * default → max-w-[1100px] — standard pages, hero, sections
   * wide    → max-w-[1280px] — store grid, full-bleed layouts
   * narrow  → max-w-[720px]  — blog posts, checkout, forms
   */
  size?: "default" | "wide" | "narrow"
  as?: React.ElementType
}

const maxWidths = {
  default: "max-w-[1100px]",
  wide:    "max-w-[1280px]",
  narrow:  "max-w-[720px]",
} as const

export function Container({
  children,
  className,
  size = "default",
  as: Element = "div",
}: ContainerProps) {
  /* React 19 TypeScript inference regression: `React.ElementType` narrows
     children to `never` when used directly as a JSX tag. Casting to a
     properly-typed component alias avoids the false-positive error. */
  const El = Element as React.ComponentType<
    React.PropsWithChildren<{ className?: string }>
  >

  return (
    <El
      className={cn(
        // Generous padding at every breakpoint so content never hugs the edge
        "mx-auto w-full px-5 sm:px-8 md:px-10 lg:px-16",
        maxWidths[size],
        className
      )}
    >
      {children}
    </El>
  )
}
