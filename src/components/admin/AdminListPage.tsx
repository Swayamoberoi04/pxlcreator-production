"use client"

/**
 * src/components/admin/AdminListPage.tsx
 *
 * Generic list-page shell. A module passes columns + resource config and
 * gets a full page: breadcrumbs, search, filters, bulk actions, table,
 * pagination, delete confirmation, and remembered search/filter/page state
 * — all wired to useAdminResource + useAdminListState automatically.
 *
 * This is the piece that makes Courses/Blog/every future list module NOT
 * re-implement the search+filter+table+pagination glue that presets and
 * bundles each currently hand-roll.
 *
 * Usage:
 *   <AdminListPage
 *     title="Courses" basePath="/api/admin/courses" newHref="/admin/courses/new"
 *     columns={[...]} searchPlaceholder="Search courses…"
 *     getId={(c) => c.id} onRowClick={(c) => router.push(`/admin/courses/${c.id}`)}
 *   />
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { useAdminResource } from "@/hooks/admin/useAdminResource"
import { useAdminListState } from "@/hooks/admin/useAdminListState"
import { useAdminShortcuts } from "@/hooks/admin/useAdminShortcuts"
import { Breadcrumbs, type Crumb } from "@/components/admin/ui/Breadcrumbs"
import { SearchBar } from "@/components/admin/ui/SearchBar"
import { FilterBar, type FilterOption } from "@/components/admin/ui/FilterBar"
import { AdminDataTable, type DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import { Pagination } from "@/components/admin/ui/Pagination"
import { BulkActionsBar, type BulkAction } from "@/components/admin/ui/BulkActionsBar"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"

interface FilterGroupConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface AdminListPageProps<T extends Record<string, unknown>> {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  basePath: string          // e.g. "/api/admin/courses"
  newHref?: string          // e.g. "/admin/courses/new" — shows a "New" button if set
  columns: DataTableColumn<T>[]
  getId: (row: T) => string
  searchPlaceholder?: string
  filters?: FilterGroupConfig[]
  pageSize?: number
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
  bulkActions?: BulkAction[]
  onBulkAction?: (key: string, ids: string[]) => void | Promise<void>
}

export function AdminListPage<T extends Record<string, unknown>>({
  title, description, breadcrumbs, basePath, newHref, columns, getId,
  searchPlaceholder = "Search…", filters = [], pageSize = 25,
  onRowClick, rowActions, bulkActions = [], onBulkAction,
}: AdminListPageProps<T>) {
  const list = useAdminListState({ q: "", page: 1, filters: {} as Record<string, string> })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (list.state.q) params.set("q", list.state.q)
    params.set("page", String(list.state.page))
    params.set("pageSize", String(pageSize))
    for (const [k, v] of Object.entries(list.state.filters)) {
      if (v && v !== "all") params.set(k, v)
    }
    return params.toString()
  }, [list.state, pageSize])

  const resource = useAdminResource<T>({ basePath, query, getId })

  useAdminShortcuts({
    n: () => { if (newHref) window.location.href = newHref },
  })

  async function handleBulk(key: string) {
    const ids = Array.from(selected)
    if (key === "delete") {
      for (const id of ids) await resource.remove(id)
    } else {
      await onBulkAction?.(key, ids)
    }
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[1400px] mx-auto w-full">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.375rem] font-bold text-white/95">{title}</h1>
          {description && <p className="text-[0.8125rem] text-white/45">{description}</p>}
        </div>
        {newHref && (
          <Link
            href={newHref}
            className="shrink-0 rounded-lg bg-gold px-4 py-2.5 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors"
          >
            + New <kbd className="ml-1.5 opacity-50 text-[0.6875rem]">N</kbd>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={list.state.q}
            onChange={(q) => list.set({ q, page: 1 })}
            placeholder={searchPlaceholder}
            autoFocusKey="/"
            className="min-w-[240px] flex-1"
          />
        </div>
        {filters.length > 0 && (
          <FilterBar
            groups={filters}
            active={list.state.filters}
            onChange={(key, value) => list.set({ filters: { ...list.state.filters, [key]: value }, page: 1 })}
            onClearAll={() => list.set({ filters: {} })}
          />
        )}
      </div>

      {bulkActions.length > 0 && (
        <BulkActionsBar
          selectedCount={selected.size}
          actions={bulkActions}
          onAction={handleBulk}
          onClearSelection={() => setSelected(new Set())}
        />
      )}

      {resource.error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[0.8125rem] text-red-300">
          {resource.error}
        </div>
      )}

      <AdminDataTable
        columns={columns}
        rows={resource.items}
        getId={getId}
        loading={resource.loading}
        selectable={bulkActions.length > 0}
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowClick={onRowClick}
        rowActions={rowActions ?? (newHref ? (row) => (
          <button
            type="button"
            onClick={() => setPendingDeleteId(getId(row))}
            className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        ) : undefined)}
      />

      <Pagination
        page={list.state.page}
        pageSize={pageSize}
        total={resource.total}
        onPageChange={(page) => list.set({ page })}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={async () => { if (pendingDeleteId) await resource.remove(pendingDeleteId) }}
        title="Delete this item?"
        description="This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  )
}
