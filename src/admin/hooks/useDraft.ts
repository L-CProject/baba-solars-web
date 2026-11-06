import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldErrors } from '@/types'

type Path = string

export function getPath(obj: unknown, path: Path): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc == null ? undefined : (acc as Record<string, unknown>)[k]), obj)
}

/** Immutable set by dot path ("home.solutions.0.title"). Numeric segments index arrays. */
export function setPath<T>(obj: T, path: Path, value: unknown): T {
  const [head, ...rest] = path.split('.')
  const container = obj as unknown
  const current = (container as Record<string, unknown>)?.[head]
  const nextValue = rest.length ? setPath(current, rest.join('.'), value) : value
  if (Array.isArray(container)) {
    const copy = [...container]
    copy[Number(head)] = nextValue
    return copy as T
  }
  return { ...(container as object), [head]: nextValue } as T
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export interface DraftForm<T> {
  draft: T
  get: <V = string>(path: Path) => V
  set: (path: Path, value: unknown) => void
  errors: FieldErrors
  setErrors: (e: FieldErrors) => void
}

/**
 * Local editable copy of server data (TanStack Query cache) for a form.
 * - `dirty`: the draft differs from the version it started from.
 * - When the saved data changes elsewhere (another tab) and the form is clean, the
 *   draft follows automatically; when it is dirty, `remoteChanged` lets the UI warn.
 */
export function useDraft<T>(saved: T) {
  const [draft, setDraft] = useState<T>(saved)
  const [base, setBase] = useState<T>(saved)
  const [errors, setErrors] = useState<FieldErrors>({})

  const dirty = useMemo(() => !same(draft, base), [draft, base])
  const remoteChanged = useMemo(() => !same(saved, base), [saved, base])

  useEffect(() => {
    if (remoteChanged && !dirty) { setDraft(saved); setBase(saved) }
  }, [remoteChanged, dirty, saved])

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const set = useCallback((path: Path, value: unknown) => {
    setDraft((d) => setPath(d, path, value))
    setErrors((e) => {
      if (!Object.keys(e).some((k) => k === path || k.startsWith(path + '.'))) return e
      const next = { ...e }
      for (const k of Object.keys(next)) if (k === path || k.startsWith(path + '.')) delete next[k]
      return next
    })
  }, [])

  const get = useCallback(<V = string,>(path: Path) => getPath(draft, path) as V, [draft])

  const loadLatest = useCallback(() => { setDraft(saved); setBase(saved); setErrors({}) }, [saved])
  const discard = useCallback(() => { setDraft(base); setErrors({}) }, [base])
  const markSaved = useCallback((value: T) => { setBase(value); setDraft(value) }, [])

  const form: DraftForm<T> = { draft, get, set, errors, setErrors }
  return { form, draft, setDraft, dirty, remoteChanged, loadLatest, discard, markSaved }
}
