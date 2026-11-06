import { Plus, Trash2 } from 'lucide-react'
import type { CalculatorSettings, PropertyType, StateSubsidyRule } from '@/types'
import type { DraftForm } from '../hooks/useDraft'
import { GST_STATES, stateName } from '@/lib/states'
import { computeSubsidy } from '@/lib/subsidy'
import { createId } from '@/lib/id'
import { formatINR } from '@/lib/format'
import { Button, Input, Select, Toggle } from '@/components/ui'
import { IconAction } from './AdminUI'

type F = DraftForm<{ calculator: CalculatorSettings }>
const BASE = 'calculator.subsidy'
const STATE_OPTS = GST_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }))
const PROPS: Array<{ value: PropertyType; label: string }> = [
  { value: 'residential', label: 'Homes' },
  { value: 'housing-society', label: 'Housing societies' },
]

/** Settings → Calculator → state-wise subsidy rules (central rates are edited above). */
export function SubsidyRulesEditor({ form }: { form: F }) {
  const sub = form.draft.calculator.subsidy
  const rules = sub.states ?? []
  const e = form.errors
  const setRules = (next: StateSubsidyRule[]) => form.set(`${BASE}.states`, next)
  const patch = (i: number, p: Partial<StateSubsidyRule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Default state" value={sub.defaultStateCode} options={STATE_OPTS}
          onChange={(ev) => form.set(`${BASE}.defaultStateCode`, ev.target.value)} error={e[`${BASE}.defaultStateCode`]}
          hint="Used when a calculation or quotation has no state." />
        <Input label="Special category: per kW (first 2 kW)" prefix="₹" type="number" min={0} value={sub.specialCategory.perKwUpTo2}
          onChange={(ev) => form.set(`${BASE}.specialCategory.perKwUpTo2`, num(ev.target.value))} error={e[`${BASE}.specialCategory.perKwUpTo2`]} />
        <Input label="Special category: 3rd kW" prefix="₹" type="number" min={0} value={sub.specialCategory.perKwThird}
          onChange={(ev) => form.set(`${BASE}.specialCategory.perKwThird`, num(ev.target.value))} error={e[`${BASE}.specialCategory.perKwThird`]} />
        <Input label="Special category: maximum" prefix="₹" type="number" min={0} value={sub.specialCategory.cap}
          onChange={(ev) => form.set(`${BASE}.specialCategory.cap`, num(ev.target.value))} error={e[`${BASE}.specialCategory.cap`]}
          hint={`States: ${sub.specialCategoryStates.map(stateName).filter(Boolean).join(', ')}`} />
      </div>

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-sans text-sm font-semibold text-ink">State subsidy schemes</h4>
          <Button size="sm" variant="secondary" leftIcon={<Plus className="size-4" />}
            onClick={() => setRules([...rules, { id: createId('state'), stateCode: '', schemeName: '', agency: '', enabled: true, slabs: [{ fromKw: 1, amount: 0 }], propertyTypes: ['residential'], note: '' }])}>
            Add state scheme
          </Button>
        </div>
        {!rules.length && <p className="text-sm text-muted">No state schemes — only the central subsidy is applied.</p>}
        {rules.map((r, i) => {
          const p = `${BASE}.states.${i}`
          const examples = [1, 2, 3, 5].map((kw) => ({ kw, ...computeSubsidy({ capacityKw: kw, propertyType: 'residential', systemType: 'on-grid', stateCode: r.stateCode }, { ...sub, states: [{ ...r, enabled: true }] }) }))
          return (
            <fieldset key={r.id} className="grid gap-4 rounded-card border border-line bg-surface p-4">
              <legend className="px-1 text-sm font-semibold text-ink-soft">{r.schemeName || stateName(r.stateCode) || 'New state scheme'}</legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select label="State" value={r.stateCode} placeholder="— Choose —" options={STATE_OPTS}
                  onChange={(ev) => patch(i, { stateCode: ev.target.value })} error={e[`${p}.stateCode`]} />
                <Input label="Scheme name" value={r.schemeName} onChange={(ev) => patch(i, { schemeName: ev.target.value })} error={e[`${p}.schemeName`]} />
                <Input label="Agency" value={r.agency} onChange={(ev) => patch(i, { agency: ev.target.value })} />
                <div className="flex items-end justify-between gap-2">
                  <Toggle label="Active" checked={r.enabled} onChange={(v) => patch(i, { enabled: v })} />
                  <IconAction label={`Remove ${r.schemeName || 'state scheme'}`} danger onClick={() => setRules(rules.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </IconAction>
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-semibold text-ink-soft">Slabs (amount applies from this size upwards)</p>
                {r.slabs.map((sl, j) => (
                  <div key={j} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                    <Input label="From size (kW)" type="number" min={0.5} step="0.5" value={sl.fromKw}
                      onChange={(ev) => patch(i, { slabs: r.slabs.map((x, k) => (k === j ? { ...x, fromKw: num(ev.target.value) } : x)) })} error={e[`${p}.slabs.${j}.fromKw`]} />
                    <Input label="Subsidy" prefix="₹" type="number" min={0} value={sl.amount}
                      onChange={(ev) => patch(i, { slabs: r.slabs.map((x, k) => (k === j ? { ...x, amount: num(ev.target.value) } : x)) })} error={e[`${p}.slabs.${j}.amount`]} />
                    <IconAction label="Remove slab" danger disabled={r.slabs.length <= 1} onClick={() => patch(i, { slabs: r.slabs.filter((_, k) => k !== j) })}>
                      <Trash2 className="size-4" />
                    </IconAction>
                  </div>
                ))}
                <div>
                  <Button size="sm" variant="ghost" leftIcon={<Plus className="size-4" />}
                    onClick={() => patch(i, { slabs: [...r.slabs, { fromKw: Math.max(0, ...r.slabs.map((x) => x.fromKw)) + 1, amount: 0 }] })}>
                    Add slab
                  </Button>
                </div>
                {e[`${p}.slabs`] && <p role="alert" className="text-sm text-clay-700">{e[`${p}.slabs`]}</p>}
              </div>
              <div className="flex flex-wrap gap-4" role="group" aria-label="Eligible connections">
                {PROPS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-navy-700" checked={r.propertyTypes.includes(o.value)}
                      onChange={(ev) => patch(i, { propertyTypes: ev.target.checked ? [...r.propertyTypes, o.value] : r.propertyTypes.filter((x) => x !== o.value) })} />
                    {o.label}
                  </label>
                ))}
                {e[`${p}.propertyTypes`] && <p role="alert" className="text-sm text-clay-700">{e[`${p}.propertyTypes`]}</p>}
              </div>
              <Input label="Note" value={r.note} onChange={(ev) => patch(i, { note: ev.target.value })} />
              <p className="text-xs text-muted">
                Check (home, on-grid): {examples.map((x) => `${x.kw} kW → central ${formatINR(x.central)} + state ${formatINR(x.state)} = ${formatINR(x.total)}`).join(' · ')}
              </p>
            </fieldset>
          )
        })}
      </div>
      <Input label="Rates last verified on" type="date" value={sub.verifiedOn ?? ''} onChange={(ev) => form.set(`${BASE}.verifiedOn`, ev.target.value)}
        hint="Government rules change — check pmsuryaghar.gov.in and the state notification, then update this date." />
    </div>
  )
}
