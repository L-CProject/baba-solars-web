import { Link } from 'react-router'
import { useReducedMotion } from 'motion/react'
import * as motion from 'motion/react-m'
import { ArrowRight } from 'lucide-react'
import { SURYA_GHAR } from '@/config/site'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui'
import type { IconName } from '@/types'
import { FEATURED_SERVICE_IDS, useFeaturedService } from '@/hooks/useFeaturedService'
import { useSkipEntrance } from '@/lib/ssg'

type Tile = { icon: IconName; tag: string; title: string; text: string; to: string }

/** Animated promo tiles under the home banner. Drone & 6-month tiles use Admin → Services data. */
export function HighlightStrip({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const skip = useSkipEntrance()
  const drone = useFeaturedService(FEATURED_SERVICE_IDS.drone)
  const six = useFeaturedService(FEATURED_SERVICE_IDS.sixMonth)
  const tiles: Tile[] = [
    ...(drone ? [{ icon: drone.icon, tag: drone.highlight || 'New', title: drone.title, text: drone.summary, to: '/drone-cleaning' }] : []),
    ...(six ? [{ icon: six.icon, tag: six.highlight || 'Free', title: six.title, text: six.summary, to: `/services#${six.slug}` }] : []),
    { icon: 'file', tag: `Till ${SURYA_GHAR.deadlineLabel}`, title: 'PM Surya Ghar Subsidy', text: 'Up to ₹78,000 on home roof solar.', to: '/pm-surya-ghar' },
  ]
  return (
    <div className={cn('relative z-10 container-site', className)}>
      <ul className={cn('grid gap-4', tiles.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        {tiles.map((t, i) => (
          <motion.li
            key={t.title}
            initial={skip ? false : { opacity: 0, y: reduce ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to={t.to}
              className="group relative flex h-full items-start gap-4 overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-field bg-navy-800 text-sun-300 transition-transform duration-300 group-hover:scale-110">
                <Icon name={t.icon} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="badge-glow relative inline-block rounded-chip bg-accent px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-navy-900">{t.tag}</span>
                <span className="mt-1.5 block font-display text-lg capitalize leading-snug text-ink">{t.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{t.text}</span>
              </span>
              <ArrowRight className="mt-1 size-5 shrink-0 text-steel-500 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
