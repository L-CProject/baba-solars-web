/**
 * Writes static HTML for every public page into dist/ (run by `npm run build:ssg`).
 *   dist/index.html, dist/pricing/index.html, …   prerendered pages
 *   dist/spa.html                                  empty app shell for /admin and unknown URLs
 *
 * Content comes from the centralized mock seed (src/mocks/seed) — there is no backend yet.
 * Pages render the same app in the browser afterwards, so edits saved in the admin panel
 * (mock data in this browser) replace the prerendered markup.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import Beasties from 'beasties'

process.env.NODE_ENV = 'production'

const dist = new URL('../dist/', import.meta.url)
const ssrDir = new URL('../dist-ssr/', import.meta.url)
const { render, ROUTES, seedData } = await import(new URL('entry-prerender.js', ssrDir).href)

const template = await readFile(new URL('index.html', dist), 'utf8')
await writeFile(new URL('spa.html', dist), template)
const { data, version } = await seedData()

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/** A prerendered page paints without JavaScript: drop eager chunk preloads and lower the script priority. */
function deprioritiseJs(html) {
  return html
    .replace(/\s*<script>\(function\(\)\{var m=[\s\S]*?<\/script>/, '')
    .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
    .replace('<script type="module" crossorigin', '<script type="module" fetchpriority="low" crossorigin')
}

function inject(html, body, seo) {
  return deprioritiseJs(html)
    .replace('<html lang="en-IN">', `<html lang="en-IN" class="ssg" data-published="${esc(version)}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(seo.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(seo.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(seo.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(seo.description)}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(seo.image)}" />`)
    .replace('</head>', `  <meta property="og:url" content="${esc(seo.url)}" />\n    <meta name="robots" content="${seo.robots}" />\n    <link rel="canonical" href="${esc(seo.url)}" />\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

const beasties = new Beasties({
  path: fileURLToPath(dist), publicPath: '/', preload: 'swap', pruneSource: false,
  inlineFonts: false, preloadFonts: false, reduceInlineStyles: false, logLevel: 'warn', inlineThreshold: 120_000,
})

let count = 0
for (const route of ROUTES) {
  const { html, seo } = await render(route, data)
  const file = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`
  const out = new URL(file, dist)
  await mkdir(new URL('.', out), { recursive: true })
  await writeFile(out, await beasties.process(inject(template, html, seo)))
  count++
  console.log(`  prerendered ${route.padEnd(16)} → dist/${file} (${(html.length / 1024).toFixed(0)} KB)`)
}
await rm(ssrDir, { recursive: true, force: true })
console.log(`✓ ${count} pages prerendered, app shell at dist/spa.html`)
process.exit(0)
