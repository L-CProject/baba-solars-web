/**
 * End-to-end checks in a real browser against the running website + API + database.
 *
 *   1. API:      cd ../baba-solars-backend && npm run dev            (port 4000)
 *   2. Website:  npm run build && npx vite preview --port 4173        (proxies /api and /uploads to the API)
 *   3. Run:      E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_OWNER_EMAIL=… E2E_OWNER_PASSWORD=… node e2e/run.mjs
 *
 * Needs Playwright (`npm i -D playwright && npx playwright install chromium`, or a global install).
 * Optional: E2E_BASE_URL (default http://localhost:4173), E2E_SCREENSHOTS=dir to save screenshots.
 * Submits a few real test enquiries and uploads one gallery photo (saved as a hidden draft).
 */
import { createRequire } from 'node:module'
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }
const OWNER = { email: process.env.E2E_OWNER_EMAIL, password: process.env.E2E_OWNER_PASSWORD }
const SHOTS = process.env.E2E_SCREENSHOTS
if (!ADMIN.email || !ADMIN.password || !OWNER.email || !OWNER.password) {
  console.error('Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD.')
  process.exit(1)
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

// ─── tiny test runner ───────────────────────────────────────────────────────
const results = []
async function test(name, fn) {
  const t0 = Date.now()
  try { await fn(); results.push({ name, ok: true }); console.log(`  ✔ ${name} (${Date.now() - t0} ms)`) }
  catch (e) { results.push({ name, ok: false, error: e }); console.log(`  ✖ ${name}\n      ${String(e?.message ?? e).split('\n').slice(0, 4).join('\n      ')}`) }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }) }

// ─── test images (real PNGs) ───────────────────────────────────────────────
function crc32(buf) { let c, crc = ~0; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c } return ~crc >>> 0 }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]) }
function png(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { row[1 + x * 3] = (r + x) & 255; row[2 + x * 3] = g; row[3 + x * 3] = b }
  const raw = Buffer.concat(Array.from({ length: h }, () => row))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const tmp = mkdirSync(path.join(os.tmpdir(), `bs-e2e-${Date.now()}`), { recursive: true })
const file = (name, data) => { const p = path.join(tmp, name); writeFileSync(p, data); return p }
const IMG_A = file('solar-a.png', png(640, 400, [30, 110, 196]))
const IMG_B = file('solar-b.png', png(500, 500, [243, 146, 0]))
const TXT = file('notes.txt', 'not an image')
const BIG = file('huge.png', Buffer.concat([png(8, 8, [0, 0, 0]), Buffer.alloc(11 * 1024 * 1024)]))

// ─── helpers ───────────────────────────────────────────────────────────────
const noOverflow = async (page, label) => {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  assert(o.sw <= o.cw + 1, `${label}: horizontal overflow (${o.sw}px content in ${o.cw}px viewport)`)
}
async function login(page, who, portal) {
  await page.goto(`${BASE}/${portal}/login`)
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password', { exact: true }).fill(who.password)
  await page.getByRole('button', { name: /sign in/i }).click()
}
const api = (page, p) => page.evaluate(async (u) => { const r = await fetch(u, { credentials: 'include' }); return { status: r.status, body: await r.json().catch(() => null) } }, `/api${p}`)

const browser = await chromium.launch()
let uniq = Date.now() % 1e6

// ═══ CONTACT FORM ═════════════════════════════════════════════════════════════
for (const vp of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 900 }]) {
  console.log(`\nContact form (${vp.name} ${vp.width}px)`)
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  const popups = []
  const waRequests = []
  ctx.on('page', (p) => popups.push(p.url()))
  page.on('request', (r) => { if (/wa\.me|whatsapp\.com/.test(r.url())) waRequests.push(r.url()) })
  const posts = []
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/public/enquiries')) posts.push(r) })
  const form = () => page.getByRole('form', { name: 'Enquiry form' })
  const submit = () => form().getByRole('button', { name: /submit enquiry|try again/i }).click()
  const fresh = async () => { await page.goto(`${BASE}/contact`); await form().waitFor() }
  const thanks = () => page.getByRole('alertdialog', { name: 'Thank You!' })

  await test('page loads with no horizontal overflow', async () => {
    await fresh()
    await noOverflow(page, 'contact')
    await shot(page, `contact-${vp.name}`)
  })

  await test('both mobile and email empty → validation error, nothing sent', async () => {
    await fresh()
    const before = posts.length
    await submit()
    await page.getByText('Please provide a mobile number or an email address').first().waitFor()
    assert(posts.length === before, 'a request was sent')
    assert(!(await thanks().isVisible()), 'success popup shown')
  })

  await test('invalid mobile → error', async () => {
    await fresh()
    await form().getByLabel('Mobile number').fill('12345')
    await submit()
    await page.getByText(/valid 10-digit Indian mobile/i).waitFor()
  })

  await test('invalid email → error', async () => {
    await fresh()
    await form().getByLabel('Email').fill('person@nowhere')
    await submit()
    await page.getByText(/valid email address/i).waitFor()
  })

  await test('mobile only, all other fields empty → saved, Thank You popup, form reset', async () => {
    await fresh()
    await form().getByLabel('City or area').fill('')
    const phone = `98${String(++uniq).padStart(8, '0')}`
    await form().getByLabel('Mobile number').fill(phone)
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/public/enquiries')), submit()])
    assert(res.status() === 201, `API answered ${res.status()}`)
    const saved = await res.json()
    await thanks().waitFor()
    const text = await thanks().innerText()
    assert(text.includes('Thank You!') && text.includes('Your enquiry has been submitted successfully.') && text.includes('Our team will contact you soon.'), `popup text: ${text}`)
    assert(saved.phone === phone && saved.name === '' && saved.id.startsWith('enq-'), 'saved record mismatch')
    await shot(page, `contact-thanks-${vp.name}`)
    await thanks().getByRole('button', { name: 'Close', exact: true }).click()
    await thanks().waitFor({ state: 'hidden' })
    assert((await form().getByLabel('Mobile number').inputValue()) === '', 'form not reset')
    assert(page.url().endsWith('/contact'), `redirected to ${page.url()}`)
  })

  await test('email only → saved', async () => {
    await fresh()
    await form().getByLabel('Email').fill(`e2e${++uniq}@example.com`)
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/public/enquiries')), submit()])
    assert(res.status() === 201, `API answered ${res.status()}`)
    await thanks().waitFor()
    await page.keyboard.press('Escape')
    await thanks().waitFor({ state: 'hidden' })
  })

  await test('both + Home / Residential + 5 kW → stored as chosen', async () => {
    await fresh()
    await form().getByLabel('Full name').fill('E2E Home Customer')
    await form().getByLabel('Mobile number').fill(`97${String(++uniq).padStart(8, '0')}`)
    await form().getByLabel('Email').fill(`home${uniq}@example.com`)
    await form().getByText('Home / Residential').click()
    await form().getByText('5 kW', { exact: true }).click()
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/public/enquiries')), submit()])
    const body = await res.json()
    assert(res.status() === 201 && body.enquiryType === 'home' && body.capacityKw === 5, JSON.stringify(body))
    await thanks().waitFor()
    await thanks().getByRole('button', { name: 'Close', exact: true }).click()
  })

  await test('Commercial + Other / Custom 12 kW; only one type selectable', async () => {
    await fresh()
    await form().getByLabel('Mobile number').fill(`96${String(++uniq).padStart(8, '0')}`)
    await form().getByText('Home / Residential').click()
    await form().getByText('Commercial', { exact: true }).click()
    const checked = await form().locator('input[type=radio]:checked').evaluateAll((els) => els.map((e) => e.value))
    assert(checked.includes('commercial') && !checked.includes('home'), `checked: ${checked}`)
    await form().getByText('Other / Custom').click()
    await form().getByLabel(/Your capacity in kW/).fill('12')
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/public/enquiries')), submit()])
    const body = await res.json()
    assert(body.enquiryType === 'commercial' && body.capacityKw === 12, JSON.stringify(body))
    await thanks().waitFor()
    await thanks().getByRole('button', { name: 'Close', exact: true }).click()
  })

  await test('"Not sure yet" capacity is stored', async () => {
    await fresh()
    await form().getByLabel('Mobile number').fill(`95${String(++uniq).padStart(8, '0')}`)
    await form().getByText('Not sure yet').click()
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/public/enquiries')), submit()])
    const body = await res.json()
    assert(body.capacityChoice === 'not-sure' && body.capacityKw === null, JSON.stringify(body))
    await thanks().waitFor()
    await thanks().getByRole('button', { name: 'Close', exact: true }).click()
  })

  await test('API failure → real error shown, no success popup, details kept', async () => {
    await fresh()
    await page.route('**/api/public/enquiries', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' } }) }))
    await form().getByLabel('Mobile number').fill('9876500000')
    await submit()
    await page.getByText('Your enquiry was not submitted').waitFor()
    await page.getByText('Something went wrong on our side').waitFor()
    assert(!(await thanks().isVisible()), 'false success popup')
    assert((await form().getByLabel('Mobile number').inputValue()) === '9876500000', 'details were cleared')
    await page.unroute('**/api/public/enquiries')
  })

  await test('network failure → error shown, no success popup', async () => {
    await fresh()
    await page.route('**/api/public/enquiries', (r) => r.abort('connectionrefused'))
    await form().getByLabel('Email').fill('offline@example.com')
    await submit()
    await page.getByText(/Could not reach the server/).waitFor()
    assert(!(await thanks().isVisible()), 'false success popup')
    await page.unroute('**/api/public/enquiries')
    await page.evaluate(() => localStorage.clear())
  })

  await test('double click / Enter while submitting → one request', async () => {
    await fresh()
    let release
    const gate = new Promise((r) => { release = r })
    await page.route('**/api/public/enquiries', async (r) => { await gate; await r.continue() })
    await form().getByLabel('Mobile number').fill(`94${String(++uniq).padStart(8, '0')}`)
    const before = posts.length
    const btn = form().getByRole('button', { name: /submit enquiry/i })
    await btn.click()
    await btn.click({ force: true, timeout: 1000 }).catch(() => {})
    await form().getByLabel('Mobile number').press('Enter', { timeout: 1000 }).catch(() => {})
    assert(await form().getByRole('button', { name: /submitting/i }).isDisabled(), 'button not disabled while submitting')
    release()
    await thanks().waitFor()
    assert(posts.length - before === 1, `${posts.length - before} requests sent`)
    await page.unroute('**/api/public/enquiries')
    await thanks().getByRole('button', { name: 'Close', exact: true }).click()
  })

  await test('no WhatsApp / wa.me / new tab / redirect during any submission', async () => {
    assert(popups.length === 0, `new pages opened: ${popups.join(', ')}`)
    assert(waRequests.length === 0, `WhatsApp requests: ${waRequests.join(', ')}`)
  })
  await ctx.close()
}

// ═══ AUTH ═════════════════════════════════════════════════════════════════════
console.log('\nAuthentication')
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const page = await ctx.newPage()
  await test('admin login page shows nothing about the owner portal', async () => {
    await page.goto(`${BASE}/admin/login`)
    await page.getByRole('heading', { name: 'Sign in' }).waitFor()
    const text = await page.locator('body').innerText()
    assert(!/owner/i.test(text), `owner text found: ${text.match(/.{0,30}owner.{0,30}/i)?.[0]}`)
    const links = await page.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    assert(!links.some((h) => h?.includes('/owner')), 'link to /owner on admin login')
    await shot(page, 'admin-login')
  })
  await test('wrong password → generic error', async () => {
    await login(page, { email: ADMIN.email, password: 'definitely-wrong-1' }, 'admin')
    await page.getByText('Incorrect email or password.').waitFor()
  })
  await test('owner account on the admin login → same generic error (no owner wording)', async () => {
    await login(page, OWNER, 'admin')
    await page.getByText('Incorrect email or password.').waitFor()
    assert(!/owner/i.test(await page.locator('body').innerText()), 'owner wording shown')
  })
  await test('admin signs in → dashboard; no "Owner view" in navigation', async () => {
    await login(page, ADMIN, 'admin')
    await page.waitForURL(`${BASE}/admin`)
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor()
    assert(!(await page.getByText('Owner view').count()), 'Owner view link present')
  })
  await test('admin cannot open the owner portal (UI redirect + API 403)', async () => {
    const r = await api(page, '/owner/dashboard')
    assert(r.status === 403, `owner API answered ${r.status}`)
    await page.goto(`${BASE}/owner`)
    await page.waitForURL(/\/owner\/login/)
  })
  await test('logout ends the session', async () => {
    await page.goto(`${BASE}/admin`)
    await page.getByRole('button', { name: /sign out|log out/i }).first().click()
    await page.waitForURL(/\/admin\/login/)
    assert((await api(page, '/auth/me')).status === 401, 'still signed in')
    await page.goto(`${BASE}/admin/enquiries`)
    await page.waitForURL(/\/admin\/login/)
  })
  await test('owner signs in on the owner login → owner portal', async () => {
    await login(page, OWNER, 'owner')
    await page.waitForURL(`${BASE}/owner`)
    assert((await api(page, '/owner/dashboard')).status === 200, 'owner dashboard API')
    assert((await api(page, '/admin/dashboard/analytics')).status === 403, 'owner reached admin analytics')
  })
  await test('owner cannot open the admin panel', async () => {
    await page.goto(`${BASE}/admin`)
    await page.waitForURL(/\/admin\/login/)
  })
  await test('expired session → back to sign-in', async () => {
    await ctx.clearCookies()
    await page.goto(`${BASE}/owner`)
    await page.waitForURL(/\/owner\/login/)
  })
  await ctx.close()
}

// ═══ IMAGE UPLOAD ═════════════════════════════════════════════════════════════
console.log('\nAdmin image upload')
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    window.__urls = { created: 0, revoked: 0 }
    const c = URL.createObjectURL.bind(URL); const r = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (o) => { window.__urls.created++; return c(o) }
    URL.revokeObjectURL = (u) => { window.__urls.revoked++; return r(u) }
  })
  const page = await ctx.newPage()
  const uploads = []
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/uploads')) uploads.push(r.url()) })
  await login(page, ADMIN, 'admin')
  await page.waitForURL(`${BASE}/admin`)
  const caption = `E2E photo ${Date.now()}`
  const dialog = () => page.getByRole('dialog')
  const box = () => dialog().locator('img[alt="Photo preview"]')
  const fileInput = () => dialog().locator('input[type=file]')

  await test('select image → shown in the box immediately, before the upload finishes', async () => {
    await page.goto(`${BASE}/admin/gallery`)
    await page.getByRole('button', { name: 'Add photo' }).first().click()
    await dialog().waitFor()
    let release
    const gate = new Promise((r) => { release = r })
    await page.route('**/api/uploads', async (r) => { await gate; await r.continue() })
    await fileInput().setInputFiles(IMG_A)
    await box().waitFor()
    const src = await box().getAttribute('src')
    assert(src?.startsWith('blob:'), `preview src ${src}`)
    await dialog().getByText('Uploading…').waitFor()
    assert(!(await dialog().getByText('Uploaded', { exact: true }).isVisible()), 'success shown before server confirmed')
    await shot(page, 'upload-uploading')
    release()
    await dialog().getByText('Uploaded', { exact: true }).waitFor()
    await page.waitForFunction(() => document.querySelector('[role=dialog] img[alt="Photo preview"]')?.getAttribute('src')?.startsWith('/uploads/'))
    await page.unroute('**/api/uploads')
    await shot(page, 'upload-done')
  })
  await test('replace image → new local preview, then new server URL', async () => {
    const first = await box().getAttribute('src')
    await dialog().getByRole('button', { name: 'Replace Photo' }).click().catch(() => {})
    await fileInput().setInputFiles(IMG_B)
    await page.waitForFunction((prev) => { const s = document.querySelector('[role=dialog] img[alt="Photo preview"]')?.getAttribute('src'); return s && s !== prev && s.startsWith('/uploads/') }, first)
  })
  await test('remove image → empty upload box', async () => {
    await dialog().getByRole('button', { name: 'Remove Photo' }).click()
    await dialog().getByText('Click to choose an image').waitFor()
    assert(!(await box().count()), 'image still shown')
  })
  await test('invalid file type → error, not uploaded', async () => {
    const n = uploads.length
    await fileInput().setInputFiles(TXT)
    await dialog().getByText(/file type is not supported/i).waitFor()
    assert(uploads.length === n, 'invalid file was sent')
  })
  await test('oversized file → error, not uploaded', async () => {
    const n = uploads.length
    await fileInput().setInputFiles(BIG)
    await dialog().getByText(/must be 10 MB or smaller/i).waitFor()
    assert(uploads.length === n, 'oversized file was sent')
  })
  await test('upload failure → "Not uploaded" + error + Retry; field not changed', async () => {
    await page.route('**/api/uploads', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'internal', message: 'Storage is full.' } }) }))
    await fileInput().setInputFiles(IMG_A)
    await dialog().getByText('Storage is full.').waitFor()
    await dialog().getByText('Not uploaded').waitFor()
    assert((await box().getAttribute('src'))?.startsWith('blob:'), 'local preview should stay')
    await shot(page, 'upload-failed')
    await page.unroute('**/api/uploads')
    await dialog().getByRole('button', { name: 'Retry uploading Photo' }).click()
    await dialog().getByText('Uploaded', { exact: true }).waitFor()
  })
  await test('temporary object URLs are revoked', async () => {
    await page.waitForTimeout(500)
    const u = await page.evaluate(() => window.__urls)
    assert(u.created >= 3 && u.revoked >= u.created - 1, `created ${u.created}, revoked ${u.revoked}`)
  })
  await test('save → refresh → edit shows the stored image', async () => {
    await dialog().getByLabel('Caption').fill(caption)
    await dialog().getByText('Hidden', { exact: true }).click()
    await dialog().getByRole('button', { name: 'Add photo' }).click()
    await dialog().waitFor({ state: 'hidden' }).catch(async (e) => { await shot(page, 'gallery-save-failed'); throw e })
    await page.reload()
    await shot(page, 'gallery-after-reload')
    await page.getByRole('button', { name: `Edit photo ${caption}` }).click()
    await box().waitFor()
    const src = await box().getAttribute('src')
    assert(src?.startsWith('/uploads/'), `existing image src ${src}`)
    await page.waitForFunction(() => { const i = document.querySelector('[role=dialog] img[alt="Photo preview"]'); return i && i.complete && i.naturalWidth > 0 })
    await shot(page, 'upload-edit-existing')
    await page.keyboard.press('Escape')
    // Clean up the test photo.
    await page.getByRole('button', { name: `Delete photo ${caption}` }).click()
    await page.getByRole('button', { name: 'Delete photo' }).last().click()
  })
  await ctx.close()
}

// ═══ DASHBOARD ════════════════════════════════════════════════════════════════
console.log('\nDashboard')
for (const vp of [{ name: 'phone', width: 390, height: 844 }, { name: 'tablet', width: 820, height: 1180 }, { name: 'laptop', width: 1366, height: 900 }, { name: 'desktop', width: 1920, height: 1080 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  await login(page, ADMIN, 'admin')
  await page.waitForURL(`${BASE}/admin`)
  await test(`[${vp.name}] cards, charts and recent leads match the API; no overflow`, async () => {
    const r = await api(page, '/admin/dashboard/analytics?range=all')
    assert(r.status === 200, `analytics ${r.status}`)
    await page.getByText('Total enquiries').waitFor()
    await page.waitForFunction((n) => document.body.innerText.includes(new Intl.NumberFormat('en-IN').format(n)), r.body.cards.total)
    const rows = vp.width >= 768 ? await page.locator('table >> tbody tr').count() : await page.locator('section[aria-labelledby=recent-leads-title] li').count()
    assert(rows === Math.min(10, r.body.cards.total), `recent rows ${rows}`)
    await page.locator('.recharts-surface').first().waitFor()
    assert((await page.locator('.recharts-surface').count()) >= 3, 'charts missing')
    await page.waitForTimeout(700)
    await noOverflow(page, `dashboard ${vp.name}`)
    await shot(page, `dashboard-${vp.name}`)
  })
  if (vp.name === 'laptop') {
    await test('date filters update cards and URL', async () => {
      for (const [label, key] of [['Last 7 days', '7d'], ['Today', 'today'], ['This month', 'month'], ['Last 30 days', '30d']]) {
        const r = await api(page, `/admin/dashboard/analytics?range=${key}`)
        await page.getByRole('radio', { name: label }).click()
        await page.waitForURL(new RegExp(`range=${key}`))
        await page.waitForFunction(([n]) => document.querySelector('a[href="/admin/enquiries"] p.font-display')?.textContent?.replace(/,/g, '') === String(n), [r.body.cards.total])
      }
    })
    await test('custom range with no data → empty states', async () => {
      await page.goto(`${BASE}/admin?range=custom&from=2020-01-01&to=2020-01-31`)
      await page.getByText('No enquiries in this period yet.').first().waitFor()
      await shot(page, 'dashboard-empty')
    })
    await test('API failure → error message with Try again', async () => {
      await page.route('**/api/admin/dashboard/analytics**', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'internal', message: 'Database is unavailable.' } }) }))
      await page.goto(`${BASE}/admin?range=7d`)
      await page.getByText('Database is unavailable.').waitFor({ timeout: 15000 })
      await page.getByRole('button', { name: 'Try again' }).waitFor()
      await page.unroute('**/api/admin/dashboard/analytics**')
    })
    await test('View all → Enquiries page', async () => {
      await page.goto(`${BASE}/admin`)
      await page.locator('#recent-leads-title').waitFor()
      await page.locator('section[aria-labelledby=recent-leads-title]').getByRole('link', { name: 'View all' }).click()
      await page.waitForURL(`${BASE}/admin/enquiries`)
    })
  }
  await ctx.close()
}

// ═══ RESPONSIVE: public pages + admin modal ═══════════════════════════════════
console.log('\nResponsive layout')
for (const vp of [{ w: 360, h: 740 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
  const page = await ctx.newPage()
  await test(`${vp.w}px: home, contact, calculator, admin login have no horizontal overflow`, async () => {
    for (const p of ['/', '/contact', '/calculator', '/admin/login', '/owner/login']) {
      await page.goto(`${BASE}${p}`)
      await page.waitForLoadState('networkidle')
      await noOverflow(page, p)
    }
  })
  await ctx.close()
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} E2E checks passed`)
process.exit(failed.length ? 1 : 0)
