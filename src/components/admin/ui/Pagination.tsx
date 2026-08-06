"use client"

interface PaginationProps {
  page: number       // 1-indexed
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** Generic pagination control, shared by every admin list page. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-[0.75rem] text-white/40">
        {from}–{to} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </PageButton>
        <span className="px-3 text-[0.75rem] text-white/60 font-medium tabular-nums">
          {page} / {totalPages}
        </span>
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </PageButton>
      </div>
    </div>
  )
}

function PageButton({ children, disabled, onClick, "aria-label": ariaLabel }: {
  children: React.ReactNode; disabled?: boolean; onClick: () => void; "aria-label": string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white/90 hover:border-white/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10"
    >
      {children}
    </button>
  )
}
