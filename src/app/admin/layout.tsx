/**
 * src/app/admin/layout.tsx
 *
 * Admin shell layout.
 * Uses position:fixed + z-index to render completely over the site's
 * SiteHeader and SiteFooter — no structural refactor needed.
 *
 * Access is controlled by middleware.ts (HMAC cookie check).
 */

import type { Metadata }  from "next"
import { AdminSidebar }  from "@/components/admin/AdminSidebar"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: {
    default:  "PXL Admin",
    template: "%s — PXL Admin",
  },
  robots: "noindex, nofollow",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex bg-[#080808] overflow-hidden">

      {/* ── Sidebar ── */}
      <AdminSidebar />

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </div>

    </div>
  )
}
