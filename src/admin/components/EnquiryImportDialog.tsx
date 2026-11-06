import { useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, Copy, Download, FileSpreadsheet, Trash2 } from 'lucide-react'
import type { Enquiry, EnquirySource, EnquiryStatus } from '@/types'
import { useImportEnquiries } from '@/queries'
import { useToast } from '@/context/ToastContext'
import { downloadBlob } from '@/lib/files'
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, findDuplicates, validateEnquiry } from '@/lib/enquiries'
import { IMPORT_FIELDS, autoMap, convertRows, missingRequired, type ColumnMapping, type ImportRow } from '@/lib/enquiryImport'
import { Badge, Button, Modal, Toggle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { IconAction, Pagination } from './AdminUI'
import { errorMessage } from '../hooks/useCrud'

type Step = 'file' | 'map' | 'preview' | 'done'
type View = 'all' | 'errors' | 'duplicates' | 'ready'
const PAGE = 25

const cell = 'h-8 w-full min-w-[7rem] rounded-[0.45rem] border border-line bg-surface px-2 text-sm focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40'

/**
 * Excel / CSV import: choose file → match columns → review, edit or remove rows (errors and
 * possible duplicates flagged) → import → result with imported / failed counts.
 */
export function EnquiryImportDialog({ existing, onClose }: { existing: Enquiry[]; onClose: () => void }) {
  const toast = useToast()
  const imp = useImportEnquiries()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('file')
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [raw, setRaw] = useState<string[][]>([])
  const [truncated, setTruncated] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [skipDupes, setSkipDupes] = useState(true)
  const [view, setView] = useState<View>('all')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ imported: number; failed: Array<{ row: number; errors: string[] }>; skipped: number; invalid: number } | null>(null)

  const dupes = useMemo(() => new Map(findDuplicates(rows.map((r) => r.values as Enquiry), existing).map((d) => [d.index, d.reason])), [rows, existing])
  const hasErr = (r: ImportRow) => Object.keys(r.errors).length > 0
  const ready = rows.filter((r, i) => !hasErr(r) && !(skipDupes && dupes.has(i)))
  const errorCount = rows.filter(hasErr).length
  const visible = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => view === 'all' || (view === 'errors' ? hasErr(r) : view === 'duplicates' ? dupes.has(i) : !hasErr(r) && !(skipDupes && dupes.has(i))))
  const pages = Math.max(1, Math.ceil(visible.length / PAGE))
  const current = Math.min(page, pages)

  const readFile = async (file: File) => {
    setReading(true)
    setFileError('')
    try {
      const { readTableFile } = await import('@/excel/table')
      const sheet = await readTableFile(file)
      if (!sheet.headers.length || !sheet.rows.length) throw new Error('The file has no data rows. The first row must contain column names.')
      setFileName(file.name)
      setHeaders(sheet.headers)
      setRaw(sheet.rows)
      setTruncated(sheet.truncated)
      setMapping(autoMap(sheet.headers))
      setStep('map')
    } catch (e) {
      setFileError(errorMessage(e, 'This file could not be read.'))
    } finally {
      setReading(false)
    }
  }

  const downloadTemplate = async () => {
    const { tableXlsx } = await import('@/excel/table')
    const sample = [{ name: 'Ravi Verma', phone: '9876543210', email: 'ravi@example.com', address: 'Shankar Nagar', city: 'Raipur', state: 'Chhattisgarh', service: '3 kW roof solar', property: 'Residential', kw: 3, bill: 2500, source: 'WhatsApp', status: 'New', message: 'Wants subsidy details', date: '2026-10-28' }]
    const blob = await tableXlsx<(typeof sample)[number]>('Enquiries', [
      { header: 'Name', value: (r) => r.name }, { header: 'Mobile', value: (r) => r.phone }, { header: 'Email', value: (r) => r.email },
      { header: 'Address', value: (r) => r.address }, { header: 'City', value: (r) => r.city }, { header: 'State', value: (r) => r.state },
      { header: 'Requirement', value: (r) => r.service }, { header: 'Property type', value: (r) => r.property }, { header: 'Capacity (kW)', value: (r) => r.kw },
      { header: 'Monthly bill', value: (r) => r.bill }, { header: 'Source', value: (r) => r.source }, { header: 'Status', value: (r) => r.status },
      { header: 'Message', value: (r) => r.message }, { header: 'Date', value: (r) => r.date },
    ], sample)
    downloadBlob(blob, 'baba-solars-enquiry-import-template.xlsx')
  }

  const toPreview = () => {
    if (!mapping) return
    setRows(convertRows(raw, mapping))
    setPage(1)
    setView('all')
    setStep('preview')
  }

  const editRow = (index: number, patch: Partial<Enquiry>) =>
    setRows((list) => list.map((r, i) => {
      if (i !== index) return r
      const values = { ...r.values, ...patch }
      // Keep conversion errors for fields the admin did not touch (e.g. an unreadable date).
      const kept = Object.fromEntries(Object.entries(r.errors).filter(([k]) => !(k in patch) && !(k in validateEnquiry(r.values))))
      return { ...r, values, errors: { ...kept, ...validateEnquiry(values) } }
    }))
  const removeRow = (index: number) => setRows((list) => list.filter((_, i) => i !== index))

  const runImport = async () => {
    const payload = ready.map((r) => r.values)
    if (!payload.length) return
    try {
      const res = await imp.mutateAsync(payload)
      setResult({ imported: res.imported, failed: res.failed, skipped: skipDupes ? rows.filter((r, i) => !hasErr(r) && dupes.has(i)).length : 0, invalid: errorCount })
      setStep('done')
      toast({ title: `${res.imported} ${res.imported === 1 ? "enquiry" : "enquiries"} imported`, description: res.failed.length ? `${res.failed.length} rows failed validation.` : undefined })
    } catch (e) {
      toast({ tone: 'error', title: 'Import failed', description: errorMessage(e) })
    }
  }

  const footer =
    step === 'map' ? (
      <>
        <Button variant="secondary" onClick={() => setStep('file')}>Back</Button>
        <Button onClick={toPreview} disabled={!mapping || missingRequired(mapping).length > 0}>Preview {raw.length} rows</Button>
      </>
    ) : step === 'preview' ? (
      <>
        <Button variant="secondary" onClick={() => setStep('map')}>Back to columns</Button>
        <Button onClick={() => void runImport()} loading={imp.isPending} disabled={!ready.length}>Import {ready.length} {ready.length === 1 ? 'enquiry' : 'enquiries'}</Button>
      </>
    ) : step === 'done' ? (
      <Button onClick={onClose}>Done</Button>
    ) : (
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
    )

  return (
    <Modal open onClose={() => !imp.isPending && onClose()} title="Import enquiries" description={step === 'file' ? 'Excel (.xlsx) or CSV. The first row must contain column names.' : fileName} size="xl" footer={footer}>
      <ol className="mb-5 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Import steps">
        {(['file', 'map', 'preview', 'done'] as Step[]).map((s, i) => (
          <li key={s} className={cn('rounded-chip px-3 py-1', step === s ? 'bg-navy-700 text-snow-50' : 'bg-snow-200 text-muted')} aria-current={step === s ? 'step' : undefined}>
            {i + 1}. {{ file: 'Choose file', map: 'Match columns', preview: 'Review rows', done: 'Result' }[s]}
          </li>
        ))}
      </ol>

      {step === 'file' && (
        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void readFile(f) }}
            className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-steel-400/60 bg-snow-100 px-6 py-10 text-center hover:border-steel-500"
            disabled={reading}
          >
            <FileSpreadsheet className="size-10 text-steel-600" aria-hidden />
            <span className="font-semibold text-ink">{reading ? 'Reading file…' : 'Choose or drop an Excel / CSV file'}</span>
            <span className="text-sm text-muted">Up to 2,000 rows, 10 MB. Column names can differ — you match them next.</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" aria-label="Excel or CSV file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = '' }} />
          {fileError && <p role="alert" className="flex items-start gap-2 rounded-field bg-clay-100 p-3 text-sm text-clay-700"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{fileError}</p>}
          <Button variant="ghost" size="sm" leftIcon={<Download className="size-4" />} onClick={() => void downloadTemplate()} className="justify-self-start">Download a template</Button>
        </div>
      )}

      {step === 'map' && mapping && (
        <div className="grid gap-4">
          <p className="text-sm text-muted">We matched columns by name. Change any that are wrong; choose “Don’t import” to skip a field. <strong className="text-ink">Name, Mobile and Requirement</strong> are required.</p>
          {truncated > 0 && <p className="rounded-field bg-sun-300/30 p-3 text-sm text-navy-800">Only the first 2,000 rows will be imported; {truncated} more rows were left out. Split the file to import the rest.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_FIELDS.map((f) => {
              const idx = mapping[f.key]
              const sample = idx >= 0 ? raw.find((r) => r[idx])?.[idx] ?? '' : ''
              return (
                <label key={f.key} className="grid gap-1 text-sm">
                  <span className="font-semibold text-ink-soft">{f.label}{f.required && <span className="text-clay-700"> *</span>}</span>
                  <select value={idx} onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                    className={cn('h-10 rounded-field border bg-canvas px-2', f.required && idx < 0 ? 'border-clay-500' : 'border-line')}>
                    <option value={-1}>— Don’t import —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                  <span className="truncate text-xs text-muted">{sample ? `e.g. ${sample}` : idx >= 0 ? 'Column is empty' : ' '}</span>
                </label>
              )
            })}
          </div>
          {missingRequired(mapping).length > 0 && <p role="alert" className="text-sm text-clay-700">Choose a column for: {missingRequired(mapping).join(', ')}.</p>}
        </div>
      )}

      {step === 'preview' && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {([['all', `All ${rows.length}`], ['ready', `Ready ${ready.length}`], ['errors', `With errors ${errorCount}`], ['duplicates', `Possible duplicates ${dupes.size}`]] as Array<[View, string]>).map(([v, label]) => (
              <button key={v} type="button" onClick={() => { setView(v); setPage(1) }} aria-pressed={view === v}
                className={cn('rounded-chip border px-3 py-1 font-medium', view === v ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-surface text-ink-soft')}>{label}</button>
            ))}
          </div>
          <Toggle label="Skip possible duplicates" checked={skipDupes} onChange={setSkipDupes} description="Rows with the same mobile or email as an existing enquiry (or an earlier row) are left out." />
          {visible.length ? (
            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[60rem] text-left text-sm">
                <thead className="bg-snow-200/60 text-ink-soft">
                  <tr>
                    {['Row', 'Name *', 'Mobile *', 'Email', 'City', 'Requirement *', 'kW', 'Source', 'Status', 'Check', ''].map((h) => <th key={h} scope="col" className="px-2 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visible.slice((current - 1) * PAGE, current * PAGE).map(({ r, i }) => {
                    const dup = dupes.get(i)
                    const errs = Object.values(r.errors)
                    const inp = (k: 'name' | 'phone' | 'email' | 'city' | 'service') => (
                      <input aria-label={`${k} row ${r.line}`} className={cn(cell, r.errors[k] && 'border-clay-500')} value={String(r.values[k] ?? '')} onChange={(e) => editRow(i, { [k]: e.target.value })} />
                    )
                    return (
                      <tr key={`${r.line}-${i}`} className={cn('border-t border-line align-top', errs.length ? 'bg-clay-100/40' : dup ? 'bg-sun-300/15' : '')}>
                        <td className="px-2 py-1.5 text-muted tabular-nums">{r.line}</td>
                        <td className="px-2 py-1.5">{inp('name')}</td>
                        <td className="px-2 py-1.5">{inp('phone')}</td>
                        <td className="px-2 py-1.5">{inp('email')}</td>
                        <td className="px-2 py-1.5">{inp('city')}</td>
                        <td className="px-2 py-1.5">{inp('service')}</td>
                        <td className="px-2 py-1.5">
                          <input aria-label={`capacity row ${r.line}`} type="number" min={0} step="0.5" className={cn(cell, 'min-w-[4.5rem]', r.errors.capacityKw && 'border-clay-500')} value={r.values.capacityKw ?? ''} onChange={(e) => editRow(i, { capacityKw: e.target.value === '' ? null : Number(e.target.value) })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select aria-label={`source row ${r.line}`} className={cell} value={r.values.source} onChange={(e) => editRow(i, { source: e.target.value as EnquirySource })}>
                            {ENQUIRY_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select aria-label={`status row ${r.line}`} className={cell} value={r.values.status} onChange={(e) => editRow(i, { status: e.target.value as EnquiryStatus })}>
                            {ENQUIRY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="max-w-[16rem] px-2 py-1.5 text-xs">
                          {errs.length ? <span className="flex gap-1 text-clay-700"><CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />{errs.join(' ')}</span>
                            : dup ? <span className="flex gap-1 text-navy-800"><Copy className="mt-0.5 size-3.5 shrink-0" aria-hidden />{dup}</span>
                              : <span className="flex gap-1 text-leaf-700"><CircleCheck className="size-3.5" aria-hidden />Ready</span>}
                        </td>
                        <td className="px-1 py-1"><IconAction label={`Remove row ${r.line}`} danger onClick={() => removeRow(i)}><Trash2 className="size-4" /></IconAction></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No rows in this view.</p>
          )}
          <Pagination page={current} pages={pages} total={visible.length} pageSize={PAGE} onPage={setPage} noun="rows" />
        </div>
      )}

      {step === 'done' && result && (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card bg-leaf-100 p-4"><p className="text-sm text-leaf-700">Imported</p><p className="font-display text-3xl text-ink tabular-nums">{result.imported}</p></div>
            <div className="rounded-card bg-clay-100 p-4"><p className="text-sm text-clay-700">Failed / not imported</p><p className="font-display text-3xl text-ink tabular-nums">{result.failed.length + result.invalid}</p></div>
            <div className="rounded-card bg-snow-200 p-4"><p className="text-sm text-muted">Skipped duplicates</p><p className="font-display text-3xl text-ink tabular-nums">{result.skipped}</p></div>
          </div>
          {result.invalid > 0 && <p className="text-sm text-muted">{result.invalid} rows had errors and were not imported. Fix them in the file and import again.</p>}
          {result.failed.length > 0 && (
            <ul className="grid gap-1 text-sm text-clay-700">{result.failed.map((f) => <li key={f.row}>Row {f.row}: {f.errors.join(' ')}</li>)}</ul>
          )}
          <p className="flex items-center gap-2 text-sm text-muted"><Badge tone="info">Tip</Badge> Imported enquiries can be viewed, edited and deleted like any other enquiry.</p>
        </div>
      )}
    </Modal>
  )
}
