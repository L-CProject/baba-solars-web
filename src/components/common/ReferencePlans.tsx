import { Check } from 'lucide-react'
import type { CapacityPlan } from '@/types'
import { usePublished } from '@/queries'
import { cn } from '@/lib/cn'
import { LinkButton, Reveal } from '@/components/ui'

const segmentLabel: Record<CapacityPlan['segment'], string> = {
  residential: 'Home', commercial: 'Commercial', industrial: 'Industrial',
}

const serviceFor = (p: CapacityPlan) => (p.segment === 'residential' ? 'Home roof installation' : 'Commercial and industrial solar')

export const capacityPlanLink = (p: CapacityPlan) =>
  `/contact?service=${encodeURIComponent(serviceFor(p))}&message=${encodeURIComponent(`I'm interested in the ${p.name} (${p.capacity}). Please share a price after survey.`)}`

/** One "plan by capacity" card. Exported for the admin live preview. */
export function CapacityPlanCard({ plan: p }: { plan: CapacityPlan }) {
  const sub = p.featured ? 'text-snow-300' : 'text-muted'
  return (
    <article
      aria-label={p.name}
      className={cn(
        'card-lift relative flex h-full flex-col rounded-card border p-6',
        p.featured ? 'border-navy-700 bg-navy-800 text-snow-100 shadow-lift' : 'border-line bg-surface shadow-soft',
      )}
    >
      {p.featured && p.badge && <span className="absolute -top-3 left-6 rounded-chip bg-accent px-3 py-1 text-xs font-semibold text-navy-900 shadow-soft">{p.badge}</span>}
      <p className={cn('text-xs font-semibold uppercase tracking-wide', p.featured ? 'text-sun-300' : 'text-steel-600')}>{segmentLabel[p.segment]} · {p.capacity}</p>
      <h3 className={cn('mt-1 font-sans text-xl font-semibold', p.featured && 'text-snow-50')}>{p.name}</h3>
      {p.subtitle && <p className={cn('text-sm', sub)}>{p.subtitle}</p>}

      {p.specs.length > 0 && (
        <dl className="mt-5 space-y-2.5 text-sm">
          {p.specs.map((s, i) => (
            <div key={`${i}-${s.label}`} className={cn('flex flex-col rounded-field px-3 py-2', p.featured ? 'bg-navy-700/70' : 'bg-ice-100')}>
              <dt className={sub}>{s.label}</dt>
              <dd className="font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {p.features.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {p.features.map((f, i) => (
            <li key={`${i}-${f}`} className="flex gap-2"><Check className={cn('mt-0.5 size-4 shrink-0', p.featured ? 'text-sun-300' : 'text-leaf-500')} aria-hidden />{f}</li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        {p.priceNote && <p className={cn('mb-3 text-sm font-semibold', p.featured ? 'text-snow-50' : 'text-ink')}>{p.priceNote}</p>}
        <LinkButton to={capacityPlanLink(p)} variant={p.featured ? 'accent' : 'secondary'} className="w-full" aria-label={`${p.ctaLabel}: ${p.name}`}>
          {p.ctaLabel}
        </LinkButton>
      </div>
    </article>
  )
}

/** Solar plans by capacity (Admin → Pricing → Capacity plans). Hidden when none are published. */
export function ReferencePlans({ className }: { className?: string }) {
  const plans = usePublished('capacityPlans')
  if (!plans.length) return null
  return (
    <div className={cn('grid gap-6 pt-3 md:grid-cols-2 lg:grid-cols-3', className)}>
      {plans.map((p, i) => (
        <Reveal key={p.id} index={i % 3} className="h-full">
          <CapacityPlanCard plan={p} />
        </Reveal>
      ))}
    </div>
  )
}
