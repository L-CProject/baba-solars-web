import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { FieldErrors } from '@/types'
import { cn } from '@/lib/cn'
import { ImageUploadField } from './ImageUploadField'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { IconAction } from './AdminUI'

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function useFocusNew(count: number) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef(count)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  useEffect(() => {
    if (focusIndex !== null && count > prev.current) {
      ref.current?.querySelectorAll<HTMLElement>('[data-row]')[focusIndex]?.querySelector<HTMLElement>('input, textarea')?.focus()
      setFocusIndex(null)
    }
    prev.current = count
  }, [count, focusIndex])
  return { ref, focusNext: setFocusIndex }
}

function RowActions({ noun, index, count, onMove, onRemove }: { noun: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
      <IconAction label={`Move ${noun} ${index + 1} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp className="size-4" /></IconAction>
      <IconAction label={`Move ${noun} ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown className="size-4" /></IconAction>
      <IconAction label={`Remove ${noun} ${index + 1}`} danger onClick={onRemove}><Trash2 className="size-4" /></IconAction>
    </div>
  )
}

interface StringListEditorProps {
  label: string
  /** Singular, lower-case: "feature", "point" */
  noun: string
  value: string[]
  onChange: (v: string[]) => void
  /** Errors keyed by index ("0", "1") plus "" for the list itself */
  errors?: FieldErrors
  max?: number
  placeholder?: string
  hint?: string
  multiline?: boolean
}

/** Editable list of strings: add, edit, delete and reorder — one input per row. */
export function StringListEditor({ label, noun, value, onChange, errors = {}, max = 20, placeholder, hint, multiline }: StringListEditorProps) {
  const { ref, focusNext } = useFocusNew(value.length)
  const add = () => { focusNext(value.length); onChange([...value, '']) }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold text-ink-soft">{label} <span className="font-normal text-muted">({value.length}/{max})</span></legend>
      {hint && <p className="-mt-1 text-sm text-muted">{hint}</p>}
      <div ref={ref} className="grid gap-2">
        {value.map((item, i) => (
          <div key={i} data-row className="flex items-start gap-2">
            <span className="mt-3 w-5 shrink-0 text-right text-xs font-semibold text-muted" aria-hidden>{i + 1}.</span>
            {multiline ? (
              <Textarea label={`${noun} ${i + 1}`} hideLabel rows={3} value={item} placeholder={placeholder} error={errors[String(i)]} wrapperClassName="flex-1"
                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
            ) : (
              <Input label={`${noun} ${i + 1}`} hideLabel value={item} placeholder={placeholder} error={errors[String(i)]} wrapperClassName="flex-1"
                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (value.length < max) add() } }} />
            )}
            <RowActions noun={noun} index={i} count={value.length} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      {!value.length && <p className="rounded-field border border-dashed border-line px-3 py-3 text-sm text-muted">No {noun}s yet.</p>}
      {errors[''] && <p className="text-sm text-clay-700" role="alert">{errors['']}</p>}
      <div>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={add} disabled={value.length >= max}>Add {noun}</Button>
      </div>
    </fieldset>
  )
}

export interface ItemField<T> {
  key: keyof T & string
  label: string
  kind?: 'text' | 'textarea' | 'image' | 'link' | 'select'
  placeholder?: string
  /** For kind "select" */
  options?: Array<{ value: string; label: string }>
  /** Grid span on wide screens: 1 (half) or 2 (full). Default 1. */
  span?: 1 | 2
}

interface ItemListEditorProps<T extends { id?: string }> {
  label: string
  noun: string
  value: T[]
  onChange: (v: T[]) => void
  fields: ItemField<T>[]
  create: () => T
  /** Errors keyed "0.title", "1.text" … plus "" for the list */
  errors?: FieldErrors
  max?: number
  hint?: string
  /** Optional preview rendered next to each row (e.g. an image thumbnail). */
  renderAside?: (item: T) => ReactNode
}

/** Editable list of small records (title + text, cards with image/link, spec rows…). */
export function ItemListEditor<T extends { id?: string }>({ label, noun, value, onChange, fields, create, errors = {}, max = 12, hint, renderAside }: ItemListEditorProps<T>) {
  const { ref, focusNext } = useFocusNew(value.length)
  const update = (i: number, key: keyof T, v: string) => onChange(value.map((x, j) => (j === i ? { ...x, [key]: v } : x)))
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold text-ink-soft">{label} <span className="font-normal text-muted">({value.length}/{max})</span></legend>
      {hint && <p className="-mt-1 text-sm text-muted">{hint}</p>}
      <div ref={ref} className="grid gap-3">
        {value.map((item, i) => (
          <div key={item.id ?? i} data-row className="rounded-card border border-line bg-snow-100/60 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{noun[0].toUpperCase() + noun.slice(1)} {i + 1}</p>
              <RowActions noun={noun} index={i} count={value.length} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
            </div>
            <div className={cn('grid gap-3', renderAside && 'sm:grid-cols-[1fr_7rem]')}>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) => {
                  const common = {
                    label: f.label,
                    value: String(item[f.key] ?? ''),
                    placeholder: f.placeholder,
                    error: errors[`${i}.${f.key}`],
                    wrapperClassName: f.span === 2 || f.kind === 'textarea' ? 'sm:col-span-2' : undefined,
                  }
                  if (f.kind === 'select') {
                    return <Select key={f.key} label={f.label} value={common.value} error={common.error} options={f.options ?? []} onChange={(e) => update(i, f.key, e.target.value)} />
                  }
                  if (f.kind === 'image') {
                    return <ImageUploadField key={f.key} label={f.label} value={common.value} error={common.error} placeholder={f.placeholder} hint="" wrapperClassName={common.wrapperClassName} onChange={(v) => update(i, f.key, v)} />
                  }
                  return f.kind === 'textarea'
                    ? <Textarea key={f.key} {...common} rows={2} onChange={(e) => update(i, f.key, e.target.value)} />
                    : <Input key={f.key} {...common} onChange={(e) => update(i, f.key, f.kind === 'image' || f.kind === 'link' ? e.target.value.trim() : e.target.value)} />
                })}
              </div>
              {renderAside && <div className="hidden sm:block">{renderAside(item)}</div>}
            </div>
          </div>
        ))}
      </div>
      {!value.length && <p className="rounded-field border border-dashed border-line px-3 py-3 text-sm text-muted">No {noun}s yet.</p>}
      {errors[''] && <p className="text-sm text-clay-700" role="alert">{errors['']}</p>}
      <div>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => { focusNext(value.length); onChange([...value, create()]) }} disabled={value.length >= max}>
          Add {noun}
        </Button>
      </div>
    </fieldset>
  )
}
