import { COLORS, CW, PAGE, ensure, fillRect, font, inr, kv, text, type Doc } from './kit'

export interface SubsidyBoxData {
  systemCost: number
  central: number
  state: number
  stateScheme?: string | null
  /** Label of the last line, e.g. "Net payable after subsidy". */
  netLabel?: string
  /** Line under the heading. */
  note: string
}

/**
 * Subsidy breakdown printed on quotations and invoices: total system cost, central subsidy
 * (PM Surya Ghar CFA), state subsidy and the final amount after subsidy.
 */
export function subsidyBox(doc: Doc, y: number, d: SubsidyBoxData, mono = false): number {
  const L = PAGE.m
  const total = d.central + d.state
  const net = Math.max(0, d.systemCost - total)
  const accent = mono ? '#111111' : COLORS.leaf
  const rows = [
    { label: 'Total system cost (incl. GST)', value: inr(d.systemCost, 0) },
    { label: 'Central subsidy — PM Surya Ghar CFA (MNRE)', value: `– ${inr(d.central, 0)}`, color: accent },
    { label: `State subsidy${d.stateScheme ? ` — ${d.stateScheme}` : ''}`, value: d.state ? `– ${inr(d.state, 0)}` : inr(0, 0), color: accent },
    { label: 'Total subsidy', value: `– ${inr(total, 0)}`, color: accent },
    { label: d.netLabel ?? 'Net payable after subsidy', value: inr(net, 0), strong: true, color: mono ? '#111111' : COLORS.navy },
  ]
  const listW = 300
  font(doc, 'normal', 8, COLORS.ink)
  const noteH = (doc.splitTextToSize(d.note, CW - listW - 40) as string[]).length * 10 + 26
  const h = Math.max(rows.length * 13.8 + 34, noteH + 10)
  y = ensure(doc, y, h + 10)
  fillRect(doc, L, y, CW, h, mono ? '#f2f2f2' : COLORS.leafBg, 6)
  font(doc, 'bold', 10, accent)
  doc.text('Subsidy breakdown', L + 12, y + 9, { baseline: 'top' })
  font(doc, 'normal', 8, COLORS.ink)
  text(doc, d.note, L + 12, y + 25, { width: CW - listW - 40 })
  kv(doc, rows, L + CW - listW - 12, y + 10, listW, 8.2)
  return y + h + 10
}
