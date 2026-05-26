/**
 * Auth route group layout.
 * Sits inside the root layout (SiteHeader + SiteFooter stay),
 * but centres content vertically in the remaining viewport.
 * Cinematic atmosphere: living indigo/gold orbs behind auth cards.
 */
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-5 py-12 overflow-hidden">
      {/* Living atmospheric backdrop */}
      <LuminousEnvironment variant="indigo" intensity={0.9} />
      <GrainOverlay opacity={0.016} animated zIndex={1} />
      {/* Content sits above atmosphere */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
