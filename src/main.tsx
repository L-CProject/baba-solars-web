import { StrictMode, startTransition } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
// Self-hosted fonts (no render-blocking request to Google Fonts). Latin subsets only.
import '@fontsource-variable/figtree/wght.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import './styles/index.css'

import { createQueryClient, prefetchSite } from './queries'
import { preloadRoute } from './routes/AppRoutes'
import { api } from './services/api'
import { startRetryQueue } from './services/enquiryIntegrations'

/**
 * Boot: load the live site data from the API (one GET /site request) and the page chunk for
 * this URL, THEN render. Prerendered pages stay on screen meanwhile and are replaced in one
 * step — no loading spinner. If the admin changed anything since the build, the fresh data
 * simply replaces the prerendered markup.
 */
async function boot() {
  const queryClient = createQueryClient()
  await Promise.allSettled([
    prefetchSite(queryClient),
    preloadRoute(window.location.pathname),
    import('./lib/motion-features'),
  ])
  const root = document.getElementById('root')!
  const app = (
    <StrictMode>
      <App queryClient={queryClient} />
    </StrictMode>
  )
  // Hydrate (reuse the prerendered DOM) only when this browser will render exactly the same
  // markup: the API data is the version the page was built with, and no URL parameters pre-fill forms.
  const html = document.documentElement
  const canHydrate = html.classList.contains('ssg') && root.hasChildNodes() && !window.location.search
    && !!html.dataset.published && html.dataset.published === (api.publishedVersion() ?? '')
  if (canHydrate) {
    html.dataset.render = 'hydrated'
    // As a transition, hydration yields to the browser in small slices (lower Total Blocking Time).
    startTransition(() => {
      hydrateRoot(root, app, {
        onRecoverableError: (error) => {
          html.dataset.render = 'hydration-fallback' // visible to tests; React re-rendered on the client
          if (import.meta.env.DEV) console.warn('Hydration fell back to client rendering:', error)
        },
      })
    })
  } else {
    html.dataset.render = 'client'
    root.replaceChildren()
    createRoot(root).render(app)
  }
}

void boot().finally(() => {
  // Website enquiries whose Google Sheet / email delivery failed earlier are retried now and when back online.
  startRetryQueue()
  // Website enquiries that could not reach the server earlier (offline) are sent now and when back online.
  const flush = () => { void api.flushEnquiryOutbox() }
  window.addEventListener('online', flush)
  window.setTimeout(flush, 1500)
})
