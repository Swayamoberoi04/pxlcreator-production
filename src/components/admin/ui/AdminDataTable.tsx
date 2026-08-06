"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { TableSkeleton } from "./Skeleton"

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  align?: "left" | "right" | "center"
  className?: string
}

interface AdminDataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getId: (row: T) => string
  loading?: boolean
  emptyMessage?: string
  /** Enables the checkbox column + returns selected ids via onSelectionChange. */
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  sortKey?: string
  sortDir?: "asc" | "desc"
  onSortChange?: (key: string, dir: "asc" | "desc") => void
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
}

/**
 * The one generic table every admin module should render its list with —
 * search/filter/pagination live in separate components (SearchBar,
 * FilterBar, Pagination) and are composed around this by the page.
 */
export function AdminDataTable<T>({
  columns, rows, getId, loading, emptyMessage = "Nothing here yet.",
  selectable, selectedIds, onSelectionChange,
  sortKey, sortDir, onSortChange, onRowClick, rowActions,
}: AdminDataTableProps<T>) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  const selected = selectedIds ?? localSelected
  const setSelected = onSelectionChange ?? setLocalSelected

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(getId(r)))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(rows.map(getId)))
  }

  function toggleRow(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  if (loading) return <TableSkeleton columns={columns.length} />

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] py-16 text-center text-[0.8125rem] text-white/40">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-[#FFD60A]"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-white/40",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className
                )}
              >
                {col.sortable && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(col.key, sortKey === col.key && sortDir === "asc" ? "desc" : "asc")}
                    className="flex items-center gap-1 hover:text-white/70 transition-colors"
                  >
                    {col.header}
                    {sortKey === col.key && (
                      <span className="text-gold">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {rowActions && <th className="w-10 px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = getId(row)
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-white/[0.04] last:border-b-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-white/[0.025]",
                  selected.has(id) && "bg-gold/[0.04]"
                )}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleRow(id)}
                      aria-label="Select row"
                      className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-[#FFD60A]"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-[0.8125rem] text-white/75",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
