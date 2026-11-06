import type { MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Gift } from 'lucide-react'
import type { Offer } from '@/types'
import { useSiteContent } from '@/queries'
import { activeOffers, offerDateRange } from '@/lib/offers'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Light offer pieces used in the header on every page (the full section lives in OfferSection.tsx). */

/** Live offers for the website (enabled, titled, inside their dates). */
export function useLiveOffers(): Offer[] {
  return activeOffers(useSiteContent().offers)
}

/** Slim animated marquee shown site-wide while an offer is live; jumps to the offer section (or /offers). */
export function OfferRibbon() {
  const offer = useLiveOffers()[0]
  const navigate = useNavigate()
  if (!offer) return null
  const parts = [
    offer.badge,
    ...offer.slabs.map((s) => `${s.capacity}: ${s.gifts}`),
    offer.bookingAmount != null ? `Book for just ${formatINR(offer.bookingAmount)}` : '',
    offer.luckyDrawText,
    offerDateRange(offer) ? `Valid ${offerDateRange(offer)}` : '',
  ].filter(Boolean)
  const strip = (hidden?: boolean) => (
    <span className="flex shrink-0 items-center gap-6 pr-6" aria-hidden={hidden || undefined}>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-6 whitespace-nowrap">
          <span className={i === 0 ? 'font-bold uppercase tracking-wider text-[var(--dw-gold)]' : ''}>{p}</span>
          <span className="text-[var(--dw-gold)]" aria-hidden>✦</span>
        </span>
      ))}
      <span className="whitespace-nowrap font-bold text-[var(--dw-gold)] underline underline-offset-4">See offer →</span>
      <span className="text-[var(--dw-gold)]" aria-hidden>✦</span>
    </span>
  )
  const onClick = (e: MouseEvent) => {
    const el = document.getElementById('offers')
    e.preventDefault()
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else navigate('/offers')
  }
  return (
    <a
      href="/offers"
      onClick={onClick}
      className="diwali-scope diwali-ribbon relative z-[51] block overflow-hidden py-2 text-sm text-[var(--dw-cream)]"
      aria-label={`${offer.badge ? offer.badge + ': ' : ''}${offer.title} — see the offer`}
    >
      <span className="diwali-marquee flex w-max">
        {strip()}
        {strip(true)}
      </span>
    </a>
  )
}

/** Gold "Offers" button for the header — only while an offer is live. */
export function OfferNavButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  const live = useLiveOffers().length > 0
  const { pathname } = useLocation()
  if (!live) return null
  return (
    <Link
      to="/offers"
      onClick={onClick}
      aria-current={pathname === '/offers' ? 'page' : undefined}
      className={cn('diwali-scope diwali-pill inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold', className)}
    >
      <Gift className="size-4" aria-hidden /> Offers
    </Link>
  )
}
