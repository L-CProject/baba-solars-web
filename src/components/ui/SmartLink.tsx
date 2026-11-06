import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { linkTarget } from './Button'

/** Link for admin-editable URLs: internal paths use the router, external ones open in a new tab. */
export function SmartLink({ to, className, children, ...rest }: { to: string; className?: string; children: ReactNode; 'aria-label'?: string }) {
  const t = linkTarget(to, '/')
  if ('to' in t) return <Link to={t.to} className={className} {...rest}>{children}</Link>
  return <a href={t.href} className={className} {...(t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>{children}</a>
}
