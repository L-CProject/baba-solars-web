import { useState } from 'react'
import { Download, Gift } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { offerSrcSet } from '@/lib/offers'
import { LinkButton } from '@/components/ui'
import { OfferSection } from '@/components/common/OfferSection'
import { useLiveOffers } from '@/components/common/OfferRibbon'
import { Lightbox } from '@/components/common/Lightbox'
import { CtaBand } from '@/components/common/CtaBand'

/** Full-quality JPG shipped next to a poster's WebP copies (/images/offers/<name>.jpg), for download and sharing. */
const downloadUrl = (url: string) => (/^\/images\/offers\/.+-\d+w\.webp$/.test(url) ? url.replace(/-\d+w\.webp$/, '.jpg') : url)

/** /offers — every live offer with all its posters. Linked from the header marquee and "Offers" button. */
export default function OffersPage() {
  const offers = useLiveOffers()
  const offer = offers[0]
  const posters = offers.flatMap((o) => o.images)
  const [zoom, setZoom] = useState<number | null>(null)
  useSeo({
    path: '/offers',
    title: offer ? `${offer.badge || 'Offers'} — free gifts on solar | Baba Solars` : 'Offers | Baba Solars',
    description: offer ? `${offer.description} ${offer.slabs.map((s) => `${s.capacity}: ${s.gifts}`).join('. ')}.` : 'Current Baba Solars offers on roof solar.',
  })

  if (!offer) {
    return (
      <section className="container-site grid min-h-[50vh] place-items-center py-20 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-ice-200 text-navy-700"><Gift className="size-6" aria-hidden /></span>
          <h1 className="mt-4 text-3xl">No offer is running right now</h1>
          <p className="mt-3 text-muted">Ask us about current prices and the PM Surya Ghar subsidy — new offers are announced here first.</p>
          <div className="mt-7 flex justify-center gap-3">
            <LinkButton to="/contact">Get a free quote</LinkButton>
            <LinkButton to="/calculator" variant="secondary">Solar calculator</LinkButton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <OfferSection asPage />
      {posters.length > 1 && (
        <section className="section-y" aria-labelledby="posters-title">
          <div className="container-site">
            <h2 id="posters-title" className="text-2xl md:text-3xl">All offer posters</h2>
            <p className="mt-1 text-muted">Tap a poster to see it full size, or download it to share on WhatsApp.</p>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {posters.map((img, i) => (
                <li key={img.id} className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
                  <button type="button" onClick={() => setZoom(i)} className="block w-full" aria-label={`View full size: ${img.alt}`}>
                    <img src={img.variants?.[0]?.url ?? img.url} srcSet={offerSrcSet(img)} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      alt={img.alt} width={img.width} height={img.height} loading="lazy" decoding="async" className="aspect-[1032/1280] w-full object-cover" />
                  </button>
                  <a href={downloadUrl(img.url)} download className="flex items-center justify-center gap-1.5 border-t border-line py-2.5 text-sm font-semibold text-navy-700 hover:bg-ice-100">
                    <Download className="size-4" aria-hidden /> Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <Lightbox items={posters.map((img) => ({ id: img.id, imageUrl: img.variants?.at(-1)?.url ?? img.url, caption: img.alt }))} index={zoom} onChange={setZoom} />
      <CtaBand />
    </>
  )
}
