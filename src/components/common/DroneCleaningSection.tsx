import { useReducedMotion } from 'motion/react'
import * as motion from 'motion/react-m'
import { Camera, Check, Footprints, Gauge, Mountain } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSkipEntrance } from '@/lib/ssg'
import { LinkButton, Icon } from '@/components/ui'
import { enquiryLink, FEATURED_SERVICE_IDS, useFeaturedService } from '@/hooks/useFeaturedService'
import { DroneArt } from './DroneArt'
import { SolarParticles } from './SolarParticles'

/** Icons cycle over the "What's included" lines edited in Admin → Services. */
const benefitIcons = [Mountain, Footprints, Camera, Gauge]

interface DroneCleaningSectionProps {
  /** "home" shows a CTA to the dedicated page; "page" shows only the booking CTAs. */
  variant?: 'home' | 'page'
  className?: string
}

/** Prominent, animated showcase for the Drone Solar Panel Cleaning service. */
export function DroneCleaningSection({ variant = 'home', className }: DroneCleaningSectionProps) {
  const reduce = useReducedMotion()
  const skip = useSkipEntrance()
  // Text comes from Admin → Services → "Drone solar panel cleaning". Draft/deleted = section hidden.
  const svc = useFeaturedService(FEATURED_SERVICE_IDS.drone)
  const fadeUp = {
    initial: { opacity: 0, y: reduce ? 0 : 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }
  if (!svc) return null
  const [firstWord, ...restWords] = svc.title.split(' ')

  return (
    <section id="drone-cleaning" aria-labelledby="drone-title" className={cn('section-y solar-grid-dark overflow-hidden bg-navy-900 text-snow-100', className)}>
      <SolarParticles />
      {/* soft glow */}
      <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-steel-500/25 blur-3xl" aria-hidden />
      <div className="container-site relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div {...fadeUp}>
          {svc.highlight && (
            <p className="badge-glow relative inline-flex items-center gap-2 rounded-chip bg-accent px-3.5 py-1 text-sm font-semibold text-navy-900">
              <Icon name={svc.icon} className="size-4" /> {svc.highlight}
            </p>
          )}
          <h2 id="drone-title" className="mt-4 text-3xl capitalize text-snow-50 md:text-[2.6rem]">
            <span className="text-shine">{firstWord}</span> {restWords.join(' ')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-snow-300">{svc.description || svc.summary}</p>

          <ul className="mt-7 grid gap-4 sm:grid-cols-2">
            {svc.includes.map((text, i) => {
              const BIcon = benefitIcons[i % benefitIcons.length]
              return (
              <motion.li
                key={text}
                className="flex gap-3 rounded-card border border-navy-600 bg-navy-800/70 p-4"
                initial={skip ? false : { opacity: 0, y: reduce ? 0 : 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              >
                <BIcon className="mt-0.5 size-5 shrink-0 text-sun-300" aria-hidden />
                <p className="font-semibold text-snow-50">{text}</p>
              </motion.li>
              )
            })}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to={enquiryLink(svc.title)} variant="accent" size="lg">Book now</LinkButton>
            {variant === 'home' ? (
              <LinkButton to="/drone-cleaning" variant="light" size="lg">How it works</LinkButton>
            ) : (
              <LinkButton to="/pricing#maintenance" variant="light" size="lg">See care plans</LinkButton>
            )}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-snow-300">
            <Check className="size-4 text-leaf-500" aria-hidden /> {svc.startingPrice || 'Price after a free site check'}
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="relative">
          <DroneArt className="rounded-panel shadow-lift" />
          <span className="absolute -bottom-4 left-6 rounded-chip bg-snow-50 px-4 py-2 text-sm font-semibold text-navy-800 shadow-card">
            Roofs, sheds &amp; solar plants
          </span>
        </motion.div>
      </div>
    </section>
  )
}
