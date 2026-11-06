import type { ReactNode } from 'react'
import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-muted', className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-field', className)} aria-hidden />
}

interface EmptyStateProps { title: string; message?: string; action?: ReactNode; icon?: ReactNode; className?: string }

export function EmptyState({ title, message, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-card border border-dashed border-steel-400/60 bg-snow-50 px-6 py-12 text-center', className)}>
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-ice-100 text-steel-600">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <h3 className="font-sans text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-md text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface ErrorStateProps { title?: string; message: string; onRetry?: () => void; className?: string }

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center rounded-card border border-clay-500/30 bg-clay-100/50 px-6 py-12 text-center', className)}>
      <CircleAlert className="mb-3 size-8 text-clay-500" aria-hidden />
      <h3 className="font-sans text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-ink-soft">{message}</p>
      {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
