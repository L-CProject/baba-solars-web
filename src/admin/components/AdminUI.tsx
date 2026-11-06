import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { PublishStatus } from '@/types'
import { cn } from '@/lib/cn'
import { Badge, type BadgeTone } from '@/components/ui'

/**
 * Page title + actions. Actions stay on one line beside the title on large screens (primary action
 * last = right-most), wrap neatly on tablets, and become equal-width buttons on phones.
 */
export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-[1.75rem] leading-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:min-w-[calc(50%-0.25rem)] max-sm:[&>*]:flex-1 lg:shrink-0 lg:flex-nowrap lg:pt-1 [&>*]:whitespace-nowrap">
          {actions}
        </div>
      )}
    </div>
  )
}

/** Search + filters bar: search full width and filters in two columns on phones, one row on larger screens. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-2 items-end gap-3 rounded-card border border-line bg-surface p-3 shadow-soft sm:flex sm:flex-wrap sm:items-center [&>label:first-child]:col-span-2">{children}</div>
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative min-w-0 flex-1 sm:min-w-[16rem]">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-field border border-line bg-canvas pl-9 pr-3 text-sm focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40"
      />
    </label>
  )
}

export function FilterSelect<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm sm:flex sm:items-center sm:gap-2">
      <span className="text-xs font-medium text-muted sm:text-sm sm:font-normal">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-10 w-full min-w-0 rounded-field border border-line bg-canvas px-3 focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40 sm:w-auto">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

/** Date filter that matches FilterSelect (same height, label beside on desktop, above on phones). */
export function FilterDate({ label, value, onChange, min }: { label: string; value: string; onChange: (v: string) => void; min?: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm sm:flex sm:items-center sm:gap-2">
      <span className="text-xs font-medium text-muted sm:text-sm sm:font-normal">{label}</span>
      <input type="date" value={value} min={min} onChange={(e) => onChange(e.target.value)} className="h-10 w-full min-w-0 rounded-field border border-line bg-canvas px-3 focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40 sm:w-auto" />
    </label>
  )
}

export function StatusBadge({ status }: { status: PublishStatus }) {
  return <Badge tone={status === 'published' ? 'success' : 'neutral'}>{status === 'published' ? 'Published' : 'Draft'}</Badge>
}

export function ToneBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <Badge tone={tone} className="capitalize">{children}</Badge>
}

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

/** Responsive table: scrolls horizontally on small screens. */
/**
 * Admin list: a table from the md breakpoint up, stacked cards on phones (no sideways scrolling).
 * On cards the first column is the title, an "Actions" column sits at the bottom, the rest are label/value rows.
 */
export function DataTable<T extends { id: string }>({ rows, columns, empty, caption }: { rows: T[]; columns: Column<T>[]; empty: ReactNode; caption: string }) {
  if (!rows.length) return <>{empty}</>
  const [first, ...rest] = columns
  const actions = rest.find((c) => c.header === 'Actions')
  const details = rest.filter((c) => c !== actions)
  return (
    <>
      <div className="hidden overflow-x-auto rounded-card bg-surface shadow-soft md:block">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-snow-200/60 text-ink-soft">
            <tr>{columns.map((c) => <th key={c.header} scope="col" className={cn('px-4 py-3 font-semibold', c.className)}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line transition-colors last:border-0 hover:bg-ice-100/40">
                {columns.map((c) => <td key={c.header} className={cn('px-4 py-3 align-top', c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.id} className="rounded-card bg-surface p-4 text-sm shadow-soft">
            <div className="min-w-0">{first.cell(r)}</div>
            {details.length > 0 && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3">
                {details.map((c) => (
                  <div key={c.header} className="contents">
                    <dt className="text-muted">{c.header}</dt>
                    <dd className="min-w-0 text-right [&>*]:ml-auto">{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="-mb-1 -mr-1 mt-2 flex justify-end">{actions.cell(r)}</div>}
          </li>
        ))}
      </ul>
    </>
  )
}

export type ActionTone = 'edit' | 'danger' | 'success' | 'accent' | 'neutral'

const ACTION_TONES: Record<ActionTone, string> = {
  // Blue = edit, red = delete/remove, green = create/convert, amber = documents, slate = everything else.
  edit: 'bg-ice-100 text-steel-600 hover:bg-steel-500 hover:text-snow-50',
  danger: 'bg-clay-100 text-clay-700 hover:bg-clay-500 hover:text-snow-50',
  success: 'bg-leaf-100 text-leaf-700 hover:bg-leaf-500 hover:text-snow-50',
  accent: 'bg-sun-300/35 text-[#8a5200] hover:bg-sun-400 hover:text-navy-900',
  neutral: 'bg-snow-200 text-navy-600 hover:bg-navy-600 hover:text-snow-50',
}

/** Tone from the action's label, so every page gets consistent colours without passing a tone. */
export function actionTone(label: string, danger?: boolean): ActionTone {
  if (danger || /^(delete|remove)\b/i.test(label)) return 'danger'
  if (/^edit\b/i.test(label)) return 'edit'
  if (/^(create|convert|duplicate|add)\b/i.test(label)) return 'success'
  if (/^(pdf|download|print|excel)\b/i.test(label)) return 'accent'
  return 'neutral'
}

/** Square icon button with a coloured background: blue edit, red delete, neutral for the rest. */
export function IconAction({ label, onClick, children, danger, disabled, tone }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; disabled?: boolean; tone?: ActionTone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-field transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500 disabled:pointer-events-none disabled:opacity-35 sm:size-8',
        ACTION_TONES[tone ?? actionTone(label, danger)],
      )}
    >
      {children}
    </button>
  )
}

/** Row of IconActions with even spacing (use in an "Actions" column). */
export function ActionGroup({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>
}

/** Converts newline-separated textarea text ↔ string[] */
export const linesToList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)
export const listToLines = (l: string[]) => l.join('\n')

/** "Showing 21–40 of 132" + previous / next + page size. Hidden when everything fits on one page and no size choice is needed. */
export function Pagination({ page, pages, total, pageSize, onPage, onPageSize, noun = 'records' }: {
  page: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void; onPageSize?: (n: number) => void; noun?: string
}) {
  if (!total) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-muted sm:flex-row">
      <p aria-live="polite">Showing <span className="font-semibold text-ink">{from}–{to}</span> of <span className="font-semibold text-ink">{total}</span> {noun}</p>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <label className="flex items-center gap-1.5">
            <span>Per page</span>
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="h-9 rounded-field border border-line bg-canvas px-2">
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className="grid size-9 place-items-center rounded-field border border-line bg-surface text-ink disabled:opacity-40"><ChevronLeft className="size-4" /></button>
        <span className="min-w-[4.5rem] text-center tabular-nums">Page {page} / {pages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page" className="grid size-9 place-items-center rounded-field border border-line bg-surface text-ink disabled:opacity-40"><ChevronRight className="size-4" /></button>
      </div>
    </nav>
  )
}

export function SortSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return <FilterSelect label="Sort" value={value} onChange={onChange} options={options} />
}

/** Label/value grid used by the "View" dialogs. Empty values show a dash. */
export function DetailList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-sm text-muted">{k}</dt>
          <dd className="break-words font-semibold text-ink">{v === '' || v == null ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  )
}
