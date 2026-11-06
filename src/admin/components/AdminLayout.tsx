import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-m'
import { Boxes, Building2, UsersRound, ExternalLink, FilePen, FileText, FolderArchive, GalleryHorizontal, Gift, Image, Images, Inbox, LayoutDashboard, LogOut, Menu, MessageSquareQuote, ReceiptIndianRupee, Settings, SlidersHorizontal, Tag, Wrench, X } from 'lucide-react'
import type { Permission } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useIsFetching, useIsMutating, useQuery } from '@tanstack/react-query'
import { collectionQuery, useEnquiryStats } from '@/queries'
import { cn } from '@/lib/cn'
import { LogoMark } from '@/components/layout/Logo'
import { PageLoader } from '@/components/layout/PageLoader'
import { useToast } from '@/context/ToastContext'

interface NavItem { to: string; label: string; icon: typeof Inbox; end?: boolean; count?: number; permission?: Permission; group?: string }

function useNavItems(): NavItem[] {
  const { can } = useAuth()
  // Lead counts load in the background (no suspense) and only for roles that may see leads.
  const leadStats = useEnquiryStats(can('leads:read')).data
  const proposals = useQuery({ ...collectionQuery('proposals'), enabled: can('quotations:read') }).data ?? []
  const quotations = useQuery({ ...collectionQuery('quotations'), enabled: can('quotations:read') }).data ?? []
  const items: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, count: (leadStats?.new ?? 0) + (leadStats?.followUpsDue ?? 0), permission: 'leads:read', group: 'Sales' },
    { to: '/admin/proposals', label: 'Proposals', icon: FilePen, count: proposals.filter((p) => p.status === 'draft').length, permission: 'quotations:read', group: 'Sales' },
    { to: '/admin/quotations', label: 'Quotations', icon: FileText, count: quotations.filter((q) => q.status === 'pending').length, permission: 'quotations:read', group: 'Sales' },
    { to: '/admin/billing', label: 'Billing', icon: ReceiptIndianRupee, permission: 'invoices:read', group: 'Sales' },
    { to: '/admin/products', label: 'Products & rates', icon: Boxes, permission: 'invoices:read', group: 'Sales' },
    { to: '/admin/documents', label: 'Saved documents', icon: FolderArchive, permission: 'quotations:read', group: 'Sales' },
    { to: '/admin/companies', label: 'Companies & rates', icon: Building2, permission: 'companies:read', group: 'Sales' },
    { to: '/admin/offers', label: 'Offers', icon: Gift, permission: 'content:write', group: 'Website' },
    { to: '/admin/pricing', label: 'Pricing', icon: Tag, permission: 'content:write', group: 'Website' },
    { to: '/admin/services', label: 'Services', icon: Wrench, permission: 'content:write', group: 'Website' },
    { to: '/admin/slides', label: 'Banner slides', icon: GalleryHorizontal, permission: 'content:write', group: 'Website' },
    { to: '/admin/gallery', label: 'Gallery', icon: Images, permission: 'content:write', group: 'Website' },
    { to: '/admin/projects', label: 'Power plants', icon: Image, permission: 'content:write', group: 'Website' },
    { to: '/admin/reviews-faqs', label: 'Reviews & FAQs', icon: MessageSquareQuote, permission: 'content:write', group: 'Website' },
    { to: '/admin/content', label: 'Site content', icon: Settings, permission: 'content:write', group: 'Website' },
    { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal, permission: 'business:read', group: 'Setup' },
    { to: '/admin/team', label: 'Team & access', icon: UsersRound, permission: 'users:manage', group: 'Setup' },
  ]
  return items.filter((i) => !i.permission || can(i.permission))
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNavItems()
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end, count, group }, i) => (
        <li key={to}>
          {group && group !== items[i - 1]?.group && <p className="px-3 pb-1 pt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-snow-300/60">{group}</p>}
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn('flex items-center gap-3 rounded-field px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-navy-700 text-snow-50' : 'text-snow-300 hover:bg-navy-800 hover:text-snow-50')
            }
          >
            <Icon className="size-4.5" aria-hidden />
            <span className="flex-1">{label}</span>
            {!!count && <span className="rounded-chip bg-sun-400 px-2 text-xs font-bold text-navy-900">{count}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Small live status: "Saving…" while a mutation runs, "Syncing…" while data refetches. */
function SyncIndicator({ className }: { className?: string }) {
  const saving = useIsMutating()
  const fetching = useIsFetching({ queryKey: ['site'] }) + useIsFetching({ queryKey: ['admin'] })
  const label = saving ? 'Saving…' : fetching ? 'Syncing…' : 'All changes saved'
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted', className)}>
      <span className={cn('size-2 rounded-full', saving || fetching ? 'animate-pulse bg-sun-400' : 'bg-leaf-500')} aria-hidden />
      {label}
    </span>
  )
}

export function AdminLayout() {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const signOut = async () => {
    try {
      await logout()
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Sign-out could not be confirmed',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2.5 px-2 pb-4">
        <LogoMark className="size-9" />
        <div>
          <p className="font-display text-lg leading-none text-snow-50">Baba Solars</p>
          <p className="text-xs text-snow-300">Admin</p>
        </div>
      </div>
      <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><SidebarNav onNavigate={() => setOpen(false)} /></nav>
      <div className="mt-2 shrink-0 space-y-1 border-t border-navy-700 pt-3">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-field bg-transparent px-3 py-2 text-sm text-snow-300 transition-colors hover:bg-navy-800 hover:text-snow-50 active:bg-navy-800">
          <ExternalLink className="size-4" aria-hidden /> View website
        </a>
        <button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-field bg-transparent px-3 py-2 text-left text-sm text-snow-300 transition-colors hover:bg-navy-800 hover:text-snow-50 active:bg-navy-800">
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-snow-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 bg-navy-900 p-4 lg:block">{sidebarBody}</aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div className="absolute inset-0 bg-navy-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-navy-900 p-4 safe-bottom"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Admin menu"
            >
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-field p-2 text-snow-300" aria-label="Close menu"><X className="size-5" /></button>
              {sidebarBody}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-snow-100/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="-ml-1 rounded-field p-2" aria-label="Open admin menu"><Menu className="size-5" /></button>
          <span className="font-display text-lg">Admin</span>
          <SyncIndicator className="ml-auto" />
        </header>
        <div className="mx-auto hidden max-w-7xl justify-end px-8 pt-4 lg:flex"><SyncIndicator /></div>
        <main className="mx-auto max-w-7xl p-4 md:p-8 lg:ml-64">
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}