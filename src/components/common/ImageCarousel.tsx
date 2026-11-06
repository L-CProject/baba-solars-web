import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { SmartImage } from './SmartImage'
import { Lightbox, type LightboxItem } from './Lightbox'

/**
 * Horizontal photo slider (like the client's installation photo strip):
 * native scroll-snap so it swipes smoothly on Android/iOS, arrow buttons on
 * desktop, gentle autoplay that pauses on hover/touch, tap to enlarge.
 */
export function ImageCarousel({ items, label, autoplay = true }: { items: LightboxItem[]; label: string; autoplay?: boolean }) {
  const track = useRef<HTMLUListElement>(null)
  const [paused, setPaused] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const reduce = useReducedMotion()

  const updateEdges = useCallback(() => {
    const el = track.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }, [])

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector('li')
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8
    if (dir === 1 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!autoplay || paused || reduce || open !== null || items.length < 2) return
    const t = window.setInterval(() => scrollByCard(1), 3800)
    return () => window.clearInterval(t)
  }, [autoplay, paused, reduce, open, items.length, scrollByCard])

  useEffect(() => { updateEdges() }, [items.length, updateEdges])

  if (!items.length) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <ul
        ref={track}
        onScroll={updateEdges}
        aria-label={label}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, i) => (
          <li key={it.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-12px)]">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-card bg-ice-100 shadow-soft"
              aria-label={`Enlarge photo: ${it.caption || `photo ${i + 1}`}`}
            >
              <SmartImage src={it.imageUrl} alt={it.caption} className="size-full transition-transform duration-700 ease-soft group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-navy-900/80 to-transparent p-4 pt-12 text-left text-sm font-medium text-snow-50">
                <span>{it.caption}</span>
                <Expand className="size-4 shrink-0 opacity-80" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => scrollByCard(-1)} disabled={edges.start} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-soft hover:border-steel-400 disabled:opacity-40" aria-label="Previous photos">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => scrollByCard(1)} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-soft hover:border-steel-400" aria-label="Next photos">
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
      <Lightbox items={items} index={open} onChange={setOpen} />
    </div>
  )
}
