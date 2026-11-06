import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { EnquirySource } from '@/types'
import { api, type EnquiryListParams } from '@/services/api'
import { useSeo } from '@/hooks/useSeo'
import { useAssignableUsers } from '@/queries'
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, SOURCE_LABEL, capacityLabel, enquiryDisplayName, enquiryTypeOf, isClosedStatus } from '@/lib/enquiries'
import { todayISO } from '@/lib/files'
import { formatDate, relativeDay } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button, EmptyState, ErrorState } from '@/components/ui'
import { AdminPageHeader, DataTable, FilterDate, FilterSelect, Pagination, SearchBox, SortSelect, ToneBadge, Toolbar } from '@/admin/components/AdminUI'
import { LeadDetail } from '@/admin/components/LeadDetail'
import { enquiryTone } from '@/admin/constants'
import { errorMessage } from '@/admin/hooks/useCrud'
import { useServerTable, type ServerSort } from '@/admin/hooks/useServerTable'

const SORTS: ServerSort[] = [
  { value: 'new', label: 'Newest first', sort: 'createdAt', order: 'desc' },
  { value: 'old', label: 'Oldest first', sort: 'createdAt', order: 'asc' },
  { value: 'updated', label: 'Recently updated', sort: 'updatedAt', order: 'desc' },
  { value: 'follow', label: 'Follow-up date', sort: 'followUpOn', order: 'asc' },
  { value: 'status', label: 'Status (pipeline)', sort: 'status', order: 'asc' },
  { value: 'name', label: 'Name A–Z', sort: 'name', order: 'asc' },
]

/** Owner: every lead, read-only, with server-side search, filters, sorting and pagination. */
export default function OwnerLeadsPage() {
  useSeo({ title: 'All leads', path: '/owner/leads', noIndex: true })
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'all')
  const [source, setSource] = useState<string>('all')
  const [follow, setFollow] = useState(params.get('followUp') ?? 'all')
  const [assigned, setAssigned] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const users = useAssignableUsers()
  const viewing = params.get('open')
  const open = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set('open', id); else n.delete('open'); setParams(n, { replace: true }) }
  const table = useServerTable('enquiries', (p) => api.listEnquiries(p as EnquiryListParams), {
    sorts: SORTS,
    filters: { status: status === 'all' ? undefined : status, source: source === 'all' ? undefined : source, followUp: follow === 'all' ? undefined : follow, assignedTo: assigned === 'all' ? undefined : assigned, from: from || undefined, to: to || undefined },
  })
  const today = todayISO()
  const active = status !== 'all' || source !== 'all' || follow !== 'all' || assigned !== 'all' || !!from || !!to || !!table.query
  return (
    <>
      <AdminPageHeader title="All leads" description="Read-only view of every enquiry with its status, follow-up and history." />
      <Toolbar>
        <SearchBox value={table.query} onChange={table.setQuery} placeholder="Search name, mobile, city or requirement" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open (not closed)' }, ...ENQUIRY_STATUSES.map((s) => ({ value: s.value, label: s.label }))]} />
        <FilterSelect label="Source" value={source} onChange={setSource} options={[{ value: 'all', label: 'All sources' }, { value: 'website', label: 'Website (all forms)' }, { value: 'admin', label: 'Entered by staff' }, ...ENQUIRY_SOURCES.map((s) => ({ value: s.value as EnquirySource, label: s.label }))]} />
        <FilterSelect label="Follow-up" value={follow} onChange={setFollow} options={[{ value: 'all', label: 'Any' }, { value: 'due', label: 'Due' }, { value: 'overdue', label: 'Overdue' }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }]} />
        <FilterSelect label="Assigned" value={assigned} onChange={setAssigned} options={[{ value: 'all', label: 'Anyone' }, { value: 'unassigned', label: 'Unassigned' }, ...(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))]} />
        <FilterDate label="From" value={from} onChange={setFrom} />
        <FilterDate label="To" value={to} onChange={setTo} min={from || undefined} />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORTS} />
        {active && <Button variant="ghost" size="sm" onClick={() => { setStatus('all'); setSource('all'); setFollow('all'); setAssigned('all'); setFrom(''); setTo(''); table.setQuery('') }}>Clear</Button>}
      </Toolbar>
      {table.error && !table.pageRows.length ? <ErrorState message={errorMessage(table.error)} onRetry={() => void table.refetch()} /> : (
        <div className={cn('transition-opacity', table.isFetching && table.isPlaceholderData && 'opacity-60')}>
          <DataTable caption="Leads" rows={table.pageRows}
            empty={table.isPending ? <p className="p-8 text-center text-muted">Loading…</p> : <EmptyState title={active ? 'No leads match' : 'No leads yet'} message={active ? 'Try clearing the filters.' : 'Website enquiries appear here.'} />}
            columns={[
              { header: 'Customer', cell: (e) => <button type="button" className="text-left" onClick={() => open(e.id)}><p className="font-semibold text-ink hover:underline">{enquiryDisplayName(e)}</p><p className="text-muted">{[e.phone || e.email, e.city].filter(Boolean).join(', ')}</p></button> },
              { header: 'Received', cell: (e) => <span className="whitespace-nowrap text-muted">{formatDate(e.createdAt)}</span> },
              { header: 'Requirement', cell: (e) => { const t = enquiryTypeOf(e); return <div className="max-w-xs"><p className="text-ink-soft">{e.service}</p><p className="text-muted">{[t ? ENQUIRY_TYPE_LABEL[t] : '', capacityLabel(e), SOURCE_LABEL[e.source]].filter(Boolean).join(' · ')}</p></div> } },
              { header: 'Status', cell: (e) => <ToneBadge tone={enquiryTone[e.status]}>{ENQUIRY_STATUS_LABEL[e.status]}</ToneBadge> },
              { header: 'Follow-up', cell: (e) => e.followUpOn ? <span className={cn('whitespace-nowrap text-sm', !isClosedStatus(e.status) && e.followUpOn < today ? 'font-semibold text-clay-700' : 'text-ink-soft')}>{formatDate(e.followUpOn)}<span className="block text-xs text-muted">{relativeDay(e.followUpOn, today)}</span></span> : <span className="text-muted">—</span> },
              { header: 'Assigned', cell: (e) => <span className="text-sm text-ink-soft">{e.assignedToName ?? '—'}</span> },
              { header: 'Last contact', cell: (e) => <span className="whitespace-nowrap text-sm text-muted">{e.lastContactedAt ? formatDate(e.lastContactedAt) : 'Never'}</span> },
            ]} />
        </div>
      )}
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} noun="leads" />
      {viewing && <LeadDetail id={viewing} initial={table.pageRows.find((r) => r.id === viewing)} readOnly onClose={() => open(null)} />}
    </>
  )
}
