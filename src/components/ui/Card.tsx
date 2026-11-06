import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'surface' | 'warm' | 'plain' | 'dark'
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  padded?: boolean
  interactive?: boolean
  as?: 'div' | 'article' | 'section'
  children?: ReactNode
}

const tones: Record<Tone, string> = {
  surface: 'bg-surface border border-line shadow-soft',
  warm: 'bg-ice-100 border border-ice-200',
  plain: 'bg-transparent border border-line',
  dark: 'bg-navy-800 text-snow-100 border border-navy-700',
}

export function Card({ tone = 'surface', padded = true, interactive, as: Tag = 'div', className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-card',
        tones[tone],
        padded && 'p-6',
        interactive && 'card-lift',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
