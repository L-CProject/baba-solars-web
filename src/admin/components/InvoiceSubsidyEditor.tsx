import { PROPERTY_OPTIONS } from '@/lib/labels'
import type { InvoiceInput, InvoiceSubsidyInput, PropertyType, SystemType } from '@/types'
import { useSiteContent } from '@/queries'
import { deriveInvoiceSubsidy } from '@/lib/documents'
import { formatINR } from '@/lib/format'
import { computeSubsidy } from '@/lib/subsidy'
import { Input, Select, Toggle } from '@/components/ui'

const PROPERTIES = PROPERTY_OPTIONS
const SYSTEMS = [
  { value: 'on-grid', label: 'On-grid' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'off-grid', label: 'Off-grid' },
]

export const blankInvoiceSubsidy = (): InvoiceSubsidyInput => ({
  show: true, auto: true, capacityKw: 3, propertyType: 'residential', systemType: 'on-grid', central: null, state: null,
})

/**
 * Billing → subsidy information. The GST invoice total is NOT reduced (under PM Surya Ghar the
 * Government credits the subsidy to the consumer), so the breakdown shows the net cost after subsidy.
 */
export function InvoiceSubsidyEditor({ input, grandTotal, onChange, errors }: {
  input: InvoiceInput
  grandTotal: number
  onChange: (next: InvoiceSubsidyInput | null) => void
  errors: Record<string, string>
}) {
  const content = useSiteContent()
  const sub = input.subsidy ?? null
  const derived = deriveInvoiceSubsidy(input, grandTotal, content.calculator)
  const rules = sub
    ? computeSubsidy({ capacityKw: sub.capacityKw, propertyType: sub.propertyType, systemType: sub.systemType, stateCode: input.stateCode, systemCost: grandTotal }, content.calculator)
    : null
  const patch = (p: Partial<InvoiceSubsidyInput>) => sub && onChange({ ...sub, ...p })

  return (
    <section className="grid gap-4 rounded-card border border-leaf-500/30 bg-leaf-100/60 p-4" aria-label="Subsidy">
      <Toggle
        label="Show solar subsidy breakdown on this invoice"
        checked={!!sub?.show}
        onChange={(v) => onChange(v ? { ...(sub ?? blankInvoiceSubsidy()), show: true } : sub ? { ...sub, show: false } : null)}
        description="Central (PM Surya Ghar) + state subsidy. The invoice total stays the full amount payable; the subsidy is credited to the customer by the Government."
      />
      {sub?.show && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="System capacity (kW)" type="number" min={0.5} step="0.5" value={sub.capacityKw}
              onChange={(e) => patch({ capacityKw: Number(e.target.value) })} error={errors['subsidy.capacityKw']} />
            <Select label="Property" value={sub.propertyType} options={PROPERTIES}
              onChange={(e) => patch({ propertyType: e.target.value as PropertyType })} />
            <Select label="System type" value={sub.systemType} options={SYSTEMS}
              onChange={(e) => patch({ systemType: e.target.value as SystemType })} />
          </div>
          <Toggle
            label="Calculate subsidy automatically"
            checked={sub.auto}
            onChange={(v) => patch(v ? { auto: true, central: null, state: null } : { auto: false, central: derived?.central ?? 0, state: derived?.state ?? 0 })}
            description={rules?.notes[0] ?? `Rules for ${rules?.stateName || 'the selected state'}: Settings → Calculator → Subsidy.`}
          />
          {!sub.auto && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Central subsidy (PM Surya Ghar)" prefix="₹" type="number" min={0} value={sub.central ?? 0}
                onChange={(e) => patch({ central: Number(e.target.value) })} error={errors['subsidy.central']} />
              <Input label="State subsidy" prefix="₹" type="number" min={0} value={sub.state ?? 0}
                onChange={(e) => patch({ state: Number(e.target.value) })} error={errors['subsidy.state']} />
            </div>
          )}
          {derived && (
            <dl className="grid gap-1 text-sm">
              <Row label="Total system cost (invoice total)" value={formatINR(grandTotal)} />
              <Row label="Central subsidy (PM Surya Ghar)" value={`– ${formatINR(derived.central)}`} good />
              <Row label={`State subsidy${derived.stateScheme ? ` (${derived.stateScheme})` : ''}`} value={`– ${formatINR(derived.state)}`} good />
              <Row label="Net cost after subsidy" value={formatINR(derived.netCost)} strong />
            </dl>
          )}
        </>
      )}
    </section>
  )
}

function Row({ label, value, good, strong }: { label: string; value: string; good?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-leaf-500/30 pt-1' : ''}`}>
      <dt className={strong ? 'font-semibold text-ink' : 'text-muted'}>{label}</dt>
      <dd className={`whitespace-nowrap font-semibold tabular-nums ${good ? 'text-leaf-700' : ''}`}>{value}</dd>
    </div>
  )
}
