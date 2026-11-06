import type { ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-m'
import { RefreshCw } from 'lucide-react'
import { errorsUnder } from '@/lib/schemas'
import { Button, Input, Textarea, Toggle, type InputProps } from '@/components/ui'
import type { DraftForm } from '../hooks/useDraft'
import { ItemListEditor, StringListEditor, type ItemField } from './ListEditor'

/** Inputs bound to a draft by dot path, with errors looked up by the same path. */
type Base<T> = { form: DraftForm<T>; path: string; label: string; hint?: string; className?: string }

export function DraftInput<T>({ form, path, label, hint, className, ...rest }: Base<T> & Omit<InputProps, 'label' | 'value' | 'onChange' | 'form'> & { trim?: boolean }) {
  const { trim, ...inputProps } = rest as { trim?: boolean } & Omit<InputProps, 'label'>
  return (
    <Input
      label={label}
      hint={hint}
      wrapperClassName={className}
      value={form.get<string>(path) ?? ''}
      onChange={(e) => form.set(path, trim ? e.target.value.trim() : e.target.value)}
      error={form.errors[path]}
      {...inputProps}
    />
  )
}

export function DraftTextarea<T>({ form, path, label, hint, className, rows = 3 }: Base<T> & { rows?: number }) {
  return <Textarea label={label} hint={hint} rows={rows} wrapperClassName={className} value={form.get<string>(path) ?? ''} onChange={(e) => form.set(path, e.target.value)} error={form.errors[path]} />
}

export function DraftToggle<T>({ form, path, label, hint }: Base<T>) {
  return <Toggle label={label} description={hint} checked={!!form.get<boolean>(path)} onChange={(v) => form.set(path, v)} />
}

export function DraftStringList<T>({ form, path, label, noun, max, hint, multiline }: Base<T> & { noun: string; max?: number; multiline?: boolean }) {
  return <StringListEditor label={label} noun={noun} hint={hint} max={max} multiline={multiline} value={form.get<string[]>(path) ?? []} onChange={(v) => form.set(path, v)} errors={errorsUnder(form.errors, path)} />
}

export function DraftItemList<T, I extends { id?: string }>({ form, path, label, noun, max, hint, fields, create, renderAside }: Base<T> & {
  noun: string; max?: number; fields: ItemField<I>[]; create: () => I; renderAside?: (item: I) => ReactNode
}) {
  return (
    <ItemListEditor<I>
      label={label} noun={noun} hint={hint} max={max} fields={fields} create={create} renderAside={renderAside}
      value={form.get<I[]>(path) ?? []} onChange={(v) => form.set(path, v)} errors={errorsUnder(form.errors, path)}
    />
  )
}

/** Card section with a heading used across the content editors. */
export function EditorSection({ id, title, description, children, hidden }: { id?: string; title: string; description?: ReactNode; children: ReactNode; hidden?: boolean }) {
  return (
    <section id={id} hidden={hidden} className="scroll-mt-24 rounded-card border border-line bg-surface p-5 shadow-soft md:p-6" aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined} className="font-sans text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  )
}

interface SaveBarProps {
  dirty: boolean
  saving: boolean
  remoteChanged: boolean
  errorCount: number
  onDiscard: () => void
  onLoadLatest: () => void
}

/** Sticky bar that appears when a form has unsaved changes. */
export function SaveBar({ dirty, saving, remoteChanged, errorCount, onDiscard, onLoadLatest }: SaveBarProps) {
  return (
    <AnimatePresence>
      {(dirty || saving) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="sticky bottom-3 z-20 mt-6 flex flex-col gap-3 rounded-card border border-line bg-surface/95 p-3 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4"
          role="region"
          aria-label="Unsaved changes"
        >
          <div className="text-sm">
            {remoteChanged ? (
              <p className="text-clay-700"><strong>Saved data changed in another tab.</strong> Saving now overwrites it.{' '}
                <button type="button" onClick={onLoadLatest} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"><RefreshCw className="size-3.5" aria-hidden />Load latest</button>
              </p>
            ) : errorCount ? (
              <p className="text-clay-700" role="alert">{errorCount} field{errorCount === 1 ? ' needs' : 's need'} attention.</p>
            ) : (
              <p className="text-ink-soft">You have unsaved changes.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onDiscard} disabled={saving}>Discard</Button>
            <Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
