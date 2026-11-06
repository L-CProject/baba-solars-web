import { useState, type FormEvent } from 'react'
import { Download, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import type { CatalogItem } from '@/types'
import { useCatalogMutations } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, ApiError } from '@/services/api'
import { createId } from '@/lib/id'
import { CATALOG_CATEGORY_LABEL, CATALOG_CATEGORY_OPTIONS, validateCatalogItem } from '@/lib/catalog'
import { GST_RATE_OPTIONS, formatINR2 } from '@/lib/totals'
import { downloadBlob, todayISO } from '@/lib/files'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Select, Skeleton } from '@/components/ui'
import { AdminPageHeader, DataTable, DetailList, FilterSelect, IconAction, Pagination, SearchBox, SortSelect, Toolbar } from '../components/AdminUI'
import { errorMessage } from '../hooks/useCrud'
import { useServerTable, type ServerSort } from '../hooks/useServerTable'

type Cat = CatalogItem['category'] | 'all'
/** Sorted, filtered and paginated by the server (GET /api/catalog). */
const SORTS: ServerSort[] = [
  { value: 'name', label: 'Name A–Z', sort: 'name', order: 'asc' },
  { value: 'cat', label: 'Category', sort: 'category', order: 'asc' },
  { value: 'rate-hi', label: 'Rate (highest)', sort: 'rate', order: 'desc' },
  { value: 'rate-lo', label: 'Rate (lowest)', sort: 'rate', order: 'asc' },
]
const blank = (category: CatalogItem['category'] = 'bos'): CatalogItem => ({ id: createId('cat'), name: '', sku: '', description: '', hsn: '', unit: 'PCS', rate: 0, gstRate: 18, category })

/**
 * Products, materials, services and charges with their rates. Used by "Add from catalog" in
 * proposals, quotations and bills; every line stays editable there, and any custom item can be added.
 */
export default function ProductsPage() {
  useSeo({ title: 'Products & rates', path: '/admin/products', noIndex: true })
  const m = useCatalogMutations()
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('invoices:write')
  const [cat, setCat] = useState<Cat>('all')
  const [editing, setEditing] = useState<{ item: CatalogItem; isNew: boolean } | null>(null)
  const [viewing, setViewing] = useState<CatalogItem | null>(null)
  const [deleting, setDeleting] = useState<CatalogItem | null>(null)
  const table = useServerTable('catalog', (p) => api.listCatalogPage(p), { sorts: SORTS, filters: { category: cat === 'all' ? undefined : cat } })
  const { isPending, refetch } = table
  const isError = !!table.error && !table.pageRows.length
  const filtering = cat !== 'all' || !!table.query

  const exportXlsx = async () => {
    const { tableXlsx } = await import('@/excel/table')
    const blob = await tableXlsx<CatalogItem>('Products & rates', [
      { header: 'Category', width: 20, value: (c) => CATALOG_CATEGORY_LABEL[c.category] },
      { header: 'Name', width: 34, value: (c) => c.name },
      { header: 'SKU', width: 14, value: (c) => c.sku ?? '' },
      { header: 'Description', width: 40, value: (c) => c.description },
      { header: 'HSN/SAC', width: 12, value: (c) => c.hsn },
      { header: 'Unit', width: 8, value: (c) => c.unit },
      { header: 'Rate excl. GST (₹)', width: 16, value: (c) => c.rate },
      { header: 'GST %', width: 8, value: (c) => c.gstRate },
    ], await (async () => {
      const all: CatalogItem[] = []
      for (let page = 1; ; page++) {
        const res = await api.listCatalogPage({ ...table.params, page, limit: 200 })
        all.push(...res.items)
        if (page >= res.totalPages) return all
      }
    })())
    downloadBlob(blob, `baba-solars-products-${todayISO()}.xlsx`)
  }

  const confirmDelete = async () => {
    const target = deleting
    setDeleting(null)
    if (!target) return
    try {
      await m.remove.mutateAsync(target.id)
      toast({ title: `${target.name} deleted`, description: 'Existing documents keep their own copy of the line.' })
    } catch (e) {
      toast({ tone: 'error', title: 'Not deleted', description: errorMessage(e) })
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Products & rates"
        description="Products, materials (nuts, bolts, wires, connectors, structures…), services and charges. Rates exclude GST."
        actions={
          <>
            <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={() => void exportXlsx()} disabled={!table.total}>Export Excel</Button>
            {canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing({ item: blank(cat === 'all' ? 'bos' : cat), isNew: true })}>Add item</Button>}
          </>
        }
      />
      <Toolbar>
        <SearchBox value={table.query} onChange={table.setQuery} placeholder="Search name, SKU or HSN" />
        <FilterSelect<Cat> label="Category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, ...CATALOG_CATEGORY_OPTIONS]} />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORTS} />
      </Toolbar>
      {isPending ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <ErrorState title="Products could not load" message="Reload the list to try again." onRetry={() => void refetch()} />
      ) : (
        <DataTable
          caption="Products and rates"
          rows={table.pageRows}
          empty={<EmptyState title={filtering ? 'Nothing matches' : 'No items yet'} message={filtering ? 'Try another search or category.' : 'Add products, materials and charges to reuse them in bills and quotations.'} />}
          columns={[
            { header: 'Item', cell: (c) => <div><p className="font-semibold text-ink">{c.name}</p>{c.description && <p className="max-w-md truncate text-muted">{c.description}</p>}</div> },
            { header: 'Category', cell: (c) => <Badge tone={c.category === 'kit' ? 'info' : c.category === 'expense' ? 'warning' : 'neutral'}>{CATALOG_CATEGORY_LABEL[c.category]}</Badge> },
            { header: 'HSN/SAC', cell: (c) => <span className="tabular-nums text-muted">{c.hsn || '—'}</span> },
            { header: 'Rate', className: 'text-right', cell: (c) => <span className="whitespace-nowrap font-semibold tabular-nums">{formatINR2(c.rate)} / {c.unit}</span> },
            { header: 'GST', className: 'text-right', cell: (c) => <span className="tabular-nums">{c.gstRate}%</span> },
            { header: 'Actions', className: 'text-right', cell: (c) => (
              <div className="flex items-center justify-end gap-1.5">
                <IconAction label={`View ${c.name}`} onClick={() => setViewing(c)}><Eye className="size-4" /></IconAction>
                {canWrite && <IconAction label={`Edit ${c.name}`} onClick={() => setEditing({ item: { ...c }, isNew: false })}><Pencil className="size-4" /></IconAction>}
                {canWrite && <IconAction label={`Delete ${c.name}`} danger onClick={() => setDeleting(c)}><Trash2 className="size-4" /></IconAction>}
              </div>
            ) },
          ]}
        />
      )}
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} noun="items" />

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.name} description={CATALOG_CATEGORY_LABEL[viewing.category]} size="md"
          footer={<>{canWrite && <Button variant="secondary" onClick={() => { setEditing({ item: { ...viewing }, isNew: false }); setViewing(null) }}>Edit</Button>}<Button onClick={() => setViewing(null)}>Done</Button></>}>
          <DetailList items={[['Rate (excl. GST)', `${formatINR2(viewing.rate)} / ${viewing.unit}`], ['GST', `${viewing.gstRate}%`], ['Rate incl. GST', formatINR2(Math.round(viewing.rate * (1 + viewing.gstRate / 100) * 100) / 100)], ['HSN/SAC', viewing.hsn], ['SKU', viewing.sku ?? ''], ['Description', viewing.description]]} />
        </Modal>
      )}
      {editing && <ItemForm initial={editing.item} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete this item?" message={`${deleting?.name} will be removed from the list. Bills and quotations that already use it are not changed.`} confirmLabel="Delete item" onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </>
  )
}

function ItemForm({ initial, isNew, onClose }: { initial: CatalogItem; isNew: boolean; onClose: () => void }) {
  const m = useCatalogMutations()
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof CatalogItem>(k: K, v: CatalogItem[K]) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k as string]; return n }) }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateCatalogItem(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await m.save.mutateAsync({ ...f, name: f.name.trim(), unit: f.unit.trim().toUpperCase() })
      toast({ title: isNew ? 'Item added' : 'Item saved' })
      onClose()
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
      toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) })
    }
  }
  return (
    <Modal open onClose={() => !m.save.isPending && onClose()} title={isNew ? 'Add item' : `Edit ${initial.name}`} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="item-form" loading={m.save.isPending}>{isNew ? 'Add item' : 'Save changes'}</Button></>}>
      <form id="item-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} wrapperClassName="sm:col-span-2" />
        <Select label="Category" value={f.category} onChange={(e) => set('category', e.target.value as CatalogItem['category'])} options={CATALOG_CATEGORY_OPTIONS} error={errors.category} />
        <Input label="SKU (optional)" value={f.sku ?? ''} onChange={(e) => set('sku', e.target.value.slice(0, 40))} />
        <Input label="Description" value={f.description} onChange={(e) => set('description', e.target.value)} wrapperClassName="sm:col-span-2" />
        <Input label="HSN/SAC" inputMode="numeric" value={f.hsn} onChange={(e) => set('hsn', e.target.value.replace(/\D/g, '').slice(0, 10))} error={errors.hsn} />
        <Input label="Unit" value={f.unit} onChange={(e) => set('unit', e.target.value.toUpperCase().slice(0, 8))} error={errors.unit} hint="PCS, NOS, MTR, KG, SET, LOT, kW…" />
        <Input label="Rate (₹, excl. GST)" type="number" min={0} step="any" value={f.rate} onChange={(e) => set('rate', Number(e.target.value))} error={errors.rate} />
        <Select label="GST" value={String(f.gstRate)} onChange={(e) => set('gstRate', Number(e.target.value))} options={GST_RATE_OPTIONS} error={errors.gstRate} />
      </form>
    </Modal>
  )
}
