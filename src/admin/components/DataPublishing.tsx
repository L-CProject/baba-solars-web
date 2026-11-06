import { useRef, useState } from 'react'
import { DatabaseBackup, Download, RotateCcw, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useImportSnapshot } from '@/queries'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button, ConfirmDialog } from '@/components/ui'
import { errorMessage } from '../hooks/useCrud'

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Admin → Site content → Backup & restore.
 * Data lives in PostgreSQL on the server. A backup is a JSON copy (website data, optionally leads and
 * documents). Restoring replaces website content; leads and documents in the file are only ADDED —
 * existing records are never overwritten. This is also how data from the old browser-only version is moved in.
 */
export function DataPublishing() {
  const { can } = useAuth()
  const importer = useImportSnapshot()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'content' | 'full' | null>(null)
  const [pendingImport, setPendingImport] = useState<{ name: string; data: unknown } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const qc = useQueryClient()
  if (!can('backup:manage')) return null

  const doReset = async () => {
    setConfirmReset(false)
    try {
      await api.resetData()
      await qc.invalidateQueries()
      toast({ title: 'Original content restored', description: 'Website text, lists and offers are back to the original. Enquiries, documents, users and settings were not touched.' })
    } catch (e) {
      toast({ tone: 'error', title: 'Reset failed', description: errorMessage(e) })
    }
  }

  const exportFile = async (includeLeads: boolean) => {
    setBusy(includeLeads ? 'full' : 'content')
    try {
      const snap = await api.exportSnapshot({ includeLeads })
      download(`baba-solars-${includeLeads ? 'full-backup' : 'content'}-${snap.exportedAt.slice(0, 10)}.json`, snap)
      toast({ title: 'Backup downloaded', description: includeLeads ? 'Includes enquiries, quotations and invoices. Keep it private.' : 'Website content, prices and settings.' })
    } catch (e) {
      toast({ tone: 'error', title: 'Backup failed', description: errorMessage(e) })
    } finally { setBusy(null) }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try { setPendingImport({ name: file.name, data: JSON.parse(await file.text()) }) }
    catch { toast({ tone: 'error', title: 'Could not read the file', description: 'Choose a .json backup exported from this admin panel.' }) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  const doImport = async () => {
    const job = pendingImport
    setPendingImport(null)
    if (!job) return
    try {
      const { imported } = await importer.mutateAsync(job.data)
      toast({ title: 'Backup restored', description: `Updated: ${imported.join(', ')}. The website shows it now.` })
    } catch (e) {
      toast({ tone: 'error', title: 'Restore failed — nothing was changed', description: errorMessage(e) })
    }
  }

  return (
    <section id="data" className="scroll-mt-24 rounded-card border border-line bg-surface p-5 shadow-soft md:p-6" aria-labelledby="data-title">
      <h2 id="data-title" className="flex items-center gap-2 font-sans text-base font-semibold"><DatabaseBackup className="size-4 text-steel-600" aria-hidden />Backup &amp; restore</h2>
      <p className="mt-1 text-sm text-muted">Everything is saved on the server (PostgreSQL). Download a copy any time. To bring in data from the old browser-only admin panel, export a full backup there and restore it here — enquiries already on the server are never duplicated.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button leftIcon={<Download className="size-4" />} loading={busy === 'content'} onClick={() => void exportFile(false)}>Download content backup</Button>
        <Button variant="secondary" leftIcon={<Download className="size-4" />} loading={busy === 'full'} onClick={() => void exportFile(true)}>Full backup (with leads & invoices)</Button>
        <Button variant="secondary" leftIcon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()} loading={importer.isPending}>Restore from file…</Button>
        <Button variant="ghost" leftIcon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>Reset website content</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      <p className="mt-3 text-xs text-muted">Restore replaces website content, prices, services, banners, gallery, FAQs, companies and settings found in the file. Enquiries, proposals, quotations and invoices in the file are added if they are not on the server yet.</p>
      <ConfirmDialog open={!!pendingImport} title="Restore this backup?" message={`"${pendingImport?.name}" will replace the matching sections. Download a backup first if unsure.`}
        confirmLabel="Restore" onConfirm={() => void doImport()} onCancel={() => setPendingImport(null)} />
      <ConfirmDialog open={confirmReset} title="Reset website content?" message="Website text, plans, services, banners, gallery, reviews, FAQs and offers go back to the original content. Enquiries, proposals, quotations, invoices, users and business settings are kept. Download a content backup first if unsure."
        confirmLabel="Reset" onConfirm={() => void doReset()} onCancel={() => setConfirmReset(false)} />
    </section>
  )
}
