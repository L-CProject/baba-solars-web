import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlarmClock, Download, Eye, FilePlus2, FileText, Pencil, Phone, Plus, Trash2, Upload } from 'lucide-react'
import type { Enquiry, EnquirySource, EnquiryStatus, PropertyType } from '@/types'
import { collectionQuery, refreshLeads, useAssignableUsers, useEnquiryStats, useLeadActions, useSaveEnquiry } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, ApiError, type EnquirySave, type EnquiryListParams } from '@/services/api'
import { createId } from '@/lib/id'
import { downloadBlob, todayISO } from '@/lib/files'
import { formatDate, formatDateTime, relativeDay, telHref, whatsappHref } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ADMIN_SOURCES, ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, SOURCE_LABEL, capacityLabel, enquiryDisplayName, enquiryTypeOf, isClosedStatus, originOf, validateEnquiry } from '@/lib/enquiries'
import { PROPERTY_LABEL, PROPERTY_OPTIONS } from '@/lib/labels'
import { GST_STATES } from '@/lib/states'
import { Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Select, Textarea, Toggle, WhatsAppIcon } from '@/components/ui'
import { AdminPageHeader, DataTable, FilterDate, FilterSelect, IconAction, Pagination, SearchBox, SortSelect, Toolbar } from '../components/AdminUI'
import { CustomerPicker } from '../components/CustomerPicker'
import { EnquiryImportDialog } from '../components/EnquiryImportDialog'
import { LeadDetail } from '../components/LeadDetail'
import { errorMessage } from '../hooks/useCrud'
import { useServerTable, type ServerSort } from '../hooks/useServerTable'

/** Status groups used by the dashboard cards (Contacted = reached, not yet closed). */
const CONTACTED_FILTER = 'contacted,follow-up,interested,site-visit,proposal,quoted'

type SourceFilter = 'all' | 'website' | 'admin' | 'import' | EnquirySource
const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'website', label: 'Website (all forms)' },
  { value: 'admin', label: 'Entered by admin (all)' },
  { value: 'import', label: 'Excel import' },
  ...ENQUIRY_SOURCES.filter((s) => s.origin !== 'import').map((s) => ({ value: s.value as SourceFilter, label: s.label })),
]
type FollowFilter = 'all' | 'due' | 'overdue' | 'today' | 'upcoming'
const FOLLOW_FILTERS: Array<{ value: FollowFilter; label: string }> = [
  { value: 'all', label: 'Any' }, { value: 'due', label: 'Due (today or earlier)' }, { value: 'overdue', label: 'Overdue' }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' },
]

const SORTS: ServerSort[] = [
  { value: 'new', label: 'Newest first', sort: 'createdAt', order: 'desc' },
  { value: 'old', label: 'Oldest first', sort: 'createdAt', order: 'asc' },
  { value: 'updated', label: 'Recently updated', sort: 'updatedAt', order: 'desc' },
  { value: 'follow', label: 'Follow-up date', sort: 'followUpOn', order: 'asc' },
  { value: 'contacted', label: 'Last contacted', sort: 'lastContactedAt', order: 'desc' },
  { value: 'name', label: 'Name A–Z', sort: 'name', order: 'asc' },
  { value: 'status', label: 'Status (pipeline)', sort: 'status', order: 'asc' },
  { value: 'kw', label: 'Capacity (largest)', sort: 'capacityKw', order: 'desc' },
]

const STATE_OPTIONS = [{ value: '', label: '—' }, ...GST_STATES.map((s) => ({ value: s.name, label: s.name }))]

/**
 * Admin → Enquiries: lead management. The table is searched, filtered, sorted and paginated
 * on the server. Each lead keeps a full history (status changes, calls, WhatsApp, notes,
 * follow-ups, assignment) — see LeadDetail.
 */
export default function EnquiriesPage() {
  useSeo({ title: 'Enquiries', path: '/admin/enquiries', noIndex: true })
  const { can, user } = useAuth()
  const canWrite = can('leads:write')
  const canQuote = can('quotations:write')
  const canAssign = can('leads:assign')
  const canDelete = can('leads:delete')
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<string>(params.get('status') ?? 'all')
  const [source, setSource] = useState<SourceFilter>('all')
  const [follow, setFollow] = useState<FollowFilter>((params.get('followUp') as FollowFilter) ?? 'all')
  const [assigned, setAssigned] = useState<string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<string | null>(params.get('open'))
  const [editing, setEditing] = useState<{ value: EnquirySave; isNew: boolean } | null>(null)
  const [deleting, setDeleting] = useState<Enquiry | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [quickFollow, setQuickFollow] = useState<{ e: Enquiry } | null>(null)
  const stats = useEnquiryStats()
  const users = useAssignableUsers(canAssign)
  const { setStatus: setLeadStatus, remove } = useLeadActions()
  // Full list only for the Excel import duplicate check.
  const existing = useQuery({ ...collectionQuery('enquiries'), enabled: importing })

  const filters: Omit<EnquiryListParams, 'page' | 'limit' | 'search' | 'sort' | 'order'> = {
    status: status === 'all' ? undefined : status,
    source: source === 'all' ? undefined : source,
    followUp: follow === 'all' ? undefined : follow,
    assignedTo: assigned === 'all' ? undefined : assigned,
    from: from || undefined,
    to: to || undefined,
  }
  const table = useServerTable('enquiries', (p) => api.listEnquiries(p), { sorts: SORTS, filters: filters as Record<string, string | undefined> })

  const openLead = (id: string | null) => {
    setViewing(id)
    const next = new URLSearchParams(params)
    if (id) next.set('open', id); else next.delete('open')
    setParams(next, { replace: true })
  }

  const changeStatus = async (e: Enquiry, s: EnquiryStatus) => {
    if (s === 'follow-up' && !e.followUpOn) return setQuickFollow({ e })
    try {
      await setLeadStatus.mutateAsync({ id: e.id, status: s })
      toast({ title: `Marked as ${ENQUIRY_STATUS_LABEL[s].toLowerCase()}`, description: e.name })
    } catch (err) { toast({ tone: 'error', title: 'Status not changed', description: errorMessage(err) }) }
  }

  const exportXlsx = async () => {
    setExporting(true)
    try {
      // Every record matching the current filters (all pages).
      const ids: string[] = []
      for (let page = 1; ; page++) {
        const res = await api.listEnquiries({ ...table.params, page, limit: 200 })
        ids.push(...res.items.map((e) => e.id))
        if (page >= res.totalPages) break
      }
      const blob = await api.enquiriesXlsx(ids)
      downloadBlob(blob, `baba-solars-enquiries-${todayISO()}.xlsx`)
      toast({ title: `Exported ${ids.length} enquiries` })
    } catch (e) {
      toast({ tone: 'error', title: 'Export failed', description: errorMessage(e) })
    } finally {
      setExporting(false)
    }
  }

  const blank = (): EnquirySave => ({
    id: createId('enq'), name: '', phone: '', email: '', city: 'Raipur', state: 'Chhattisgarh', address: '', pincode: '', service: '', message: '',
    source: 'manual', status: 'new', propertyType: 'residential', capacityKw: null, monthlyBill: null, notes: '', followUpOn: null, assignedTo: canAssign ? null : undefined,
  })
  const today = todayISO()
  const statusChips = ENQUIRY_STATUSES.filter((s) => stats.data?.byStatus[s.value])
  const filtersActive = status !== 'all' || source !== 'all' || follow !== 'all' || assigned !== 'all' || !!from || !!to || !!table.query

  return (
    <>
      <AdminPageHeader
        title="Enquiries"
        description="Every lead from the website, WhatsApp, calls and other sources — with status, follow-ups, assignment and full history."
        actions={
          <>
            {canWrite && <Button variant="secondary" leftIcon={<Upload className="size-4" />} onClick={() => setImporting(true)}>Import Excel</Button>}
            <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={() => void exportXlsx()} loading={exporting} disabled={!table.total}>Export Excel</Button>
            {canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing({ value: blank(), isNew: true })}>New enquiry</Button>}
          </>
        }
      />

      <ul className="mb-4 flex flex-wrap gap-2" aria-label="Enquiries by status">
        <li>
          <button type="button" onClick={() => setStatus(status === 'open' ? 'all' : 'open')} aria-pressed={status === 'open'}
            className={cn('rounded-chip border px-3 py-1 text-sm font-medium transition-colors', status === 'open' ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-surface text-ink-soft hover:border-steel-400')}>
            Open leads <span className="tabular-nums opacity-75">{stats.data?.open ?? '…'}</span>
          </button>
        </li>
        {statusChips.map((s) => (
          <li key={s.value}>
            <button type="button" onClick={() => setStatus(status === s.value ? 'all' : s.value)} aria-pressed={status === s.value}
              className={cn('rounded-chip border px-3 py-1 text-sm font-medium transition-colors', status === s.value ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-surface text-ink-soft hover:border-steel-400')}>
              {s.label} <span className="tabular-nums opacity-75">{stats.data?.byStatus[s.value]}</span>
            </button>
          </li>
        ))}
        {!!stats.data?.followUpsDue && (
          <li>
            <button type="button" onClick={() => setFollow(follow === 'due' ? 'all' : 'due')} aria-pressed={follow === 'due'}
              className={cn('inline-flex items-center gap-1 rounded-chip border px-3 py-1 text-sm font-semibold transition-colors', follow === 'due' ? 'border-clay-500 bg-clay-500 text-white' : 'border-clay-500/40 bg-clay-100/60 text-clay-700 hover:border-clay-500')}>
              <AlarmClock className="size-3.5" aria-hidden /> Follow-ups due <span className="tabular-nums">{stats.data.followUpsDue}</span>
            </button>
          </li>
        )}
      </ul>

      <Toolbar>
        <SearchBox value={table.query} onChange={table.setQuery} placeholder="Search name, mobile, city, requirement or notes" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open (not closed)' }, { value: CONTACTED_FILTER, label: 'Contacted / in progress' }, { value: 'closed-all', label: 'Closed (all)' }, ...ENQUIRY_STATUSES.map((s) => ({ value: s.value, label: s.label }))]} />
        <FilterSelect label="Source" value={source} onChange={setSource} options={SOURCE_FILTERS} />
        <FilterSelect label="Follow-up" value={follow} onChange={setFollow} options={FOLLOW_FILTERS} />
        {(canAssign || users.data) && (
          <FilterSelect label="Assigned" value={assigned} onChange={setAssigned}
            options={[{ value: 'all', label: 'Anyone' }, { value: 'me', label: 'Me' }, { value: 'unassigned', label: 'Unassigned' }, ...(users.data ?? []).filter((u) => u.id !== user?.id).map((u) => ({ value: u.id, label: u.name }))]} />
        )}
        <FilterDate label="From" value={from} onChange={setFrom} />
        <FilterDate label="To" value={to} onChange={setTo} min={from || undefined} />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORTS} />
        {filtersActive && <Button variant="ghost" size="sm" onClick={() => { setStatus('all'); setSource('all'); setFollow('all'); setAssigned('all'); setFrom(''); setTo(''); table.setQuery('') }}>Clear</Button>}
      </Toolbar>

      {table.error && !table.pageRows.length ? <ErrorState message={errorMessage(table.error)} onRetry={() => void table.refetch()} /> : (
        <div className={cn('transition-opacity', table.isFetching && table.isPlaceholderData && 'opacity-60')} aria-busy={table.isFetching || undefined}>
          <DataTable
            caption="Enquiries"
            rows={table.pageRows}
            empty={table.isPending ? <p className="p-8 text-center text-muted">Loading enquiries…</p> : (
              <EmptyState
                title={filtersActive ? 'No enquiries match' : 'No enquiries yet'}
                message={filtersActive ? 'Try clearing the search or filters.' : 'Website form submissions appear here. You can also add one by hand or import an Excel file.'}
                action={canWrite && !filtersActive ? <Button onClick={() => setEditing({ value: blank(), isNew: true })}>New enquiry</Button> : undefined}
              />
            )}
            columns={[
              { header: 'Customer', cell: (e) => <button type="button" className="text-left" onClick={() => openLead(e.id)}><p className={e.name ? 'font-semibold text-ink hover:underline' : 'font-semibold italic text-muted hover:underline'}>{enquiryDisplayName(e)}</p><p className="text-muted">{[e.phone || e.email, e.city].filter(Boolean).join(', ')}</p></button> },
              { header: 'Received', cell: (e) => <span className="whitespace-nowrap text-muted" title={formatDateTime(e.createdAt)}>{formatDate(e.createdAt)}</span> },
              { header: 'Requirement', cell: (e) => <div className="max-w-xs"><p className="text-ink-soft">{e.service}</p><p className="text-muted">{SOURCE_LABEL[e.source]}{e.propertyType ? ` · ${PROPERTY_LABEL[e.propertyType]}` : ''}</p></div> },
              { header: 'Type', cell: (e) => { const t = enquiryTypeOf(e); return t ? <span className="whitespace-nowrap text-ink-soft">{ENQUIRY_TYPE_LABEL[t]}</span> : <span className="text-muted">—</span> } },
              { header: 'kW', cell: (e) => { const cap = capacityLabel(e); return cap ? <span className="whitespace-nowrap tabular-nums text-ink-soft">{cap}</span> : <span className="text-muted">—</span> } },
              { header: 'Status', cell: (e) => (
                <select aria-label={`Status for ${e.name}`} value={e.status} disabled={!canWrite || setLeadStatus.isPending} onChange={(ev) => void changeStatus(e, ev.target.value as EnquiryStatus)}
                  className={cn('h-8 rounded-field border bg-canvas px-2 text-sm', e.status === 'new' ? 'border-sun-400' : isClosedStatus(e.status) ? 'border-line text-muted' : 'border-line')}>
                  {ENQUIRY_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) },
              { header: 'Follow-up', cell: (e) => e.followUpOn ? (
                <span className={cn('whitespace-nowrap text-sm', !isClosedStatus(e.status) && e.followUpOn < today ? 'font-semibold text-clay-700' : !isClosedStatus(e.status) && e.followUpOn === today ? 'font-semibold text-sun-500' : 'text-ink-soft')}>
                  {formatDate(e.followUpOn)}<span className="block text-xs font-normal text-muted">{relativeDay(e.followUpOn, today)}</span>
                </span>
              ) : <span className="text-muted">—</span> },
              { header: 'Assigned', cell: (e) => <span className="whitespace-nowrap text-sm text-ink-soft">{e.assignedToName ?? '—'}</span> },
              { header: 'Last contact', cell: (e) => <span className="whitespace-nowrap text-sm text-muted">{e.lastContactedAt ? formatDate(e.lastContactedAt) : 'Never'}{e.contactCount ? ` · ${e.contactCount}×` : ''}</span> },
              { header: 'Actions', className: 'text-right', cell: (e) => (
                <div className="flex items-center justify-end gap-1.5">
                  <IconAction label={`View enquiry from ${e.name}`} onClick={() => openLead(e.id)}><Eye className="size-4" /></IconAction>
                  {e.phone && <a href={telHref(e.phone)} onClick={() => window.setTimeout(() => openLead(e.id), 400)} aria-label={`Call ${e.name}`} title="Call (then log the result)" className="grid size-9 place-items-center rounded-field border border-line text-ink-soft hover:bg-ice-100"><Phone className="size-4" /></a>}
                  {e.phone && <a href={whatsappHref('91' + e.phone.replace(/\D/g, '').slice(-10), `Hi ${e.name}, this is Baba Solars regarding your enquiry about ${e.service}.`)} target="_blank" rel="noopener noreferrer" onClick={() => window.setTimeout(() => openLead(e.id), 400)} aria-label={`WhatsApp ${e.name}`} title="WhatsApp (then log the result)" className="grid size-9 place-items-center rounded-field border border-line text-[#1f7a4d] hover:bg-leaf-100"><WhatsAppIcon className="size-4" /></a>}
                  {canWrite && <IconAction label={`Edit enquiry from ${e.name}`} onClick={() => setEditing({ value: structuredClone(e), isNew: false })}><Pencil className="size-4" /></IconAction>}
                  {canQuote && <IconAction label={`Create proposal for ${e.name}`} onClick={() => navigate(`/admin/proposals?fromEnquiry=${e.id}`)}><FilePlus2 className="size-4" /></IconAction>}
                  {canQuote && <IconAction label={`Create quotation for ${e.name}`} onClick={() => navigate(`/admin/quotations?fromEnquiry=${e.id}`)}><FileText className="size-4" /></IconAction>}
                  {canDelete && <IconAction label={`Delete enquiry from ${e.name}`} danger onClick={() => setDeleting(e)}><Trash2 className="size-4" /></IconAction>}
                </div>
              ) },
            ]}
          />
        </div>
      )}
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} noun="enquiries" />

      {viewing && (
        <LeadDetail id={viewing} initial={table.pageRows.find((r) => r.id === viewing)} onClose={() => openLead(null)} readOnly={!canWrite} canAssign={canAssign} canQuote={canQuote}
          onEdit={(e) => { setEditing({ value: structuredClone(e), isNew: false }); openLead(null) }} openDoc={(path) => navigate(path)} />
      )}
      {editing && <EnquiryForm initial={editing.value} isNew={editing.isNew} canAssign={canAssign} onClose={() => setEditing(null)} />}
      {importing && (existing.data
        ? <EnquiryImportDialog existing={existing.data} onClose={() => { setImporting(false); void refreshLeads(qc) }} />
        : <Modal open onClose={() => setImporting(false)} title="Import enquiries"><p className="text-muted">Loading existing enquiries for the duplicate check…</p></Modal>)}
      {quickFollow && <QuickFollowUp e={quickFollow.e} onClose={() => setQuickFollow(null)} />}

      <ConfirmDialog open={!!deleting} title="Delete this enquiry?" message={`The enquiry from ${deleting?.name} will be removed from the list. Its history is kept in the database, and proposals and quotations made from it are kept.`}
        confirmLabel="Delete enquiry"
        onConfirm={() => { const d = deleting; setDeleting(null); if (d) remove.mutateAsync(d.id).then(() => toast({ title: 'Enquiry deleted' })).catch((err) => toast({ tone: 'error', title: 'Not deleted', description: errorMessage(err) })) }}
        onCancel={() => setDeleting(null)} />
    </>
  )
}

/** Choosing "Follow-up Required" in the table asks for the date first. */
function QuickFollowUp({ e, onClose }: { e: Enquiry; onClose: () => void }) {
  const { setStatus } = useLeadActions()
  const toast = useToast()
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!date) return toast({ tone: 'error', title: 'Pick the follow-up date' })
    try {
      await setStatus.mutateAsync({ id: e.id, status: 'follow-up', followUpOn: date, note: note.trim() })
      toast({ title: `Follow-up on ${formatDate(date)}`, description: e.name })
      onClose()
    } catch (err) { toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) }) }
  }
  return (
    <Modal open onClose={onClose} title={`Follow-up for ${e.name}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="quick-follow" loading={setStatus.isPending}>Save</Button></>}>
      <form id="quick-follow" onSubmit={save} className="grid gap-4">
        <Input label="Follow-up date" type="date" min={todayISO()} required value={date} onChange={(ev) => setDate(ev.target.value)} />
        <Input label="Note" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Call back after Diwali" />
      </form>
    </Modal>
  )
}

function EnquiryForm({ initial, isNew, canAssign, onClose }: { initial: EnquirySave; isNew: boolean; canAssign: boolean; onClose: () => void }) {
  const save = useSaveEnquiry()
  const toast = useToast()
  const { can } = useAuth()
  const users = useAssignableUsers(canAssign)
  const [f, setF] = useState<EnquirySave>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [withProposal, setWithProposal] = useState(isNew && initial.source === 'manual')
  const websiteRecord = !isNew && originOf(initial.source) !== 'admin'
  const set = <K extends keyof EnquirySave>(k: K, v: EnquirySave[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n })
  }
  const num = (v: string) => (v === '' ? null : Number(v))

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const errs = validateEnquiry(f)
    setErrors(errs)
    if (Object.keys(errs).length) { toast({ tone: 'error', title: 'Fix the highlighted fields', description: Object.values(errs)[0] }); return }
    try {
      const res = await save.mutateAsync({ data: f, createProposal: isNew && withProposal })
      toast({
        title: isNew ? 'Enquiry added' : 'Enquiry saved',
        description: res.proposal ? `Draft proposal ${res.proposal.proposalNumber} created — find it under Proposals.` : undefined,
      })
      onClose()
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors)
      toast({ tone: 'error', title: 'Enquiry not saved', description: errorMessage(e) })
    }
  }

  const sourceOptions = websiteRecord
    ? ENQUIRY_SOURCES.filter((s) => s.value === initial.source).map((s) => ({ value: s.value, label: s.label }))
    : ADMIN_SOURCES.map((s) => ({ value: s.value, label: s.label }))

  return (
    <Modal open onClose={() => !save.isPending && onClose()} title={isNew ? 'New enquiry' : `Edit enquiry — ${initial.name}`} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="enquiry-form" loading={save.isPending}>{isNew ? 'Add enquiry' : 'Save changes'}</Button>
        </>
      }>
      <form id="enquiry-form" onSubmit={submit} noValidate className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink-soft">Customer</p>
          <CustomerPicker onPick={(c) => setF((p) => ({ ...p, name: c.name, phone: c.phone, email: c.email || p.email, address: c.address || p.address, city: c.city || p.city, state: c.state || p.state }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Customer name" value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="off" />
          <Input label="Mobile" required={!f.email.trim()} type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} hint="10-digit Indian mobile (or give an email)" />
          <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
          <Input label="City / location" value={f.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="Address" value={f.address ?? ''} onChange={(e) => set('address', e.target.value)} wrapperClassName="sm:col-span-2" />
          <Select label="State" value={f.state ?? ''} onChange={(e) => set('state', e.target.value)} options={STATE_OPTIONS} />
          <Input label="PIN code" inputMode="numeric" maxLength={6} value={f.pincode ?? ''} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} error={errors.pincode} />
        </div>
        <p className="border-t border-line pt-4 text-sm font-semibold text-ink-soft">Requirement</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Requirement" required value={f.service} onChange={(e) => set('service', e.target.value)} error={errors.service} placeholder="e.g. 5 kW roof solar for home" wrapperClassName="sm:col-span-2" />
          <Select label="Property type" value={f.propertyType ?? ''} onChange={(e) => set('propertyType', (e.target.value || undefined) as PropertyType | undefined)} options={[{ value: '', label: '—' }, ...PROPERTY_OPTIONS]} />
          <Input label="System capacity (kW)" type="number" step="0.5" min={0} value={f.capacityKw ?? ''} onChange={(e) => set('capacityKw', num(e.target.value))} error={errors.capacityKw} />
          <Input label="Monthly bill (₹)" type="number" min={0} prefix="₹" value={f.monthlyBill ?? ''} onChange={(e) => set('monthlyBill', num(e.target.value))} error={errors.monthlyBill} />
          <Select label="Source" value={f.source} disabled={websiteRecord} onChange={(e) => { const v = e.target.value as EnquirySource; set('source', v); if (isNew) setWithProposal(v === 'manual') }} options={sourceOptions} hint={websiteRecord ? 'Received from the website — source cannot be changed.' : undefined} />
          <Select label="Status" value={f.status} onChange={(e) => set('status', e.target.value as EnquiryStatus)} options={ENQUIRY_STATUSES} />
          <Input label="Follow-up date" type="date" value={f.followUpOn ?? ''} onChange={(e) => set('followUpOn', e.target.value || null)} error={errors.followUpOn} hint={f.status === 'follow-up' ? 'Required for “Follow-up Required”.' : undefined} />
          {canAssign && (
            <Select label="Assigned to" value={f.assignedTo ?? ''} onChange={(e) => set('assignedTo', e.target.value || null)}
              options={[{ value: '', label: 'Unassigned' }, ...(users.data ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))]} />
          )}
        </div>
        <Textarea label="Customer message / details" rows={3} value={f.message} onChange={(e) => set('message', e.target.value)} />
        <Textarea label="Internal notes" rows={3} value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} hint="Only visible in the admin panel." />
        {isNew && can('quotations:write') && (
          <Toggle label="Also start a draft proposal" checked={withProposal} onChange={setWithProposal} description="Manual enquiries are added to Proposals too, with the customer details filled in." />
        )}
      </form>
    </Modal>
  )
}
