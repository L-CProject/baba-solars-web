import type { Proposal } from '@/types'
import { computeTotals } from '@/lib/totals'
import { QUALITY_LABEL } from '@/lib/pricing'
import { PROPERTY_LABEL } from '@/lib/labels'
import { PROPOSAL_STATUS_LABEL } from '@/lib/proposals'
import { COLORS, CW, PAGE, createDoc, drawLogo, ensure, fillRect, font, footers, inr, kv, num, paragraphs, table, text, toBlob, watermark, type Doc } from './kit'
import { docBusiness, footerLine, formatDate, type DocCtx } from './business'
import { amountInWords } from './words'

const L = PAGE.m
const SYSTEM: Record<string, string> = { 'on-grid': 'On-grid (net-metered)', hybrid: 'Hybrid (grid + battery)', 'off-grid': 'Off-grid (battery)' }
const ROOF: Record<string, string> = { rcc: 'RCC flat roof', tin: 'Tin / metal shed', ground: 'Ground mounted' }

function section(doc: Doc, y: number, title: string) {
  y = ensure(doc, y + 10, 40)
  fillRect(doc, L, y + 2, 3, 11, COLORS.sun)
  font(doc, 'bold', 10.5, COLORS.navy)
  doc.text(title, L + 9, y, { baseline: 'top' })
  return y + 18
}

/** Printable proposal (A4). Same totals engine as quotations and invoices. */
export async function proposalPdf(p: Proposal, ctx: DocCtx): Promise<Blob> {
  const b = await docBusiness(ctx)
  const doc = await createDoc(`Proposal ${p.proposalNumber}`, b.name)
  const top = PAGE.m

  // Header
  drawLogo(doc, b.logo, L, top, 150, 56)
  const rx = L + 200
  const rw = CW - 200
  font(doc, 'bold', 13, COLORS.navy)
  let y = text(doc, b.name, rx, top, { width: rw, align: 'right' })
  font(doc, 'normal', 7.8, COLORS.muted)
  for (const line of b.addressLines) y = text(doc, line, rx, y, { width: rw, align: 'right' })
  const contact = [b.phone, b.email].filter(Boolean).join('  ·  ')
  if (contact) y = text(doc, contact, rx, y, { width: rw, align: 'right' })
  if (b.gstin) { font(doc, 'medium', 7.8, COLORS.ink); y = text(doc, `GSTIN: ${b.gstin}`, rx, y, { width: rw, align: 'right' }) }
  y = Math.max(y, top + 62) + 10
  fillRect(doc, L, y, CW, 3, COLORS.navy)
  fillRect(doc, L, y, CW * 0.28, 3, COLORS.sun)
  const ty = y + 14
  font(doc, 'bold', 20, COLORS.navy)
  doc.text('PROPOSAL', L, ty, { baseline: 'top' })
  font(doc, 'normal', 9, COLORS.muted)
  doc.text(doc.splitTextToSize(p.title || 'Roof solar power plant proposal', CW - 230)[0], L, ty + 26, { baseline: 'top' })
  const mx = L + CW - 210
  fillRect(doc, mx, ty - 2, 210, 54, COLORS.tint, 6)
  ;([['Proposal no.', p.proposalNumber], ['Date', formatDate(p.proposalDate)], ['Valid until', formatDate(p.validUntil)]] as const).forEach(([k, v], i) => {
    font(doc, 'normal', 8.3, COLORS.muted)
    doc.text(k, mx + 10, ty + 5 + i * 15, { baseline: 'top' })
    font(doc, 'medium', 8.3, COLORS.ink)
    doc.text(String(v), mx + 200, ty + 5 + i * 15, { baseline: 'top', align: 'right' })
  })
  y = ty + 70

  // Customer + system
  const w = (CW - 12) / 2
  const box = (x: number, title: string, rows: Array<[string, string]>) => {
    const filled = rows.filter(([, v]) => v)
    const h = 22 + filled.length * 13 + 8
    fillRect(doc, x, y, w, h, COLORS.tint, 6)
    font(doc, 'bold', 8.5, COLORS.navy)
    doc.text(title, x + 10, y + 8, { baseline: 'top' })
    filled.forEach(([k, v], i) => {
      font(doc, 'normal', 8, COLORS.muted)
      doc.text(k, x + 10, y + 24 + i * 13, { baseline: 'top' })
      font(doc, 'medium', 8, COLORS.ink)
      doc.text(doc.splitTextToSize(v, w - 100)[0], x + 90, y + 24 + i * 13, { baseline: 'top' })
    })
    return h
  }
  const h1 = box(L, 'PREPARED FOR', [
    ['Name', p.customerName], ['Mobile', p.phone], ['Email', p.email],
    ['Address', [p.address, p.city, p.state].filter(Boolean).join(', ')], ['Consumer no.', p.consumerNumber], ['DISCOM', p.discom],
  ])
  const h2 = box(L + w + 12, 'PROPOSED SYSTEM', [
    ['Capacity', `${num(p.capacityKw)} kWp`], ['System', SYSTEM[p.systemType] ?? p.systemType], ['Property', PROPERTY_LABEL[p.propertyType]],
    ['Roof', ROOF[p.roofType] ?? p.roofType], ['Package', `${QUALITY_LABEL[p.quality]}${p.quality === 'premium' ? ' (incl. drone cleaning)' : ''}`],
    ['Generation', `~${num(p.annualGenerationKwh)} units / year`],
  ])
  y += Math.max(h1, h2) + 6

  // Scope
  if (p.scope.length) {
    y = section(doc, y, 'Scope of work')
    y = paragraphs(doc, p.scope.map((s) => `• ${s}`).join('\n'), L, y, CW)
  }

  // Items
  if (p.items.length) {
    y = section(doc, y, 'Products, materials & charges')
    const t = computeTotals(p.items, { supplyType: 'intra', discountType: 'amount', discountValue: p.discount, roundOff: true })
    y = table(doc, {
      startY: y,
      head: [['#', 'Item', 'Qty', 'Unit', 'Rate', 'GST', 'Amount']],
      body: p.items.map((it, i) => [
        String(i + 1),
        it.description ? `${it.name}\n${it.description}` : it.name,
        num(it.quantity), it.unit, inr(it.rate), `${it.gstRate}%`, inr(t.lines[i]?.total ?? 0),
      ]),
      headStyles: { fillColor: COLORS.navy, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: COLORS.tint },
      columnStyles: { 0: { cellWidth: 22 }, 2: { halign: 'right', cellWidth: 38 }, 3: { cellWidth: 38 }, 4: { halign: 'right', cellWidth: 70 }, 5: { halign: 'right', cellWidth: 36 }, 6: { halign: 'right', cellWidth: 78 } },
    }) + 10
  }

  // Price summary
  y = ensure(doc, y, 120)
  y = section(doc, y, 'Price summary')
  const rows: Array<{ label: string; value: string; strong?: boolean; color?: string }> = []
  if (p.items.length) {
    rows.push({ label: 'Taxable value', value: inr(p.taxableAmount) }, { label: 'GST', value: inr(p.taxTotal) })
    if (p.discount) rows.push({ label: 'Less: discount', value: inr(p.discount) })
  }
  rows.push({ label: p.items.length ? 'Total system cost (incl. GST)' : 'Indicative system cost', value: inr(p.grandTotal), strong: true })
  if (p.subsidy) rows.push({ label: 'Less: PM Surya Ghar central subsidy (est.)', value: inr(p.subsidy), color: COLORS.leaf })
  if (p.stateSubsidy) rows.push({ label: 'Less: state subsidy (est.)', value: inr(p.stateSubsidy), color: COLORS.leaf })
  if (p.subsidy + p.stateSubsidy) rows.push({ label: 'Effective cost after subsidy', value: inr(p.netCost), strong: true, color: COLORS.leaf })
  y = kv(doc, rows, L + CW / 2, y, CW / 2)
  font(doc, 'normal', 7.8, COLORS.muted)
  y = text(doc, `Amount in words: ${amountInWords(Math.round(p.grandTotal))}`, L, y + 2, { width: CW }) + 4
  if (p.subsidy + p.stateSubsidy) y = text(doc, 'Subsidy is credited by the Government to the customer’s bank account after commissioning and is subject to scheme rules.', L, y, { width: CW }) + 4

  if (p.paymentTerms) { y = section(doc, y, 'Payment terms'); y = paragraphs(doc, p.paymentTerms, L, y, CW, { numbered: true }) }
  if (p.terms) { y = section(doc, y, 'Terms & conditions'); y = paragraphs(doc, p.terms, L, y, CW, { numbered: true }) }
  if (p.notes) { y = section(doc, y, 'Notes'); y = paragraphs(doc, p.notes, L, y, CW) }

  y = ensure(doc, y + 20, 60)
  font(doc, 'normal', 8.3, COLORS.muted)
  doc.text(`This proposal is valid until ${formatDate(p.validUntil)}. A formal quotation follows on acceptance.`, L, y, { baseline: 'top' })
  font(doc, 'bold', 9, COLORS.ink)
  doc.text(`For ${b.name}`, PAGE.w - PAGE.m, y + 18, { baseline: 'top', align: 'right' })
  font(doc, 'normal', 8, COLORS.muted)
  doc.text(b.signatory, PAGE.w - PAGE.m, y + 46, { baseline: 'top', align: 'right' })

  if (p.status === 'rejected') watermark(doc, 'REJECTED', COLORS.clay)
  else if (p.proposalNumber === 'DRAFT' || p.status === 'draft') watermark(doc, 'DRAFT', COLORS.navy)
  footers(doc, `${footerLine(b)}  ·  ${PROPOSAL_STATUS_LABEL[p.status]}`)
  return toBlob(doc)
}
