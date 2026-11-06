import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { CollectionItem, CollectionKey, Database, OrderedCollectionKey, SiteContent } from '@/types'
import { api, type EnquiryInput, type QuotationRequestInput } from '@/services/api'
import { siteKeys } from './keys'
import { broadcastChange } from './SiteSync'

/**
 * Write hooks. Pattern for every admin edit:
 *   onMutate  → cancel in-flight reads, snapshot the cache, apply the change optimistically
 *   onError   → roll back to the snapshot (the UI shows the error)
 *   onSettled → invalidate, so the cache is re-read from the API (the source of truth)
 * The public website reads the same cache, so it updates at once in this tab; other tabs
 * are told via <SiteSync />, and every visitor gets the saved data from the API.
 */

type Ctx<T> = { previous: T | undefined }

async function snapshot<T>(qc: QueryClient, queryKey: readonly unknown[]): Promise<Ctx<T>> {
  await qc.cancelQueries({ queryKey })
  return { previous: qc.getQueryData<T>(queryKey) }
}

/** Writes to one resource share a key + scope: they run one after another, never interleaved. */
const writeKey = (resource: string) => ['site-write', resource] as const
const writeScope = (resource: string) => ({ id: `site-write:${resource}` })

/**
 * Re-read from the source of truth — but only when this is the last pending write for
 * the resource, otherwise the refetch would briefly undo a queued optimistic update.
 */
const settle = (qc: QueryClient, queryKey: readonly unknown[], resource?: string) => {
  broadcastChange()
  if (resource && qc.isMutating({ mutationKey: writeKey(resource) }) > 1) return Promise.resolve()
  // Server-paginated tables and dashboards of the same resource refresh too.
  return Promise.all([qc.invalidateQueries({ queryKey }), resource ? qc.invalidateQueries({ queryKey: ['admin', 'list', resource] }) : null, qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })])
}

export function useUpsertItem<K extends CollectionKey>(key: K) {
  const qc = useQueryClient()
  const queryKey = siteKeys.collection(key)
  type List = Database[K]
  return useMutation({
    mutationKey: writeKey(key),
    scope: writeScope(key),
    mutationFn: (item: CollectionItem<K>) => api.upsertItem(key, item),
    onMutate: async (item) => {
      const ctx = await snapshot<List>(qc, queryKey)
      qc.setQueryData<List>(queryKey, (old) => {
        const list = (old ?? []) as Array<CollectionItem<K>>
        const exists = list.some((x) => x.id === item.id)
        return (exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]) as List
      })
      return ctx
    },
    onError: (_e, _item, ctx) => { if (ctx) qc.setQueryData(queryKey, ctx.previous) },
    onSettled: () => settle(qc, queryKey, key),
  })
}

export function useRemoveItem<K extends CollectionKey>(key: K) {
  const qc = useQueryClient()
  const queryKey = siteKeys.collection(key)
  type List = Database[K]
  return useMutation({
    mutationKey: writeKey(key),
    scope: writeScope(key),
    mutationFn: (id: string) => api.removeItem(key, id),
    onMutate: async (id) => {
      const ctx = await snapshot<List>(qc, queryKey)
      qc.setQueryData<List>(queryKey, (old) => ((old ?? []) as Array<{ id: string }>).filter((x) => x.id !== id) as List)
      return ctx
    },
    onError: (_e, _id, ctx) => { if (ctx) qc.setQueryData(queryKey, ctx.previous) },
    onSettled: () => settle(qc, queryKey, key),
  })
}

/** Save a full new order (array of ids). Optimistic, so arrows feel instant. */
export function useReorder<K extends OrderedCollectionKey>(key: K) {
  const qc = useQueryClient()
  const queryKey = siteKeys.collection(key)
  type List = Database[K]
  return useMutation({
    mutationKey: writeKey(key),
    scope: writeScope(key),
    mutationFn: (ids: string[]) => api.reorder(key, ids),
    onMutate: async (ids) => {
      const ctx = await snapshot<List>(qc, queryKey)
      qc.setQueryData<List>(queryKey, (old) => {
        const list = (old ?? []) as Array<{ id: string; order: number }>
        const pos = new Map(ids.map((id, i) => [id, i + 1]))
        return list.map((x) => ({ ...x, order: pos.get(x.id) ?? x.order })) as unknown as List
      })
      return ctx
    },
    onError: (_e, _ids, ctx) => { if (ctx) qc.setQueryData(queryKey, ctx.previous) },
    onSettled: () => settle(qc, queryKey, key),
  })
}

export function useUpdateContent() {
  const qc = useQueryClient()
  const queryKey = siteKeys.content()
  return useMutation({
    mutationKey: writeKey('content'),
    scope: writeScope('content'),
    mutationFn: (patch: Partial<SiteContent>) => api.updateContent(patch),
    onMutate: async (patch) => {
      const ctx = await snapshot<SiteContent>(qc, queryKey)
      if (ctx.previous) qc.setQueryData<SiteContent>(queryKey, { ...ctx.previous, ...patch })
      return ctx
    },
    onError: (_e, _p, ctx) => { if (ctx) qc.setQueryData(queryKey, ctx.previous) },
    onSettled: () => settle(qc, queryKey, 'content'),
  })
}

export function useSubmitEnquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EnquiryInput) => api.submitEnquiry(input),
    // Saved in this browser: must run even when offline (the Sheet/email part has its own retry queue).
    networkMode: 'always',
    onSuccess: () => settle(qc, siteKeys.collection('enquiries')),
  })
}

export function useSubmitQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: QuotationRequestInput) => api.submitQuotation(input),
    onSuccess: () => settle(qc, siteKeys.collection('enquiries')),
  })
}

/** Restoring a backup touches everything: re-read every query afterwards. */
export function useImportSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapshot: unknown) => api.importSnapshot(snapshot),
    onSettled: () => { broadcastChange(); return qc.invalidateQueries({ queryKey: siteKeys.all }) },
  })
}
