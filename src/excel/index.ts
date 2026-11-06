import { PROPERTY_LABEL } from '@/lib/labels'
/**
 * Excel (.xlsx) quotations and invoices — generated in the browser with ExcelJS (loaded on demand,
 * admin panel only). Same figures as the PDFs: line items, GST split, totals, subsidy breakdown
 * (total system cost, central, state, net payable) and the amount in words.
 */
import type ExcelJSNS from 'exceljs'
import type { Invoice, LineItem, Quotation } from '@/types'
import type { DocCtx } from '@/pdf/business'
import { computeTotals, type Totals } from '@/lib/totals'
import { csvSafe } from '@/lib/csv'
import { QUALITY_LABEL } from '@/lib/pricing'
import { amountInWords } from '@/pdf/words'

type Workbook = ExcelJSNS.Workbook
type Worksheet = ExcelJSNS.Worksheet

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
/** Indian digit grouping (₹1,08,000.00). Amounts are never negative — deductions are labelled "Less:". */
const INR = '[>=10000000]"₹"##\\,##\\,##\\,##0.00;[>=100000]"₹"##\\,##\\,##0.00;"₹"#,##0.00'
const NAVY = 'FF0F2F57'
const SUN = 'FFFFB81C'
const LEAF = 'FF17733A'
const TINT = 'FFF3F6FA'
const LEAF_BG = 'FFE2F5E7'
const LAST_COL = 12 // A..L

const SYSTEM: Record<string, string> = { 'on-grid': 'On-grid (net-metered)', hybrid: 'Hybrid (grid + battery)', 'off-grid': 'Off-grid (battery)' }
const PROPERTY: Record<string, string> = PROPERTY_LABEL

async function excel() {
  const mod = (await import('exceljs')) as unknown as { default?: typeof ExcelJSNS } & typeof ExcelJSNS
  return mod.default ?? mod
}

/** Text cell value: never a formula, never undefined. */
const t = (v: unknown) => csvSafe(v == null ? '' : String(v))
const thin = { style: 'thin' as const, color: { argb: 'FFDFE4EA' } }

function setupSheet(ws: Worksheet) {
  ws.columns = [
    { width: 6 }, { width: 34 }, { width: 26 }, { width: 10 }, { width: 8 }, { width: 8 },
    { width: 14 }, { width: 8 }, { width: 15 }, { width: 8 }, { width: 13 }, { width: 16 },
  ]
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } }
  ws.views = [{ showGridLines: false }]
}

function mergeRow(ws: Worksheet, r: number, value: string, opts: { bold?: boolean; size?: number; color?: string; fill?: string; align?: 'left' | 'right' | 'center' } = {}) {
  ws.mergeCells(r, 1, r, LAST_COL)
  const c = ws.getCell(r, 1)
  c.value = t(value)
  c.font = { name: 'Calibri', bold: opts.bold, size: opts.size ?? 10, color: { argb: opts.color ?? 'FF1D2733' } }
  c.alignment = { horizontal: opts.align ?? 'left', vertical: 'middle', wrapText: true }
  if (opts.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
  return r + 1
}

function header(ws: Worksheet, ctx: DocCtx, title: string, meta: Array<[string, string]>) {
  const b = ctx.business
  let r = 1
  r = mergeRow(ws, r, b.tradeName || b.legalName, { bold: true, size: 18, color: NAVY })
  ws.getRow(1).height = 26
  r = mergeRow(ws, r, [b.address, b.city, b.state && `${b.state}${b.pincode ? ` – ${b.pincode}` : ''}`].filter(Boolean).join(', '), { color: 'FF6B7785' })
  r = mergeRow(ws, r, [b.gstin && `GSTIN: ${b.gstin}`, b.phone && `Phone: ${b.phone}`, b.email && `Email: ${b.email}`, b.website].filter(Boolean).join('   ·   '), { color: 'FF6B7785' })
  if (b.mnreRegistration) r = mergeRow(ws, r, b.mnreRegistration, { color: 'FF6B7785' })
  ws.mergeCells(r, 1, r, LAST_COL)
  ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUN } }
  ws.getRow(r).height = 4
  r += 2
  r = mergeRow(ws, r, title.toUpperCase(), { bold: true, size: 16, color: NAVY })
  for (const [k, v] of meta) {
    ws.getCell(r, 1).value = t(k)
    ws.mergeCells(r, 1, r, 2)
    ws.getCell(r, 1).font = { bold: true, color: { argb: 'FF6B7785' } }
    ws.getCell(r, 3).value = t(v)
    ws.mergeCells(r, 3, r, 6)
    r++
  }
  return r + 1
}

function block(ws: Worksheet, r: number, title: string, rows: Array<[string, string | number | null | undefined]>) {
  r = mergeRow(ws, r, title, { bold: true, size: 11, color: 'FFFFFFFF', fill: NAVY })
  for (const [k, v] of rows) {
    if (v === '' || v == null) continue
    ws.getCell(r, 1).value = t(k)
    ws.mergeCells(r, 1, r, 2)
    ws.getCell(r, 1).font = { color: { argb: 'FF6B7785' } }
    ws.mergeCells(r, 3, r, LAST_COL)
    const c = ws.getCell(r, 3)
    c.value = typeof v === 'number' ? v : t(v)
    c.alignment = { horizontal: 'left', wrapText: true }
    r++
  }
  return r + 1
}

function itemsTable(ws: Worksheet, r: number, items: LineItem[], totals: Totals) {
  const head = ['#', 'Item', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc %', 'Taxable value', 'GST %', 'GST', 'Amount']
  const hr = ws.getRow(r)
  head.forEach((h, i) => {
    const c = hr.getCell(i + 1)
    c.value = h
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    c.alignment = { horizontal: i >= 4 ? 'right' : 'left', vertical: 'middle', wrapText: true }
  })
  hr.height = 20
  r++
  items.forEach((it, i) => {
    const l = totals.lines[i]
    const row = ws.getRow(r)
    row.values = [i + 1, t(it.name), t(it.description), t(it.hsn), Number(it.quantity), t(it.unit), Number(it.rate), Number(it.discountPct) || 0, l.taxable, Number(it.gstRate), l.tax, l.total]
    for (const col of [7, 9, 11, 12]) row.getCell(col).numFmt = INR
    for (let col = 1; col <= LAST_COL; col++) {
      const c = row.getCell(col)
      c.border = { bottom: thin }
      c.alignment = { vertical: 'top', wrapText: col <= 3, horizontal: col >= 5 ? 'right' : 'left' }
      if (i % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TINT } }
    }
    r++
  })
  return r + 1
}

/** Label in I:K, amount in L. */
function totalRow(ws: Worksheet, r: number, label: string, value: number, opts: { bold?: boolean; color?: string; fill?: string } = {}) {
  ws.mergeCells(r, 8, r, 11)
  const lc = ws.getCell(r, 8)
  lc.value = t(label)
  lc.alignment = { horizontal: 'right' }
  lc.font = { bold: opts.bold, color: { argb: opts.color ?? 'FF1D2733' }, size: opts.bold ? 12 : 10 }
  const vc = ws.getCell(r, 12)
  vc.value = Math.round(value * 100) / 100
  vc.numFmt = INR
  vc.font = { bold: opts.bold, color: { argb: opts.color ?? 'FF1D2733' }, size: opts.bold ? 12 : 10 }
  if (opts.fill) for (let c = 8; c <= 12; c++) ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
  return r + 1
}

function totalsBlock(ws: Worksheet, r: number, totals: Totals, intra: boolean, grandLabel: string) {
  r = totalRow(ws, r, 'Sub total', totals.subtotal)
  const disc = totals.itemDiscount + totals.overallDiscount
  if (disc > 0) r = totalRow(ws, r, 'Less: Discount', disc, { color: LEAF })
  r = totalRow(ws, r, 'Taxable value', totals.taxableAmount)
  if (intra) { r = totalRow(ws, r, 'CGST', totals.cgst); r = totalRow(ws, r, 'SGST', totals.sgst) }
  else r = totalRow(ws, r, 'IGST', totals.igst)
  if (totals.roundOff) r = totalRow(ws, r, 'Round off', totals.roundOff)
  r = totalRow(ws, r, grandLabel, totals.grandTotal, { bold: true, color: NAVY, fill: TINT })
  return r
}

function subsidyBlock(ws: Worksheet, r: number, d: { systemCost: number; central: number; state: number; stateScheme?: string | null; netLabel: string; note: string }) {
  r = mergeRow(ws, r + 1, 'SUBSIDY BREAKDOWN', { bold: true, size: 11, color: 'FFFFFFFF', fill: LEAF })
  r = totalRow(ws, r, 'Total system cost (incl. GST)', d.systemCost)
  r = totalRow(ws, r, 'Less: Central subsidy — PM Surya Ghar CFA (MNRE)', d.central, { color: LEAF })
  r = totalRow(ws, r, `Less: State subsidy${d.stateScheme ? ` — ${d.stateScheme}` : ''}`, d.state, { color: LEAF })
  r = totalRow(ws, r, 'Total subsidy', d.central + d.state, { color: LEAF })
  r = totalRow(ws, r, d.netLabel, Math.max(0, d.systemCost - d.central - d.state), { bold: true, color: NAVY, fill: LEAF_BG })
  return mergeRow(ws, r, d.note, { color: 'FF6B7785', size: 9 }) + 1
}

function words(ws: Worksheet, r: number, amount: number) {
  r = mergeRow(ws, r + 1, 'Amount in words', { bold: true, color: 'FF6B7785' })
  return mergeRow(ws, r, amountInWords(amount), { bold: true })
}

function lines(ws: Worksheet, r: number, title: string, text?: string | null) {
  const list = (text ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
  if (!list.length) return r
  r = mergeRow(ws, r + 1, title, { bold: true, size: 11, color: NAVY })
  list.forEach((x, i) => { r = mergeRow(ws, r, `${i + 1}. ${x}`, { size: 9 }) })
  return r
}

function signature(ws: Worksheet, r: number, ctx: DocCtx) {
  r += 2
  r = mergeRow(ws, r, `For ${ctx.business.legalName}`, { bold: true, align: 'right' })
  r += 2
  return mergeRow(ws, r, [ctx.business.signatoryName, ctx.business.signatoryTitle || 'Authorised Signatory'].filter(Boolean).join(' · '), { align: 'right', color: 'FF6B7785' })
}

async function finish(wb: Workbook): Promise<Blob> {
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf as ArrayBuffer], { type: XLSX_MIME })
}

async function newBook(ctx: DocCtx, title: string) {
  const ExcelJS = await excel()
  const wb = new ExcelJS.Workbook()
  wb.creator = ctx.business.tradeName || ctx.business.legalName
  wb.company = ctx.business.legalName
  wb.title = title
  wb.created = new Date()
  return wb
}

// ─── Quotation ──────────────────────────────────────────────────────────────
export async function quotationXlsx(q: Quotation, ctx: DocCtx): Promise<Blob> {
  const wb = await newBook(ctx, `Quotation ${q.quoteNumber ?? ''} – ${q.customerName}`)
  const ws = wb.addWorksheet('Quotation', { properties: { tabColor: { argb: NAVY } } })
  setupSheet(ws)
  const items = q.items ?? []
  const intra = (q.supplyType ?? 'intra') === 'intra'
  const totals = computeTotals(items, { supplyType: q.supplyType ?? 'intra', discountType: 'amount', discountValue: q.discount ?? 0, roundOff: true })
  let r = header(ws, ctx, 'Quotation', [
    ['Quotation no.', q.quoteNumber ?? 'DRAFT'],
    ['Date', q.quoteDate ?? ''],
    ['Valid until', q.validUntil ?? ''],
  ])
  r = block(ws, r, 'CUSTOMER', [
    ['Name', q.customerName], ['Mobile', q.phone], ['Email', q.email], ['Address', q.address],
    ['City / State', [q.city, q.state].filter(Boolean).join(', ')], ['GSTIN', q.gstin],
    ['Consumer no.', q.consumerNumber], ['DISCOM', q.discom], ['Sanctioned load', q.sanctionedLoadKw ? `${q.sanctionedLoadKw} kW` : ''],
  ])
  r = block(ws, r, 'PROPOSED SYSTEM', [
    ['System capacity', `${q.capacityKw} kWp`],
    ['Brand / quality', q.company ? `${q.company.name}${q.quality ? ` · ${QUALITY_LABEL[q.quality]}` : ''}` : ''],
    ['Panels', q.company ? `${q.company.panelWattage} Wp ${q.company.panelTechnology}${q.company.panelModel ? ` (${q.company.panelModel})` : ''}` : ''],
    ['Inverter', q.company ? [q.company.inverterBrand, q.company.inverterModel].filter(Boolean).join(' ') : ''],
    ['System type', SYSTEM[q.systemType] ?? q.systemType], ['Property', PROPERTY[q.propertyType] ?? q.propertyType],
    ['Expected generation', q.annualGenerationKwh ? `${q.annualGenerationKwh.toLocaleString('en-IN')} units / year` : ''],
  ])
  let grand = q.estimatedCost
  if (items.length) {
    r = itemsTable(ws, r, items, totals)
    r = totalsBlock(ws, r, totals, intra, 'Total (incl. GST)')
    grand = totals.grandTotal
  } else {
    r = mergeRow(ws, r, `Indicative price for a ${q.capacityKw} kWp system. A detailed bill of materials follows after the site survey.`, { color: 'FF6B7785' })
    r = totalRow(ws, r, 'Estimated system cost', q.estimatedCost, { bold: true, color: NAVY, fill: TINT })
  }
  if (ctx.business.quotation.showSubsidy && q.subsidy + (q.stateSubsidy ?? 0) > 0)
    r = subsidyBlock(ws, r, {
      systemCost: grand, central: q.subsidy, state: q.stateSubsidy ?? 0, stateScheme: q.stateSubsidyScheme, netLabel: 'Net payable after subsidy',
      note: 'Subsidy is credited by the Government to the customer’s bank account after installation, net-metering and inspection. The full system cost is paid to us; final subsidy is as per scheme rules at sanction.',
    })
  r = words(ws, r, grand)
  r = lines(ws, r, 'Payment terms', q.paymentTerms)
  r = lines(ws, r, 'Terms & conditions', q.terms)
  signature(ws, r, ctx)
  return finish(wb)
}

// ─── Invoice ────────────────────────────────────────────────────────────────
export async function invoiceXlsx(inv: Invoice, ctx: DocCtx): Promise<Blob> {
  const wb = await newBook(ctx, `${inv.documentTitle} ${inv.invoiceNumber} – ${inv.customerName}`)
  const ws = wb.addWorksheet('Invoice', { properties: { tabColor: { argb: NAVY } } })
  setupSheet(ws)
  const intra = inv.supplyType === 'intra'
  const totals = computeTotals(inv.items, { supplyType: inv.supplyType, discountType: inv.discountType, discountValue: inv.discountValue, roundOff: ctx.business.invoice.roundOff })
  let r = header(ws, ctx, inv.documentTitle || 'Tax Invoice', [
    ['Invoice no.', inv.invoiceNumber],
    ['Invoice date', inv.invoiceDate],
    ['Due date', inv.dueDate ?? ''],
    ['Place of supply', inv.placeOfSupply],
    ...(inv.reference ? [['Buyer’s ref.', inv.reference] as [string, string]] : []),
    ['Status', `${inv.status}${inv.status === 'issued' ? ` · ${inv.paymentStatus}` : ''}`],
  ])
  r = block(ws, r, 'BILL TO', [
    ['Name', inv.customerName], ['Mobile', inv.phone], ['Email', inv.email], ['Address', inv.address],
    ['City / State', [inv.city, inv.state && `${inv.state} (${inv.stateCode})`].filter(Boolean).join(', ')], ['GSTIN', inv.gstin],
  ])
  if (inv.subsidy?.show) r = block(ws, r, 'SYSTEM', [
    ['System capacity', `${inv.subsidy.capacityKw} kWp`], ['System type', SYSTEM[inv.subsidy.systemType]], ['Property', PROPERTY[inv.subsidy.propertyType]],
  ])
  r = itemsTable(ws, r, inv.items, totals)
  r = totalsBlock(ws, r, totals, intra, 'Grand total')
  if (inv.amountPaid > 0) {
    r = totalRow(ws, r, 'Less: Paid', inv.amountPaid, { color: LEAF })
    r = totalRow(ws, r, 'Balance due', inv.amountDue, { bold: true, color: inv.amountDue > 0 ? 'FFF39200' : LEAF })
  }
  if (inv.subsidy?.show && inv.subsidy.total > 0)
    r = subsidyBlock(ws, r, {
      systemCost: inv.grandTotal, central: inv.subsidy.central, state: inv.subsidy.state, stateScheme: inv.subsidy.stateScheme, netLabel: 'Net cost after subsidy',
      note: `The invoice amount is payable to ${ctx.business.legalName} in full. The subsidy is credited by the Government to the consumer’s bank account after commissioning and inspection.`,
    })
  r = words(ws, r, inv.grandTotal)
  if (inv.payments.length) {
    r = mergeRow(ws, r + 1, 'Payments received', { bold: true, size: 11, color: NAVY })
    for (const p of inv.payments) {
      ws.mergeCells(r, 1, r, 7)
      ws.getCell(r, 1).value = t(`${p.date} · ${p.method}${p.reference ? ` · ${p.reference}` : ''}`)
      const c = ws.getCell(r, 12)
      c.value = p.amount
      c.numFmt = INR
      r++
    }
  }
  const bank = ctx.business.bank
  if (bank.accountNumber) r = block(ws, r + 1, 'BANK DETAILS', [
    ['Account name', bank.accountName], ['Account no.', bank.accountNumber], ['IFSC', bank.ifsc], ['Bank / branch', [bank.bankName, bank.branch].filter(Boolean).join(', ')], ['UPI', bank.upiId],
  ])
  r = lines(ws, r, 'Notes', inv.notes)
  r = lines(ws, r, 'Terms', inv.terms)
  signature(ws, r, ctx)
  // A second sheet with the GST summary by rate, for the accountant.
  const g = wb.addWorksheet('GST summary')
  g.columns = [{ header: 'GST %', width: 10 }, { header: 'Taxable value', width: 18 }, { header: 'CGST', width: 14 }, { header: 'SGST', width: 14 }, { header: 'IGST', width: 14 }, { header: 'Total tax', width: 16 }]
  g.getRow(1).font = { bold: true }
  for (const b of totals.breakup) {
    const row = g.addRow([b.gstRate, b.taxable, b.cgst, b.sgst, b.igst, Math.round((b.cgst + b.sgst + b.igst) * 100) / 100])
    for (let c = 2; c <= 6; c++) row.getCell(c).numFmt = INR
  }
  return finish(wb)
}

// ─── Lists ──────────────────────────────────────────────────────────────────
export { readTableFile, parseCsv, tableXlsx } from './table'
import { tableXlsx } from './table'
import type { Enquiry } from '@/types'
import { CAPACITY_CHOICE_LABEL, ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, SOURCE_LABEL, enquiryTypeOf } from '@/lib/enquiries'

/** Enquiry list export — the same columns the import understands, so a file can be edited and re-imported. */
export function enquiriesXlsx(list: Enquiry[]): Promise<Blob> {
  return tableXlsx<Enquiry>('Enquiries', [
    { header: 'Date', width: 12, value: (e) => e.createdAt.slice(0, 10) },
    { header: 'Name', width: 24, value: (e) => e.name },
    { header: 'Mobile', width: 14, value: (e) => e.phone },
    { header: 'Email', width: 26, value: (e) => e.email },
    { header: 'Address', width: 30, value: (e) => e.address ?? '' },
    { header: 'City', width: 16, value: (e) => e.city },
    { header: 'State', width: 16, value: (e) => e.state ?? '' },
    { header: 'Requirement', width: 30, value: (e) => e.service },
    { header: 'Property type', width: 16, value: (e) => (e.propertyType ? PROPERTY_LABEL[e.propertyType] : '') },
    { header: 'Capacity (kW)', width: 14, value: (e) => e.capacityKw ?? (e.capacityChoice ? CAPACITY_CHOICE_LABEL[e.capacityChoice] : '') },
    { header: 'Monthly bill (₹)', width: 14, value: (e) => e.monthlyBill ?? '' },
    { header: 'Source', width: 22, value: (e) => SOURCE_LABEL[e.source] ?? e.source },
    { header: 'Status', width: 12, value: (e) => ENQUIRY_STATUS_LABEL[e.status] ?? e.status },
    { header: 'Follow-up', width: 12, value: (e) => e.followUpOn ?? '' },
    { header: 'Message', width: 40, value: (e) => e.message },
    { header: 'Notes', width: 40, value: (e) => e.notes ?? '' },
    { header: 'Home / Commercial', width: 14, value: (e) => { const t = enquiryTypeOf(e); return t ? ENQUIRY_TYPE_LABEL[t] : '' } },
    { header: 'Submission ID', width: 38, value: (e) => e.submissionId ?? '' },
  ], list)
}
