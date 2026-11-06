/**
 * Build-time prerender entry (Node). scripts/prerender.mjs renders every public route to
 * static HTML with the bundled seed content (src/data/seed), so the first paint needs no
 * JavaScript: faster FCP/LCP and full content for search engines. In the browser, main.tsx
 * then renders the same app over it.
 */
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router'
import type { Database } from '@/types'
import { AppProviders } from './App'
import { AppRoutes, PUBLIC_PAGES } from './routes/AppRoutes'
import { createQueryClient, seedSite } from './queries'
import { SeoCollectorContext, seoTags, type SeoTags } from './hooks/useSeo'
import { databaseFromSnapshot } from './services/api'

export const ROUTES = Object.keys(PUBLIC_PAGES)

/**
 * Public website data for the prerendered pages. With PRERENDER_API_URL (e.g. http://127.0.0.1:4000)
 * the live published data is read from the API, so the HTML matches what visitors get and React
 * hydrates it. Without it, the bundled original content is used (the page is then re-rendered on load).
 */
export async function seedData(): Promise<{ data: Partial<Database>; version: string }> {
  const apiUrl = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PRERENDER_API_URL
  if (apiUrl) {
    const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/site`)
    if (!res.ok) throw new Error(`PRERENDER_API_URL: GET /api/site failed (${res.status})`)
    const { version, ...data } = (await res.json()) as { version: string } & Partial<Database>
    return { version, data }
  }
  // No API at build time: the original website content (src/data/seed). The page is re-rendered on load.
  const [{ default: site }, { seedCompanies }, { withContentDefaults }, { normalizePricingPlan, normalizeCapacityPlan }] = await Promise.all([
    import('./data/seed/site-data.json'), import('./data/seed/companies'), import('./data/settings-defaults'), import('./lib/schemas'),
  ])
  const d = (site as unknown as { data: Record<string, unknown[]> & { content: unknown } }).data
  const pick = <T,>(list: unknown[]) => (list as Array<T & { status?: string }>).filter((x) => (x.status ?? 'published') === 'published')
  return {
    version: 'seed',
    data: {
      content: withContentDefaults(d.content as Database['content']),
      pricingPlans: pick<Database['pricingPlans'][number]>(d.pricingPlans).map(normalizePricingPlan),
      capacityPlans: pick<Database['capacityPlans'][number]>(d.capacityPlans).map(normalizeCapacityPlan),
      services: pick(d.services), projects: pick(d.projects), testimonials: pick(d.testimonials), faqs: pick(d.faqs),
      heroSlides: pick(d.heroSlides), gallery: pick(d.gallery), companies: seedCompanies,
    } as unknown as Partial<Database>,
  }
}

export async function render(url: string, data: Partial<Database>): Promise<{ html: string; seo: SeoTags }> {
  const db = await databaseFromSnapshot(data)
  const queryClient = createQueryClient()
  seedSite(queryClient, db)
  await PUBLIC_PAGES[url].preload()
  const seo: { tags: SeoTags | null } = { tags: null }
  const { prelude } = await prerender(
    <SeoCollectorContext value={seo}>
      <StaticRouter location={url}>
        <AppProviders queryClient={queryClient}>
          <AppRoutes />
        </AppProviders>
      </StaticRouter>
    </SeoCollectorContext>,
    // Never "outline" big Suspense boundaries into late-revealed chunks: emit the page inline,
    // so it paints in one go and hydrates against exactly this markup.
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  )
  const html = await new Response(prelude as unknown as ReadableStream).text()
  queryClient.clear() // drop cache timers so Node can exit
  return { html, seo: seo.tags ?? seoTags({ path: url }, db.content) }
}
