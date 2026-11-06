// SPA build: hosting rewrites send every URL to /spa.html (see vercel.json / public/_redirects).
import { copyFile } from 'node:fs/promises'
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/spa.html', import.meta.url))
console.log('✓ dist/spa.html written (single-page app build)')
