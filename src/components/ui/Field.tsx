import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-field border bg-surface px-3.5 text-ink placeholder:text-navy-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sun-400/45 disabled:opacity-60'
const controlState = (invalid?: boolean) => (invalid ? 'border-clay-500 focus:border-clay-500' : 'border-line hover:border-steel-400 focus:border-steel-500')

interface FieldShellProps {
  label: string
  id: string
  hint?: string
  error?: string
  required?: boolean
  hideLabel?: boolean
  children: ReactNode
  className?: string
}

export function FieldShell({ label, id, hint, error, required, hideLabel, children, className }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-semibold text-ink-soft', hideLabel && 'sr-only')}>
        {label}
        {required && <span className="text-clay-500" aria-hidden> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-clay-700" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

interface BaseFieldProps { label: string; hint?: string; error?: string; hideLabel?: boolean; wrapperClassName?: string }

export type InputProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement> & { prefix?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, hideLabel, wrapperClassName, className, id, required, prefix, ...rest }, ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  return (
    <FieldShell label={label} id={fieldId} hint={hint} error={error} required={required} hideLabel={hideLabel} className={wrapperClassName}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{prefix}</span>}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(control, controlState(!!error), 'h-11', prefix && 'pl-8', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  )
})

export type TextareaProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, hideLabel, wrapperClassName, className, id, required, rows = 4, ...rest }, ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell label={label} id={fieldId} hint={hint} error={error} required={required} hideLabel={hideLabel} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(control, controlState(!!error), 'py-2.5 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  )
})

export interface SelectOption { value: string; label: string }
export type SelectProps = BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[]; placeholder?: string }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, hideLabel, wrapperClassName, className, id, required, options, placeholder, ...rest }, ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell label={label} id={fieldId} hint={hint} error={error} required={required} hideLabel={hideLabel} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(control, controlState(!!error), 'h-11 appearance-none pr-10', className)}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </FieldShell>
  )
})

interface ToggleProps { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string; id?: string }

export function Toggle({ label, checked, onChange, description, id }: ToggleProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={fieldId} className="text-sm font-semibold text-ink-soft">{label}</label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={fieldId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-leaf-500' : 'bg-snow-300')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-surface shadow-soft transition-transform duration-200 ease-soft', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  className?: string
}

/** Radio-group styled as pill segments. Keyboard accessible via native radios. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      <legend className="mb-1.5 text-sm font-semibold text-ink-soft">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-field border border-line bg-snow-200/60 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex-1 cursor-pointer rounded-[0.55rem] px-3 py-2 text-center text-sm font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sun-500',
              value === o.value ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
