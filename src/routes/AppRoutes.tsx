import { lazy, type ComponentType } from 'react'
import { Route, Routes } from 'react-router'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { RequireAuth, RequirePermission } from '@/admin/components/RequireAuth'
import type { Permission } from '@/types'

/**
 * Code-split page that can be loaded BEFORE React renders (see preloadRoute). Once loaded
 * it renders synchronously, so a prerendered page is replaced without a loading flash.
 */
type PageModule = { default: ComponentType }
function lazyPage(factory: () => Promise<PageModule>) {
  let Loaded: ComponentType | null = null
  const load = () => factory().then((m) => { Loaded = m.default; return m })
  const Lazy = lazy(load)
  function Page() { return Loaded ? <Loaded /> : <Lazy /> }
  Page.preload = load
  return Page
}

// Public pages (code-split per route)
const HomePage = lazyPage(() => import('@/pages/public/HomePage'))
const AboutPage = lazyPage(() => import('@/pages/public/AboutPage'))
const ServicesPage = lazyPage(() => import('@/pages/public/ServicesPage'))
const PricingPage = lazyPage(() => import('@/pages/public/PricingPage'))
const ProjectsPage = lazyPage(() => import('@/pages/public/ProjectsPage'))
const FaqsPage = lazyPage(() => import('@/pages/public/FaqsPage'))
const GalleryPage = lazyPage(() => import('@/pages/public/GalleryPage'))
const ContactPage = lazyPage(() => import('@/pages/public/ContactPage'))
const DroneCleaningPage = lazyPage(() => import('@/pages/public/DroneCleaningPage'))
const SuryaGharPage = lazyPage(() => import('@/pages/public/SuryaGharPage'))
const CalculatorPage = lazyPage(() => import('@/pages/public/CalculatorPage'))
const OffersPage = lazyPage(() => import('@/pages/public/OffersPage'))
const NotFoundPage = lazyPage(() => import('@/pages/public/NotFoundPage'))

/** Public routes that are prerendered to static HTML at build time (scripts/prerender.mjs). */
export const PUBLIC_PAGES: Record<string, ReturnType<typeof lazyPage>> = {
  '/': HomePage, '/about': AboutPage, '/services': ServicesPage, '/pricing': PricingPage, '/projects': ProjectsPage,
  '/faqs': FaqsPage, '/gallery': GalleryPage, '/contact': ContactPage, '/drone-cleaning': DroneCleaningPage, '/pm-surya-ghar': SuryaGharPage, '/calculator': CalculatorPage,
  '/offers': OffersPage,
}

/** Start loading the page chunk for a URL; resolves when it can render without suspending. */
export function preloadRoute(pathname: string): Promise<unknown> {
  const path = pathname.replace(/\/+$/, '') || '/'
  const page = PUBLIC_PAGES[path] ?? (path.startsWith('/admin') || path.startsWith('/owner') ? null : NotFoundPage)
  return page ? page.preload() : Promise.resolve()
}

// Admin (separate chunks: visitors never download admin code)
const AdminLayout = lazy(() => import('@/admin/components/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const LoginPage = lazy(() => import('@/admin/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/admin/pages/DashboardPage'))
const PricingAdminPage = lazy(() => import('@/admin/pages/PricingAdminPage'))
const ServicesAdminPage = lazy(() => import('@/admin/pages/ServicesAdminPage'))
const ProjectsAdminPage = lazy(() => import('@/admin/pages/ProjectsAdminPage'))
const EnquiriesPage = lazy(() => import('@/admin/pages/EnquiriesPage'))
const ProposalsPage = lazy(() => import('@/admin/pages/ProposalsPage'))
const ProductsPage = lazy(() => import('@/admin/pages/ProductsPage'))
const QuotationsPage = lazy(() => import('@/admin/pages/QuotationsPage'))
const ContentPage = lazy(() => import('@/admin/pages/ContentPage'))
const SlidesAdminPage = lazy(() => import('@/admin/pages/SlidesAdminPage'))
const GalleryAdminPage = lazy(() => import('@/admin/pages/GalleryAdminPage'))
const BillingPage = lazy(() => import('@/admin/pages/BillingPage'))
const DocumentsPage = lazy(() => import('@/admin/pages/DocumentsPage'))
const CompaniesPage = lazy(() => import('@/admin/pages/CompaniesPage'))
const SettingsPage = lazy(() => import('@/admin/pages/SettingsPage'))
const ReviewsFaqsPage = lazy(() => import('@/admin/pages/ReviewsFaqsPage'))
const OffersAdminPage = lazy(() => import('@/admin/pages/OffersAdminPage'))
const TeamPage = lazy(() => import('@/admin/pages/TeamPage'))
// Owner portal (separate login; lead monitoring only)
const OwnerLayout = lazy(() => import('@/owner/OwnerLayout').then((m) => ({ default: m.OwnerLayout })))
const OwnerDashboardPage = lazy(() => import('@/owner/OwnerDashboardPage'))
const OwnerLeadsPage = lazy(() => import('@/owner/OwnerLeadsPage'))
const OwnerLoginPage = lazy(() => import('@/owner/OwnerLoginPage'))

const guard = (permission: Permission, el: React.ReactNode) => <RequirePermission permission={permission}>{el}</RequirePermission>

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="faqs" element={<FaqsPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="drone-cleaning" element={<DroneCleaningPage />} />
        <Route path="pm-surya-ghar" element={<SuryaGharPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="admin/login" element={<LoginPage />} />
      <Route path="owner/login" element={<OwnerLoginPage />} />
      <Route path="owner" element={<RequireAuth portal="owner"><OwnerLayout /></RequireAuth>}>
        <Route index element={<OwnerDashboardPage />} />
        <Route path="leads" element={<OwnerLeadsPage />} />
        <Route path="*" element={<OwnerDashboardPage />} />
      </Route>
      <Route path="admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="pricing" element={guard('content:write', <PricingAdminPage />)} />
        <Route path="services" element={guard('content:write', <ServicesAdminPage />)} />
        <Route path="projects" element={guard('content:write', <ProjectsAdminPage />)} />
        <Route path="enquiries" element={guard('leads:read', <EnquiriesPage />)} />
        <Route path="proposals" element={guard('quotations:read', <ProposalsPage />)} />
        <Route path="quotations" element={guard('quotations:read', <QuotationsPage />)} />
        <Route path="products" element={guard('invoices:read', <ProductsPage />)} />
        <Route path="billing" element={guard('invoices:read', <BillingPage />)} />
        <Route path="documents" element={guard('quotations:read', <DocumentsPage />)} />
        <Route path="companies" element={guard('companies:read', <CompaniesPage />)} />
        <Route path="offers" element={guard('content:write', <OffersAdminPage />)} />
        <Route path="content" element={guard('content:write', <ContentPage />)} />
        <Route path="slides" element={guard('content:write', <SlidesAdminPage />)} />
        <Route path="gallery" element={guard('content:write', <GalleryAdminPage />)} />
        <Route path="reviews-faqs" element={guard('content:write', <ReviewsFaqsPage />)} />
        <Route path="settings" element={guard('business:read', <SettingsPage />)} />
        <Route path="team" element={guard('users:manage', <TeamPage />)} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}
