import { jsPDF } from 'jspdf'
import autoTable, { type UserOptions } from 'jspdf-autotable'

/**
 * Small toolkit over jsPDF used by every document: Poppins fonts (they contain the ₹ glyph),
 * money formatting, logo loading, text blocks with page breaks, footers and watermarks.
 * Everything runs in the browser — no server needed.
 */
export const PAGE = { w: 595.28, h: 841.89, m: 40 }
export const CW = PAGE.w - PAGE.m * 2
export const FOOT = 34
export const COLORS = {
  navy: '#0f2f57', navyDark: '#061630', sun: '#ffb81c', sunDeep: '#f39200', leaf: '#17733a', leafBg: '#e2f5e7',
  clay: '#a52e1f', ink: '#1d2733', muted: '#6b7785', line: '#dfe4ea', tint: '#f3f6fa', ice: '#eaf2fb', border: '#b9c3cf',
}

let fonts: Record<string, string> | null = null
async function loadFonts() {
  if (fonts) return fonts
  const toB64 = async (url: string) => {
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return btoa(s)
  }
  const [r, m, b] = await Promise.all(['Regular', 'Medium', 'Bold'].map((w) => toB64(`/fonts/Poppins-${w}.ttf`)))
  fonts = { r, m, b }
  return fonts
}

export type Doc = jsPDF & { lastAutoTable?: { finalY: number } }

export async function createDoc(title: string, author: string): Promise<Doc> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true }) as Doc
  try {
    const f = await loadFonts()
    doc.addFileToVFS('Poppins-Regular.ttf', f.r); doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal')
    doc.addFileToVFS('Poppins-Medium.ttf', f.m); doc.addFont('Poppins-Medium.ttf', 'Poppins', 'medium')
    doc.addFileToVFS('Poppins-Bold.ttf', f.b); doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold')
    doc.setFont('Poppins', 'normal')
  } catch {
    doc.setFont('helvetica', 'normal') // fonts unavailable (offline): ₹ falls back to "Rs."
    useRupeeFallback = true
  }
  doc.setProperties({ title, author, creator: 'Baba Solars Admin', subject: title })
  doc.setFontSize(9)
  doc.setTextColor(COLORS.ink)
  return doc
}

let useRupeeFallback = false
const fmt2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const inr = (n: number, d = 2) => `${useRupeeFallback ? 'Rs. ' : '₹'}${(d ? fmt2 : fmt0).format(d ? n : Math.round(n))}`
export const num = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(n)
export const indian = (n: number) => fmt2.format(n)

export type Weight = 'normal' | 'medium' | 'bold'
export function font(doc: Doc, weight: Weight = 'normal', size = 9, color: string = COLORS.ink) {
  const family = doc.getFont().fontName === 'helvetica' ? 'helvetica' : 'Poppins'
  doc.setFont(family, family === 'helvetica' ? (weight === 'normal' ? 'normal' : 'bold') : weight)
  doc.setFontSize(size)
  doc.setTextColor(color)
}

/** Write wrapped text at (x, y) (top-left), returns the y after it. */
export function text(doc: Doc, str: string, x: number, y: number, opts: { width?: number; align?: 'left' | 'right' | 'center'; lineGap?: number } = {}) {
  const lines = opts.width ? (doc.splitTextToSize(str || '', opts.width) as string[]) : [str]
  const lh = doc.getFontSize() * (1.25 + (opts.lineGap ?? 0))
  const ax = opts.align === 'right' && opts.width ? x + opts.width : opts.align === 'center' && opts.width ? x + opts.width / 2 : x
  lines.forEach((l, i) => doc.text(l, ax, y + i * lh, { baseline: 'top', align: opts.align ?? 'left' }))
  return y + lines.length * lh
}
export const textHeight = (doc: Doc, str: string, width: number, lineGap = 0) => (doc.splitTextToSize(str || ' ', width) as string[]).length * doc.getFontSize() * (1.25 + lineGap)

export const bottomLimit = () => PAGE.h - PAGE.m - FOOT
/** New page if fewer than `need` points remain; returns the y to continue at. */
export function ensure(doc: Doc, y: number, need: number) {
  if (y + need > bottomLimit()) { doc.addPage(); return PAGE.m }
  return y
}

export function fillRect(doc: Doc, x: number, y: number, w: number, h: number, color: string, radius = 0) {
  doc.setFillColor(color)
  if (radius) doc.roundedRect(x, y, w, h, radius, radius, 'F')
  else doc.rect(x, y, w, h, 'F')
}
export function strokeRect(doc: Doc, x: number, y: number, w: number, h: number, color: string, width = 0.6) {
  doc.setDrawColor(color); doc.setLineWidth(width); doc.rect(x, y, w, h, 'S')
}
export function hline(doc: Doc, x1: number, x2: number, y: number, color: string = COLORS.line, width = 0.5) {
  doc.setDrawColor(color); doc.setLineWidth(width); doc.line(x1, y, x2, y)
}

/** Tables with page breaks and repeated headers (jspdf-autotable) in the document font. */
export function table(doc: Doc, opts: UserOptions) {
  const fam = doc.getFont().fontName === 'helvetica' ? 'helvetica' : 'Poppins'
  autoTable(doc, {
    margin: { left: PAGE.m, right: PAGE.m, bottom: PAGE.m + FOOT, top: PAGE.m },
    theme: 'plain',
    ...opts,
    styles: { font: fam, fontSize: 8.3, cellPadding: 4.5, textColor: COLORS.ink, lineColor: COLORS.line, overflow: 'linebreak', ...opts.styles },
    headStyles: { font: fam, fontStyle: fam === 'Poppins' ? 'bold' : 'bold', ...opts.headStyles },
  })
  return doc.lastAutoTable?.finalY ?? PAGE.m
}

// ─── Logo ────────────────────────────────────────────────────────────────
export interface LogoImage { data: string; format: 'PNG' | 'JPEG'; w: number; h: number }
const DEFAULT_LOGO = '/images/brand/logo-full.png'

async function toDataUrl(url: string): Promise<string | null> {
  if (url.startsWith('data:image/')) return url
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => resolve(null); r.readAsDataURL(blob) })
  } catch { return null }
}

/** Convert any image (webp, gif…) to PNG via canvas so jsPDF can embed it. */
async function normalise(dataUrl: string): Promise<LogoImage | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const scale = Math.min(1, 900 / Math.max(img.width, img.height))
      c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale))
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve({ data: c.toDataURL('image/png'), format: 'PNG', w: c.width, h: c.height })
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/** The business logo, or the built-in logo if the uploaded one cannot be read. */
export async function loadLogo(url?: string | null): Promise<LogoImage | null> {
  for (const candidate of [url, DEFAULT_LOGO]) {
    if (!candidate) continue
    const d = await toDataUrl(candidate)
    const img = d ? await normalise(d) : null
    if (img) return img
  }
  return null
}

export function drawLogo(doc: Doc, logo: LogoImage | null, x: number, y: number, maxW: number, maxH: number) {
  if (!logo) return 0
  const s = Math.min(maxW / logo.w, maxH / logo.h)
  try { doc.addImage(logo.data, logo.format, x, y, logo.w * s, logo.h * s); return logo.h * s } catch { return 0 }
}

// ─── Page furniture ────────────────────────────────────────────────────────
export function footers(doc: Doc, line: string) {
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    const y = PAGE.h - PAGE.m - 12
    hline(doc, PAGE.m, PAGE.w - PAGE.m, y - 6)
    font(doc, 'normal', 7.3, COLORS.muted)
    doc.text(line, PAGE.m, y, { baseline: 'top' })
    doc.text(`Page ${i} of ${n}`, PAGE.w - PAGE.m, y, { baseline: 'top', align: 'right' })
  }
}

export function watermark(doc: Doc, label: string, color: string) {
  doc.setPage(1)
  const gs = new (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 0.08 })
  doc.saveGraphicsState()
  ;(doc as unknown as { setGState: (g: unknown) => void }).setGState(gs)
  font(doc, 'bold', 88, color)
  doc.text(label, PAGE.w / 2, PAGE.h / 2 + 30, { align: 'center', angle: 30 })
  doc.restoreGraphicsState()
}

/** Numbered / bulleted paragraphs, page-breaking per line. */
export function paragraphs(doc: Doc, block: string, x: number, y: number, width: number, opts: { numbered?: boolean; size?: number } = {}) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  font(doc, 'normal', opts.size ?? 8.3, '#334150')
  lines.forEach((l, i) => {
    const label = opts.numbered && !/^(\d+[.)]|[-•*])\s/.test(l) ? `${i + 1}. ${l}` : l.replace(/^[-*]\s/, '• ')
    const h = textHeight(doc, label, width)
    y = ensure(doc, y, h + 2)
    y = text(doc, label, x, y, { width }) + 2
  })
  return y
}

export function kv(doc: Doc, rows: Array<{ label: string; value: string; strong?: boolean; color?: string }>, x: number, y: number, width: number, size = 8.8) {
  for (const r of rows) {
    font(doc, r.strong ? 'bold' : 'normal', r.strong ? size + 1.8 : size, r.color ?? COLORS.ink)
    doc.text(r.label, x, y, { baseline: 'top' })
    doc.text(r.value, x + width, y, { baseline: 'top', align: 'right' })
    y += r.strong ? size + 8 : size + 5
  }
  return y
}

export const toBlob = (doc: Doc) => doc.output('blob')
