import { useReducedMotion } from 'motion/react'
import * as motion from 'motion/react-m'
import { CalendarCheck, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LinkButton } from '@/components/ui'
import { SolarParticles } from './SolarParticles'
import { enquiryLink, FEATURED_SERVICE_IDS, useFeaturedService } from '@/hooks/useFeaturedService'
import { useSkipEntrance } from '@/lib/ssg'

/** Small animated pill: "6 Months FREE care". Use in banners, cards and headers. */
export function SixMonthBadge({ className, tone = 'accent' }: { className?: string; tone?: 'accent' | 'light' }) {
  return (
    <span
      className={cn(
        'badge-glow relative inline-flex items-center gap-1.5 rounded-chip px-3 py-1 text-xs font-bold uppercase tracking-wide',
        tone === 'accent' ? 'bg-accent text-navy-900' : 'border border-sun-300/60 bg-navy-800 text-sun-300',
        className,
      )}
    >
      <Sparkles className="size-3.5" aria-hidden /> 6 months free care
    </span>
  )
}

/** Animated progress ring showing the 6-month window. */
function MonthRing() {
  const reduce = useReducedMotion()
  const skip = useSkipEntrance()
  const r = 62
  const len = 2 * Math.PI * r
  return (
    <div className="relative mx-auto size-44 shrink-0 sm:size-52">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-navy-600)" strokeWidth="12" />
        <motion.circle
          cx="80" cy="80" r={r} fill="none" stroke="var(--color-sun-400)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={len}
          initial={skip ? false : { strokeDashoffset: reduce ? 0 : len }}
          whileInView={{ strokeDashoffset: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-6xl font-bold leading-none text-snow-50">6</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-sun-300">months free</p>
        </div>
      </div>
    </div>
  )
}

interface SixMonthPlanProps {
  className?: string
  /** Hide the outer section padding when nested inside another section. */
  bare?: boolean
}

/** Highlight card for the 6-month free service/maintenance plan. */
export function SixMonthPlan({ className, bare = false }: SixMonthPlanProps) {
  const reduce = useReducedMotion()
  const skip = useSkipEntrance()
  // Text comes from Admin → Services → "6-month free care plan". Draft/deleted = card hidden.
  const svc = useFeaturedService(FEATURED_SERVICE_IDS.sixMonth)
  if (!svc) return null
  const card = (
    <motion.div
      initial={skip ? false : { opacity: 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-panel border-2 border-sun-400/70 bg-navy-800 p-6 text-snow-100 shadow-lift md:p-10"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-sun-400/15 blur-3xl" aria-hidden />
      <SolarParticles />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <MonthRing />
        <div>
          <SixMonthBadge />
          <h2 className="mt-3 text-3xl capitalize text-snow-50 md:text-4xl">{svc.title}</h2>
          <p className="mt-3 text-lg text-snow-300">{svc.description || svc.summary}</p>

          {/* Month chips that light up one by one */}
          <ol className="mt-6 grid grid-cols-6 gap-1.5 sm:gap-2" aria-label="Six months of free care">
            {Array.from({ length: 6 }, (_, i) => (
              <motion.li
                key={i}
                initial={skip ? false : { opacity: 0.25, scale: reduce ? 1 : 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 + i * 0.15, duration: 0.35 }}
                className="flex flex-col items-center rounded-field bg-navy-700 py-2 text-center"
              >
                <CalendarCheck className="size-4 text-sun-300" aria-hidden />
                <span className="mt-1 text-[0.7rem] font-semibold text-snow-200 sm:text-xs">M{i + 1}</span>
              </motion.li>
            ))}
          </ol>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {svc.includes.map((t) => (
              <li key={t} className="flex gap-2.5 text-snow-200"><Check className="mt-1 size-4 shrink-0 text-leaf-500" aria-hidden />{t}</li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to={enquiryLink(svc.title)} variant="accent" size="lg">Claim with new installation</LinkButton>
            <LinkButton to="/pricing#maintenance" variant="light" size="lg">Compare care plans</LinkButton>
          </div>
        </div>
      </div>
    </motion.div>
  )

  if (bare) return <div className={className}>{card}</div>
  return (
    <section id="six-month-plan" className={cn('section-y', className)} aria-label="6-month free service plan">
      <div className="container-site">{card}</div>
    </section>
  )
}
