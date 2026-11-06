import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Paginated } from '@/types'

export interface ServerSort { value: string; label: string; sort: string; order: 'asc' | 'desc' }

/**
 * Server-side search + filters + sort + pagination for admin tables. Same return shape as the
 * client-side useTable, so pages switch with few changes. Search is debounced; the previous
 * page stays on screen while the next one loads (no flicker).
 */
export function useServerTable<T, F extends Record<string, string | number | undefined>>(
  resource: string,
  fetcher: (params: F & { page: number; limit: number; search: string; sort: string; order: 'asc' | 'desc' }) => Promise<Paginated<T>>,
  opts: { sorts: ServerSort[]; filters: F; pageSize?: number; enabled?: boolean },
) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(opts.sorts[0]?.value ?? '')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(opts.pageSize ?? 20)
  const filterKey = JSON.stringify(opts.filters)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])
  useEffect(() => { setPage(1) }, [search, sort, pageSize, filterKey])

  const s = opts.sorts.find((x) => x.value === sort) ?? opts.sorts[0]
  const params = { ...opts.filters, page, limit: pageSize, search, sort: s?.sort ?? '', order: s?.order ?? 'desc' } as F & { page: number; limit: number; search: string; sort: string; order: 'asc' | 'desc' }
  const q = useQuery({
    queryKey: ['admin', 'list', resource, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  })
  const data = q.data
  const pages = data?.totalPages ?? 1
  // A delete on the last page can leave it empty: step back.
  useEffect(() => { if (data && page > data.totalPages) setPage(data.totalPages) }, [data, page])

  return {
    query, setQuery, sort, setSort, page: Math.min(page, pages), setPage, pages, pageSize, setPageSize,
    pageRows: data?.items ?? [], total: data?.total ?? 0,
    isPending: q.isPending, isFetching: q.isFetching, isPlaceholderData: q.isPlaceholderData, error: q.error, refetch: q.refetch, params,
  }
}
