import { Check } from 'lucide-react'
import type { PricingPageContent, PricingPlan } from '@/types'
import { useSiteContent } from '@/queries'
import { formatINR, formatPriceRange } from '@/lib/format'
import { cn } from '@/lib/cn'
import { LinkButton } from '@/components/ui'

interface PricingCardProps {
  plan: PricingPlan
  /** Page text to use (admin live preview passes its unsaved draft). Defaults to saved content. */
  text?: PricingPageContent
}

/** Price-range card. Every label comes from the plan or from Admin → Pricing → Page text. */
export function PricingCard({ plan, text }: PricingCardProps) {
  const saved = useSiteContent().pricingPage
  const t = text ?? saved
  const isService = plan.category === 'maintenance'
  const isFree = plan.priceMax === 0
  const netMin = Math.max(0, plan.priceMin - plan.subsidy)
  const netMax = Math.max(0, plan.priceMax - plan.subsidy)
  const badge = plan.badge.trim() || (isFree ? t.freeBadge : t.featuredBadge)
  const ctaLabel = plan.ctaLabel.trim() || t.ctaLabel
  const sub = plan.featured ? 'text-snow-300' : 'text-muted'

  return (
    <article
      className={cn(
        'card-lift relative flex h-full flex-col rounded-card border p-6',
        plan.featured ? 'border-navy-700 bg-navy-800 text-snow-100 shadow-lift' : 'border-line bg-surface shadow-soft',
      )}
      aria-label={plan.name}
    >
      {plan.featured && (
        <span className={cn('absolute -top-3 left-6 rounded-chip bg-accent px-3 py-1 text-xs font-semibold text-navy-900 shadow-soft', isFree && 'badge-glow')}>
          {badge}
        </span>
      )}
      <h3 className={cn('font-sans text-lg font-semibold', plan.featured && 'text-snow-50')}>{plan.name}</h3>
      {plan.idealFor && <p className={cn('mt-1 text-sm', sub)}>{plan.idealFor}</p>}

      <div className="mt-5">
        <p className={cn('text-xs', sub)}>{isFree ? 'Price' : isService ? 'Estimated price' : 'Estimated system price'}</p>
        <p className={cn('mt-1 font-display text-[1.65rem] leading-tight tabular-nums', plan.featured ? 'text-snow-50' : 'text-ink')}>
          {isFree ? t.freePriceLabel : formatPriceRange(plan.priceMin, plan.priceMax)}
        </p>
        {plan.priceUnit && <p className={cn('text-sm', sub)}>{plan.priceUnit}</p>}
      </div>

      {plan.subsidy > 0 && (
        <dl className={cn('mt-4 grid grid-cols-2 gap-3 rounded-field p-3 text-sm', plan.featured ? 'bg-navy-700/70' : 'bg-ice-100')}>
          <div>
            <dt className={sub}>Subsidy up to</dt>
            <dd className="font-semibold tabular-nums">{formatINR(plan.subsidy)}</dd>
          </div>
          <div>
            <dt className={sub}>You pay about</dt>
            <dd className="font-semibold tabular-nums">{formatPriceRange(netMin, netMax)}</dd>
          </div>
        </dl>
      )}

      {!isService && (plan.monthlyGeneration || plan.roofArea) && (
        <dl className={cn('mt-4 grid grid-cols-2 gap-3 text-sm', plan.featured ? 'text-snow-200' : 'text-ink-soft')}>
          {plan.monthlyGeneration && <div><dt className={sub}>Generation</dt><dd>{plan.monthlyGeneration}/mo</dd></div>}
          {plan.roofArea && <div><dt className={sub}>Roof needed</dt><dd>{plan.roofArea}</dd></div>}
        </dl>
      )}

      {plan.features.length > 0 && (
        <ul className="mt-5 space-y-2 text-sm">
          {plan.features.map((f, i) => (
            <li key={`${i}-${f}`} className="flex gap-2">
              <Check className={cn('mt-0.5 size-4 shrink-0', plan.featured ? 'text-sun-300' : 'text-leaf-500')} aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        <LinkButton
          to={`/contact?plan=${encodeURIComponent(plan.id)}`}
          variant={plan.featured ? 'accent' : 'secondary'}
          className="w-full"
          aria-label={`${ctaLabel}: ${plan.name}`}
        >
          {ctaLabel}
        </LinkButton>
      </div>
    </article>
  )
}

export function PriceDisclaimer({ className, text }: { className?: string; text?: PricingPageContent }) {
  const saved = useSiteContent().pricingPage
  const t = text ?? saved
  if (!t.disclaimerText.trim()) return null
  return (
    <aside className={cn('rounded-card border border-ice-200 bg-ice-100/70 p-5 text-sm leading-relaxed text-ink-soft', className)} aria-label="Pricing disclaimer">
      {t.disclaimerTitle && <p className="font-semibold text-ink">{t.disclaimerTitle}</p>}
      <p className="mt-1 whitespace-pre-line">{t.disclaimerText}</p>
    </aside>
  )
}
