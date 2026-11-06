import { useEffect } from 'react'
import { useSiteContent } from '@/queries'
import { SITE } from '@/config/site'

/**
 * Site-wide head tags from the admin-edited content: favicon and LocalBusiness structured
 * data (name, phone, email, address, areas served) for Google.
 */
export function SiteMeta() {
  const c = useSiteContent()
  const base = (c.seo?.siteUrl || SITE.url).replace(/\/+$/, '')

  useEffect(() => {
    if (!c.brand?.faviconUrl) return
    for (const rel of ['icon', 'apple-touch-icon']) {
      const el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
      if (el) { el.href = c.brand.faviconUrl; el.removeAttribute('type') }
    }
  }, [c.brand?.faviconUrl])

  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: c.businessName,
    description: c.seo?.siteDescription || c.tagline,
    telephone: c.phone,
    email: c.email,
    url: base,
    image: c.seo?.ogImage || `${base}/og-image.png`,
    address: { '@type': 'PostalAddress', streetAddress: c.address, addressRegion: 'Chhattisgarh', addressCountry: 'IN' },
    areaServed: c.serviceAreas,
    sameAs: Object.values(c.social ?? {}).filter(Boolean),
  }
  // JSON.stringify output with "<" escaped cannot break out of the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
