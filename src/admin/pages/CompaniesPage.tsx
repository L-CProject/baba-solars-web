import { useState, type FormEvent } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Company, PackagePrice, Quality, QualitySpec } from '@/types'
import { useCompanies, useDeleteCompany, useSaveCompany } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/services/api'
import { createId } from '@/lib/id'
import { formatINR, formatLakh } from '@/lib/format'
import { QUALITIES, QUALITY_LABEL } from '@/lib/pricing'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Skeleton, Textarea, Toggle } from '@/components/ui'
import { AdminPageHeader, IconAction } from '../components/AdminUI'
import { DraftStringListPlain } from '../components/PlainLists'
import { ImageUploadField } from '../components/ImageUploadField'
import { errorMessage } from '../hooks/useCrud'
import { cn } from '@/lib/cn'

const spec = (over: Partial<QualitySpec> = {}): QualitySpec => ({
  label: '', panelModel: '', panelTechnology: 'Mono PERC bifacial', panelWattage: 540, inverterBrand: '', inverterModel: 'On-grid string inverter',
  structure: 'GI structure', panelWarrantyYears: 12, performanceWarrantyYears: 25, inverterWarrantyYears: 5, ...over,
})
const blank = (): Company => ({
  id: createId('co'), name: '', description: '', logoUrl: '', isActive: true, order: 0, pricesIncludeGst: true, workmanshipWarrantyYears: 5,
  kitIncludes: ['ACDB + DCDB with SPD/MCB', '3 earthing rods + chemical bag', 'Lightning arrester', 'MC4 connectors'],
  packages: [3, 5, 8, 10].map((capacityKw) => ({ capacityKw, normal: 0, premium: 0 })),
  qualities: { normal: spec({ label: 'Normal' }), premium: spec({ label: 'Premium', panelTechnology: 'N-type TOPCon bifacial', panelWattage: 580, performanceWarrantyYears: 30 }) },
})

export default function CompaniesPage() {
  useSeo({ title: 'Companies & rates', path: '/admin/companies', noIndex: true })
  const { data, isPending, isError, error, refetch } = useCompanies()
  const { can } = useAuth()
  const del = useDeleteCompany()
  const toast = useToast()
  const [editing, setEditing] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const canWrite = can('companies:write')

  return (
    <>
      <AdminPageHeader title="Companies & rates" description="Package prices per company, size and quality. They fill quotations automatically and appear in the website calculator and pricing page."
        actions={canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing(blank())}>Add company</Button>} />
      {isPending ? <div className="grid gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
        : isError ? <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        : !data.length ? <EmptyState title="No companies yet" message="Add the brands you install with their package prices." action={canWrite ? <Button onClick={() => setEditing(blank())}>Add company</Button> : undefined} />
        : (
          <>
            <PriceMatrix companies={data} />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.map((c) => (
                <article key={c.id} aria-label={c.name} className={cn('flex flex-col rounded-card border border-line bg-surface p-5 shadow-soft', !c.isActive && 'opacity-70')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-sans text-lg font-semibold">{c.name}</h2>
                      <p className="text-sm text-muted">{c.description}</p>
                    </div>
                    {!c.isActive && <Badge tone="neutral">Inactive</Badge>}
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    {QUALITIES.map((q) => (
                      <div key={q} className="rounded-field bg-snow-200/50 px-3 py-2">
                        <dt className="font-semibold text-ink">{QUALITY_LABEL[q]}</dt>
                        <dd className="text-muted">{c.qualities[q].panelWattage} Wp {c.qualities[q].panelTechnology} · {c.qualities[q].inverterBrand} inverter · {c.qualities[q].performanceWarrantyYears}-yr performance</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs text-muted">Prices {c.pricesIncludeGst ? 'include' : 'exclude'} GST · {c.packages.length} package sizes</p>
                  {canWrite && (
                    <div className="mt-auto flex items-center justify-end gap-1.5 pt-4">
                      <IconAction label={`Duplicate ${c.name}`} onClick={() => setEditing({ ...structuredClone(c), id: createId('co'), name: `${c.name} (copy)` })}><Copy className="size-4" /></IconAction>
                      <IconAction label={`Edit ${c.name}`} onClick={() => setEditing(structuredClone(c))}><Pencil className="size-4" /></IconAction>
                      <IconAction label={`Delete ${c.name}`} danger onClick={() => setDeleting(c)}><Trash2 className="size-4" /></IconAction>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      {editing && <CompanyEditor initial={editing} isNew={!data?.some((c) => c.id === editing.id)} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name}?`} message="Existing quotations keep the specs and prices they were made with. You can also make the company inactive instead." confirmLabel="Delete company"
        onConfirm={() => { const c = deleting; setDeleting(null); if (c) void del.mutateAsync(c.id).then(() => toast({ title: `${c.name} deleted` }), (e) => toast({ tone: 'error', title: 'Not deleted', description: errorMessage(e) })) }}
        onCancel={() => setDeleting(null)} />
    </>
  )
}

/** Side-by-side price list (what the client sent): rows = size, columns = company × quality. */
export function PriceMatrix({ companies, compact = false }: { companies: Company[]; compact?: boolean }) {
  const active = companies.filter((c) => c.isActive)
  const sizes = [...new Set(active.flatMap((c) => c.packages.map((p) => p.capacityKw)))].sort((a, b) => a - b)
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">Package prices by company and quality</caption>
        <thead className="bg-snow-200/60 text-ink-soft">
          <tr>
            <th scope="col" rowSpan={2} className="border-b border-line px-4 py-2 text-left font-semibold">System</th>
            {active.map((c) => <th key={c.id} scope="colgroup" colSpan={2} className="border-b border-l border-line px-3 py-2 text-center font-semibold text-ink">{c.name}</th>)}
          </tr>
          <tr>
            {active.flatMap((c) => QUALITIES.map((q) => <th key={c.id + q} scope="col" className={cn('border-b border-line px-3 py-1.5 text-right text-xs font-semibold', q === 'normal' && 'border-l')}>{QUALITY_LABEL[q]}</th>))}
          </tr>
        </thead>
        <tbody>
          {sizes.map((kw) => (
            <tr key={kw} className="border-b border-line last:border-0">
              <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-left font-semibold">{kw} kW</th>
              {active.flatMap((c) => QUALITIES.map((q) => {
                const p = c.packages.find((x) => x.capacityKw === kw)
                return <td key={c.id + q} className={cn('whitespace-nowrap px-3 py-2.5 text-right tabular-nums', q === 'normal' && 'border-l border-line', q === 'premium' && 'font-semibold text-ink')}>{p ? (compact ? formatLakh(p[q]) : formatINR(p[q])) : '—'}</td>
              }))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompanyEditor({ initial, isNew, onClose }: { initial: Company; isNew: boolean; onClose: () => void }) {
  const save = useSaveCompany()
  const toast = useToast()
  const [c, setC] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof Company>(k: K, v: Company[K]) => setC((p) => ({ ...p, [k]: v }))
  const setPkg = (i: number, patch: Partial<PackagePrice>) => set('packages', c.packages.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setSpec = (q: Quality, patch: Partial<QualitySpec>) => set('qualities', { ...c.qualities, [q]: { ...c.qualities[q], ...patch } })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!c.name.trim()) errs.name = 'Enter a company name.'
    c.packages.forEach((p, i) => {
      if (!(p.capacityKw > 0)) errs[`packages.${i}.capacityKw`] = 'Size must be more than 0.'
      if (!(p.normal > 0)) errs[`packages.${i}.normal`] = 'Enter the Normal price.'
      if (!(p.premium > 0)) errs[`packages.${i}.premium`] = 'Enter the Premium price.'
    })
    setErrors(errs)
    if (Object.keys(errs).length) { toast({ tone: 'error', title: 'Fix the highlighted fields', description: Object.values(errs)[0] }); return }
    try {
      await save.mutateAsync(c)
      toast({ title: isNew ? 'Company added' : 'Company saved', description: 'Quotations, calculator and pricing page use the new prices.' })
      onClose()
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
      toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) })
    }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Add company' : `Edit ${initial.name}`} size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="company-form" loading={save.isPending}>Save company</Button></>}>
      <form id="company-form" onSubmit={submit} noValidate className="grid gap-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Input label="Company / brand name" required value={c.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <Input label="Workmanship warranty (years)" type="number" min={0} value={c.workmanshipWarrantyYears} onChange={(e) => set('workmanshipWarrantyYears', Number(e.target.value))} />
          <Textarea label="Short description" rows={2} value={c.description} onChange={(e) => set('description', e.target.value)} wrapperClassName="sm:col-span-2" />
          <Toggle label="Prices include GST" description="The client price list is the final price; GST is taken out of it on the quotation." checked={c.pricesIncludeGst} onChange={(v) => set('pricesIncludeGst', v)} />
          <Toggle label="Active" description="Shown in quotations, the calculator and the pricing page." checked={c.isActive} onChange={(v) => set('isActive', v)} />
        </section>

        <section className="grid gap-3">
          <div>
            <h3 className="font-sans text-base font-semibold">Package prices</h3>
            <p className="text-sm text-muted">Complete installed price per system. Sizes in between are estimated from the nearest packages.</p>
          </div>
          {errors.packages && <p role="alert" className="text-sm text-clay-700">{errors.packages}</p>}
          <div className="grid gap-2">
            {c.packages.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_1.4fr_auto] items-end gap-2 sm:gap-3">
                <Input label="Size (kW)" type="number" min={0.5} step="0.5" value={p.capacityKw} onChange={(e) => setPkg(i, { capacityKw: Number(e.target.value) })} error={errors[`packages.${i}.capacityKw`]} />
                <Input label="Normal" prefix="₹" type="number" min={0} step={1000} value={p.normal} onChange={(e) => setPkg(i, { normal: Number(e.target.value) })} error={errors[`packages.${i}.normal`]} />
                <Input label="Premium" prefix="₹" type="number" min={0} step={1000} value={p.premium} onChange={(e) => setPkg(i, { premium: Number(e.target.value) })} error={errors[`packages.${i}.premium`]} />
                <Button variant="ghost" aria-label={`Remove ${p.capacityKw} kW`} onClick={() => set('packages', c.packages.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <div><Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => set('packages', [...c.packages, { capacityKw: (c.packages.at(-1)?.capacityKw ?? 0) + 5, normal: 0, premium: 0 }])}>Add size</Button></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {QUALITIES.map((q) => {
            const s = c.qualities[q]
            return (
              <fieldset key={q} className="grid gap-3 rounded-card border border-line bg-snow-100/60 p-4 sm:grid-cols-2">
                <legend className="px-1 text-sm font-semibold text-ink">{QUALITY_LABEL[q]} quality — equipment</legend>
                <Input label="Panel model" value={s.panelModel} onChange={(e) => setSpec(q, { panelModel: e.target.value })} />
                <Input label="Panel technology" value={s.panelTechnology} onChange={(e) => setSpec(q, { panelTechnology: e.target.value })} />
                <Input label="Panel wattage (Wp)" type="number" min={50} max={1000} value={s.panelWattage} onChange={(e) => setSpec(q, { panelWattage: Number(e.target.value) })} error={errors[`qualities.${q}.panelWattage`]} />
                <Input label="Inverter brand" value={s.inverterBrand} onChange={(e) => setSpec(q, { inverterBrand: e.target.value })} />
                <Input label="Inverter model" value={s.inverterModel} onChange={(e) => setSpec(q, { inverterModel: e.target.value })} wrapperClassName="sm:col-span-2" />
                <Input label="Structure" value={s.structure} onChange={(e) => setSpec(q, { structure: e.target.value })} wrapperClassName="sm:col-span-2" />
                <Input label="Panel warranty (yrs)" type="number" min={0} value={s.panelWarrantyYears} onChange={(e) => setSpec(q, { panelWarrantyYears: Number(e.target.value) })} />
                <Input label="Performance warranty (yrs)" type="number" min={0} value={s.performanceWarrantyYears} onChange={(e) => setSpec(q, { performanceWarrantyYears: Number(e.target.value) })} />
                <Input label="Inverter warranty (yrs)" type="number" min={0} value={s.inverterWarrantyYears} onChange={(e) => setSpec(q, { inverterWarrantyYears: Number(e.target.value) })} />
              </fieldset>
            )
          })}
        </section>

        <DraftStringListPlain label="Included with every kit (printed on quotations)" value={c.kitIncludes} onChange={(v) => set('kitIncludes', v)} noun="item" max={15} />
        <ImageUploadField label="Brand logo (optional)" value={c.logoUrl} onChange={(v) => set('logoUrl', v)} hint="" />
      </form>
    </Modal>
  )
}
