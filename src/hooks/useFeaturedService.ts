import { useCollection } from '@/queries'
import type { Service } from '@/types'

/** Seed ids of services that have their own highlight sections (drone section, 6-month plan, top ticker). */
export const FEATURED_SERVICE_IDS = {
  drone: 'svc-drone-cleaning',
  sixMonth: 'svc-six-month-care',
} as const

/**
 * Returns the service as edited in Admin → Services, or null when it is deleted or set to Draft.
 * Highlight sections read their text from here, so admin edits show up on the website.
 */
export function useFeaturedService(id: string): Service | null {
  const services = useCollection('services')
  const svc = services.find((s) => s.id === id)
  return svc && svc.status === 'published' ? svc : null
}

export const enquiryLink = (serviceTitle: string) => `/contact?service=${encodeURIComponent(serviceTitle)}`
