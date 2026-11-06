import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import type { Quality } from '@/types'
import { useCompanyPrices, useSiteContent } from '@/queries'
import { computeSubsidy } from '@/lib/subsidy'
import { QUALITIES, QUALITY_LABEL, packageSizes } from '@/lib/pricing'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Segmented, SectionHeading } from '@/components/ui'

const calcLink = (companyId: string, kw: number, quality: Quality) => `/calculator?company=${companyId}&kw=${kw}&quality=${quality}`

/**
 * Company-wise package prices (Waaree / Adani / Tata × 3, 5, 8, 10 kW × Normal / Premium).
 * Data: Admin → Companies & rates. Shows the price, the PM Surya Ghar subsidy for homes and the
 * effective cost. Table on desktop, cards on phones.
 */
export function CompanyPricing({ id = 'company-prices', heading = true }: { id?: string; heading?: boolean }) {
  const companies = useCompanyPrices()
  const calc = useSiteContent().calculator
  const [quality, setQuality] = useState<Quality>('normal')
  const sizes = packageSizes(companies)
  if (!companies.length) return null
  // Central PM Surya Ghar + state subsidy (default state, e.g. Chhattisgarh) for an on-grid home.
  const subsidy = (kw: number) => computeSubsidy({ capacityKw: kw, propertyType: 'residential', systemType: 'on-grid' }, calc).total
  const spec = companies[0].qualities[quality]

  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-title`}>
      {heading && (
        <SectionHeading kicker={companies.map((c) => c.name).join(' · ')} title="Company-wise package prices"
          intro="Complete installed on-grid systems including GST, structure, wiring, earthing and net-metering paperwork. Choose the quality you want." />
      )}
      <h2 id={`${id}-title`} className="sr-only">Company-wise package prices</h2>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Segmented<Quality> label="Plan" value={quality} onChange={setQuality} options={QUALITIES.map((q) => ({ value: q, label: QUALITY_LABEL[q] }))} className="sm:w-80" />
        <p className="flex items-start gap-2 text-sm text-ink-soft sm:max-w-md"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-hidden />
          {quality === 'premium' ? `Premium: N-type TOPCon bifacial panels (~${spec.panelWattage} Wp), premium inverter with Wi-Fi monitoring, heavy GI structure, up to ${spec.performanceWarrantyYears}-year performance warranty, plus drone-based panel cleaning.` : `Normal: ${spec.panelWattage} Wp Mono PERC bifacial panels, reliable on-grid inverter, GI structure, ${spec.performanceWarrantyYears}-year performance warranty. Drone cleaning not included.`}
        </p>
      </div>

      {/* Desktop / tablet table */}
      <div className="mt-5 hidden overflow-hidden rounded-card border border-line bg-surface shadow-soft md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{QUALITY_LABEL[quality]} package prices by company</caption>
          <thead className="bg-navy-900 text-snow-50">
            <tr>
              <th scope="col" className="px-5 py-3 text-left font-semibold">System</th>
              {companies.map((c) => <th key={c.id} scope="col" className="px-5 py-3 text-right font-semibold">{c.name}</th>)}
              <th scope="col" className="px-5 py-3 text-right font-semibold">Subsidy (homes)</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((kw, i) => (
              <tr key={kw} className={cn('border-b border-line last:border-0', i % 2 === 1 && 'bg-snow-100/60')}>
                <th scope="row" className="px-5 py-3.5 text-left">
                  <span className="font-display text-lg text-ink">{kw} kW</span>
                  <span className="block text-xs font-normal text-muted">~{Math.round(kw * calc.unitsPerKwPerDay * 30)} units / month</span>
                </th>
                {companies.map((c) => {
                  const p = c.packages.find((x) => x.capacityKw === kw)
                  return (
                    <td key={c.id} className="px-5 py-3.5 text-right">
                      {p ? (
                        <Link to={calcLink(c.id, kw, quality)} className="group inline-flex flex-col items-end" aria-label={`${c.name} ${kw} kW ${QUALITY_LABEL[quality]}: ${formatINR(p[quality])}`}>
                          <span className="font-semibold tabular-nums text-ink group-hover:underline">{formatINR(p[quality])}</span>
                          <span className="text-xs tabular-nums text-leaf-700">{formatINR(Math.max(0, p[quality] - subsidy(kw)))} after subsidy</span>
                        </Link>
                      ) : '—'}
                    </td>
                  )
                })}
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-leaf-700">– {formatINR(subsidy(kw))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per size */}
      <ul className="mt-5 grid gap-3 md:hidden">
        {sizes.map((kw) => (
          <li key={kw} className="rounded-card border border-line bg-surface p-4 shadow-soft">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-xl text-ink">{kw} kW <span className="font-sans text-sm text-muted">{QUALITY_LABEL[quality]}</span></p>
              <p className="text-xs text-leaf-700">Subsidy – {formatINR(subsidy(kw))}</p>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {companies.map((c) => {
                const p = c.packages.find((x) => x.capacityKw === kw)
                if (!p) return null
                return (
                  <li key={c.id}>
                    <Link to={calcLink(c.id, kw, quality)} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="font-medium text-ink">{c.name}</span>
                      <span className="text-right"><span className="block font-semibold tabular-nums">{formatINR(p[quality])}</span><span className="block text-xs tabular-nums text-leaf-700">{formatINR(Math.max(0, p[quality] - subsidy(kw)))} after subsidy</span></span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>Prices include GST. Subsidy shown for residential on-grid systems: PM Surya Ghar central subsidy{calc.subsidy.states.some((r) => r.enabled && r.stateCode === calc.subsidy.defaultStateCode) ? ' + state subsidy' : ''} (credited to your bank after commissioning).</span>
        <Link to="/calculator" className="inline-flex items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline">Work out your size <ArrowRight className="size-4" aria-hidden /></Link>
      </p>
    </section>
  )
}
