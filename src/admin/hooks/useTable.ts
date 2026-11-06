import { useEffect, useMemo, useState } from 'react'

export interface SortOption<T> {
  value: string
  label: string
  compare: (a: T, b: T) => number
}

/**
 * Client-side search + filters + sort + pagination for admin lists. Filters are plain
 * predicates so each page decides what it filters on. Page resets when the query changes.
 */
export function useTable<T>(rows: T[], opts: {
  search: (row: T) => string
  sorts: SortOption<T>[]
  filters?: Array<(row: T) => boolean>
  /** Changes whenever a filter value changes (e.g. `${status}|${source}`): re-filters and goes back to page 1. */
  filterKey?: string
  pageSize?: number
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(opts.sorts[0]?.value ?? '')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(opts.pageSize ?? 20)
  const { search, sorts, filters = [] } = opts

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const words = q.split(/\s+/).filter(Boolean)
    const cmp = sorts.find((s) => s.value === sort)?.compare
    const out = rows.filter((r) => filters.every((f) => f(r)) && (!words.length || words.every((w) => search(r).toLowerCase().includes(w))))
    return cmp ? [...out].sort(cmp) : out
    // `filters` and `search` are recreated each render; `filterKey` stands for their values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort, opts.filterKey])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => { setPage(1) }, [query, sort, pageSize, opts.filterKey])
  const current = Math.min(page, pages)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  return { query, setQuery, sort, setSort, page: current, setPage, pages, pageSize, setPageSize, filtered, pageRows, total: filtered.length }
}

export const byText = <T,>(f: (r: T) => string, dir: 1 | -1 = 1) => (a: T, b: T) => dir * f(a).localeCompare(f(b), 'en', { sensitivity: 'base' })
export const byNumber = <T,>(f: (r: T) => number, dir: 1 | -1 = 1) => (a: T, b: T) => dir * (f(a) - f(b))
