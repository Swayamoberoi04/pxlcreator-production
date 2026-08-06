/**
 * src/lib/admin/permissions.ts
 *
 * Permission-aware guard for /api/admin/* routes, built on top of the
 * existing requireAdmin() session check (src/lib/admin/guard.ts) — auth
 * itself is unchanged. This adds a second layer: does the authenticated
 * admin's ROLE grant the specific permission this route needs?
 *
 * Since only Super Admin exists today (resolveRole() always returns
 * "super_admin"), `can()` always returns true and every route behaves
 * exactly as before. Routes should still call requirePermission() with the
 * correct permission string now, so that turning on additional roles later
 * requires zero route changes.
 *
 * Usage:
 *   const deny = await requirePermission("courses:delete")
 *   if (deny) return deny
 */

import { NextResponse }      from "next/server"
import { getAdminSession }   from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import { resolveRole, can, type Permission } from "@/lib/admin/roles"

/**
 * Guard an admin route by permission (auth + role check combined).
 * @returns null when authorised, or a 401/403 NextResponse to return as-is.
 */
export async function requirePermission(permission: Permission): Promise<NextResponse | null> {
  const session = await getAdminSession()

  if (!session) {
    const res = NextResponse.json(
      { error: "Unauthorized. Valid admin session required." },
      { status: 401 },
    )
    res.headers.set("Cache-Control", "no-store")
    return res
  }

  const role = resolveRole({ email: session.email })
  if (!can(role, permission)) {
    await audit({
      event:   "admin.permission_denied",
      outcome: "denied",
      email:   session.email,
      meta:    { permission, role },
    })
    const res = NextResponse.json(
      { error: `Forbidden. Missing permission: ${permission}.` },
      { status: 403 },
    )
    res.headers.set("Cache-Control", "no-store")
    return res
  }

  return null
}
