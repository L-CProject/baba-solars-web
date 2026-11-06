import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import * as motion from 'motion/react-m'
import { ArrowRight, CalendarCheck, Drone, Landmark, Megaphone } from 'lucide-react'
import { SURYA_GHAR } from '@/config/site'
import { cn } from '@/lib/cn'
import { usePublished, useSiteContent } from '@/queries'
import { FEATURED_SERVICE_IDS } from '@/hooks/useFeaturedService'

const INTERVAL = 4500

type TickerItem = {
  id: string
  /** Section id on the home page that the click scrolls to */
  target: string
  tag: string
  title: string
  text: string
  thumb: 'drone' | 'calendar' | 'pm' | 'offer'
}

/**
 * Ticker items are built from admin data:
 *  - Drone & 6-month items use title / summary / ribbon from Admin → Services (hidden when Draft or deleted)
 *  - Admin → Site content → Announcement (when enabled) is added as the first item
 *  - PM Surya Ghar uses the official facts in src/config/site.ts
 */
function useTickerItems(): TickerItem[] {
  const services = usePublished('services')
  const content = useSiteContent()
  return useMemo(() => {
    const pick = (id: string) => services.find((s) => s.id === id && s.status === 'published')
    const drone = pick(FEATURED_SERVICE_IDS.drone)
    const six = pick(FEATURED_SERVICE_IDS.sixMonth)
    const items: TickerItem[] = []
    if (content.announcementEnabled && content.announcement.trim()) {
      items.push({ id: 'announcement', target: 'six-month-plan', thumb: 'offer', tag: 'Offer', title: content.announcement, text: content.tagline })
    }
    if (drone) items.push({ id: 'drone', target: 'drone-cleaning', thumb: 'drone', tag: drone.highlight || 'New', title: drone.title, text: drone.summary })
    if (six) items.push({ id: 'six', target: 'six-month-plan', thumb: 'calendar', tag: six.highlight || 'Free', title: six.title, text: six.summary })
    items.push({
      id: 'psg', target: 'pm-surya-ghar', thumb: 'pm', tag: `Till ${SURYA_GHAR.deadlineLabel}`,
      title: 'PM Surya Ghar Muft Bijli Yojana',
      text: 'Subsidy up to ₹78,000 on home roof solar. We help you apply.',
    })
    return items
  }, [services, content])
}

/** Smooth-scrolls to a section; if it is not on this page, navigates home first (PublicLayout finishes the scroll). */
export function useScrollToSection() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return useCallback(
    (id: string, e?: MouseEvent) => {
      const el = pathname === '/' ? document.getElementById(id) : null
      if (el) {
        e?.preventDefault()
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.history.replaceState(window.history.state, '', `/#${id}`)
        return
      }
      e?.preventDefault()
      navigate(`/#${id}`)
    },
    [navigate, pathname],
  )
}

function Thumb({ kind }: { kind: TickerItem['thumb'] }) {
  if (kind === 'pm') {
    return (
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[conic-gradient(#ff9933_0_33%,#ffffff_0_66%,#138808_0)] p-[2.5px] sm:size-11">
        {SURYA_GHAR.photo ? (
          <img src={SURYA_GHAR.photo} alt={SURYA_GHAR.photoAlt} className="size-full rounded-full object-cover object-top" loading="eager" />
        ) : (
          <span className="grid size-full place-items-center rounded-full bg-navy-800 text-sun-300"><Landmark className="size-5" aria-hidden /></span>
        )}
      </span>
    )
  }
  const Icon = kind === 'drone' ? Drone : kind === 'offer' ? Megaphone : CalendarCheck
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sun-400 text-navy-900 sm:size-11">
      <Icon className={cn('size-5', kind === 'drone' && 'drone-hover')} aria-hidden />
    </span>
  )
}

/**
 * Rotating, animated highlight bar at the very top of every page:
 * Drone cleaning → 6 months free cleaning → PM Surya Ghar. Click = smooth scroll to the section.
 */
export function HighlightTicker() {
  const reduce = useReducedMotion()
  const scrollTo = useScrollToSection()
  const items = useTickerItems()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const item = items[index % items.length]

  useEffect(() => {
    if (paused || reduce || items.length < 2) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL)
    return () => window.clearTimeout(t)
  }, [index, paused, reduce, items.length])

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 text-snow-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Offers and schemes"
    >
      {/* light sweep across the bar */}
      <div className="clean-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-snow-50/10 to-transparent" aria-hidden />

      <div className="container-site relative flex h-[5.25rem] items-center gap-3 sm:h-16">
        <div className="relative min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -14 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/#${item.target}`}
                onClick={(e) => scrollTo(item.target, e)}
                className="group flex items-center gap-3 rounded-field py-1 pr-2 outline-offset-4"
              >
                <Thumb kind={item.thumb} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className="badge-glow relative shrink-0 rounded-chip bg-accent px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-navy-900">{item.tag}</span>
                    <span className="block max-w-full truncate font-display text-sm font-semibold capitalize text-snow-50 sm:text-base">{item.title}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-snow-300 sm:text-sm">{item.text}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 rounded-chip border border-sun-300/50 px-3 py-1 text-xs font-semibold text-sun-300 transition-colors group-hover:bg-sun-400 group-hover:text-navy-900 sm:inline-flex">
                  View <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <ArrowRight className="size-4 shrink-0 text-sun-300 sm:hidden" aria-hidden />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* dots */}
        <div className="hidden shrink-0 items-center gap-0.5 sm:flex" role="tablist" aria-label="Choose highlight">
          {items.map((it, i) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={it.id === item.id}
              aria-label={it.title}
              onClick={() => setIndex(i)}
              className="group/dot grid h-6 min-w-6 place-items-center"
            >
              <span className={cn('relative block h-1.5 overflow-hidden rounded-full transition-all duration-300', it.id === item.id ? 'w-7 bg-snow-50/25' : 'w-2.5 bg-snow-50/40 group-hover/dot:bg-snow-50/70')}>
                {it.id === item.id && (
                  <motion.span
                    key={`${it.id}-${paused}`}
                    className="absolute inset-0 origin-left bg-sun-400"
                    initial={{ scaleX: paused || reduce ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: paused || reduce ? 0 : INTERVAL / 1000, ease: 'linear' }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* mobile progress line */}
      <motion.span
        key={`m-${item.id}-${paused}`}
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-sun-400 sm:hidden"
        initial={{ scaleX: paused || reduce ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: paused || reduce ? 0 : INTERVAL / 1000, ease: 'linear' }}
        aria-hidden
      />
    </div>
  )
}
