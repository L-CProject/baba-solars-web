import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Copy, ExternalLink, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { CapacityPlan, CapacitySegment, FieldErrors, PlanCategory, PricingPlan, PublishStatus } from '@/types'
import { useCollection, useSiteContent } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { createId } from '@/lib/id'
import { computeSubsidy } from '@/lib/subsidy'
import { formatPriceRange } from '@/lib/format'
import { errorsUnder, hasErrors, validateCapacityPlan, validatePricingPlan } from '@/lib/schemas'
import { cn } from '@/lib/cn'
import { Button, ConfirmDialog, EmptyState, Input, LinkButton, Modal, Segmented, Select, Toggle } from '@/components/ui'
import { PricingCard } from '@/components/common/PricingCard'
import { CapacityPlanCard } from '@/components/common/ReferencePlans'
import { AdminPageHeader, DataTable, FilterSelect, IconAction, SearchBox, StatusBadge, Toolbar } from '../components/AdminUI'
import { ItemListEditor, StringListEditor } from '../components/ListEditor'
import { useCrud } from '../hooks/useCrud'
import { useReorderList } from '../hooks/useReorderList'
import { PricingTextEditor } from './PricingTextEditor'
import { PlanTiersEditor } from './PlanTiersEditor'

const categoryOptions: Array<{ value: PlanCategory; label: string }> = [
  { value: 'residential', label: 'Home system' }, { value: 'commercial', label: 'Commercial system' }, { value: 'maintenance', label: 'Cleaning / AMC' },
]
const segmentOptions: Array<{ value: CapacitySegment; label: string }> = [
  { value: 'residential', label: 'Home' }, { value: 'commercial', label: 'Commercial' }, { value: 'industrial', label: 'Industrial' },
]
const statusOptions: Array<{ value: PublishStatus; label: string }> = [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]

type Tab = 'plans' | 'tiers' | 'capacity' | 'text'
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'plans', label: 'Price plans' }, { value: 'tiers', label: 'Normal & Premium' }, { value: 'capacity', label: 'Capacity plans' }, { value: 'text', label: 'Page text & buttons' },
]

const blankPlan = (order: number): PricingPlan => ({
  id: createId('plan'), name: '', category: 'residential', capacityKw: 3, priceMin: 0, priceMax: 0, subsidy: 0, priceUnit: '',
  idealFor: '', monthlyGeneration: '', roofArea: '', features: [], featured: false, badge: '', ctaLabel: '', status: 'published', order,
  updatedAt: new Date().toISOString(),
})

const blankCapacity = (order: number): CapacityPlan => ({
  id: createId('cap'), segment: 'residential', name: '', subtitle: '', capacity: '', specs: [{ label: 'Generation', value: '' }], features: [],
  featured: false, badge: '', priceNote: 'Price: on free site survey', ctaLabel: 'Get price', status: 'published', order, updatedAt: new Date().toISOString(),
})

const nextOrderOf = (list: Array<{ order: number }>) => Math.max(0, ...list.map((p) => p.order)) + 1

export default function PricingAdminPage() {
  useSeo({ title: 'Pricing', path: '/admin/pricing', noIndex: true })
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'plans') as Tab

  return (
    <>
      <AdminPageHeader
        title="Pricing"
        description="Everything on the website's Pricing page. Changes appear on the site as soon as you save."
        actions={<LinkButton href="/pricing" external variant="secondary" leftIcon={<ExternalLink className="size-4" />}>View Pricing page</LinkButton>}
      />
      <div role="tablist" aria-label="Pricing sections" className="mb-5 flex gap-1 overflow-x-auto rounded-field border border-line bg-surface p-1 shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={tab === t.value}
            aria-controls={`panel-${t.value}`}
            onClick={() => setParams(t.value === 'plans' ? {} : { tab: t.value }, { replace: true })}
            className={cn('flex-1 whitespace-nowrap rounded-[0.55rem] px-4 py-2 text-sm font-semibold transition-colors', tab === t.value ? 'bg-navy-800 text-snow-50 shadow-soft' : 'text-muted hover:bg-ice-100 hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'plans' && <PricePlansPanel />}
        {tab === 'tiers' && <PlanTiersEditor />}
        {tab === 'capacity' && <CapacityPlansPanel />}
        {tab === 'text' && <PricingTextEditor />}
      </div>
    </>
  )
}

// ─── Price plans ────────────────────────────────────────────────────────────
function PricePlansPanel() {
  const pricingPlans = useCollection('pricingPlans')
  const crud = useCrud('pricingPlans', 'Plan')
  const { move, pending: moving } = useReorderList('pricingPlans')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<PlanCategory | 'all'>('all')
  const [status, setStatus] = useState<PublishStatus | 'all'>('all')

  const rows = useMemo(() => pricingPlans
    .filter((p) => (cat === 'all' || p.category === cat) && (status === 'all' || p.status === status) && p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.order - b.order), [pricingPlans, q, cat, status])
  const visibleIds = rows.map((r) => r.id)
  const nextOrder = nextOrderOf(pricingPlans)

  return (
    <section aria-label="Price plans">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Price-range cards in the “Estimated prices” section. Published plans show under their tab; drafts stay hidden. Use the arrows to change the order.</p>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blankPlan(nextOrder))} className="shrink-0">Add plan</Button>
      </div>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search plans" />
        <FilterSelect label="Type" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, ...categoryOptions]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, ...statusOptions]} />
      </Toolbar>

      <DataTable
        caption="Pricing plans"
        rows={rows}
        empty={<EmptyState title={pricingPlans.length ? 'No plans match these filters' : 'No pricing plans yet'} message={pricingPlans.length ? 'Clear the search or filters to see all plans.' : 'Add a plan to show it on the website.'} action={<Button onClick={() => crud.openNew(blankPlan(nextOrder))}>Add plan</Button>} />}
        columns={[
          { header: 'Order', className: 'w-24', cell: (p) => {
            const i = visibleIds.indexOf(p.id)
            return (
              <div className="flex items-center gap-1.5">
                <IconAction label={`Move ${p.name} up`} disabled={i === 0 || moving} onClick={() => void move(p.id, -1, visibleIds)}><ArrowUp className="size-4" /></IconAction>
                <IconAction label={`Move ${p.name} down`} disabled={i === rows.length - 1 || moving} onClick={() => void move(p.id, 1, visibleIds)}><ArrowDown className="size-4" /></IconAction>
              </div>
            )
          } },
          { header: 'Plan', cell: (p) => (
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-ink">{p.name || 'Untitled'}{p.featured && <Star className="size-3.5 fill-sun-400 text-sun-400" aria-label="Featured" />}</p>
              <p className="text-muted">{categoryOptions.find((c) => c.value === p.category)?.label}{p.capacityKw ? `, ${p.capacityKw} kW` : ''} · {p.features.length} feature{p.features.length === 1 ? '' : 's'}</p>
            </div>) },
          { header: 'Price', cell: (p) => <span className="whitespace-nowrap tabular-nums">{p.priceMax === 0 ? 'Free' : formatPriceRange(p.priceMin, p.priceMax)}{p.priceUnit && <span className="text-muted"> {p.priceUnit}</span>}</span> },
          { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
          { header: 'Actions', className: 'text-right', cell: (p) => (
            <div className="flex items-center justify-end gap-1.5">
              <IconAction label={p.status === 'published' ? `Move ${p.name} to draft` : `Publish ${p.name}`} onClick={() => void crud.quickUpdate({ ...p, status: p.status === 'published' ? 'draft' : 'published' }, p.status === 'published' ? 'Moved to draft' : 'Published')}>
                {p.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </IconAction>
              <IconAction label={`Duplicate ${p.name}`} onClick={() => crud.openNew({ ...structuredClone(p), id: createId('plan'), name: `${p.name} (copy)`, status: 'draft', featured: false, order: nextOrder })}><Copy className="size-4" /></IconAction>
              <IconAction label={`Edit ${p.name}`} onClick={() => crud.openEdit(p)}><Pencil className="size-4" /></IconAction>
              <IconAction label={`Delete ${p.name}`} danger onClick={() => crud.setDeleting(p)}><Trash2 className="size-4" /></IconAction>
            </div>) },
        ]}
      />

      <Modal
        open={!!crud.editing}
        onClose={crud.close}
        title={crud.isNew ? 'Add pricing plan' : 'Edit pricing plan'}
        size="xl"
        footer={<><Button variant="secondary" onClick={crud.close} disabled={crud.saving}>Cancel</Button><Button type="submit" form="plan-form" loading={crud.saving}>{crud.saving ? 'Saving…' : crud.isNew ? 'Add plan' : 'Save changes'}</Button></>}
      >
        {crud.editing && <PlanForm initial={crud.editing} serverErrors={crud.serverErrors} onSave={(p) => void crud.save(p)} />}
      </Modal>

      <ConfirmDialog
        open={!!crud.deleting}
        title="Delete this plan?"
        message={`"${crud.deleting?.name}" will be removed from the website and admin. This can't be undone. Tip: move it to Draft instead to hide it.`}
        confirmLabel="Delete plan"
        onConfirm={() => void crud.confirmDelete()}
        onCancel={() => crud.setDeleting(null)}
      />
    </section>
  )
}

/** Two-column editor: form on the left, live website preview on the right. */
function EditorLayout({ form, preview }: { form: ReactNode; preview: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      {form}
      <aside aria-label="Live preview" className="lg:sticky lg:top-0 lg:self-start">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Live preview</p>
        <div className="pointer-events-none select-none pt-3" inert>{preview}</div>
      </aside>
    </div>
  )
}

function PlanForm({ initial, onSave, serverErrors }: { initial: PricingPlan; onSave: (p: PricingPlan) => void; serverErrors: FieldErrors }) {
  const [p, setP] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const set = <K extends keyof PricingPlan>(k: K, v: PricingPlan[K]) => {
    setP((x) => ({ ...x, [k]: v }))
    if (errors[k as string]) setErrors(({ [k as string]: _omit, ...rest }) => rest)
  }
  const isService = p.category === 'maintenance'
  const all = { ...serverErrors, ...errors }
  const site = useSiteContent()
  const text = site.pricingPage

  const clean = (x: PricingPlan): PricingPlan => ({
    ...x,
    name: x.name.trim(),
    capacityKw: x.category === 'maintenance' ? null : x.capacityKw,
    subsidy: x.category === 'maintenance' ? 0 : x.subsidy,
    features: x.features.map((f) => f.trim()),
    badge: x.badge.trim(),
    ctaLabel: x.ctaLabel.trim(),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = clean(p)
    const errs = validatePricingPlan(next)
    setErrors(errs)
    if (hasErrors(errs)) {
      document.querySelector<HTMLElement>('#plan-form [aria-invalid="true"]')?.focus()
      return
    }
    onSave(next)
  }

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <EditorLayout
      preview={<PricingCard plan={clean(p)} text={text} />}
      form={
        <form id="plan-form" onSubmit={submit} noValidate className="grid content-start gap-5 sm:grid-cols-2">
          {hasErrors(all) && <p role="alert" className="rounded-field bg-clay-100 p-3 text-sm text-clay-700 sm:col-span-2">Please fix {Object.keys(all).length} highlighted field{Object.keys(all).length === 1 ? '' : 's'}.</p>}
          <Input label="Plan name" required value={p.name} onChange={(e) => set('name', e.target.value)} error={all.name} wrapperClassName="sm:col-span-2" />
          <Select label="Type" value={p.category} onChange={(e) => set('category', e.target.value as PlanCategory)} options={categoryOptions} hint="Decides which tab it appears under." />
          {isService ? (
            <Input label="Price unit" placeholder="per visit / per year" value={p.priceUnit} onChange={(e) => set('priceUnit', e.target.value)} error={all.priceUnit} />
          ) : (
            <Input label="System size (kW)" type="number" inputMode="decimal" step="0.5" min={0.5} value={p.capacityKw ?? ''} onChange={(e) => set('capacityKw', e.target.value === '' ? null : Number(e.target.value))} error={all.capacityKw} />
          )}
          <Input label="Minimum price" prefix="₹" type="number" inputMode="numeric" min={0} value={p.priceMin} onChange={(e) => set('priceMin', num(e.target.value))} error={all.priceMin} />
          <Input label="Maximum price" prefix="₹" type="number" inputMode="numeric" min={0} value={p.priceMax} onChange={(e) => set('priceMax', num(e.target.value))} error={all.priceMax} hint="Set both to 0 for a free plan." />
          {!isService && (
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_auto] sm:items-start">
              <Input label="Estimated subsidy" prefix="₹" type="number" inputMode="numeric" min={0} value={p.subsidy} onChange={(e) => set('subsidy', num(e.target.value))} error={all.subsidy} hint="Shown as “subsidy up to”. Use 0 for business plans." />
              <Button variant="secondary" className="sm:mt-7" onClick={() => set('subsidy', computeSubsidy({ capacityKw: p.capacityKw ?? 0, propertyType: p.category === 'residential' ? 'residential' : 'commercial', systemType: 'on-grid' }, site.calculator).total)}>Use central + state subsidy</Button>
            </div>
          )}
          <Input label="Ideal for" value={p.idealFor} onChange={(e) => set('idealFor', e.target.value)} error={all.idealFor} wrapperClassName="sm:col-span-2" />
          {!isService && (
            <>
              <Input label="Monthly generation" placeholder="330–390 units" value={p.monthlyGeneration} onChange={(e) => set('monthlyGeneration', e.target.value)} error={all.monthlyGeneration} />
              <Input label="Roof area needed" placeholder="240–300 sq ft" value={p.roofArea} onChange={(e) => set('roofArea', e.target.value)} error={all.roofArea} />
            </>
          )}
          <div className="sm:col-span-2">
            <StringListEditor label="Features" noun="feature" value={p.features} onChange={(v) => set('features', v)} errors={errorsUnder(all, 'features')} max={15} placeholder="e.g. 6 months free cleaning" hint="Press Enter to add the next one." />
          </div>
          <Input label="Button label" placeholder={text.ctaLabel} value={p.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} error={all.ctaLabel} hint="Empty = default from Page text." />
          <Input label="Display order" type="number" min={0} value={p.order} onChange={(e) => set('order', Math.trunc(num(e.target.value)))} error={all.order} hint="Or use the arrows in the list." />
          <div className="grid gap-4 rounded-card border border-line p-4 sm:col-span-2">
            <Toggle label="Highlight this plan" description="Dark featured style with a ribbon." checked={p.featured} onChange={(v) => set('featured', v)} />
            {p.featured && <Input label="Ribbon text" placeholder={p.priceMax === 0 ? text.freeBadge : text.featuredBadge} value={p.badge} onChange={(e) => set('badge', e.target.value)} error={all.badge} hint="Empty = automatic." />}
          </div>
          <Segmented<PublishStatus> label="Status" value={p.status} onChange={(v) => set('status', v)} options={statusOptions} className="sm:col-span-2" />
        </form>
      }
    />
  )
}

// ─── Capacity plans ─────────────────────────────────────────────────────────
function CapacityPlansPanel() {
  const plans = useCollection('capacityPlans')
  const crud = useCrud('capacityPlans', 'Capacity plan')
  const { move, pending: moving } = useReorderList('capacityPlans')
  const rows = useMemo(() => [...plans].sort((a, b) => a.order - b.order), [plans])
  const nextOrder = nextOrderOf(plans)

  return (
    <section aria-label="Capacity plans">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Cards in “Solar plans by capacity” (specs, savings and a price note). The section hides itself when nothing is published.</p>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blankCapacity(nextOrder))} className="shrink-0">Add capacity plan</Button>
      </div>
      <DataTable
        caption="Capacity plans"
        rows={rows}
        empty={<EmptyState title="No capacity plans yet" message="Add one to show the “plans by capacity” section." action={<Button onClick={() => crud.openNew(blankCapacity(nextOrder))}>Add capacity plan</Button>} />}
        columns={[
          { header: 'Order', className: 'w-24', cell: (p) => {
            const i = rows.findIndex((r) => r.id === p.id)
            return (
              <div className="flex items-center gap-1.5">
                <IconAction label={`Move ${p.name} up`} disabled={i === 0 || moving} onClick={() => void move(p.id, -1)}><ArrowUp className="size-4" /></IconAction>
                <IconAction label={`Move ${p.name} down`} disabled={i === rows.length - 1 || moving} onClick={() => void move(p.id, 1)}><ArrowDown className="size-4" /></IconAction>
              </div>
            )
          } },
          { header: 'Plan', cell: (p) => (
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-ink">{p.name || 'Untitled'}{p.featured && <Star className="size-3.5 fill-sun-400 text-sun-400" aria-label="Featured" />}</p>
              <p className="text-muted">{segmentOptions.find((s) => s.value === p.segment)?.label} · {p.capacity} · {p.specs.length} spec{p.specs.length === 1 ? '' : 's'}</p>
            </div>) },
          { header: 'Button', cell: (p) => <span className="text-ink-soft">{p.ctaLabel}</span> },
          { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
          { header: 'Actions', className: 'text-right', cell: (p) => (
            <div className="flex items-center justify-end gap-1.5">
              <IconAction label={p.status === 'published' ? `Move ${p.name} to draft` : `Publish ${p.name}`} onClick={() => void crud.quickUpdate({ ...p, status: p.status === 'published' ? 'draft' : 'published' }, p.status === 'published' ? 'Moved to draft' : 'Published')}>
                {p.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </IconAction>
              <IconAction label={`Duplicate ${p.name}`} onClick={() => crud.openNew({ ...structuredClone(p), id: createId('cap'), name: `${p.name} (copy)`, status: 'draft', featured: false, order: nextOrder })}><Copy className="size-4" /></IconAction>
              <IconAction label={`Edit ${p.name}`} onClick={() => crud.openEdit(p)}><Pencil className="size-4" /></IconAction>
              <IconAction label={`Delete ${p.name}`} danger onClick={() => crud.setDeleting(p)}><Trash2 className="size-4" /></IconAction>
            </div>) },
        ]}
      />
      <Modal
        open={!!crud.editing}
        onClose={crud.close}
        title={crud.isNew ? 'Add capacity plan' : 'Edit capacity plan'}
        size="xl"
        footer={<><Button variant="secondary" onClick={crud.close} disabled={crud.saving}>Cancel</Button><Button type="submit" form="capacity-form" loading={crud.saving}>{crud.saving ? 'Saving…' : crud.isNew ? 'Add plan' : 'Save changes'}</Button></>}
      >
        {crud.editing && <CapacityForm initial={crud.editing} serverErrors={crud.serverErrors} onSave={(p) => void crud.save(p)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this capacity plan?" message={`"${crud.deleting?.name}" will be removed from the Pricing page.`} confirmLabel="Delete plan" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </section>
  )
}

function CapacityForm({ initial, onSave, serverErrors }: { initial: CapacityPlan; onSave: (p: CapacityPlan) => void; serverErrors: FieldErrors }) {
  const [p, setP] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const set = <K extends keyof CapacityPlan>(k: K, v: CapacityPlan[K]) => {
    setP((x) => ({ ...x, [k]: v }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k && !key.startsWith(`${String(k)}.`))))
  }
  const all = { ...serverErrors, ...errors }
  const clean = (x: CapacityPlan): CapacityPlan => ({
    ...x, name: x.name.trim(), capacity: x.capacity.trim(), features: x.features.map((f) => f.trim()),
    specs: x.specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = clean(p)
    const errs = validateCapacityPlan(next)
    setErrors(errs)
    if (hasErrors(errs)) { document.querySelector<HTMLElement>('#capacity-form [aria-invalid="true"]')?.focus(); return }
    onSave(next)
  }

  // ItemListEditor needs ids for stable rows; spec rows get a transient one.
  const specRows = p.specs.map((s, i) => ({ id: `spec-${i}`, ...s }))

  return (
    <EditorLayout
      preview={<CapacityPlanCard plan={clean(p)} />}
      form={
        <form id="capacity-form" onSubmit={submit} noValidate className="grid content-start gap-5 sm:grid-cols-2">
          {hasErrors(all) && <p role="alert" className="rounded-field bg-clay-100 p-3 text-sm text-clay-700 sm:col-span-2">Please fix the highlighted fields.</p>}
          <Input label="Plan name" required value={p.name} onChange={(e) => set('name', e.target.value)} error={all.name} />
          <Input label="Capacity" required placeholder="3 kW or 10 kW – 50 kW" value={p.capacity} onChange={(e) => set('capacity', e.target.value)} error={all.capacity} />
          <Select label="Segment" value={p.segment} onChange={(e) => set('segment', e.target.value as CapacitySegment)} options={segmentOptions} />
          <Input label="Subtitle" placeholder="Small family / 2–3 BHK home" value={p.subtitle} onChange={(e) => set('subtitle', e.target.value)} error={all.subtitle} />
          <div className="sm:col-span-2">
            <ItemListEditor
              label="Spec rows"
              noun="spec"
              value={specRows}
              onChange={(rows) => set('specs', rows.map(({ label, value }) => ({ label, value })))}
              create={() => ({ id: createId('spec'), label: '', value: '' })}
              fields={[{ key: 'label', label: 'Label', placeholder: 'Generation' }, { key: 'value', label: 'Value', placeholder: 'Approx. 12–15 units/day' }]}
              errors={errorsUnder(all, 'specs')}
              max={10}
            />
          </div>
          <div className="sm:col-span-2">
            <StringListEditor label="Features (optional)" noun="feature" value={p.features} onChange={(v) => set('features', v)} errors={errorsUnder(all, 'features')} max={15} />
          </div>
          <Input label="Price note" placeholder="Price: on free site survey" value={p.priceNote} onChange={(e) => set('priceNote', e.target.value)} error={all.priceNote} hint="Shown above the button. Empty hides it." />
          <Input label="Button label" required value={p.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} error={all.ctaLabel} />
          <div className="grid gap-4 rounded-card border border-line p-4 sm:col-span-2">
            <Toggle label="Highlight this plan" description="Dark featured style." checked={p.featured} onChange={(v) => set('featured', v)} />
            {p.featured && <Input label="Ribbon text" placeholder="For 2–3 BHK homes" value={p.badge} onChange={(e) => set('badge', e.target.value)} error={all.badge} />}
          </div>
          <Input label="Display order" type="number" min={0} value={p.order} onChange={(e) => set('order', Math.trunc(Number(e.target.value) || 0))} error={all.order} />
          <Segmented<PublishStatus> label="Status" value={p.status} onChange={(v) => set('status', v)} options={statusOptions} />
        </form>
      }
    />
  )
}

