import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Copy, Eye, FileOutput, FileText, Pencil, Plus, Printer, Trash2, Wand2 } from 'lucide-react'
import type { Enquiry, LineItem, Proposal, ProposalStatus, Quality } from '@/types'
import { collectionQuery, useBusiness, useCollection, useCompanies, useConvertProposal, useDuplicateProposal, useProposalStatus, useSaveProposal, useSiteContent } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, ApiError } from '@/services/api'
import { PROPOSAL_STATUSES, PROPOSAL_STATUS_LABEL, blankProposal, deriveProposal, isExpired, proposalFromEnquiry, validateProposal, type ProposalInput } from '@/lib/proposals'
import { computeTotals } from '@/lib/totals'
import { QUALITIES, QUALITY_LABEL } from '@/lib/pricing'
import { PROPERTY_LABEL, PROPERTY_OPTIONS } from '@/lib/labels'
import { GST_STATES, stateCodeOf } from '@/lib/states'
import { addDaysISO, safeFileName, todayISO } from '@/lib/files'
import { formatDate, formatINR } from '@/lib/format'
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { AdminPageHeader, DataTable, DetailList, FilterSelect, IconAction, Pagination, SearchBox, SortSelect, ToneBadge, Toolbar, linesToList, listToLines } from '../components/AdminUI'
import { LineItemsEditor, TotalsPanel } from '../components/LineItemsEditor'
import { CatalogPicker } from '../components/CatalogPicker'
import { CustomerPicker } from '../components/CustomerPicker'
import { PdfPreviewModal } from '../components/PdfPreview'
import { useCrud, errorMessage } from '../hooks/useCrud'
import { useServerTable, type ServerSort } from '../hooks/useServerTable'
import { proposalTone } from '../constants'

/** Sorted, filtered and paginated by the server (GET /api/proposals). */
const SORTS: ServerSort[] = [
  { value: 'new', label: 'Newest first', sort: 'createdAt', order: 'desc' },
  { value: 'old', label: 'Oldest first', sort: 'createdAt', order: 'asc' },
  { value: 'value', label: 'Value (highest)', sort: 'grandTotal', order: 'desc' },
  { value: 'valid', label: 'Valid until', sort: 'validUntil', order: 'asc' },
  { value: 'name', label: 'Customer A–Z', sort: 'customerName', order: 'asc' },
]
const SYSTEMS = [{ value: 'on-grid', label: 'On-grid' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'off-grid', label: 'Off-grid' }]
const ROOFS = [{ value: 'rcc', label: 'RCC flat roof' }, { value: 'tin', label: 'Tin / metal shed' }, { value: 'ground', label: 'Ground mounted' }]
const STATE_NAMES = GST_STATES.map((s) => ({ value: s.name, label: s.name }))

type Editing = { id: string | null; data: ProposalInput; number?: string }
const toInput = (p: Proposal): ProposalInput => {
  const { id: _i, proposalNumber: _n, createdAt: _c, updatedAt: _u, subtotal: _s, taxableAmount: _t, taxTotal: _x, grandTotal: _g, subsidy: _sb, stateSubsidy: _ss, netCost: _nc, annualGenerationKwh: _a, ...rest } = p
  return structuredClone(rest)
}

export default function ProposalsPage() {
  const proposals = useCollection('proposals')
  useSeo({ title: 'Proposals', path: '/admin/proposals', noIndex: true })
  const { can } = useAuth()
  const canWrite = can('quotations:write')
  const crud = useCrud('proposals', 'Proposal')
  const toast = useToast()
  const navigate = useNavigate()
  const business = useBusiness().data
  const enquiries = useQuery({ ...collectionQuery('enquiries'), enabled: can('leads:read') }).data ?? []
  const duplicate = useDuplicateProposal()
  const setStatus = useProposalStatus()
  const convert = useConvertProposal()
  const [status, setStatusFilter] = useState<ProposalStatus | 'all'>('all')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [viewing, setViewing] = useState<Proposal | null>(null)
  const [pdfFor, setPdfFor] = useState<Proposal | null>(null)
  const [picking, setPicking] = useState(false)
  const [params, setParams] = useSearchParams()

  // Deep links: ?fromEnquiry=<id> starts a proposal from that enquiry; ?open=<id> shows one; ?new=1 starts blank.
  useEffect(() => {
    const from = params.get('fromEnquiry')
    const open = params.get('open')
    if (from && canWrite) {
      const e = enquiries.find((x) => x.id === from)
      if (!e) return // wait for enquiries to load
      setEditing({ id: null, data: proposalFromEnquiry(e, business) })
      setParams({}, { replace: true })
    } else if (open) {
      const p = proposals.find((x) => x.id === open)
      if (p) setViewing(p)
      setParams({}, { replace: true })
    } else if (params.get('new') === '1' && canWrite) {
      setEditing({ id: null, data: blankProposal(business) })
      setParams({}, { replace: true })
    }
  }, [params, setParams, enquiries, proposals, business, canWrite])

  const table = useServerTable('proposals', (p) => api.listProposals(p), { sorts: SORTS, filters: { status: status === 'all' ? undefined : status } })
  const enquiryOf = (id: string | null) => (id ? enquiries.find((e) => e.id === id) : undefined)
  const waiting = useMemo(
    () => enquiries.filter((e) => !proposals.some((p) => p.enquiryId === e.id) && !['converted', 'not-interested', 'closed', 'quoted'].includes(e.status)),
    [enquiries, proposals],
  )

  const changeStatus = async (p: Proposal, s: ProposalStatus) => {
    try {
      await setStatus.mutateAsync({ id: p.id, status: s })
      toast({ title: `Marked as ${PROPOSAL_STATUS_LABEL[s].toLowerCase()}` })
    } catch (e) {
      toast({ tone: 'error', title: 'Status not changed', description: errorMessage(e) })
    }
  }
  const dup = async (p: Proposal) => {
    try {
      const c = await duplicate.mutateAsync(p.id)
      toast({ title: `Duplicated as ${c.proposalNumber}`, description: 'The copy is a draft — edit it as needed.' })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not duplicate', description: errorMessage(e) })
    }
  }
  const toQuotation = async (p: Proposal) => {
    try {
      const q = await convert.mutateAsync(p.id)
      toast({ title: `Quotation ${q.quoteNumber} created`, description: 'Opening it in Quotations.' })
      navigate(`/admin/quotations?open=${q.id}`)
    } catch (e) {
      toast({ tone: 'error', title: 'Could not convert', description: errorMessage(e) })
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Proposals"
        description="Prepare the system design, scope and indicative price before issuing a formal quotation."
        actions={canWrite ? (
          <>
            <Button variant="secondary" leftIcon={<FileText className="size-4" />} onClick={() => setPicking(true)} disabled={!enquiries.length}>From enquiry</Button>
            <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing({ id: null, data: blankProposal(business) })}>New proposal</Button>
          </>
        ) : undefined}
      />

      {canWrite && waiting.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-card border border-sun-500/40 bg-sun-300/20 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-navy-800"><strong>{waiting.length}</strong> open {waiting.length === 1 ? 'enquiry has' : 'enquiries have'} no proposal yet.</p>
          <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>Choose an enquiry</Button>
        </div>
      )}

      <Toolbar>
        <SearchBox value={table.query} onChange={table.setQuery} placeholder="Search proposal no., customer, mobile or city" />
        <FilterSelect label="Status" value={status} onChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, ...PROPOSAL_STATUSES]} />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORTS} />
      </Toolbar>

      <DataTable
        caption="Proposals"
        rows={table.pageRows}
        empty={<EmptyState title={proposals.length ? 'No proposals match' : 'No proposals yet'} message={proposals.length ? 'Try clearing the search or status filter.' : 'Start one from an enquiry, or create a blank proposal.'} action={canWrite && !proposals.length ? <Button onClick={() => setEditing({ id: null, data: blankProposal(business) })}>New proposal</Button> : undefined} />}
        columns={[
          { header: 'Proposal', cell: (p) => <div className="whitespace-nowrap"><p className="font-semibold text-ink">{p.proposalNumber}</p><p className="text-muted">{formatDate(p.proposalDate)}</p></div> },
          { header: 'Customer', cell: (p) => <div><p className="font-semibold text-ink">{p.customerName}</p><p className="text-muted">{[p.phone, p.city].filter(Boolean).join(', ')}</p>{p.enquiryId && <p className="text-xs text-muted">{enquiryOf(p.enquiryId) ? 'From enquiry' : 'Enquiry deleted'}</p>}</div> },
          { header: 'System', cell: (p) => <div><p>{p.capacityKw} kW {p.systemType}</p><p className="text-muted">{QUALITY_LABEL[p.quality]} · {p.items.length} items</p></div> },
          { header: 'Value', cell: (p) => <div className="whitespace-nowrap"><p className="font-semibold">{formatINR(p.grandTotal)}</p>{p.subsidy + p.stateSubsidy > 0 && <p className="text-muted">{formatINR(p.netCost)} after subsidy</p>}</div> },
          { header: 'Valid until', cell: (p) => <span className="whitespace-nowrap">{formatDate(p.validUntil)}{isExpired(p) && <Badge tone="danger" className="ml-1">Expired</Badge>}</span> },
          { header: 'Status', cell: (p) => (
            <select aria-label={`Status for ${p.proposalNumber}`} value={p.status} disabled={!canWrite} onChange={(e) => void changeStatus(p, e.target.value as ProposalStatus)} className="h-8 rounded-field border border-line bg-canvas px-2 text-sm">
              {PROPOSAL_STATUSES.filter((o) => o.value !== 'converted' || p.quotationId).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) },
          { header: 'Actions', className: 'text-right', cell: (p) => (
            <div className="flex items-center justify-end gap-1.5">
              <IconAction label={`View proposal ${p.proposalNumber}`} onClick={() => setViewing(p)}><Eye className="size-4" /></IconAction>
              {canWrite && <IconAction label={`Edit proposal ${p.proposalNumber}`} onClick={() => setEditing({ id: p.id, data: toInput(p), number: p.proposalNumber })}><Pencil className="size-4" /></IconAction>}
              <IconAction label={`PDF of proposal ${p.proposalNumber}`} onClick={() => setPdfFor(p)}><Printer className="size-4" /></IconAction>
              {canWrite && <IconAction label={`Duplicate proposal ${p.proposalNumber}`} disabled={duplicate.isPending} onClick={() => void dup(p)}><Copy className="size-4" /></IconAction>}
              {canWrite && <IconAction label={`Convert ${p.proposalNumber} to quotation`} disabled={!!p.quotationId || convert.isPending} onClick={() => void toQuotation(p)}><FileOutput className="size-4" /></IconAction>}
              {canWrite && <IconAction label={`Delete proposal ${p.proposalNumber}`} danger onClick={() => crud.setDeleting(p)}><Trash2 className="size-4" /></IconAction>}
            </div>
          ) },
        ]}
      />
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} noun="proposals" />

      {picking && (
        <EnquiryChooser enquiries={enquiries} hasProposal={(id) => proposals.some((p) => p.enquiryId === id)} onClose={() => setPicking(false)}
          onPick={(e) => { setPicking(false); setEditing({ id: null, data: proposalFromEnquiry(e, business) }) }} />
      )}
      {editing && <ProposalEditor key={editing.id ?? 'new'} initial={editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`Proposal ${viewing.proposalNumber}`} description={`${viewing.customerName} · ${formatDate(viewing.proposalDate)}`} size="lg"
          footer={
            <>
              {canWrite && <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => { setEditing({ id: viewing.id, data: toInput(viewing), number: viewing.proposalNumber }); setViewing(null) }}>Edit</Button>}
              <Button variant="secondary" leftIcon={<Printer className="size-4" />} onClick={() => { setPdfFor(viewing); setViewing(null) }}>PDF</Button>
              {canWrite && !viewing.quotationId && <Button variant="secondary" leftIcon={<FileOutput className="size-4" />} onClick={() => { void toQuotation(viewing); setViewing(null) }}>Convert to quotation</Button>}
              {viewing.quotationId && <Button variant="secondary" onClick={() => navigate(`/admin/quotations?open=${viewing.quotationId}`)}>Open quotation</Button>}
              <Button onClick={() => setViewing(null)}>Done</Button>
            </>
          }>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><ToneBadge tone={proposalTone[viewing.status]}>{PROPOSAL_STATUS_LABEL[viewing.status]}</ToneBadge>{isExpired(viewing) && <Badge tone="danger">Expired</Badge>}</div>
            <DetailList items={[
              ['Customer', viewing.customerName], ['Mobile', viewing.phone], ['Email', viewing.email], ['Address', [viewing.address, viewing.city, viewing.state].filter(Boolean).join(', ')],
              ['System', `${viewing.capacityKw} kW ${viewing.systemType}`], ['Property', PROPERTY_LABEL[viewing.propertyType]], ['Plan', `${QUALITY_LABEL[viewing.quality]}${viewing.quality === 'premium' ? ' (incl. drone cleaning)' : ''}`],
              ['Generation', `~${viewing.annualGenerationKwh.toLocaleString('en-IN')} units/year`], ['Total', formatINR(viewing.grandTotal)], ['Subsidy (est.)', formatINR(viewing.subsidy + viewing.stateSubsidy)],
              ['After subsidy', formatINR(viewing.netCost)], ['Valid until', formatDate(viewing.validUntil)],
              ['Enquiry', viewing.enquiryId ? (enquiryOf(viewing.enquiryId)?.name ?? 'Deleted') : 'Created directly'], ['Quotation', viewing.quotationId ? 'Converted' : 'Not yet'],
            ]} />
            {viewing.items.length > 0 && (
              <div className="overflow-x-auto rounded-card border border-line">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead className="bg-snow-200/60 text-left text-ink-soft"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">GST</th></tr></thead>
                  <tbody>{viewing.items.map((it) => <tr key={it.id} className="border-t border-line"><td className="px-3 py-2">{it.name}</td><td className="px-3 py-2 text-right tabular-nums">{it.quantity} {it.unit}</td><td className="px-3 py-2 text-right tabular-nums">{formatINR(it.rate)}</td><td className="px-3 py-2 text-right">{it.gstRate}%</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
      {pdfFor && (
        <PdfPreviewModal open onClose={() => setPdfFor(null)} title={`Proposal ${pdfFor.proposalNumber}`}
          filename={`Proposal-${safeFileName(pdfFor.proposalNumber)}-${safeFileName(pdfFor.customerName)}.pdf`}
          load={() => api.proposalPdf(pdfFor.id)} reloadKey={`${pdfFor.id}-${pdfFor.updatedAt}`} />
      )}
      <ConfirmDialog open={!!crud.deleting} title="Delete this proposal?" message={`Proposal ${crud.deleting?.proposalNumber} for ${crud.deleting?.customerName} will be permanently removed. A quotation made from it is kept.`} confirmLabel="Delete proposal" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function EnquiryChooser({ enquiries, hasProposal, onPick, onClose }: { enquiries: Enquiry[]; hasProposal: (id: string) => boolean; onPick: (e: Enquiry) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const list = enquiries.filter((e) => `${e.name} ${e.phone} ${e.city} ${e.service}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
  return (
    <Modal open onClose={onClose} title="Create a proposal from an enquiry" description="Customer and site details are copied in; you can change them." size="md">
      <SearchBox value={q} onChange={setQ} placeholder="Search name, mobile, city or requirement" />
      <ul className="mt-3 max-h-[55vh] divide-y divide-line overflow-y-auto rounded-card border border-line">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPick(e)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-ice-100/60">
              <span><span className="block font-semibold text-ink">{e.name}</span><span className="block text-sm text-muted">{[e.phone, e.city, e.service].filter(Boolean).join(' · ')}</span></span>
              <span className="shrink-0 text-xs text-muted">{hasProposal(e.id) ? 'Has proposal' : formatDate(e.createdAt)}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted">No enquiries match.</li>}
      </ul>
    </Modal>
  )
}

function ProposalEditor({ initial, onClose }: { initial: Editing; onClose: () => void }) {
  const content = useSiteContent()
  const business = useBusiness().data
  const companies = useCompanies().data ?? []
  const save = useSaveProposal()
  const toast = useToast()
  const [f, setF] = useState<ProposalInput>(initial.data)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const [filling, setFilling] = useState(false)
  const isNew = !initial.id
  const set = <K extends keyof ProposalInput>(k: K, v: ProposalInput[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n })
  }
  const bizState = business?.stateCode ?? '22'
  const supplyType = (stateCodeOf(f.state) || bizState) === bizState ? 'intra' : 'inter'
  const totals = useMemo(() => computeTotals(f.items, { supplyType, discountType: 'amount', discountValue: f.discount, roundOff: true }), [f.items, f.discount, supplyType])
  const derived = useMemo(() => deriveProposal(f, { calc: content.calculator, businessStateCode: bizState }), [f, content.calculator, bizState])

  const fillFromCompany = async () => {
    if (!f.companyId) { toast({ tone: 'error', title: 'Choose a company first' }); return }
    setFilling(true)
    try {
      const res = await api.priceQuote(f.companyId, f.capacityKw, f.quality, supplyType)
      setF((p) => ({ ...p, items: res.items.map((it) => ({ ...it, id: `${it.id}-${Math.random().toString(36).slice(2, 7)}` })), discount: 0 }))
      toast({ title: `${res.company.name} ${QUALITY_LABEL[f.quality]} · ${f.capacityKw} kW: ${formatINR(res.price)}`, description: res.exact ? 'Package price itemised.' : res.basis })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not load company prices', description: errorMessage(e) })
    } finally {
      setFilling(false)
    }
  }

  const check = () => {
    const errs = validateProposal(f)
    if (derived.discountError) errs.discount = 'Discount cannot be more than the proposal value.'
    setErrors(errs)
    if (Object.keys(errs).length) toast({ tone: 'error', title: 'Fix the highlighted fields', description: Object.values(errs)[0] })
    return !Object.keys(errs).length
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!check()) return
    try {
      const saved = await save.mutateAsync({ id: initial.id, data: f })
      toast({ title: isNew ? `Proposal ${saved.proposalNumber} created` : 'Proposal saved', description: `${formatINR(saved.grandTotal)}${saved.items.length ? ' incl. GST' : ' (indicative)'}` })
      onClose()
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
      toast({ tone: 'error', title: 'Proposal not saved', description: errorMessage(err) })
    }
  }

  return (
    <>
      <Modal open onClose={() => !save.isPending && onClose()} title={isNew ? 'New proposal' : `Edit proposal ${initial.number ?? ''}`} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
            <Button variant="secondary" leftIcon={<Eye className="size-4" />} onClick={() => check() && setPreview(true)}>Preview PDF</Button>
            <Button type="submit" form="proposal-form" loading={save.isPending}>{isNew ? 'Create proposal' : 'Save changes'}</Button>
          </>
        }>
        <form id="proposal-form" onSubmit={submit} noValidate className="grid gap-6">
          <section className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-sans text-base font-semibold">Customer</h3>
              <CustomerPicker onPick={(c) => setF((p) => ({ ...p, customerName: c.name, phone: c.phone, email: c.email || p.email, address: c.address || p.address, city: c.city || p.city, state: c.state || p.state }))} />
            </div>
            {f.enquiryId && <p className="-mt-2 text-xs text-muted">Linked to an enquiry — the enquiry moves to “Proposal” when you create this.</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Customer name" required value={f.customerName} onChange={(e) => set('customerName', e.target.value)} error={errors.customerName} />
              <Input label="Mobile" required type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
              <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
              <Input label="Address" value={f.address} onChange={(e) => set('address', e.target.value)} wrapperClassName="lg:col-span-2" />
              <Input label="City" value={f.city} onChange={(e) => set('city', e.target.value)} />
              <Select label="State" value={f.state} onChange={(e) => set('state', e.target.value)} options={STATE_NAMES} />
              <Input label="Consumer no. (optional)" value={f.consumerNumber} onChange={(e) => set('consumerNumber', e.target.value)} />
              <Input label="DISCOM" value={f.discom} onChange={(e) => set('discom', e.target.value)} />
            </div>
          </section>

          <section className="grid gap-4 border-t border-line pt-5">
            <h3 className="font-sans text-base font-semibold">Proposal & system</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Title" value={f.title} onChange={(e) => set('title', e.target.value)} wrapperClassName="sm:col-span-2 lg:col-span-3" />
              <Input label="Proposal date" type="date" value={f.proposalDate} onChange={(e) => { set('proposalDate', e.target.value); if (isNew) set('validUntil', addDaysISO(e.target.value || todayISO(), business?.proposal?.validityDays ?? 15)) }} error={errors.proposalDate} />
              <Input label="Valid until" type="date" value={f.validUntil} onChange={(e) => set('validUntil', e.target.value)} error={errors.validUntil} />
              <Select label="Status" value={f.status} onChange={(e) => set('status', e.target.value as ProposalStatus)} options={PROPOSAL_STATUSES.filter((s) => s.value !== 'converted' || f.quotationId)} />
              <Input label="Capacity (kW)" type="number" step="0.5" min={0.5} value={f.capacityKw} onChange={(e) => set('capacityKw', Number(e.target.value))} error={errors.capacityKw} />
              <Select label="Property" value={f.propertyType} onChange={(e) => set('propertyType', e.target.value as ProposalInput['propertyType'])} options={PROPERTY_OPTIONS} />
              <Select label="System" value={f.systemType} onChange={(e) => set('systemType', e.target.value as ProposalInput['systemType'])} options={SYSTEMS} />
              <Select label="Roof" value={f.roofType} onChange={(e) => set('roofType', e.target.value as ProposalInput['roofType'])} options={ROOFS} />
              <Input label="Monthly bill (₹, optional)" type="number" min={0} value={f.monthlyBill || ''} onChange={(e) => set('monthlyBill', Number(e.target.value) || 0)} />
            </div>
          </section>

          <section className="grid gap-3 border-t border-line pt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-sans text-base font-semibold">Products, materials & charges</h3>
              <div className="flex flex-wrap items-end gap-2">
                <Select label="Company" value={f.companyId ?? ''} onChange={(e) => set('companyId', e.target.value || null)} options={[{ value: '', label: 'No company' }, ...companies.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))]} />
                <Segmented<Quality> label="Plan" value={f.quality} onChange={(v) => set('quality', v)} options={QUALITIES.map((q) => ({ value: q, label: QUALITY_LABEL[q] }))} />
                <Button size="sm" variant="secondary" leftIcon={<Wand2 className="size-4" />} loading={filling} disabled={!f.companyId} onClick={() => void fillFromCompany()}>Fill from price list</Button>
                <CatalogPicker onPick={(line: LineItem) => set('items', [...f.items.filter((it) => it.name.trim() || it.rate), line])} />
              </div>
            </div>
            {f.quality === 'premium' && <p className="text-xs text-muted">Premium plan: drone-based panel cleaning is included and printed on the proposal.</p>}
            <LineItemsEditor items={f.items} onChange={(items) => set('items', items)} totals={totals} errors={errors} />
          </section>

          <section className="grid gap-4 border-t border-line pt-5 lg:grid-cols-[1fr_22rem]">
            <div className="grid content-start gap-4">
              <Input label="Extra discount (₹)" type="number" min={0} value={f.discount || ''} onChange={(e) => set('discount', Number(e.target.value) || 0)} error={errors.discount} />
              <Textarea label="Scope of work (one per line)" rows={5} value={listToLines(f.scope)} onChange={(e) => set('scope', linesToList(e.target.value))} />
              <Textarea label="Payment terms" rows={3} value={f.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} />
              <Textarea label="Terms & conditions" rows={4} value={f.terms} onChange={(e) => set('terms', e.target.value)} />
              <Textarea label="Notes (printed)" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="grid content-start gap-3">
              {f.items.length ? (
                <TotalsPanel totals={totals} supplyType={supplyType} extra={derived.subsidy + derived.stateSubsidy > 0 ? [
                  { label: 'Central subsidy (est.)', value: -derived.subsidy, tone: 'good' },
                  ...(derived.stateSubsidy ? [{ label: 'State subsidy (est.)', value: -derived.stateSubsidy, tone: 'good' as const }] : []),
                  { label: 'After subsidy', value: derived.netCost, strong: true },
                ] : []} />
              ) : (
                <div className="rounded-card border border-line bg-snow-100/70 p-4 text-sm">
                  <p className="text-ink-soft">No items yet — the proposal shows an indicative price from the calculator settings:</p>
                  <p className="mt-1 font-display text-2xl text-ink">{formatINR(derived.grandTotal)}</p>
                  {derived.subsidy + derived.stateSubsidy > 0 && <p className="text-leaf-700">{formatINR(derived.netCost)} after subsidy (est.)</p>}
                </div>
              )}
              <p className="text-xs text-muted">Estimated generation ~{derived.annualGenerationKwh.toLocaleString('en-IN')} units/year{derived.paybackYears ? ` · payback ~${derived.paybackYears} yrs` : ''}.</p>
            </div>
          </section>
        </form>
      </Modal>
      {preview && (
        <PdfPreviewModal open onClose={() => setPreview(false)} title="Proposal preview (not saved yet)" filename={`Proposal-draft-${safeFileName(f.customerName || 'customer')}.pdf`}
          load={() => api.proposalPreviewPdf(f, initial.id ?? undefined)} reloadKey={JSON.stringify(f).length.toString()} />
      )}
    </>
  )
}
