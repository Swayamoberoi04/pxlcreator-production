/**
 * src/lib/admin/crud-factory.ts
 *
 * Generates the standard admin CRUD route handlers (list/create/get/update/
 * patch/delete) from a small config object, so a new module's entire API
 * surface is ~20 lines instead of ~150. Every handler still goes through
 * requirePermission() + audit() exactly like the hand-written presets routes
 * — this factory just removes the boilerplate around those calls, it does
 * not change the security model.
 *
 * Usage (src/app/api/admin/{module}/route.ts):
 *   export const { GET, POST } = createAdminCrudRoutes(config)
 *
 * Usage (src/app/api/admin/{module}/[id]/route.ts):
 *   export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes(config)
 *
 * Node runtime only.
 */

import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { requirePermission } from "@/lib/admin/permissions"
import { getAdminSession }   from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import type { Permission }   from "@/lib/admin/roles"
import { z } from "zod"

/**
 * Untyped service-role client for dynamic table names.
 *
 * The project's typed `createAdminClient()` (src/lib/supabase/admin.ts)
 * binds to the generated `Database` schema, which requires a compile-time
 * literal table name — incompatible with a generic factory whose table is
 * a runtime string. Each module's route file still imports the *typed*
 * Insert/Update shape from Database for its `TInsert` generic, so field
 * names are still caught at compile time; only the client itself is
 * untyped here, same pattern as src/lib/admin/audit.ts's internal client.
 */
function dynDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("[crud-factory] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface CrudConfig<TInsert extends Record<string, unknown>> {
  /** Supabase table name. */
  table: string
  /** Permission namespace, e.g. "courses" → uses "courses:read" / "courses:write" / "courses:delete". */
  permission: string
  /** Columns writable via POST/PUT/PATCH — prevents over-posting. */
  writableFields: readonly (keyof TInsert & string)[]
  /** Optional zod object schema validated against the request body before writing. */
  schema?: z.ZodObject<z.ZodRawShape>
  /** Column to order list results by. Defaults to "created_at". */
  orderBy?: string
  orderAscending?: boolean
  /** Columns ILIKE-searched when `?q=` is present. */
  searchFields?: string[]
  /**
   * Columns that may be exact-match filtered via `?<column>=value` — e.g.
   * `filterableFields: ["difficulty"]` lets the list page pass
   * `?difficulty=Beginner`. Values of "all" or "" are ignored (no filter).
   * Allowlisted so a module can't accidentally expose arbitrary column
   * filtering just by a client sending extra query params.
   */
  filterableFields?: string[]
  /** select() string for list/get — defaults to "*". */
  select?: string
  /**
   * When true, PUT/PATCH snapshot the row's PRE-update state into the
   * shared `admin_resource_versions` table before writing — enables
   * version history + restore for this module via
   * createAdminVersionsRoutes() with no per-module schema needed.
   */
  versioning?: boolean
}

async function snapshotVersion(table: string, id: string, email: string | null | undefined): Promise<void> {
  const supabase = dynDb()
  const { data: current } = await supabase.from(table).select("*").eq("id", id).single()
  if (!current) return
  await supabase.from("admin_resource_versions").insert({
    resource_table: table,
    resource_id: id,
    snapshot: current,
    created_by: email ?? null,
  })
  // Best-effort prune — never blocks the write on failure.
  await supabase.rpc("prune_admin_resource_versions", { p_table: table, p_id: id }).then(
    () => {},
    () => {}
  )
}

function pick<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  fields: readonly string[]
): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  return out as Partial<T>
}

/** GET (list) + POST (create) for /api/admin/{module}. */
export function createAdminCrudRoutes<TInsert extends Record<string, unknown>>(
  config: CrudConfig<TInsert>
) {
  const readPerm   = `${config.permission}:read` as Permission
  const writePerm  = `${config.permission}:write` as Permission

  async function GET(request: NextRequest): Promise<Response> {
    const deny = await requirePermission(readPerm)
    if (deny) return deny

    const { searchParams } = new URL(request.url)
    const q        = searchParams.get("q") ?? ""
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10) || 50))

    const supabase = dynDb()
    let query = supabase
      .from(config.table)
      .select(config.select ?? "*", { count: "exact" })
      .order(config.orderBy ?? "created_at", { ascending: config.orderAscending ?? false })

    if (q && config.searchFields?.length) {
      const or = config.searchFields.map((f) => `${f}.ilike.%${q}%`).join(",")
      query = query.or(or)
    }

    for (const field of config.filterableFields ?? []) {
      const value = searchParams.get(field)
      if (value && value !== "all") {
        query = query.eq(field, value)
      }
    }

    const from = (page - 1) * pageSize
    const { data, error, count } = await query.range(from, from + pageSize - 1)

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data, meta: { page, pageSize, total: count ?? 0 } })
  }

  async function POST(request: NextRequest): Promise<Response> {
    const deny = await requirePermission(writePerm)
    if (deny) return deny

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return Response.json({ success: false, error: "Invalid request body." }, { status: 400 })
    }

    if (config.schema) {
      const result = config.schema.safeParse(body)
      if (!result.success) {
        return Response.json(
          { success: false, error: result.error.issues[0]?.message ?? "Validation failed." },
          { status: 400 }
        )
      }
    }

    const insert = pick<TInsert>(body, config.writableFields)
    const supabase = dynDb()
    const { data, error } = await supabase.from(config.table).insert(insert as Record<string, unknown>).select().single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    const session = await getAdminSession()
    await audit({ event: `${config.permission}.create`, email: session?.email, targetId: (data as { id?: string })?.id })
    return Response.json({ success: true, data }, { status: 201 })
  }

  return { GET, POST }
}

/** GET (single) + PUT/PATCH (update) + DELETE for /api/admin/{module}/[id]. */
export function createAdminCrudItemRoutes<TInsert extends Record<string, unknown>>(
  config: CrudConfig<TInsert>
) {
  const readPerm   = `${config.permission}:read` as Permission
  const writePerm  = `${config.permission}:write` as Permission
  const deletePerm = `${config.permission}:delete` as Permission

  type RouteContext = { params: Promise<{ id: string }> }

  async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(readPerm)
    if (deny) return deny

    const { id } = await params
    const supabase = dynDb()
    const { data, error } = await supabase.from(config.table).select(config.select ?? "*").eq("id", id).single()

    if (error || !data) {
      return Response.json({ success: false, error: "Not found." }, { status: 404 })
    }
    return Response.json({ success: true, data })
  }

  async function writeById(request: NextRequest, id: string): Promise<Response> {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return Response.json({ success: false, error: "Invalid request body." }, { status: 400 })
    }

    if (config.schema) {
      const result = config.schema.partial().safeParse(body)
      if (!result.success) {
        return Response.json(
          { success: false, error: result.error.issues[0]?.message ?? "Validation failed." },
          { status: 400 }
        )
      }
    }

    const update = pick<TInsert>(body, config.writableFields)
    const session = await getAdminSession()

    if (config.versioning) {
      await snapshotVersion(config.table, id, session?.email)
    }

    const supabase = dynDb()
    const { data, error } = await supabase.from(config.table).update(update as Record<string, unknown>).eq("id", id).select().single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    await audit({ event: `${config.permission}.update`, email: session?.email, targetId: id, meta: { fields: Object.keys(update) } })
    return Response.json({ success: true, data })
  }

  async function PUT(request: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(writePerm)
    if (deny) return deny
    const { id } = await params
    return writeById(request, id)
  }

  async function PATCH(request: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(writePerm)
    if (deny) return deny
    const { id } = await params
    return writeById(request, id)
  }

  async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(deletePerm)
    if (deny) return deny

    const { id } = await params
    const supabase = dynDb()
    const { error } = await supabase.from(config.table).delete().eq("id", id)

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    const session = await getAdminSession()
    await audit({ event: `${config.permission}.delete`, email: session?.email, targetId: id })
    return Response.json({ success: true })
  }

  return { GET, PUT, PATCH, DELETE }
}

/* ── Duplicate ─────────────────────────────────────────────────────────── */

export interface DuplicateConfig {
  table: string
  permission: string
  /** Fields copied verbatim from the source row onto the copy. */
  copyFields: readonly string[]
  /** Field to suffix with " (Copy)" on the new row, e.g. "title". */
  titleField?: string
  /** Field used to derive a unique slug for the copy, e.g. "slug". Appends -1, -2, ... on collision. */
  slugField?: string
  /** Fields forced to a fixed value on the copy — e.g. { is_published: false, is_featured: false }. */
  overrides?: Record<string, unknown>
}

/** POST /api/admin/{module}/[id]/duplicate for /api/admin/{module}/[id]/duplicate. */
export function createAdminDuplicateRoute(config: DuplicateConfig) {
  const writePerm = `${config.permission}:write` as Permission
  type RouteContext = { params: Promise<{ id: string }> }

  async function uniqueSlug(base: string): Promise<string> {
    const supabase = dynDb()
    let slug = base
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data } = await supabase.from(config.table).select("id").eq(config.slugField!, slug).maybeSingle()
      if (!data) return slug
      slug = `${base}-${attempt + 1}`
    }
    return `${base}-${Date.now()}`
  }

  async function POST(_req: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(writePerm)
    if (deny) return deny

    const { id } = await params
    const supabase = dynDb()

    const { data: src, error: srcErr } = await supabase.from(config.table).select("*").eq("id", id).single()
    if (srcErr || !src) {
      return Response.json({ success: false, error: "Not found." }, { status: 404 })
    }

    const insert: Record<string, unknown> = {}
    for (const f of config.copyFields) insert[f] = (src as Record<string, unknown>)[f]
    if (config.titleField) {
      insert[config.titleField] = `${(src as Record<string, unknown>)[config.titleField]} (Copy)`
    }
    if (config.slugField) {
      const baseSlug = String((src as Record<string, unknown>)[config.slugField] ?? "copy")
      insert[config.slugField] = await uniqueSlug(`${baseSlug}-copy`)
    }
    Object.assign(insert, config.overrides ?? {})

    const { data: copy, error: copyErr } = await supabase.from(config.table).insert(insert).select().single()
    if (copyErr || !copy) {
      return Response.json({ success: false, error: copyErr?.message ?? "Duplicate failed." }, { status: 500 })
    }

    const session = await getAdminSession()
    await audit({ event: `${config.permission}.duplicate`, email: session?.email, targetId: (copy as { id: string }).id, meta: { sourceId: id } })
    return Response.json({ success: true, data: copy }, { status: 201 })
  }

  return { POST }
}

/* ── Version history ──────────────────────────────────────────────────── */

export interface VersionsConfig {
  table: string
  permission: string
}

/**
 * GET  /api/admin/{module}/[id]/versions — list snapshots, newest first.
 * Pair with `versioning: true` on the module's item-route config so
 * snapshots actually get recorded on every PUT/PATCH.
 */
export function createAdminVersionsRoutes(config: VersionsConfig) {
  const readPerm = `${config.permission}:read` as Permission
  type RouteContext = { params: Promise<{ id: string }> }

  async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(readPerm)
    if (deny) return deny

    const { id } = await params
    const supabase = dynDb()
    const { data, error } = await supabase
      .from("admin_resource_versions")
      .select("id, snapshot, created_by, created_at")
      .eq("resource_table", config.table)
      .eq("resource_id", id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
    return Response.json({ success: true, data })
  }

  return { GET }
}

/**
 * POST /api/admin/{module}/[id]/versions/[versionId]/restore
 * Restores a prior snapshot onto the live resource (itself snapshotted
 * first, so "Restore" is never a one-way trip — you can always undo an
 * undo).
 */
export function createAdminVersionRestoreRoute<TInsert extends Record<string, unknown>>(
  config: CrudConfig<TInsert>
) {
  const writePerm = `${config.permission}:write` as Permission
  type RouteContext = { params: Promise<{ id: string; versionId: string }> }

  async function POST(_req: NextRequest, { params }: RouteContext): Promise<Response> {
    const deny = await requirePermission(writePerm)
    if (deny) return deny

    const { id, versionId } = await params
    const supabase = dynDb()

    const { data: version, error: vErr } = await supabase
      .from("admin_resource_versions")
      .select("snapshot")
      .eq("id", versionId)
      .eq("resource_table", config.table)
      .eq("resource_id", id)
      .single()

    if (vErr || !version) {
      return Response.json({ success: false, error: "Version not found." }, { status: 404 })
    }

    const session = await getAdminSession()
    await snapshotVersion(config.table, id, session?.email) // snapshot current state before overwriting

    const restore = pick<TInsert>(version.snapshot as Record<string, unknown>, config.writableFields)
    const { data, error } = await supabase.from(config.table).update(restore as Record<string, unknown>).eq("id", id).select().single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    await audit({ event: `${config.permission}.restore`, email: session?.email, targetId: id, meta: { versionId } })
    return Response.json({ success: true, data })
  }

  return { POST }
}
