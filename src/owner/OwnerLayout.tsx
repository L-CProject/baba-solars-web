import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Inbox, LayoutDashboard, LogOut, Settings2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { LogoMark } from '@/components/layout/Logo'
import { PageLoader } from '@/components/layout/PageLoader'
import { cn } from '@/lib/cn'

/** Owner portal: lead monitoring only (no settings, prices, users or backups). */
export function OwnerLayout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const signOut = async () => { try { await logout() } finally { navigate('/owner/login', { replace: true }) } }
  const link = ({ isActive }: { isActive: boolean }) => cn('inline-flex items-center gap-2 rounded-field px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-navy-700 text-snow-50' : 'text-snow-300 hover:bg-navy-800 hover:text-snow-50')
  return (
    <div className="min-h-dvh bg-snow-100">
      <header className="sticky top-0 z-30 bg-navy-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <div><p className="font-display text-base leading-none text-snow-50">Baba Solars</p><p className="text-xs text-snow-300">Owner portal</p></div>
          </div>
          <nav aria-label="Owner" className="order-3 flex w-full gap-1 sm:order-none sm:ml-6 sm:w-auto">
            <NavLink to="/owner" end className={link}><LayoutDashboard className="size-4" aria-hidden />Dashboard</NavLink>
            <NavLink to="/owner/leads" className={link}><Inbox className="size-4" aria-hidden />All leads</NavLink>
            {can('leads:write') && <NavLink to="/admin/enquiries" className={link}><Settings2 className="size-4" aria-hidden />Admin panel</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-snow-300 sm:inline">{user?.name}</span>
            <button onClick={() => void signOut()} className="inline-flex items-center gap-1.5 rounded-field px-3 py-2 text-sm text-snow-300 hover:bg-navy-800 hover:text-snow-50"><LogOut className="size-4" aria-hidden />Log out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-8"><Suspense fallback={<PageLoader />}><Outlet /></Suspense></main>
    </div>
  )
}
