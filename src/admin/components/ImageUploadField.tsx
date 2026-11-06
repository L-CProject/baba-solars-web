import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { CircleAlert, CircleCheck, ImageOff, ImageUp, Link2, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { IMAGE_ACCEPT, IMAGE_MAX_SOURCE_MB, imageFileProblem } from '@/lib/images'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  error?: string
  hint?: string
  required?: boolean
  /** Kept for compatibility: the box always shows the image now. */
  preview?: boolean
  /** Size / fit of the preview box, e.g. "aspect-[3/1] max-w-xs bg-white". */
  previewClassName?: string
  wrapperClassName?: string
  placeholder?: string
}

type Phase = 'idle' | 'uploading' | 'uploaded' | 'error'

/**
 * Image upload box.
 *  1. Click (or drop a file) → the chosen image shows in the box at once (local object URL).
 *  2. It is uploaded to the API (POST /api/uploads) with a spinner on top.
 *  3. Only when the server confirms is the field set to the server URL and marked "Uploaded".
 *     A failed upload keeps the local preview with the error and Retry / Remove — the field is NOT
 *     changed, so a preview is never mistaken for a saved image.
 * Replace and Remove are available before the form is saved. Temporary object URLs are revoked
 * when replaced, removed, after the uploaded image has loaded, and on unmount.
 * Editing an existing record shows its current image (the `value`).
 */
export function ImageUploadField({ label, value, onChange, error, hint, required, previewClassName, wrapperClassName, placeholder }: Props) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const { can } = useAuth()
  const canUpload = can('uploads:write')

  const [local, setLocal] = useState<{ url: string; file: File } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const [broken, setBroken] = useState(false)
  const [showLink, setShowLink] = useState(false)
  /** Ignore answers from an upload that was replaced or removed meanwhile. */
  const attempt = useRef(0)
  const localRef = useRef(local)
  localRef.current = local

  const revoke = useCallback((url?: string) => { if (url) URL.revokeObjectURL(url) }, [])
  useEffect(() => () => revoke(localRef.current?.url), [revoke])
  useEffect(() => { setBroken(false) }, [value])

  const upload = useCallback(async (file: File, previewUrl: string) => {
    const mine = ++attempt.current
    setPhase('uploading')
    setMessage('')
    try {
      const res = await api.uploadImage(file)
      if (mine !== attempt.current) return
      onChange(res.url)
      setPhase('uploaded')
      // Keep showing the local preview until the server copy has loaded (no flash), then revoke it.
      const img = new Image()
      const done = () => {
        if (mine !== attempt.current) return
        setLocal((cur) => {
          if (cur?.url === previewUrl) { revoke(previewUrl); return null }
          return cur
        })
      }
      img.onload = done
      img.onerror = done
      img.src = res.url
    } catch (e) {
      if (mine !== attempt.current) return
      setPhase('error')
      setMessage(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    }
  }, [onChange, revoke])

  const choose = (file?: File | null) => {
    if (!file) return
    const problem = imageFileProblem(file)
    if (problem) {
      // Invalid files never get a preview and are never sent.
      setPhase('error')
      setMessage(problem)
      return
    }
    revoke(localRef.current?.url)
    const url = URL.createObjectURL(file)
    setLocal({ url, file })
    void upload(file, url)
  }

  const remove = () => {
    attempt.current++
    revoke(localRef.current?.url)
    setLocal(null)
    setPhase('idle')
    setMessage('')
    onChange('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const retry = () => { if (local) void upload(local.file, local.url) }
  const pick = () => fileRef.current?.click()

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (canUpload && phase !== 'uploading') choose(e.dataTransfer.files?.[0])
  }

  const shown = local?.url ?? value
  const uploading = phase === 'uploading'
  const failed = phase === 'error'
  const hasAspect = /\baspect-/.test(previewClassName ?? '')
  const describedBy = `${id}-status`
  const fieldError = error || (failed ? message : '')

  return (
    <div className={cn('grid gap-2', wrapperClassName)}>
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-label`} className="text-sm font-semibold text-ink-soft">
          {label}{required && <span className="text-clay-500" aria-hidden> *</span>}
        </span>
        <button type="button" onClick={() => setShowLink((v) => !v)} className="inline-flex items-center gap-1 rounded-field px-1.5 py-0.5 text-xs font-semibold text-steel-600 hover:text-ink focus-visible:outline-2 focus-visible:outline-sun-500" aria-expanded={showLink}>
          <Link2 className="size-3.5" aria-hidden /> {showLink ? 'Hide link' : 'Use a link'}
        </button>
      </div>

      <div
        onDragOver={(e) => { if (canUpload) { e.preventDefault(); setDragging(true) } }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group relative w-full overflow-hidden rounded-card border-2 transition-[border-color,background-color,box-shadow] duration-200',
          hasAspect ? '' : 'h-44 sm:h-48',
          shown ? 'border-line bg-snow-200/60' : 'border-dashed bg-ice-100/40',
          dragging ? 'border-steel-500 bg-ice-100 shadow-soft' : !shown && 'border-ice-300 hover:border-steel-400 hover:bg-ice-100/70',
          (error || failed) && 'border-clay-500/60',
          previewClassName,
        )}
      >
        {shown && !broken ? (
          <img
            src={shown}
            alt={`${label} preview`}
            onError={() => { if (!local) setBroken(true) }}
            className={cn('absolute inset-0 size-full object-contain transition-opacity duration-300', (uploading || failed) && 'opacity-60')}
          />
        ) : null}

        {/* Empty / broken: the whole box is the picker button. */}
        {(!shown || broken) && (
          <button
            type="button"
            onClick={pick}
            disabled={!canUpload}
            aria-labelledby={`${id}-label ${id}-cta`}
            aria-describedby={describedBy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-sun-500 disabled:cursor-not-allowed"
          >
            {broken ? <ImageOff className="size-7 text-muted" aria-hidden /> : (
              <span className="grid size-12 place-items-center rounded-full bg-surface text-steel-600 shadow-soft transition-transform duration-200 group-hover:-translate-y-0.5">
                <ImageUp className="size-5.5" aria-hidden />
              </span>
            )}
            <span id={`${id}-cta`} className="text-sm font-semibold text-ink">
              {broken ? 'The current image could not be loaded' : canUpload ? (dragging ? 'Drop the image here' : 'Click to choose an image') : 'No image'}
            </span>
            {canUpload && <span className="text-xs text-muted">JPG, PNG or WebP · up to {IMAGE_MAX_SOURCE_MB} MB{broken ? ' · click to replace' : ' · or drag it here'}</span>}
          </button>
        )}

        {/* Status overlay */}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-navy-900/35 backdrop-blur-[1px]" aria-hidden>
            <span className="inline-flex items-center gap-2 rounded-chip bg-surface/95 px-3.5 py-2 text-sm font-semibold text-ink shadow-soft">
              <LoaderCircle className="size-4 animate-spin text-steel-600" /> Uploading…
            </span>
          </div>
        )}
        {phase === 'uploaded' && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-chip bg-leaf-500 px-2.5 py-1 text-xs font-semibold text-snow-50 shadow-soft" aria-hidden>
            <CircleCheck className="size-3.5" /> Uploaded
          </span>
        )}
        {failed && local && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-chip bg-clay-500 px-2.5 py-1 text-xs font-semibold text-snow-50 shadow-soft" aria-hidden>
            <CircleAlert className="size-3.5" /> Not uploaded
          </span>
        )}

        {/* Actions on an image */}
        {shown && !broken && canUpload && (
          <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
            {failed && local && (
              <ActionButton onClick={retry} label={`Retry uploading ${label}`} icon={<RefreshCw className="size-4" aria-hidden />}>Retry</ActionButton>
            )}
            <ActionButton onClick={pick} disabled={uploading} label={`Replace ${label}`} icon={<ImageUp className="size-4" aria-hidden />}>Replace</ActionButton>
            <ActionButton onClick={remove} label={`Remove ${label}`} danger icon={<Trash2 className="size-4" aria-hidden />}>Remove</ActionButton>
          </div>
        )}
        {broken && value && canUpload && (
          <div className="absolute bottom-2.5 right-2.5">
            <ActionButton onClick={remove} label={`Remove ${label}`} danger icon={<Trash2 className="size-4" aria-hidden />}>Remove</ActionButton>
          </div>
        )}
      </div>

      {/* Screen-reader status + visible messages */}
      <p id={describedBy} role={fieldError ? 'alert' : 'status'} aria-live="polite" className={cn('text-sm', fieldError ? 'text-clay-700' : 'text-muted', !fieldError && !hint && phase !== 'uploading' && phase !== 'uploaded' && 'sr-only')}>
        {fieldError
          || (uploading ? 'Uploading the image…' : phase === 'uploaded' ? 'Image uploaded. Save the form to use it on the website.' : hint)}
      </p>

      {showLink && (
        <Input
          label={`${label} — link`}
          hideLabel
          value={local ? '' : value}
          placeholder={placeholder ?? 'https://… or /images/file.jpg'}
          onChange={(e) => { attempt.current++; revoke(local?.url); setLocal(null); setPhase('idle'); setMessage(''); onChange(e.target.value.trim()) }}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }}
      />
    </div>
  )
}

function ActionButton({ onClick, label, icon, children, danger, disabled }: { onClick: () => void; label: string; icon: React.ReactNode; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-field bg-surface/95 px-3 text-sm font-semibold shadow-soft backdrop-blur transition-colors focus-visible:outline-2 focus-visible:outline-sun-500 disabled:opacity-50',
        danger ? 'text-clay-700 hover:bg-clay-100' : 'text-ink hover:bg-ice-100',
      )}
    >
      {icon}<span className="max-sm:sr-only">{children}</span>
    </button>
  )
}
