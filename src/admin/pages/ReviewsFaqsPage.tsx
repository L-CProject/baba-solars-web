import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Faq, Testimonial } from '@/types'
import { useCollection } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { createId } from '@/lib/id'
import { Button, ConfirmDialog, EmptyState, Input, Modal, Select, Textarea, Toggle } from '@/components/ui'
import { AdminPageHeader, DataTable, FilterSelect, IconAction, SearchBox, StatusBadge, Toolbar } from '../components/AdminUI'
import { useCrud } from '../hooks/useCrud'
import { useReorderList } from '../hooks/useReorderList'

const FAQ_CATS: Array<{ value: Faq['category']; label: string }> = [
  { value: 'general', label: 'General' }, { value: 'pricing', label: 'Pricing' }, { value: 'subsidy', label: 'Subsidy' }, { value: 'maintenance', label: 'Maintenance' },
]

/** Customer reviews (home page) and FAQs (FAQ, pricing, drone and PM Surya Ghar pages). */
export default function ReviewsFaqsPage() {
  useSeo({ title: 'Reviews & FAQs', path: '/admin/reviews-faqs', noIndex: true })
  const [params, setParams] = useSearchParams()
  const tab: 'reviews' | 'faqs' = params.get('tab') === 'faqs' ? 'faqs' : 'reviews'
  const setTab = (t: 'reviews' | 'faqs') => setParams(t === 'faqs' ? { tab: 'faqs' } : {}, { replace: true })
  return (
    <>
      <AdminPageHeader title="Reviews & FAQs" description="Customer reviews on the home page, and the questions shown on the FAQ and service pages." />
      <div className="mb-5 flex gap-2" role="tablist">
        {(['reviews', 'faqs'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-chip px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? 'bg-navy-700 text-snow-50' : 'bg-surface text-ink-soft shadow-soft hover:text-ink'}`}>
            {t === 'reviews' ? 'Customer reviews' : 'FAQs'}
          </button>
        ))}
      </div>
      {tab === 'reviews' ? <Reviews /> : <Faqs />}
    </>
  )
}

const sorted = <T extends { order?: number }>(l: T[]) => [...l].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

type StatusFilter = 'all' | 'published' | 'draft'
const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [{ value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Hidden' }]

function Reviews() {
  const allReviews = sorted(useCollection('testimonials'))
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return allReviews.filter((r) => (status === 'all' || (r.status ?? 'published') === status) && (!t || `${r.name} ${r.location} ${r.system} ${r.quote}`.toLowerCase().includes(t)))
  }, [allReviews, q, status])
  const crud = useCrud('testimonials', 'Review')
  const { move, pending } = useReorderList('testimonials')
  const blank = (): Testimonial => ({ id: createId('t'), name: '', location: 'Raipur', system: '', rating: 5, quote: '', status: 'published' })
  return (
    <>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search reviews" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blank())}>Add review</Button>
      </Toolbar>
      <DataTable caption="Reviews" rows={list} empty={<EmptyState title={allReviews.length ? 'No reviews match' : 'No reviews yet'} />} columns={[
        { header: 'Customer', cell: (t) => <div><p className="font-semibold">{t.name}</p><p className="text-muted">{[t.location, t.system].filter(Boolean).join(' · ')}</p></div> },
        { header: 'Review', cell: (t) => <div className="max-w-md"><p className="flex text-sun-500" aria-label={`${t.rating} stars`}>{Array.from({ length: t.rating }, (_, i) => <Star key={i} className="size-3.5 fill-current" aria-hidden />)}</p><p className="line-clamp-2 text-ink-soft">{t.quote}</p></div> },
        { header: 'Status', cell: (t) => <StatusBadge status={t.status ?? 'published'} /> },
        { header: 'Actions', className: 'text-right', cell: (t) => (
          <div className="flex items-center justify-end gap-1.5">
            <IconAction label="Move up" disabled={pending} onClick={() => void move(t.id, -1, list.map((x) => x.id))}><ArrowUp className="size-4" /></IconAction>
            <IconAction label="Move down" disabled={pending} onClick={() => void move(t.id, 1, list.map((x) => x.id))}><ArrowDown className="size-4" /></IconAction>
            <IconAction label={`Edit review by ${t.name}`} onClick={() => crud.openEdit(t)}><Pencil className="size-4" /></IconAction>
            <IconAction label={`Delete review by ${t.name}`} danger onClick={() => crud.setDeleting(t)}><Trash2 className="size-4" /></IconAction>
          </div>) },
      ]} />
      <Modal open={!!crud.editing} onClose={crud.close} title={crud.isNew ? 'Add review' : 'Edit review'}
        footer={<><Button variant="secondary" onClick={crud.close}>Cancel</Button><Button type="submit" form="review-form" loading={crud.saving}>Save</Button></>}>
        {crud.editing && <ReviewForm initial={crud.editing} errors={crud.serverErrors} onSave={(t) => void crud.save(t)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this review?" message={`The review by ${crud.deleting?.name} will be removed from the website.`} confirmLabel="Delete" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function ReviewForm({ initial, errors: serverErrors, onSave }: { initial: Testimonial; errors: Record<string, string>; onSave: (t: Testimonial) => void }) {
  const [t, setT] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const all = { ...serverErrors, ...errors }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!t.name.trim()) errs.name = 'Enter the customer name.'
    if (!t.quote.trim()) errs.quote = 'Enter the review text.'
    setErrors(errs)
    if (!Object.keys(errs).length) onSave(t)
  }
  return (
    <form id="review-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input label="Customer name" required value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} error={all.name} />
      <Input label="Location" value={t.location} onChange={(e) => setT({ ...t, location: e.target.value })} />
      <Input label="System" placeholder="3 kW on-grid" value={t.system} onChange={(e) => setT({ ...t, system: e.target.value })} />
      <Select label="Rating" value={String(t.rating)} onChange={(e) => setT({ ...t, rating: Number(e.target.value) })} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))} />
      <Textarea label="Review" required rows={4} value={t.quote} onChange={(e) => setT({ ...t, quote: e.target.value })} error={all.quote} wrapperClassName="sm:col-span-2" />
      <div className="sm:col-span-2"><Toggle label="Published" checked={(t.status ?? 'published') === 'published'} onChange={(v) => setT({ ...t, status: v ? 'published' : 'draft' })} /></div>
    </form>
  )
}

function Faqs() {
  const all = sorted(useCollection('faqs'))
  const crud = useCrud('faqs', 'FAQ')
  const { move, pending } = useReorderList('faqs')
  const [cat, setCat] = useState<Faq['category'] | 'all'>('all')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return all.filter((f) => (cat === 'all' || f.category === cat) && (status === 'all' || (f.status ?? 'published') === status) && (!t || `${f.question} ${f.answer}`.toLowerCase().includes(t)))
  }, [all, cat, q, status])
  const blank = (): Faq => ({ id: createId('f'), category: cat === 'all' ? 'general' : cat, question: '', answer: '', status: 'published' })
  return (
    <>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search questions" />
        <FilterSelect label="Category" value={cat} onChange={setCat} options={[{ value: 'all' as const, label: 'All' }, ...FAQ_CATS]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blank())}>Add FAQ</Button>
      </Toolbar>
      <DataTable caption="FAQs" rows={list} empty={<EmptyState title="No FAQs here" />} columns={[
        { header: 'Question', cell: (f) => <div className="max-w-xl"><p className="font-semibold">{f.question}</p><p className="line-clamp-2 text-muted">{f.answer}</p></div> },
        { header: 'Category', cell: (f) => <span className="capitalize">{f.category}</span> },
        { header: 'Status', cell: (f) => <StatusBadge status={f.status ?? 'published'} /> },
        { header: 'Actions', className: 'text-right', cell: (f) => (
          <div className="flex items-center justify-end gap-1.5">
            <IconAction label="Move up" disabled={pending} onClick={() => void move(f.id, -1, list.map((x) => x.id))}><ArrowUp className="size-4" /></IconAction>
            <IconAction label="Move down" disabled={pending} onClick={() => void move(f.id, 1, list.map((x) => x.id))}><ArrowDown className="size-4" /></IconAction>
            <IconAction label={`Edit FAQ`} onClick={() => crud.openEdit(f)}><Pencil className="size-4" /></IconAction>
            <IconAction label={`Delete FAQ`} danger onClick={() => crud.setDeleting(f)}><Trash2 className="size-4" /></IconAction>
          </div>) },
      ]} />
      <Modal open={!!crud.editing} onClose={crud.close} title={crud.isNew ? 'Add FAQ' : 'Edit FAQ'} size="lg"
        footer={<><Button variant="secondary" onClick={crud.close}>Cancel</Button><Button type="submit" form="faq-form" loading={crud.saving}>Save</Button></>}>
        {crud.editing && <FaqForm initial={crud.editing} errors={crud.serverErrors} onSave={(f) => void crud.save(f)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this FAQ?" message={crud.deleting?.question ?? ''} confirmLabel="Delete" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function FaqForm({ initial, errors: serverErrors, onSave }: { initial: Faq; errors: Record<string, string>; onSave: (f: Faq) => void }) {
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const all = { ...serverErrors, ...errors }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!f.question.trim()) errs.question = 'Enter the question.'
    if (!f.answer.trim()) errs.answer = 'Enter the answer.'
    setErrors(errs)
    if (!Object.keys(errs).length) onSave(f)
  }
  return (
    <form id="faq-form" onSubmit={submit} noValidate className="grid gap-4">
      <Select label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Faq['category'] })} options={FAQ_CATS} />
      <Input label="Question" required value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} error={all.question} />
      <Textarea label="Answer" required rows={5} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} error={all.answer} />
      <Toggle label="Published" checked={(f.status ?? 'published') === 'published'} onChange={(v) => setF({ ...f, status: v ? 'published' : 'draft' })} />
    </form>
  )
}
