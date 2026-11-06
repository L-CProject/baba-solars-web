import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { existsSync } from 'node:fs'

/**
 * Pages are lazy-loaded, so normally the browser only discovers a page's chunk after the
 * main bundle has run (one extra round-trip before anything renders). This plugin writes a
 * tiny inline script into index.html that, based on the URL, starts downloading the right
 * page chunk (and its shared chunks) in parallel with the main bundle.
 */
const ROUTES: Record<string, string> = {
  '/': 'HomePage', '/about': 'AboutPage', '/services': 'ServicesPage', '/pricing': 'PricingPage', '/projects': 'ProjectsPage',
  '/faqs': 'FaqsPage', '/gallery': 'GalleryPage', '/contact': 'ContactPage', '/drone-cleaning': 'DroneCleaningPage', '/pm-surya-ghar': 'SuryaGharPage', '/calculator': 'CalculatorPage',
  '/offers': 'OffersPage',
}

function routePreload(): Plugin {
  return {
    name: 'route-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
        const entry = chunks.find((c) => c.isEntry)
        const loaded = new Set<string>()
        const walk = (file: string, out: Set<string>) => {
          const c = chunks.find((x) => x.fileName === file)
          if (!c || out.has(file)) return
          out.add(file)
          c.imports.forEach((f) => walk(f, out))
        }
        if (entry) walk(entry.fileName, loaded)
        const map: Record<string, string[]> = {}
        for (const [path, page] of Object.entries(ROUTES)) {
          const chunk = chunks.find((c) => c.facadeModuleId?.endsWith(`/pages/public/${page}.tsx`))
          if (!chunk) continue
          const files = new Set<string>()
          walk(chunk.fileName, files)
          map[path] = [...files].filter((f) => !loaded.has(f)).map((f) => '/' + f)
        }
        const script = `<script>(function(){var m=${JSON.stringify(map)};var p=location.pathname.replace(/\\/+$/,'')||'/';(m[p]||[]).forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.href=h;document.head.appendChild(l)})})()</script>`
        return html.replace('</title>', `</title>\n    ${script}`)
      },
    },
  }
}

/** `vite preview` behaves like the production hosts: prerendered pages as files (build:ssg), everything else → spa.html. */
function previewRewrites(): Plugin {
  return {
    name: 'preview-rewrites',
    configurePreviewServer(server) {
      const dist = fileURLToPath(new URL('./dist', import.meta.url))
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url ?? '/').split('?')
        const clean = path.replace(/\/+$/, '') || '/'
        if (/^\/(api|uploads)(\/|$)/.test(clean)) return next()
        if (!/\.[a-z0-9]+$/i.test(clean)) {
          const page = clean === '/' ? '/index.html' : `${clean}/index.html`
          const target = clean in ROUTES && existsSync(dist + page) ? page : '/spa.html'
          req.url = target + (query ? `?${query}` : '')
        }
        next()
      })
    },
  }
}

const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000'
const apiProxy = { '/api': { target: API_TARGET, changeOrigin: false }, '/uploads': { target: API_TARGET, changeOrigin: false } }

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss(), routePreload(), previewRewrites()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The prerender bundle (scripts/prerender.mjs) does not need a copy of /public.
  build: isSsrBuild
    ? { copyPublicDir: false }
    : {
        // PDF/Excel libraries are large but load only when an admin generates a document.
        chunkSizeWarningLimit: 1000,
        rolldownOptions: {
          output: {
            // React + TanStack Query in their own long-cached chunk: app updates don't re-download them.
            codeSplitting: {
              groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|@tanstack)[\\/]/, priority: 10 }],
            },
          },
        },
      },
  // Development / preview: the API (server/, port 4000) is reached through the same origin, like Nginx does in production.
  server: { host: true, port: 5173, proxy: apiProxy },
  preview: { proxy: apiProxy },
}))
