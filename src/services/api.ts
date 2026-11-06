import type { CollectionKey, Database, InvoiceTemplate, PublicCollectionKey } from '@/types'
import { httpApi } from './httpApi'

export { ApiError } from './errors'

/**
 * SERVICE LAYER — every read and write in the app goes through `api`.
 * ─────────────────────────────────────────────────────────────────────────
 * Implemented over HTTP against the Baba Solars API (server/: Express + PostgreSQL), with a
 * server-side session (HttpOnly cookie). Requests go through src/services/http.ts.
 */
export type * from '@/types/api'

export const PUBLIC_COLLECTION_KEYS: PublicCollectionKey[] = ['pricingPlans', 'capacityPlans', 'services', 'projects', 'testimonials', 'faqs', 'heroSlides', 'gallery']
export const ADMIN_COLLECTION_KEYS: CollectionKey[] = ['enquiries', 'proposals', 'quotations']
export const COLLECTION_KEYS: CollectionKey[] = [...PUBLIC_COLLECTION_KEYS, ...ADMIN_COLLECTION_KEYS]

export type PdfTemplate = InvoiceTemplate
export type { EnquiryListParams, ProposalListParams, QuotationListParams, CatalogListParams, OwnerDashboard, AdminDashboard, AssignableUser, ContactActivityInput, RecentActivity } from './httpApi'

export const api = httpApi
export type Api = typeof api

export function publishedVersion() { return api.publishedVersion() }

/** Build-time prerender: a complete Database from the seed (leads are never public). */
export async function databaseFromSnapshot(data: Partial<Database>): Promise<Database> {
  const { withContentDefaults } = await import('@/data/settings-defaults')
  return { enquiries: [], proposals: [], quotations: [], ...data, content: withContentDefaults(data.content ?? {}) } as Database
}
