import { useCallback, useState } from 'react'
import type { CollectionItem, CollectionKey, FieldErrors } from '@/types'
import { ApiError } from '@/services/api'
import { useRemoveItem, useUpsertItem } from '@/queries'
import { useToast } from '@/context/ToastContext'

export const errorMessage = (e: unknown, fallback = 'Something went wrong.') => (e instanceof Error && e.message ? e.message : fallback)

/**
 * Shared editor state for admin CRUD screens: which item is being edited,
 * which is pending deletion, and save/delete actions backed by TanStack Query
 * mutations (optimistic update, rollback on error, cache invalidation).
 */
export function useCrud<K extends CollectionKey>(key: K, noun: string) {
  const upsert = useUpsertItem(key)
  const remove = useRemoveItem(key)
  const toast = useToast()
  const [editing, setEditing] = useState<CollectionItem<K> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleting, setDeleting] = useState<CollectionItem<K> | null>(null)
  /** Errors returned by the API for the open form (server-side validation). */
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})

  const openNew = useCallback((blank: CollectionItem<K>) => { setEditing(blank); setIsNew(true); setServerErrors({}) }, [])
  const openEdit = useCallback((item: CollectionItem<K>) => { setEditing(structuredClone(item)); setIsNew(false); setServerErrors({}) }, [])
  const close = useCallback(() => { if (!upsert.isPending) setEditing(null) }, [upsert.isPending])

  const save = useCallback(async (item: CollectionItem<K>, message?: string) => {
    setServerErrors({})
    try {
      await upsert.mutateAsync(item)
      toast({ title: message ?? (isNew ? `${noun} added` : `${noun} saved`), description: 'The website shows the change now.' })
      setEditing(null)
      return true
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setServerErrors(e.fieldErrors)
      toast({ tone: 'error', title: `${noun} not saved`, description: errorMessage(e) })
      return false
    }
  }, [upsert, toast, noun, isNew])

  const quickUpdate = useCallback(async (item: CollectionItem<K>, message: string) => {
    try {
      await upsert.mutateAsync(item)
      toast({ title: message })
    } catch (e) {
      toast({ tone: 'error', title: 'Change not saved', description: errorMessage(e) })
    }
  }, [upsert, toast])

  const confirmDelete = useCallback(async () => {
    const target = deleting
    setDeleting(null)
    if (!target) return
    try {
      await remove.mutateAsync(target.id)
      toast({ title: `${noun} deleted` })
    } catch (e) {
      toast({ tone: 'error', title: `${noun} not deleted`, description: errorMessage(e) })
    }
  }, [deleting, remove, toast, noun])

  return {
    editing, setEditing, isNew, openNew, openEdit, close, save, quickUpdate, deleting, setDeleting, confirmDelete,
    saving: upsert.isPending, deletingPending: remove.isPending, serverErrors,
  }
}
