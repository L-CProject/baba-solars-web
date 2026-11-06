import { Check, ChevronDown, Drone, X } from 'lucide-react'
import type { PlanTier, Quality } from '@/types'
import { useCompanyPrices, useSiteContent } from '@/queries'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'
import { LinkButton } from '@/components/ui'

/** Lowest package price across active companies, for "From ₹…". */
function useFromPrice(q: Quality): number | null {
  const companies = useCompanyPrices()
  const prices = companies.flatMap((c) => c.packages.map((p) => p[q])).filter((n) => n > 0)
  return prices.length ? Math.min(...prices) : null
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function DroneCell({ plan, premium }: { plan: PlanTier; premium: boolean }) {
  const yes = plan.droneCleaning
  return (
    <div className={cn('flex flex-col items-center gap-1.5 px-2 py-4 text-center sm:flex-row sm:justify-center sm:gap-2.5 sm:py-5', yes && premium && 'bg-sun-300/25')}>
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-full sm:size-10', yes ? 'bg-leaf-500 text-snow-50' : 'bg-clay-100 text-clay-700')}>
        {yes ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <X className="size-5" strokeWidth={3} aria-hidden />}
      </span>
      <span className={cn('text-sm font-bold sm:text-base', yes ? 'text-leaf-700' : 'text-clay-700')}>{yes ? 'Included' : 'Not included'}</span>
    </div>
  )
}

/**
 * Normal vs Premium — one compact comparison. The deciding difference (drone cleaning, from the plan
 * flags) is the first, biggest row; rows that differ follow; everything both plans share collapses
 * into one "Both plans include" line. Text is edited in Admin → Pricing → Normal & Premium.
 */
export function PlanComparison({ id = 'plans-compare', heading = true }: { id?: string; heading?: boolean }) {
  const t = useSiteContent().plans
  const fromNormal = useFromPrice('normal')
  const fromPremium = useFromPrice('premium')
  if (!t?.enabled) return null
  const differs = t.rows.filter((r) => !same(r.normal, r.premium))
  const shared = t.rows.filter((r) => same(r.normal, r.premium))
  const price = (plan: PlanTier, from: number | null) => plan.priceLabel || (from ? `From ${formatINR(from)}` : 'Price on site survey')
  const cols = [
    { plan: t.normal, quality: 'normal' as const, from: fromNormal },
    { plan: t.premium, quality: 'premium' as const, from: fromPremium },
  ]

  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-title`}>
      {heading ? (
        <div className="mb-6 text-center md:mb-8">
          {t.kicker && <p className="mb-1.5 font-semibold text-steel-600">{t.kicker}</p>}
          <h2 id={`${id}-title`} className="text-[1.75rem] md:text-[2.3rem]">{t.title}</h2>
        </div>
      ) : (
        <h2 id={`${id}-title`} className="sr-only">{t.title}</h2>
      )}

      <div className="mx-auto max-w-4xl overflow-hidden rounded-panel border border-line bg-surface shadow-card">
        <table className="w-full table-fixed text-[0.8rem] sm:text-sm">
          <caption className="sr-only">{t.normal.name} and {t.premium.name} plans compared</caption>
          <colgroup>
            <col className="w-[34%] sm:w-[36%]" />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <td className="p-3 sm:p-5" />
              {cols.map(({ plan, quality, from }) => (
                <th key={quality} scope="col" className={cn('p-3 text-center align-top sm:p-5', quality === 'premium' ? 'bg-navy-900 text-snow-50' : 'bg-snow-200/60')}>
                  {plan.badge && quality === 'premium' && (
                    <span className="mb-1.5 hidden rounded-chip sm:inline-block bg-sun-400 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-navy-900">{plan.badge}</span>
                  )}
                  <span className={cn('block font-display text-xl sm:text-2xl', quality === 'premium' ? 'text-snow-50' : 'text-ink')}>{plan.name}</span>
                  <span className={cn('mt-1 block text-xs font-semibold tabular-nums sm:text-sm', quality === 'premium' ? 'text-sun-300' : 'text-ink-soft')}>{price(plan, from)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t-2 border-sun-400/60">
              <th scope="row" className="p-3 text-left sm:p-5">
                <span className="flex items-center gap-2 font-bold text-ink sm:text-base">
                  <Drone className="size-5 shrink-0 text-sun-500" aria-hidden /> Drone cleaning
                </span>
              </th>
              <td className="p-0"><DroneCell plan={t.normal} premium={false} /></td>
              <td className="p-0"><DroneCell plan={t.premium} premium /></td>
            </tr>
            {differs.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <th scope="row" className="p-3 text-left font-medium text-ink-soft sm:px-5">{r.label}</th>
                <td className="p-3 text-center text-ink-soft sm:px-5">{r.normal}</td>
                <td className="p-3 text-center font-semibold text-ink sm:px-5">{r.premium}</td>
              </tr>
            ))}
            <tr className="hidden border-t border-line sm:table-row">
              <td className="p-3 sm:p-5" />
              {cols.map(({ plan, quality }) => (
                <td key={quality} className="p-2 sm:p-4">
                  <LinkButton to={`/calculator?quality=${quality}`} variant={quality === 'premium' ? 'accent' : 'secondary'} size="sm" className="w-full whitespace-normal text-center">
                    {plan.ctaLabel || `Choose ${plan.name}`}
                  </LinkButton>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3 sm:hidden">
          {cols.map(({ plan, quality }) => (
            <LinkButton key={quality} to={`/calculator?quality=${quality}`} variant={quality === 'premium' ? 'accent' : 'secondary'} size="sm" className="w-full">
              {plan.name} quote
            </LinkButton>
          ))}
        </div>

        {shared.length > 0 && (
          <div className="border-t border-line bg-ice-100/60 px-4 py-3.5 text-sm sm:px-5">
            <p className="font-semibold text-ink">Both plans include</p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
              {shared.map((r) => (
                <li key={r.id} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-leaf-500" aria-hidden />
                  {/^included$/i.test(r.normal) ? r.label : `${r.label}: ${r.normal}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(t.normal.features.length > 0 || t.premium.features.length > 0) && (
          <details className="group border-t border-line">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold text-navy-700 hover:bg-snow-100 [&::-webkit-details-marker]:hidden">
              Full feature list <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-5 px-4 pb-5 sm:grid-cols-2 sm:px-5">
              {cols.map(({ plan, quality }) => (
                <div key={quality}>
                  <p className="font-semibold text-ink">{plan.name}</p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-ink-soft">
                    {plan.features.map((f, i) => (
                      <li key={`${i}-${f}`} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-hidden />{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      {t.footnote && <p className="mx-auto mt-3 max-w-4xl text-center text-xs text-muted">{t.footnote}</p>}
    </section>
  )
}
