import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Permission } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/layout/PageLoader'
import { EmptyState } from '@/components/ui'

/**
 * Route guard: checks the server session; optionally requires a permission.
 * `portal="owner"` is the owner portal (owner accounts only); `portal="admin"` is the admin panel (staff only).
 * A session for the other portal is sent to this portal's own login page.
 * The server enforces the same rules on every request — this only decides what to show.
 */
export function RequireAuth({ children, permission, portal = 'admin' }: { children: ReactNode; permission?: Permission; portal?: 'admin' | 'owner' }) {
  const { status, ensureSession, can, user } = useAuth()
  const location = useLocation()
  useEffect(() => { ensureSession() }, [ensureSession])
  if (status === 'idle' || status === 'checking') return <div className="min-h-dvh"><PageLoader label="Checking your session" /></div>
  if (status === 'anonymous') return <Navigate to={portal === 'owner' ? '/owner/login' : '/admin/login'} replace state={{ from: location.pathname + location.search }} />
  if (portal === 'admin' && user?.role === 'owner') return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  if (portal === 'owner' && user?.role !== 'owner') return <Navigate to="/owner/login" replace state={{ from: location.pathname + location.search }} />
  if (permission && !can(permission)) return <Forbidden />
  return <>{children}</>
}

/** Same check for a single admin page inside the layout. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth()
  return can(permission) ? <>{children}</> : <Forbidden />
}

function Forbidden() {
  return <EmptyState title="No access" message="Your role does not include this section. Ask an admin if you need it." className="mt-8" />
}
