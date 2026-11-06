import { useMemo, useState } from 'react'
import { Expand } from 'lucide-react'
import type { GalleryCategory } from '@/types'
import { usePublished } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { img } from '@/data/media'
import { cn } from '@/lib/cn'
import { Button, EmptyState } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { SmartImage } from '@/components/common/SmartImage'
import { Lightbox } from '@/components/common/Lightbox'
import { CtaBand } from '@/components/common/CtaBand'

export const GALLERY_CATEGORIES: Array<{ value: GalleryCategory; label: string }> = [
  { value: 'installation', label: 'Installation' },
  { value: 'residential', label: 'Homes' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'cleaning', label: 'Cleaning & service' },
]

export default function GalleryPage() {
  const gallery = usePublished('gallery')
  useSeo({ title: 'Images', description: 'Photos of roof solar installations, commercial plants and panel cleaning by Baba Solars in Raipur and Chhattisgarh.', path: '/gallery' })
  const [cat, setCat] = useState<GalleryCategory | 'all'>('all')
  const [open, setOpen] = useState<number | null>(null)

  const published = gallery.filter((g) => g.status === 'published').sort((a, b) => a.order - b.order)
  const visible = useMemo(() => published.filter((g) => cat === 'all' || g.category === cat), [published, cat])

  return (
    <>
      <PageHero crumb="Images" image={img('roofRows', 2000)} title="Images" intro="A look at our installations, power plants and service visits across Chhattisgarh." />
      <section className="section-y">
        <div className="container-site">
          <div role="group" aria-label="Filter photos" className="-mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[{ value: 'all' as const, label: 'All photos' }, ...GALLERY_CATEGORIES].map((c) => {
              const n = c.value === 'all' ? published.length : published.filter((g) => g.category === c.value).length
              return (
                <button key={c.value} type="button" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}
                  className={cn('shrink-0 whitespace-nowrap rounded-chip border px-4 py-2 text-sm font-semibold transition-colors', cat === c.value ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-surface text-ink-soft hover:border-steel-400')}>
                  {c.label} <span className="opacity-70">({n})</span>
                </button>
              )
            })}
          </div>

          {visible.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((g, i) => (
                <li key={g.id}>
                  <button type="button" onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-card bg-ice-100 shadow-soft" aria-label={`Enlarge photo: ${g.caption}`}>
                    <SmartImage src={g.imageUrl} alt={g.caption} className="aspect-[4/3] w-full transition-transform duration-700 ease-soft group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-navy-900/80 to-transparent p-4 pt-12 text-left text-sm font-medium text-snow-50">
                      {g.caption}<Expand className="size-4 shrink-0" aria-hidden />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No photos in this category yet" message="New photos are added after every installation." action={<Button variant="secondary" onClick={() => setCat('all')}>Show all photos</Button>} />
          )}
        </div>
      </section>
      <Lightbox items={visible} index={open} onChange={setOpen} />
      <CtaBand title="Want a roof like these?" />
    </>
  )
}
