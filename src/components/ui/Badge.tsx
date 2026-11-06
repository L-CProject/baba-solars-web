import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-snow-200 text-navy-700',
  success: 'bg-leaf-100 text-leaf-700',
  warning: 'bg-sun-300/40 text-navy-800',
  danger: 'bg-clay-100 text-clay-700',
  accent: 'bg-ice-200 text-navy-800',
  info: 'bg-ice-100 text-navy-700 border border-ice-200',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-chip px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}
