/**
 * Plain table import/export (.xlsx and .csv) for admin lists: enquiries, products & rates.
 * ExcelJS is loaded on demand. Parsing is defensive: header row = first non-empty row, empty
 * rows are skipped, cell values (dates, rich text, formulas, hyperlinks) become plain strings.
 */
import type ExcelJSNS from 'exceljs'
import { csvSafe } from '@/lib/csv'

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const MAX_IMPORT_ROWS = 2000

export interface ParsedSheet {
  headers: string[]
  rows: string[][]
  /** Rows beyond MAX_IMPORT_ROWS that were left out. */
  truncated: number
}

async function excel() {
  const mod = (await import('exceljs')) as unknown as { default?: typeof ExcelJSNS } & typeof ExcelJSNS
  return mod.default ?? mod
}

function cellText(v: ExcelJSNS.CellValue): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    const o = v as unknown as Record<string, unknown>
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text: string }>).map((t) => t.text).join('')
    if ('result' in o) return cellText(o.result as ExcelJSNS.CellValue)
    if ('text' in o) return String(o.text)
    if ('error' in o) return ''
    return ''
  }
  return String(v)
}

/** RFC 4180 CSV parser (quotes, escaped quotes, CRLF/LF, BOM, comma or semicolon). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

function toSheet(matrix: string[][]): ParsedSheet {
  const clean = matrix.map((r) => r.map((c) => String(c ?? '').trim())).filter((r) => r.some((c) => c !== ''))
  if (!clean.length) return { headers: [], rows: [], truncated: 0 }
  const [head, ...body] = clean
  const width = Math.max(head.length, ...body.map((r) => r.length))
  const headers = Array.from({ length: width }, (_, i) => head[i] || `Column ${i + 1}`)
  const rows = body.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''))
  return { headers, rows: rows.slice(0, MAX_IMPORT_ROWS), truncated: Math.max(0, rows.length - MAX_IMPORT_ROWS) }
}

/** Read the first worksheet of an .xlsx file, or a .csv file. */
export async function readTableFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase()
  if (file.size > 10 * 1024 * 1024) throw new Error('The file is larger than 10 MB. Split it into smaller files.')
  if (name.endsWith('.csv') || file.type === 'text/csv') return toSheet(parseCsv(await file.text()))
  if (!name.endsWith('.xlsx')) throw new Error('Choose an Excel .xlsx file or a .csv file. Old .xls files: open in Excel and “Save as” .xlsx first.')
  const ExcelJS = await excel()
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new Error('This file could not be read as an Excel workbook.')
  }
  const ws = wb.worksheets[0]
  if (!ws) return { headers: [], rows: [], truncated: 0 }
  const matrix: string[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as ExcelJSNS.CellValue[]
    matrix.push(values.slice(1).map(cellText))
  })
  return toSheet(matrix)
}

export interface Column<T> {
  header: string
  width?: number
  value: (row: T) => string | number | null | undefined
}

/** One-sheet workbook with a bold, frozen header row and auto filter. */
export async function tableXlsx<T>(sheetName: string, columns: Column<T>[], rows: T[]): Promise<Blob> {
  const ExcelJS = await excel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Baba Solars Admin'
  wb.created = new Date()
  const ws = wb.addWorksheet(sheetName.slice(0, 31))
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width ?? 18 }))
  for (const r of rows) ws.addRow(columns.map((c) => { const v = c.value(r); return typeof v === 'number' ? v : csvSafe(v ?? '') }))
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2F57' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  if (columns.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf as ArrayBuffer], { type: XLSX_MIME })
}
