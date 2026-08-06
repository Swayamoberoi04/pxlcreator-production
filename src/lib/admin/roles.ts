/**
 * src/lib/admin/roles.ts
 *
 * Role + permission architecture for the admin dashboard.
 *
 * Today only Super Admin exists (identity is still the ADMIN_EMAIL
 * allowlist in src/lib/admin/config.ts — nothing about auth changes here).
 * This module exists so that when Admin / Content Manager / Moderator
 * accounts are introduced later, NO page or API route has to change: they
 * already call `can(session, "presets:delete")` instead of hardcoding
 * "is this an admin" checks, so turning on a second role is a one-line
 * change to `ROLE_PERMISSIONS` + wiring a real role lookup into
 * `resolveRole()`.
 *
 * Edge + Node safe (no Node-only imports) so it can be used from both
 * client components (to hide/disable UI) and server route handlers (to
 * enforce).
 */

export const ROLES = ["super_admin", "admin", "content_manager", "moderator"] as const
export type Role = (typeof ROLES)[number]

/**
 * Every permission string in the system, namespaced `resource:action`.
 * Add new resources here as new modules ship — this is the single registry.
 */
export const PERMISSIONS = [
  // Presets
  "presets:read", "presets:write", "presets:delete", "presets:publish",
  // Bundles
  "bundles:read", "bundles:write", "bundles:delete", "bundles:publish",
  // Courses
  "courses:read", "courses:write", "courses:delete", "courses:publish",
  // Blog
  "blog:read", "blog:write", "blog:delete", "blog:publish",
  // Media Library
  "media:read", "media:upload", "media:delete",
  // Community
  "community:read", "community:write", "community:moderate",
  // Homepage / Editor / AI Studio CMS
  "homepage:read", "homepage:write", "homepage:delete",
  "editor:read", "editor:write", "editor:delete",
  "ai_studio:read", "ai_studio:write", "ai_studio:delete",
  // Commerce
  "pricing:write", "coupons:write", "orders:read", "orders:refund",
  // Reviews
  "reviews:moderate",
  // Platform
  "seo:write", "settings:write", "analytics:read",
  // Admin identity itself
  "admins:manage", "audit:read",
] as const

export type Permission = (typeof PERMISSIONS)[number]

/**
 * Role → permission matrix.
 * Super Admin implicitly has everything (see `can()` below) so it is not
 * enumerated. The other three roles are pre-populated with a sensible
 * default so they work correctly the moment they're activated — but they
 * are NOT reachable today (see resolveRole()).
 */
const ROLE_PERMISSIONS: Record<Exclude<Role, "super_admin">, readonly Permission[]> = {
  admin: PERMISSIONS.filter((p) => p !== "admins:manage"),

  content_manager: [
    "presets:read", "presets:write", "presets:publish",
    "bundles:read", "bundles:write", "bundles:publish",
    "courses:read", "courses:write", "courses:publish",
    "blog:read", "blog:write", "blog:publish",
    "media:read", "media:upload",
    "homepage:read", "homepage:write", "editor:read", "editor:write",
    "ai_studio:read", "ai_studio:write", "seo:write",
    "community:read", "community:write",
  ],

  moderator: [
    "presets:read", "bundles:read", "courses:read", "blog:read",
    "media:read",
    "community:read", "community:moderate",
    "reviews:moderate",
    "orders:read",
  ],
}

/**
 * The identity of an authenticated admin, as far as permissions care.
 * `email` is enough today because there is exactly one role (Super Admin).
 */
export interface AdminIdentity {
  email: string
}

/**
 * Resolve the role for an authenticated admin.
 *
 * Currently every authenticated admin (i.e. every email in ADMIN_EMAIL) is
 * Super Admin — there is no roles table yet. This is the ONE place that
 * will change when a real `admin_roles` table ships: swap the body for a
 * DB lookup keyed by email, defaulting unknown emails to the lowest role.
 * Every caller of `can()` / `requirePermission()` is already written
 * against that future, so nothing else needs to change.
 */
export function resolveRole(identity: AdminIdentity): Role {
  void identity // unused today — every authenticated admin is Super Admin
  return "super_admin"
}

/** Does `role` grant `permission`? Super Admin always returns true. */
export function can(role: Role, permission: Permission): boolean {
  if (role === "super_admin") return true
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** Human-readable label for a role, for display in the admin UI. */
export const ROLE_LABELS: Record<Role, string> = {
  super_admin:     "Super Admin",
  admin:           "Admin",
  content_manager: "Content Manager",
  moderator:       "Moderator",
}

/** Roles that can actually be assigned today (everything else is future-ready scaffolding). */
export const ACTIVE_ROLES: readonly Role[] = ["super_admin"]
