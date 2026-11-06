import { useCallback } from 'react'
import type { OrderedCollectionKey } from '@/types'
import { useCollection, useReorder } from '@/queries'
import { useToast } from '@/context/ToastContext'
import { errorMessage } from './useCrud'

/**
 * Move `id` one step up/down. When a filter hides some rows, it swaps with the
 * nearest VISIBLE neighbour, so the arrows always do what the admin sees.
 * Returns the full new id order, or null when the item can't move.
 */
export function moveWithin(sortedIds: string[], visibleIds: string[], id: string, dir: -1 | 1): string[] | null {
  const vis = visibleIds.indexOf(id)
  const neighbour = visibleIds[vis + dir]
  if (vis < 0 || !neighbour) return null
  const next = [...sortedIds]
  const a = next.indexOf(id)
  const b = next.indexOf(neighbour)
  if (a < 0 || b < 0) return null
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

export function useReorderList(key: OrderedCollectionKey) {
  const list = useCollection(key) as Array<{ id: string; order: number }>
  const reorder = useReorder(key)
  const toast = useToast()

  const move = useCallback(async (id: string, dir: -1 | 1, visibleIds?: string[]) => {
    const sortedIds = [...list].sort((a, b) => a.order - b.order).map((x) => x.id)
    const next = moveWithin(sortedIds, visibleIds ?? sortedIds, id, dir)
    if (!next) return
    try {
      await reorder.mutateAsync(next)
    } catch (e) {
      toast({ tone: 'error', title: 'Order not saved', description: errorMessage(e) })
    }
  }, [list, reorder, toast])

  return { move, pending: reorder.isPending }
}
