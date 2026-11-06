import { useCallback, useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Expand, Gift, Sparkles, Ticket } from 'lucide-react'
import type { Offer, OfferImage } from '@/types'
import { useSiteContent } from '@/queries'
import { daysLeft, offerDateRange, offerEnquiryHref, offerSrcSet, offerSummary, offerThumb } from '@/lib/offers'
import { formatINR, whatsappHref } from '@/lib/format'
import { cn } from '@/lib/cn'
import { WhatsAppIcon } from '@/components/ui'
import { Lightbox } from './Lightbox'
import { useLiveOffers } from './OfferRibbon'

/**
 * Website offers from Admin → Offers. These are the ONLY components with the festive (Diwali) look;
 * colours and animations live in the scoped `.diwali-*` classes in styles/index.css.
 */

const AUTOPLAY_MS = 5000

/** false until shortly after the window `load` event (same value in prerendered HTML and on hydration). */
function useAfterLoad(delay = 1200): [boolean, () => void] {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (ready) return
    let t = 0
    const go = () => { t = window.setTimeout(() => setReady(true), delay) }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => { window.removeEventListener('load', go); window.clearTimeout(t) }
  }, [ready, delay])
  return [ready, () => setReady(true)]
}

/** Best single file for big views (lightbox): the largest variant, else the image itself. */
const largest = (img: OfferImage) => img.variants?.at(-1)?.url ?? img.url

function OfferImg({ img, sizes, priority, className }: { img: OfferImage; sizes: string; priority?: boolean; className?: string }) {
  // Lead poster: a <link rel=preload> in <head> (also in the prerendered HTML) so it starts before the body is parsed.
  if (priority) preload(img.variants?.[1]?.url ?? img.url, { as: 'image', fetchPriority: 'high', imageSrcSet: offerSrcSet(img), imageSizes: offerSrcSet(img) ? sizes : undefined })
  return (
    <img
      src={img.variants?.[1]?.url ?? img.url}
      srcSet={offerSrcSet(img)}
      sizes={offerSrcSet(img) ? sizes : undefined}
      alt={img.alt}
      width={img.width}
      height={img.height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...(priority ? { fetchPriority: 'high' as const } : {})}
      className={className}
    />
  )
}

/** Poster slider: native scroll-snap (swipe on phones), arrows, thumbnails, autoplay that stops on interaction. */
function PosterCarousel({ images, active, onActive, onOpen, priority }: {
  images: OfferImage[]; active: number; onActive: (i: number) => void; onOpen: (i: number) => void; priority?: boolean
}) {
  const track = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [stopped, setStopped] = useState(false)
  /** Off-screen slides and thumbnails load only after the page has loaded (or on first use), so the lead poster gets the bandwidth. */
  const [restReady, setRestReady] = useAfterLoad()
  const n = images.length

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current
    if (!el) return
    const next = ((i % n) + n) % n
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
    onActive(next)
  }, [n, onActive])

  // Keep the active index in sync with manual swipes.
  useEffect(() => {
    const el = track.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
        if (i !== active && i >= 0 && i < n) onActive(i)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [active, n, onActive])

  // External selection (e.g. a slab card) scrolls the track.
  useEffect(() => {
    const el = track.current
    if (el && Math.round(el.scrollLeft / Math.max(1, el.clientWidth)) !== active) el.scrollTo({ left: active * el.clientWidth, behavior: 'smooth' })
  }, [active])

  // Autoplay: off for reduced motion, while hovered/focused, when the tab is hidden, and after any manual use.
  useEffect(() => {
    if (n < 2 || paused || stopped || !restReady) return
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => { if (!document.hidden) goTo(active + 1) }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [n, paused, stopped, active, goTo])

  const manual = (i: number) => { setStopped(true); setRestReady(); goTo(i) }

  // Selecting a poster from elsewhere (slab card) needs its image right away.
  useEffect(() => { if (active > 0) setRestReady() }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={() => setStopped(true)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Offer posters"
    >
      <div className="diwali-frame relative overflow-hidden rounded-[1.4rem] p-1.5">
        <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[1.1rem]" tabIndex={-1}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onOpen(i)}
              className="group relative w-full shrink-0 snap-center snap-always"
              aria-label={`View poster ${i + 1} of ${n} full size: ${img.alt}`}
              aria-hidden={i !== active || undefined}
              tabIndex={i === active ? 0 : -1}
            >
              {i === 0 || restReady ? (
                <OfferImg
                  img={img}
                  priority={priority && i === 0}
                  sizes="(min-width: 1024px) 440px, (min-width: 640px) 480px, 84vw"
                  className="aspect-[1032/1280] w-full bg-[var(--dw-night)] object-cover"
                />
              ) : (
                <span className="block aspect-[1032/1280] w-full bg-[var(--dw-night)]" />
              )}
              <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                <Expand className="size-4" />
              </span>
            </button>
          ))}
        </div>
        {n > 1 && (
          <>
            <button type="button" onClick={() => manual(active - 1)} className="diwali-arrow left-3" aria-label="Previous poster"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => manual(active + 1)} className="diwali-arrow right-3" aria-label="Next poster"><ChevronRight className="size-5" /></button>
          </>
        )}
      </div>

      {n > 1 && (
        <ul className="mt-3 flex justify-center gap-2" aria-label="Choose a poster">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => manual(i)}
                aria-label={`Show poster ${i + 1}`}
                aria-current={i === active || undefined}
                className={cn(
                  'block overflow-hidden rounded-lg border-2 transition-[border-color,opacity,transform] duration-300',
                  i === active ? 'scale-105 border-[var(--dw-gold)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                {restReady ? (
                  <img src={offerThumb(img)} alt="" width={44} height={55} loading="lazy" decoding="async" className="h-[55px] w-[44px] object-cover object-[50%_60%]" />
                ) : (
                  <span className="block h-[55px] w-[44px] bg-[var(--dw-plum)]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Emoji keep their own colours inside the gold gradient title. */
function TitleText({ text }: { text: string }) {
  const parts = text.split(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u)
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className="diwali-emoji">{p}</span> : p))}</>
}

/** "21 days left" — worked out after mount, so prerendered HTML never shows a stale count. */
function DaysLeft({ offer }: { offer: Offer }) {
  const [days, setDays] = useState<number | null>(null)
  useEffect(() => setDays(daysLeft(offer)), [offer])
  if (days == null || days < 1) return null
  return (
    <span className="rounded-full bg-[var(--dw-ember)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--dw-cream)]">
      {days === 1 ? 'Last day!' : `${days} days left`}
    </span>
  )
}

function OfferBlock({ offer, headingId, asPage, priority }: { offer: Offer; headingId: string; asPage?: boolean; priority?: boolean }) {
  const content = useSiteContent()
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const [cardImages] = useAfterLoad(400)
  const images = offer.images
  const posterFor = (slabId: string) => images.findIndex((img) => img.slabId === slabId)
  const drawIndex = images.findIndex((img) => !img.slabId && /draw|lucky|be ?6/i.test(img.alt + img.url))
  const range = offerDateRange(offer)
  const Heading = asPage ? 'h1' : 'h2'
  const kwOf = (capacity: string) => (/^\s*(\d+(?:\.\d+)?)/.exec(capacity)?.[1] ?? '')
  const waText = `Hi ${content.businessName}, I want to book the ${offer.badge || offer.title}${offer.bookingAmount != null ? ` (booking ${formatINR(offer.bookingAmount)})` : ''}. ${offerSummary(offer)}`
  const hasImages = images.length > 0

  return (
    <div className={cn('grid items-start gap-x-12 gap-y-7', hasImages && 'lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]')}>
      {/* Heading (first on phones, right column on desktop) */}
      <header className={cn(hasImages && 'lg:col-start-2')}>
        <div className="flex flex-wrap items-center gap-2">
          {offer.badge && (
            <p className="diwali-badge inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider sm:text-sm">
              <Sparkles className="size-4" aria-hidden /> {offer.badge}
            </p>
          )}
          <DaysLeft offer={offer} />
        </div>
        <Heading id={headingId} className="diwali-gold-text mt-3 font-display text-[1.9rem] leading-[1.12] sm:text-4xl lg:text-[2.6rem]">
          <TitleText text={offer.title} />
        </Heading>
        {offer.description && <p className="mt-3 text-base text-[var(--dw-gold-soft)] sm:text-lg">{offer.description}</p>}
        {range && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--dw-cream)]">
            <CalendarDays className="size-4 text-[var(--dw-gold)]" aria-hidden /> Valid {range}
          </p>
        )}
      </header>

      {/* Poster slider (left column on desktop, spans both rows) */}
      {hasImages && (
        <div className="mx-auto w-full max-w-[30rem] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-none">
          <PosterCarousel images={images} active={active} onActive={setActive} onOpen={setZoom} priority={priority} />
        </div>
      )}

      {/* Gifts, lucky draw and booking */}
      <div className={cn('min-w-0', hasImages && 'lg:col-start-2')}>
        {offer.slabs.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-3" aria-label="Free gift by system size">
            {offer.slabs.map((s, i) => {
              const poster = posterFor(s.id)
              const kw = kwOf(s.capacity)
              return (
                <li key={s.id} className={cn('diwali-card flex overflow-hidden rounded-2xl sm:flex-col', i === offer.slabs.length - 1 && offer.slabs.length > 1 && 'diwali-card-hot')}>
                  {poster >= 0 && cardImages && (
                    <button type="button" onClick={() => setActive(poster)} className="relative block w-24 shrink-0 overflow-hidden sm:h-28 sm:w-auto" aria-label={`Show the ${s.capacity} poster`}>
                      <img src={offerThumb(images[poster])} srcSet={offerSrcSet(images[poster])} sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 96px" alt="" loading="lazy" decoding="async" width={480} height={595}
                        className="size-full object-cover object-[50%_64%] transition-transform duration-500 hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-[var(--dw-night)]/80 to-transparent" aria-hidden />
                    </button>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-3.5">
                    <p className="font-display text-2xl font-bold leading-none text-[var(--dw-gold)]">{s.capacity}</p>
                    <p className="mt-1 flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--dw-gold-soft)]">
                      <Gift className="size-3.5" aria-hidden /> Free gift
                    </p>
                    <p className="mt-1 flex-1 text-sm font-semibold leading-snug text-[var(--dw-cream)]">{s.gifts}</p>
                    <Link to={offerEnquiryHref(offer, kw)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--dw-gold)] underline-offset-4 hover:underline">
                      Book {s.capacity} <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {offer.luckyDrawText && (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-[rgb(255_201_60/0.4)] bg-[linear-gradient(100deg,rgb(163_38_15/0.55),rgb(109_16_40/0.35))] p-3 pr-4">
            {drawIndex >= 0 && cardImages ? (
              <button type="button" onClick={() => setActive(drawIndex)} className="shrink-0 overflow-hidden rounded-xl" aria-label="Show the lucky draw poster">
                <img src={offerThumb(images[drawIndex])} alt="" loading="lazy" decoding="async" width={160} height={198} className="h-16 w-20 object-cover object-[50%_66%]" />
              </button>
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--dw-gold)] text-[var(--dw-night)]"><Ticket className="size-6" aria-hidden /></span>
            )}
            <p className="text-sm font-semibold text-[var(--dw-cream)] sm:text-base">
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--dw-gold)]">Grand lucky draw</span>
              {offer.luckyDrawText}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to={offerEnquiryHref(offer)} className="diwali-cta inline-flex min-h-13 items-center justify-center gap-2 rounded-[0.9rem] px-6 text-base font-bold">
            {offer.ctaLabel || 'Enquiry Now'}
            {offer.bookingAmount != null && <span className="font-display">· {formatINR(offer.bookingAmount)}</span>}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          {content.whatsapp && (
            <a href={whatsappHref(content.whatsapp, waText)} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-[0.9rem] border border-[rgb(255_201_60/0.55)] px-5 font-semibold text-[var(--dw-cream)] transition-colors hover:bg-white/10">
              <WhatsAppIcon className="size-5" /> Book on WhatsApp
            </a>
          )}
        </div>
        {offer.bookingAmount != null && (
          <p className="mt-2 text-sm text-[var(--dw-gold-soft)]">Book your system for just {formatINR(offer.bookingAmount)} — every booking gets a lucky draw coupon.</p>
        )}
        {offer.terms && <p className="mt-3 text-xs text-[var(--dw-gold-soft)]/80">{offer.terms}</p>}
      </div>

      <Lightbox items={images.map((img) => ({ id: img.id, imageUrl: largest(img), caption: img.alt }))} index={zoom} onChange={setZoom} />
    </div>
  )
}

const SPARKS = [
  { top: '10%', left: '6%', size: 6, delay: '0s', dur: '3.2s' },
  { top: '8%', left: '78%', size: 7, delay: '0.6s', dur: '3.6s' },
  { top: '64%', left: '94%', size: 5, delay: '1.8s', dur: '3s' },
  { top: '86%', left: '30%', size: 6, delay: '0.3s', dur: '3.4s' },
  { top: '46%', left: '2%', size: 4, delay: '2.2s', dur: '2.8s' },
]

/**
 * Highlighted offer section. On the home page it is the first section, so the offer is the first
 * thing a visitor sees; on /offers it carries the page's h1. Renders nothing when no offer is live.
 */
export function OfferSection({ asPage = false }: { asPage?: boolean }) {
  const offers = useLiveOffers()
  if (!offers.length) return null
  return (
    <section id="offers" aria-labelledby={`offer-title-${offers[0].id}`} className="diwali-scope diwali-bg relative isolate scroll-mt-24 overflow-hidden py-9 text-[var(--dw-cream)] sm:py-12 lg:py-14">
      <div className="diwali-pattern absolute inset-0 -z-10" aria-hidden />
      {SPARKS.map((s, i) => (
        <span key={i} className="diwali-spark -z-10" aria-hidden
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, ['--delay' as string]: s.delay, ['--dur' as string]: s.dur }} />
      ))}
      <div className="container-site space-y-14">
        {offers.map((o, i) => <OfferBlock key={o.id} offer={o} headingId={`offer-title-${o.id}`} asPage={asPage && i === 0} priority={i === 0} />)}
      </div>
    </section>
  )
}
