/**
 * Spreadsheet formula injection guard: text that starts with = + - @ (or tab / CR) is run as a
 * formula by Excel. Numbers stay numbers; such text gets a leading apostrophe.
 */
export function csvSafe(v: string | number | null | undefined): string {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  const s = String(v ?? '')
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}

/** Build and download a CSV file in the browser. */
export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v: string | number) => `"${csvSafe(v).replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
