import { useState, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck, CalendarClock, CalendarX, CheckCircle2, CircleDot, FilePlus2, FileText, Handshake, Mail, MessageSquare, Pencil, Phone, StickyNote, UserRound,
} from 'lucide-react'
import type { ContactOutcome, Enquiry, EnquiryActivity, EnquiryStatus } from '@/types'
import { api } from '@/services/api'
import { useAssignableUsers, useEnquiryDetail, useLeadActions } from '@/queries'
import { useToast } from '@/context/ToastContext'
import {
  ACTIVITY_LABEL, CONTACT_ACTIVITIES, CONTACT_OUTCOMES, ENQUIRY_STATUSES, ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, OUTCOME_LABEL, SOURCE_LABEL,
  enquiryTypeOf, isClosedStatus,
  capacityLabel, enquiryDisplayName,
} from '@/lib/enquiries'
import { PROPERTY_LABEL } from '@/lib/labels'
import { todayISO } from '@/lib/files'
import { formatDate, formatDateTime, formatINR, mailHref, relativeDay, telHref, whatsappHref } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button, ErrorState, Input, LinkButton, Modal, Select, Spinner, Textarea, WhatsAppIcon } from '@/components/ui'
import { DetailList, ToneBadge } from './AdminUI'
import { enquiryTone } from '../constants'
import { errorMessage } from '../hooks/useCrud'

type ContactType = (typeof CONTACT_ACTIVITIES)[number]['value']

/** Status to suggest after a contact attempt (the admin can change it). */
function suggestStatus(current: EnquiryStatus, type: ContactType, outcome: ContactOutcome | ''): EnquiryStatus | '' {
  if (type === 'note' || isClosedStatus(current)) return ''
  if (outcome === 'no-answer' || outcome === 'busy' || outcome === 'switched-off') return current === 'new' ? 'pending' : ''
  if (outcome === 'callback-requested') return 'follow-up'
  if (current === 'new' || current === 'pending') return 'contacted'
  return ''
}

const ACTIVITY_ICON: Partial<Record<EnquiryActivity['type'], ReactNode>> = {
  call: <Phone className="size-3.5" />, whatsapp: <MessageSquare className="size-3.5" />, email: <Mail className="size-3.5" />, meeting: <Handshake className="size-3.5" />,
  note: <StickyNote className="size-3.5" />, status: <CircleDot className="size-3.5" />, assigned: <UserRound className="size-3.5" />,
  'follow-up-scheduled': <CalendarClock className="size-3.5" />, 'follow-up-done': <CalendarCheck className="size-3.5" />, 'follow-up-cancelled': <CalendarX className="size-3.5" />,
  created: <CheckCircle2 className="size-3.5" />, imported: <CheckCircle2 className="size-3.5" />, updated: <Pencil className="size-3.5" />,
}

/**
 * One lead with its full history. Staff can change status, log calls / WhatsApp / emails,
 * schedule and close follow-ups and (admins) assign the lead. `readOnly` (owner portal) shows
 * the same information without any controls.
 */
export function LeadDetail({ id, initial, onClose, readOnly = false, canAssign = false, canQuote = false, onEdit, openDoc }: {
  id: string
  /** The row from the table, shown immediately while the full history loads. */
  initial?: Enquiry
  onClose: () => void
  readOnly?: boolean
  canAssign?: boolean
  canQuote?: boolean
  onEdit?: (e: Enquiry) => void
  openDoc?: (path: string) => void
}) {
  const detail = useEnquiryDetail(id, initial)
  const loadingHistory = detail.isPlaceholderData
  const e = detail.data?.enquiry
  const linked = useQuery({
    queryKey: ['admin', 'leads', 'linked', id],
    queryFn: async () => {
      const [p, q] = await Promise.all([api.listProposals({ enquiryId: id, limit: 50 }), api.listQuotations({ enquiryId: id, limit: 50 })])
      return { proposals: p.items, quotations: q.items }
    },
    enabled: canQuote && !!e,
  })

  return (
    <Modal open onClose={onClose} size="xl" title={e ? `Lead — ${enquiryDisplayName(e)}` : 'Lead'}
      description={e ? `Received ${formatDateTime(e.createdAt)} · ${SOURCE_LABEL[e.source] ?? e.source}` : undefined}
      footer={
        <>
          {!readOnly && e && onEdit && <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => onEdit(e)}>Edit details</Button>}
          {canQuote && e && openDoc && <Button variant="secondary" leftIcon={<FilePlus2 className="size-4" />} onClick={() => openDoc(`/admin/proposals?fromEnquiry=${e.id}`)}>Create proposal</Button>}
          {canQuote && e && openDoc && <Button variant="secondary" leftIcon={<FileText className="size-4" />} onClick={() => openDoc(`/admin/quotations?fromEnquiry=${e.id}`)}>Create quotation</Button>}
          <Button onClick={onClose}>Done</Button>
        </>
      }>
      {detail.isPending ? <div className="grid place-items-center py-16"><Spinner label="Loading lead" /></div>
        : detail.error ? <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />
          : e && detail.data ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0 space-y-5">
                <LeadSummary e={e} />
                {!readOnly && !loadingHistory && <ContactLogger e={e} />}
                {(linked.data?.proposals.length || linked.data?.quotations.length) ? (
                  <div>
                    <p className="text-sm text-muted">Linked documents</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {linked.data.proposals.map((p) => <li key={p.id}><button type="button" className="rounded-chip border border-line px-3 py-1 text-sm hover:bg-ice-100" onClick={() => openDoc?.(`/admin/proposals?open=${p.id}`)}>Proposal {p.proposalNumber} · {p.status}</button></li>)}
                      {linked.data.quotations.map((q) => <li key={q.id}><button type="button" className="rounded-chip border border-line px-3 py-1 text-sm hover:bg-ice-100" onClick={() => openDoc?.(`/admin/quotations?open=${q.id}`)}>Quotation {q.quoteNumber ?? ''} · {q.status}</button></li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 space-y-5">
                <StatusPanel e={e} readOnly={readOnly || loadingHistory} />
                {loadingHistory ? <div className="grid place-items-center py-10"><Spinner label="Loading history" /></div> : (
                  <>
                    <FollowUpPanel e={e} followUps={detail.data.followUps} readOnly={readOnly} />
                    <AssignPanel e={e} canAssign={canAssign && !readOnly} />
                    <Timeline activities={detail.data.activities} />
                  </>
                )}
              </div>
            </div>
          ) : null}
    </Modal>
  )
}

function LeadSummary({ e }: { e: Enquiry }) {
  const est = e.estimate
  const type = enquiryTypeOf(e)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {e.phone && <LinkButton href={telHref(e.phone)} variant="secondary" size="sm" leftIcon={<Phone className="size-4" />}>Call {e.phone}</LinkButton>}
        {e.phone && <LinkButton href={whatsappHref('91' + e.phone.replace(/\D/g, '').slice(-10), `Hi ${e.name}, this is Baba Solars regarding your enquiry about ${e.service}.`)} external variant="secondary" size="sm" leftIcon={<WhatsAppIcon className="size-4" />}>WhatsApp</LinkButton>}
        {e.email && <LinkButton href={mailHref(e.email, `Re: ${e.service}`)} variant="secondary" size="sm" leftIcon={<Mail className="size-4" />}>Email</LinkButton>}
      </div>
      <DetailList items={[
        ['Mobile', e.phone], ['Email', e.email], ['City / location', e.city], ['State', e.state], ['Address', e.address], ['PIN code', e.pincode],
        ['Requirement', e.service], ['Enquiry type', type ? ENQUIRY_TYPE_LABEL[type] : ''], ['Property type', e.propertyType ? PROPERTY_LABEL[e.propertyType] : ''],
        ['System capacity', capacityLabel(e)], ['Monthly bill', e.monthlyBill ? formatINR(e.monthlyBill) : ''],
        ['Last contacted', e.lastContactedAt ? `${formatDateTime(e.lastContactedAt)} (${e.contactCount ?? 0} total)` : 'Not yet'],
      ]} />
      {est && (
        <div className="rounded-card bg-ice-100/70 p-4 text-sm">
          <p className="font-semibold text-ink">Website calculator estimate</p>
          <p className="mt-1 text-ink-soft">{est.capacityKw} kW {est.systemType} · {PROPERTY_LABEL[est.propertyType]} · bill {formatINR(est.monthlyBill)}{est.monthlyUnits ? ` (~${est.monthlyUnits} units)` : ''}</p>
          <p className="text-ink-soft">Estimated {formatINR(est.estimatedCost)} · subsidy {formatINR(est.subsidy)} · after subsidy {formatINR(est.netCost)}{est.quality ? ` · ${est.quality} plan` : ''}</p>
        </div>
      )}
      {e.message && <div><p className="text-sm text-muted">Customer message</p><p className="mt-1 whitespace-pre-wrap rounded-field bg-snow-200/60 p-4 text-ink-soft">{e.message}</p></div>}
      {e.notes && <div><p className="text-sm text-muted">Internal notes</p><p className="mt-1 whitespace-pre-wrap rounded-field bg-sun-300/20 p-4 text-ink-soft">{e.notes}</p></div>}
      {e.submissionId && <p className="break-all font-mono text-xs text-muted">Submission ID {e.submissionId}</p>}
    </div>
  )
}

/** After a call / WhatsApp: what happened, the new status and the next follow-up — one step. */
function ContactLogger({ e }: { e: Enquiry }) {
  const { logActivity } = useLeadActions()
  const toast = useToast()
  const [type, setType] = useState<ContactType>('call')
  const [outcome, setOutcome] = useState<ContactOutcome | ''>('connected')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<EnquiryStatus | ''>(suggestStatus(e.status, 'call', 'connected'))
  const [followUpOn, setFollowUpOn] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const outcomes = type === 'note' ? [] : CONTACT_OUTCOMES.filter((o) => o.for.includes(type))

  const pickType = (t: ContactType) => {
    setType(t)
    const first = t === 'note' ? '' : CONTACT_OUTCOMES.find((o) => o.for.includes(t))?.value ?? ''
    setOutcome(first)
    setStatus(suggestStatus(e.status, t, first))
  }
  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const errs: Record<string, string> = {}
    if (type === 'note' && !note.trim()) errs.note = 'Write the note.'
    if (status === 'follow-up' && !followUpOn && !e.followUpOn) errs.followUpOn = 'Pick the follow-up date.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await logActivity.mutateAsync({ id: e.id, activity: { type, outcome: outcome || null, note: note.trim(), ...(status ? { status } : {}), ...(followUpOn ? { followUpOn } : {}) } })
      toast({ title: `${type === 'note' ? 'Note' : CONTACT_ACTIVITIES.find((a) => a.value === type)!.label} logged`, description: status ? `Status: ${ENQUIRY_STATUS_LABEL[status]}` : undefined })
      setNote(''); setFollowUpOn(''); setStatus('')
    } catch (err) {
      toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) })
    }
  }
  return (
    <form onSubmit={submit} noValidate className="rounded-card border border-line bg-surface p-4">
      <p className="font-semibold text-ink">Log a call, WhatsApp or note</p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
        {CONTACT_ACTIVITIES.map((a) => (
          <button key={a.value} type="button" role="radio" aria-checked={type === a.value} onClick={() => pickType(a.value)}
            className={cn('rounded-chip border px-3 py-1 text-sm font-medium', type === a.value ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-canvas text-ink-soft hover:border-steel-400')}>
            {a.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {outcomes.length > 0 && <Select label="Result" value={outcome} onChange={(ev) => { const o = ev.target.value as ContactOutcome; setOutcome(o); setStatus(suggestStatus(e.status, type, o)) }} options={outcomes.map((o) => ({ value: o.value, label: o.label }))} />}
        <Select label="Change status to" value={status} onChange={(ev) => setStatus(ev.target.value as EnquiryStatus | '')} options={[{ value: '', label: `Keep (${ENQUIRY_STATUS_LABEL[e.status]})` }, ...ENQUIRY_STATUSES.filter((s) => s.value !== e.status)]} />
        <Input label="Next follow-up" type="date" min={todayISO()} value={followUpOn} onChange={(ev) => setFollowUpOn(ev.target.value)} error={errors.followUpOn} hint={e.followUpOn ? `Current: ${formatDate(e.followUpOn)}` : 'Optional'} />
      </div>
      <Textarea label="What was discussed" rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} error={errors.note} wrapperClassName="mt-3" placeholder="e.g. Wants 5 kW, site visit on Saturday" />
      <div className="mt-3 flex justify-end"><Button type="submit" size="sm" loading={logActivity.isPending}>Save</Button></div>
    </form>
  )
}

function StatusPanel({ e, readOnly }: { e: Enquiry; readOnly: boolean }) {
  const { setStatus } = useLeadActions()
  const toast = useToast()
  const [next, setNext] = useState<EnquiryStatus>(e.status)
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const needDate = next === 'follow-up' && !e.followUpOn
  const save = async () => {
    if (needDate && !date) return toast({ tone: 'error', title: 'Pick the follow-up date' })
    try {
      await setStatus.mutateAsync({ id: e.id, status: next, note: note.trim(), ...(date ? { followUpOn: date } : {}) })
      toast({ title: `Status: ${ENQUIRY_STATUS_LABEL[next]}` })
      setNote(''); setDate('')
    } catch (err) { toast({ tone: 'error', title: 'Status not changed', description: errorMessage(err) }) }
  }
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2"><p className="font-semibold text-ink">Lead status</p><ToneBadge tone={enquiryTone[e.status]}>{ENQUIRY_STATUS_LABEL[e.status]}</ToneBadge></div>
      {!readOnly && (
        <div className="mt-3 grid gap-3">
          <Select label="New status" value={next} onChange={(ev) => setNext(ev.target.value as EnquiryStatus)} options={ENQUIRY_STATUSES} hint={ENQUIRY_STATUSES.find((s) => s.value === next)?.hint} />
          {needDate && <Input label="Follow-up date" type="date" min={todayISO()} value={date} onChange={(ev) => setDate(ev.target.value)} required />}
          <Input label="Reason / note" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder={next === 'not-interested' ? 'Why? e.g. price, roof not suitable' : 'Optional'} />
          <div className="flex justify-end"><Button size="sm" onClick={() => void save()} loading={setStatus.isPending} disabled={next === e.status && !note.trim()}>Update status</Button></div>
        </div>
      )}
    </div>
  )
}

function FollowUpPanel({ e, followUps, readOnly }: { e: Enquiry; followUps: Array<{ id: string; dueOn: string; note: string; status: string; assignedToName: string | null; completedAt: string | null }>; readOnly: boolean }) {
  const { scheduleFollowUp, completeFollowUp } = useLeadActions()
  const toast = useToast()
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const today = todayISO()
  const pending = followUps.find((f) => f.status === 'pending')
  const closed = isClosedStatus(e.status)
  const schedule = async () => {
    if (!due) return toast({ tone: 'error', title: 'Pick a date' })
    try {
      await scheduleFollowUp.mutateAsync({ id: e.id, dueOn: due, note: note.trim() })
      toast({ title: pending ? 'Follow-up rescheduled' : 'Follow-up scheduled', description: formatDate(due) })
      setDue(''); setNote('')
    } catch (err) { toast({ tone: 'error', title: 'Not scheduled', description: errorMessage(err) }) }
  }
  const close = async (status: 'done' | 'cancelled') => {
    if (!pending) return
    try {
      await completeFollowUp.mutateAsync({ id: e.id, followUpId: pending.id, status })
      toast({ title: status === 'done' ? 'Follow-up done' : 'Follow-up cancelled' })
    } catch (err) { toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) }) }
  }
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="font-semibold text-ink">Follow-up</p>
      {pending ? (
        <div className={cn('mt-2 rounded-field p-3 text-sm', pending.dueOn < today ? 'bg-clay-100/70' : pending.dueOn === today ? 'bg-sun-300/30' : 'bg-ice-100/70')}>
          <p className="font-semibold text-ink">{formatDate(pending.dueOn)} <span className="font-normal text-muted">({relativeDay(pending.dueOn, today)})</span></p>
          {pending.note && <p className="mt-1 whitespace-pre-wrap text-ink-soft">{pending.note}</p>}
          {pending.assignedToName && <p className="mt-1 text-xs text-muted">For {pending.assignedToName}</p>}
          {!readOnly && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" leftIcon={<CalendarCheck className="size-4" />} onClick={() => void close('done')} loading={completeFollowUp.isPending}>Mark done</Button>
              <Button size="sm" variant="ghost" onClick={() => void close('cancelled')}>Cancel</Button>
            </div>
          )}
        </div>
      ) : <p className="mt-1 text-sm text-muted">No follow-up scheduled.</p>}
      {!readOnly && !closed && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <Input label={pending ? 'Reschedule to' : 'Schedule on'} type="date" min={today} value={due} onChange={(ev) => setDue(ev.target.value)} />
          <Input label="Note" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Optional" />
          <Button size="sm" onClick={() => void schedule()} loading={scheduleFollowUp.isPending}>{pending ? 'Reschedule' : 'Schedule'}</Button>
        </div>
      )}
      {followUps.filter((f) => f.status !== 'pending').length > 0 && (
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">Earlier follow-ups</summary>
          <ul className="mt-2 space-y-1">{followUps.filter((f) => f.status !== 'pending').map((f) => <li key={f.id} className="text-ink-soft">{formatDate(f.dueOn)} — {f.status}{f.note ? ` · ${f.note}` : ''}</li>)}</ul>
        </details>
      )}
    </div>
  )
}

function AssignPanel({ e, canAssign }: { e: Enquiry; canAssign: boolean }) {
  const users = useAssignableUsers(canAssign)
  const { assign } = useLeadActions()
  const toast = useToast()
  if (!canAssign) return e.assignedToName ? <p className="text-sm text-muted">Assigned to <span className="font-semibold text-ink">{e.assignedToName}</span></p> : null
  const change = async (userId: string) => {
    try {
      await assign.mutateAsync({ id: e.id, userId: userId || null })
      toast({ title: userId ? `Assigned to ${users.data?.find((u) => u.id === userId)?.name}` : 'Unassigned' })
    } catch (err) { toast({ tone: 'error', title: 'Not assigned', description: errorMessage(err) }) }
  }
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <Select label="Assigned to" value={e.assignedTo ?? ''} disabled={assign.isPending || users.isPending} onChange={(ev) => void change(ev.target.value)}
        options={[{ value: '', label: 'Unassigned' }, ...(users.data ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))]} />
    </div>
  )
}

function Timeline({ activities }: { activities: EnquiryActivity[] }) {
  return (
    <div>
      <p className="font-semibold text-ink">History</p>
      <ol className="mt-3 space-y-3 border-l border-line pl-4">
        {activities.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[1.6rem] top-0.5 grid size-6 place-items-center rounded-full border border-line bg-surface text-steel-600" aria-hidden>{ACTIVITY_ICON[a.type]}</span>
            <p className="text-sm text-ink">
              <span className="font-semibold">{ACTIVITY_LABEL[a.type]}</span>
              {a.type === 'status' && a.toStatus ? <> · {a.fromStatus ? `${ENQUIRY_STATUS_LABEL[a.fromStatus]} → ` : ''}{ENQUIRY_STATUS_LABEL[a.toStatus]}</> : null}
              {a.outcome ? <> · {OUTCOME_LABEL[a.outcome]}</> : null}
            </p>
            {a.note && <p className="whitespace-pre-wrap text-sm text-ink-soft">{a.note}</p>}
            <p className="text-xs text-muted">{formatDateTime(a.createdAt)} · {a.actorName}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
