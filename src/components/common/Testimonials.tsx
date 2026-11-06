import { Star } from 'lucide-react'
import type { Testimonial } from '@/types'

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null
  return (
    <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
      {items.map((t) => (
        <li key={t.id} className="w-[85%] shrink-0 snap-start md:w-auto">
          <figure className="card-lift flex h-full flex-col rounded-card bg-surface p-6 shadow-soft">
            <div className="flex gap-0.5" role="img" aria-label={`Rated ${t.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={i < t.rating ? 'size-4 fill-sun-400 text-sun-400' : 'size-4 text-snow-300'} aria-hidden />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-[1.05rem] font-medium leading-relaxed text-ink">“{t.quote}”</blockquote>
            <figcaption className="mt-5 border-t border-line pt-4 text-sm">
              <span className="font-semibold text-ink">{t.name}</span>
              <span className="block text-muted">{[t.location, t.system].filter(Boolean).join(', ')}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}
