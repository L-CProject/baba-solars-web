import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, FolderOpen, RefreshCw } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { useToast } from '@/context/ToastContext'
import { downloadBlob } from '@/lib/files'
import { formatDate, formatINR } from '@/lib/format'
import {
  chooseDocumentsFolder, documentStore, folderAccessSupported, forgetDocumentsFolder,
  type DocKind, type StoredDocument,
} from '@/services/documents'
import { Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { AdminPageHeader, DataTable, FilterSelect, IconAction, SearchBox, SortSelect, Toolbar } from '../components/AdminUI'
import { documentKeys, useStoreStatus, useStoredDocuments } from '../hooks/useDocuments'
import { errorMessage } from '../hooks/useCrud'

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** Admin → Saved documents: the folder on this computer where quotation / billing files are kept, and every stored file. */
export default function DocumentsPage() {
  useSeo({ title: 'Saved documents', path: '/admin/documents', noIndex: true })
  const toast = useToast()
  const qc = useQueryClient()
  const [kind, setKind] = useState<DocKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')
  const list = useStoredDocuments({ kind: kind === 'all' ? undefined : kind })
  const store = useStoreStatus()

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    const out = (list.data ?? []).filter((d) => !t || `${d.docNumber} ${d.clientName} ${d.fileName}`.toLowerCase().includes(t))
    const cmp: Record<string, (a: StoredDocument, b: StoredDocument) => number> = {
      new: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      old: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      client: (a, b) => a.clientName.localeCompare(b.clientName, 'en', { sensitivity: 'base' }),
      amount: (a, b) => b.amount - a.amount,
    }
    return [...out].sort(cmp[sort] ?? cmp.new)
  }, [list.data, q, sort])

  const download = async (d: StoredDocument) => {
    try { downloadBlob(await documentStore().download(d), d.fileName) } catch (e) { toast({ tone: 'error', title: 'Download failed', description: errorMessage(e) }) }
  }
  return (
    <>
      <AdminPageHeader
        title="Saved documents"
        description="PDF and Excel copies of quotations and bills, saved into a folder on this computer."
        actions={<Button variant="secondary" leftIcon={<RefreshCw className="size-4" />} onClick={() => void qc.invalidateQueries({ queryKey: documentKeys.all })}>Refresh</Button>}
      />

      <div className="mb-6 max-w-2xl">
        <BrowserFolderCard ready={!!store.data?.ready} message={store.data?.message ?? ''} location={store.data?.location ?? ''} onChange={() => void qc.invalidateQueries({ queryKey: documentKeys.all })} />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search client or document no." />
        <FilterSelect label="Type" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'quotation', label: 'Quotations' }, { value: 'billing', label: 'Billing' }]} />
        <SortSelect value={sort} onChange={setSort} options={[{ value: 'new', label: 'Newest first' }, { value: 'old', label: 'Oldest first' }, { value: 'client', label: 'Client A–Z' }, { value: 'amount', label: 'Amount: high → low' }]} />
      </Toolbar>
      {list.isError ? <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} /> : list.isPending ? <Skeleton className="h-40" /> : (
        <DataTable
          caption="Saved documents"
          rows={rows}
          empty={<EmptyState title={list.data?.length ? 'No documents match' : 'No saved documents yet'} message="Files are saved when you create or edit a quotation or invoice, or with “Save PDF & Excel”." />}
          columns={[
            { header: 'Document', cell: (d) => (
              <div className="flex items-start gap-2">
                {d.format === 'pdf' ? <FileText className="mt-0.5 size-4 text-clay-700" aria-hidden /> : <FileSpreadsheet className="mt-0.5 size-4 text-leaf-700" aria-hidden />}
                <div>
                  <p className="font-semibold text-ink">{d.docNumber}</p>
                  <p className="text-muted">{d.kind === 'quotation' ? 'Quotation' : 'Billing'} · {d.format.toUpperCase()} · {kb(d.size)}</p>
                </div>
              </div>
            ) },
            { header: 'Client', cell: (d) => <div><p className="font-semibold text-ink">{d.clientName}</p><p className="break-all text-xs text-muted">{d.relativePath}</p></div> },
            { header: 'Date / amount', cell: (d) => <div className="whitespace-nowrap"><p>{formatDate(d.docDate)}</p><p className="text-muted tabular-nums">{formatINR(d.amount)}</p></div> },
            { header: 'Saved', cell: (d) => <div className="whitespace-nowrap"><p>{formatDate(d.updatedAt)}</p><p className="text-muted">Version {d.version}</p></div> },
            { header: 'Actions', className: 'text-right', cell: (d) => (
              <div className="flex items-center justify-end gap-1.5">
                <IconAction label={`Download ${d.fileName}`} onClick={() => void download(d)}><Download className="size-4" /></IconAction>
              </div>
            ) },
          ]}
        />
      )}
    </>
  )
}

function BrowserFolderCard({ ready, message, location, onChange }: { ready: boolean; message: string; location: string; onChange: () => void }) {
  const toast = useToast()
  const supported = folderAccessSupported()
  const pick = async () => {
    try {
      const name = await chooseDocumentsFolder()
      toast({ title: `Saving into “${name}”`, description: 'Quotations and Billing folders are ready.' })
      onChange()
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') toast({ tone: 'error', title: 'Folder not set', description: errorMessage(e) })
    }
  }
  const allowAgain = async () => {
    try { await documentStore().list(); const st = await documentStore().status(); if (!st.ready) await pick(); onChange() } catch (e) { toast({ tone: 'error', title: 'No access', description: errorMessage(e) }) }
  }
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2"><FolderOpen className="size-5 text-steel-600" aria-hidden /><h2 className="font-sans text-base font-semibold">Folder on this computer</h2></div>
      <p className="mt-2 text-sm text-muted">{message}</p>
      {supported && (
        <p className="mt-1 text-sm text-muted">Choose <strong>C:\</strong> (a “Quotation and Billing” folder is created inside) or an existing “Quotation and Billing” folder. The browser asks for permission — websites cannot write to your drive without it.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {supported && <Button leftIcon={<FolderOpen className="size-4" />} onClick={() => void (location && !ready ? allowAgain() : pick())}>{!location ? 'Choose folder' : ready ? 'Change folder' : 'Allow access again'}</Button>}
        {location && <Button variant="ghost" onClick={() => void forgetDocumentsFolder().then(onChange)}>Stop saving here</Button>}
      </div>
    </Card>
  )
}
