"use client"

import Link                  from "next/link"
import { useAuth }           from "@/contexts/AuthContext"
import { CommunitySidebar, CommunityMobileTabs } from "@/components/community/CommunityNav"

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      {/* Join banner — logged-out visitors only */}
      {!loading && !user && (
        <div className="w-full bg-gold/10 border-b border-gold/20 px-4 py-2.5 text-center">
          <p className="text-sm text-gold/90">
            <span className="font-semibold">Join the Community</span>
            <span className="text-muted/70 mx-2">—</span>
            connect with creators, find collaborators, and showcase your work.
            <Link
              href="/signup"
              className="ml-2 underline underline-offset-2 text-gold hover:text-gold/80 font-semibold"
            >
              Sign up free
            </Link>
          </p>
        </div>
      )}

      {/* Mobile horizontal tabs (hidden on md+) */}
      <CommunityMobileTabs />

      {/* Two-column layout: sidebar (desktop) + main */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex items-start gap-6">
        {/* Desktop sidebar (hidden on mobile) */}
        <CommunitySidebar />

        {/* Main content */}
        <main className="flex-1 min-w-0 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
