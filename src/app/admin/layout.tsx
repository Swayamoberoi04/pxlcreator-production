/**
 * src/app/admin/layout.tsx
 *
 * Admin shell layout + server-side access gate (defense in depth).
 *
 * Access control is layered:
 *   1. src/proxy.ts            — edge gate (Next 16 proxy): redirects
 *                                unauthenticated page requests to
 *                                /admin/login (stateless signature +
 *                                expiry + email check) and enforces CSRF.
 *   2. THIS layout             — Node-runtime re-check that additionally
 *                                enforces server-side session REVOCATION,
 *                                then records a page-access audit event.
 *   3. Each /api/admin/* route — requireAdmin() self-guard.
 *
 * The login page (/admin/login) is exempt so there is no redirect loop.
 * The current path is read from the `x-pathname` header set by middleware.
 */

import type { Metadata }  from "next"
import { headers }        from "next/headers"
import { redirect }       from "next/navigation"
import { cookies }        from "next/headers"
import { AdminSidebar }   from "@/components/admin/AdminSidebar"
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth"
import { isSessionActive, audit } from "@/lib/admin/audit"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: {
    default:  "PXL Admin",
    template: "%s — PXL Admin",
  },
  robots: "noindex, nofollow",
}

const LOGIN_PATH = "/admin/login"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs     = await headers()
  const pathname = hdrs.get("x-pathname") ?? ""

  // The login page renders its own UI without a session.
  const isLoginPage = pathname === LOGIN_PATH

  if (!isLoginPage) {
    const cookieStore = await cookies()
    const token       = cookieStore.get(ADMIN_COOKIE_NAME)?.value
    const claims      = await verifySessionToken(token)

    // Invalid signature/expiry/email OR a revoked session → back to login.
    if (!claims || !(await isSessionActive(claims.jti))) {
      redirect(LOGIN_PATH)
    }

    // Page-access audit (best-effort; never blocks rendering).
    await audit({
      event:     "admin.page_access",
      email:     claims.email,
      path:      pathname || undefined,
      ip:        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: hdrs.get("user-agent"),
    })
  }

  return (
    <div className="fixed inset-0 z-[200] flex bg-[#080808]">

      {/* ── Sidebar — desktop only ── */}
      <AdminSidebar />

      {/* ── Main content area — independently scrollable ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        {children}
      </div>

    </div>
  )
}
