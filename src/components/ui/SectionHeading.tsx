import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionHeadingProps {
  title: string
  /** Short line above the heading (client's "Our Solar Solutions" style) */
  kicker?: string
  intro?: ReactNode
  align?: 'left' | 'center'
  as?: 'h1' | 'h2'
  action?: ReactNode
  className?: string
}

export function SectionHeading({ title, kicker, intro, align = 'left', as: Tag = 'h2', action, className }: SectionHeadingProps) {
  return (
    <div className={cn('mb-10 flex flex-col gap-4 md:mb-12', align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between', className)}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {kicker && <p className="mb-2 font-semibold text-steel-600">{kicker}</p>}
        <Tag className={cn(Tag === 'h1' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-[2.6rem]')}>{title}</Tag>
        {intro && <p className="mt-3 text-lg leading-relaxed text-muted">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
