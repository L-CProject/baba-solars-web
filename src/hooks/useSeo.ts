import { createContext, useContext, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SeoPageKey, SiteContent } from '@/types'
import { SITE } from '@/config/site'
import { siteKeys } from '@/queries/keys'

interface SeoOptions {
  title?: string
  description?: string
  path?: string
  noIndex?: boolean
}

/** Which admin-editable SEO entry (Settings → Logo & SEO) belongs to a page path. */
const PAGE_KEYS: Record<string, SeoPageKey> = {
  '/': 'home', '/about': 'about', '/services': 'services', '/pricing': 'pricing', '/calculator': 'calculator', '/projects': 'projects',
  '/gallery': 'gallery', '/faqs': 'faqs', '/contact': 'contact', '/drone-cleaning': 'droneCleaning', '/pm-surya-ghar': 'suryaGhar',
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

export interface SeoTags { title: string; description: string; url: string; robots: string; image: string; keywords: string }

/**
 * Resolve the tags for a page. Order of precedence:
 *   admin per-page text → text passed by the page → admin site defaults → built-in defaults.
 */
export function seoTags({ title, description, path = '/', noIndex = false }: SeoOptions, content?: SiteContent | null): SeoTags {
  const seo = content?.seo
  const brand = content?.businessName || 'Baba Solars'
  const page = seo?.pages?.[PAGE_KEYS[path]]
  const pageTitle = page?.title || title
  const base = (seo?.siteUrl || SITE.url).replace(/\/+$/, '')
  return {
    title: pageTitle ? (pageTitle.includes(brand) ? pageTitle : `${pageTitle} | ${brand}`) : seo?.siteTitle || SITE.defaultTitle,
    description: page?.description || description || seo?.siteDescription || SITE.defaultDescription,
    url: base + path,
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    image: seo?.ogImage || `${base}/og-image.png`,
    keywords: seo?.keywords ?? '',
  }
}

/** During build-time prerendering, pages report their tags here so they go into the static <head>. */
export const SeoCollectorContext = createContext<{ tags: SeoTags | null } | null>(null)

/** Per-page title, description, canonical URL and Open Graph tags (admin-editable). */
export function useSeo(opts: SeoOptions) {
  const collector = useContext(SeoCollectorContext)
  const qc = useQueryClient()
  // Content is always in the cache (DataGate loads it first); read it without subscribing.
  const content = qc.getQueryData<SiteContent>(siteKeys.content()) ?? null
  const tags = seoTags(opts, content)
  if (collector) collector.tags = tags
  const verification = content?.seo?.googleSiteVerification ?? ''
  useEffect(() => {
    document.title = tags.title
    setMeta('name', 'description', tags.description)
    setMeta('name', 'keywords', tags.keywords)
    setMeta('property', 'og:title', tags.title)
    setMeta('property', 'og:description', tags.description)
    setMeta('property', 'og:url', tags.url)
    setMeta('property', 'og:image', tags.image)
    setMeta('name', 'robots', tags.robots)
    setMeta('name', 'google-site-verification', verification)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = tags.url
  }, [tags.title, tags.description, tags.url, tags.robots, tags.image, tags.keywords, verification])
}
