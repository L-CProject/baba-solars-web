import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'light' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none transition-[background-color,color,box-shadow,transform] duration-200 ease-soft active:translate-y-px disabled:pointer-events-none disabled:opacity-55'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-snow-50 shadow-soft hover:bg-primary-hover',
  accent: 'bg-accent text-navy-900 shadow-soft hover:bg-sun-300',
  secondary: 'bg-surface text-ink border border-line hover:border-steel-400 hover:bg-ice-100',
  light: 'border border-snow-50/45 bg-snow-50/10 text-snow-50 backdrop-blur-sm hover:border-snow-50/80 hover:bg-snow-50/20',
  ghost: 'text-ink-soft hover:bg-ice-100 hover:text-ink',
  danger: 'bg-clay-500 text-snow-50 hover:bg-clay-700',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-field',
  md: 'h-11 px-5 text-[0.95rem] rounded-field',
  lg: 'h-13 px-7 text-base rounded-[0.9rem]',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
  className?: string
  children?: ReactNode
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, leftIcon, rightIcon, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

interface LinkButtonProps extends CommonProps {
  to?: string
  href?: string
  external?: boolean
  onClick?: () => void
  'aria-label'?: string
}

/** Props for LinkButton from an editable link: internal page → router Link, http/tel/mailto → <a>. */
export function linkTarget(link: string, fallback = '/contact'): { to: string } | { href: string; external: boolean } {
  const l = link.trim()
  if (/^(https?:|tel:|mailto:)/i.test(l)) return { href: l, external: /^https?:/i.test(l) }
  return { to: l || fallback }
}

/** Same look as Button, rendered as a router Link (internal) or <a> (external/tel/mailto). */
export function LinkButton({ variant, size, leftIcon, rightIcon, className, children, to, href, external, ...rest }: LinkButtonProps) {
  const cls = buttonClass(variant, size, className)
  const content = (<>{leftIcon}{children}{rightIcon}</>)
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>
  return (
    <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {content}
    </a>
  )
}
