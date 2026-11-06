import { useMemo } from 'react'
import { queryOptions, type QueryClient, useQueries, useSuspenseQuery, useSuspenseQueries, type UseSuspenseQueryResult } from '@tanstack/react-query'
import type { CollectionKey, Company, Database, PublishStatus, SiteContent } from '@/types'
import { api, COLLECTION_KEYS, PUBLIC_COLLECTION_KEYS, type PublicSite } from '@/services/api'
import { siteKeys } from './keys'

// ─── Query definitions (shared by hooks, prefetching and invalidation) ──────
export const collectionQuery = <K extends CollectionKey>(key: K) =>
  queryOptions({ queryKey: siteKeys.collection(key), queryFn: () => api.getCollection(key) })

export const contentQuery = () => queryOptions({ queryKey: siteKeys.content(), queryFn: () => api.getContent() })

export const companiesQuery = () => queryOptions({ queryKey: siteKeys.companies(), queryFn: () => api.listCompanies() })

/** Queries every visitor needs (leads are excluded — they load only inside the admin panel). */
export const publicSiteQueries = () => [...PUBLIC_COLLECTION_KEYS.map((k) => collectionQuery(k)), contentQuery(), companiesQuery()]

/** Put a /site response into the cache as individual queries. */
export function seedFromSite(qc: QueryClient, site: PublicSite) {
  for (const k of PUBLIC_COLLECTION_KEYS) qc.setQueryData(collectionQuery(k).queryKey, site[k] as never)
  qc.setQueryData(contentQuery().queryKey, site.content)
  qc.setQueryData(companiesQuery().queryKey, site.companies)
}

/** Load all public website data with ONE request before the first render. */
export async function prefetchSite(qc: QueryClient) {
  try {
    seedFromSite(qc, await api.loadSite())
  } catch {
    // Fall back to individual requests; DataGate shows an error state if those fail too.
    await Promise.allSettled(publicSiteQueries().map((q) => qc.prefetchQuery(q as never)))
  }
}

/** Fill the cache from a known database (build-time prerender). */
export function seedSite(qc: QueryClient, db: Database) {
  for (const k of COLLECTION_KEYS) qc.setQueryData(collectionQuery(k).queryKey, db[k] as never)
  qc.setQueryData(contentQuery().queryKey, db.content)
  const companies = (db as Database & { companies?: Company[] }).companies
  if (companies) qc.setQueryData(companiesQuery().queryKey, companies)
}

// ─── Read hooks ─────────────────────────────────────────────────────────────
/** One collection, always defined (suspends on first load; <DataGate> preloads the public ones). */
export function useCollection<K extends CollectionKey>(key: K): Database[K] {
  return useSuspenseQuery(collectionQuery(key)).data as Database[K]
}

type Publishable = { status?: PublishStatus; order?: number }

/** Published items only, in display order — what the public website shows. */
export function usePublished<K extends CollectionKey>(key: K): Database[K] {
  const list = useCollection(key) as unknown as Publishable[]
  return useMemo(
    () => list.filter((x) => (x.status ?? 'published') === 'published').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [list],
  ) as unknown as Database[K]
}

/** Active companies with their package prices, in display order (suspends; preloaded by DataGate). */
export function useCompanyPrices(): Company[] {
  const list = useSuspenseQuery(companiesQuery()).data
  return useMemo(() => list.filter((c) => c.isActive).sort((a, b) => a.order - b.order), [list])
}

export function useSiteContent(): SiteContent {
  return useSuspenseQuery(contentQuery()).data
}

/** Status of the initial load of the public site queries (used by <DataGate>). */
export function useSiteBootstrap() {
  return useQueries({
    queries: publicSiteQueries(),
    combine: (results) => ({
      isPending: results.some((r) => r.isPending),
      error: results.find((r) => r.error && r.data === undefined)?.error ?? null,
      refetch: () => { for (const r of results) if (r.isError) void r.refetch() },
    }),
  })
}

const ALL_QUERIES = () => [...COLLECTION_KEYS.map((k) => collectionQuery(k)), contentQuery()]
function combineDb(results: UseSuspenseQueryResult[]): Database {
  const db = {} as Record<string, unknown>
  COLLECTION_KEYS.forEach((k, i) => { db[k] = results[i].data })
  db.content = results[COLLECTION_KEYS.length].data
  return db as unknown as Database
}

/** Whole database incl. leads — ADMIN ONLY (dashboard). Public code uses useCollection / usePublished. */
export function useDb(): Database {
  return useSuspenseQueries({ queries: ALL_QUERIES(), combine: combineDb })
}
