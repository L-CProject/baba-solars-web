import type { CollectionKey } from '@/types'
import type { InvoiceQuery } from '@/services/api'

/**
 * Query-key factory. Hierarchical, so one call can invalidate a whole branch:
 *   invalidateQueries({ queryKey: siteKeys.all })                        → all website data
 *   invalidateQueries({ queryKey: siteKeys.collection('pricingPlans') }) → one list
 */
export const siteKeys = {
  all: ['site'] as const,
  collections: () => [...siteKeys.all, 'collection'] as const,
  collection: (key: CollectionKey) => [...siteKeys.collections(), key] as const,
  content: () => [...siteKeys.all, 'content'] as const,
  /** Company package price lists (public: calculator & pricing page). */
  companies: () => [...siteKeys.all, 'companies'] as const,
}

/** Back-office data (never loaded for visitors). */
export const adminKeys = {
  all: ['admin'] as const,
  me: () => ['auth', 'me'] as const,
  business: () => [...adminKeys.all, 'business'] as const,
  quotation: (id: string) => [...adminKeys.all, 'quotation', id] as const,
  invoices: () => [...adminKeys.all, 'invoices'] as const,
  invoiceList: (q: InvoiceQuery) => [...adminKeys.invoices(), 'list', q] as const,
  invoice: (id: string) => [...adminKeys.invoices(), 'one', id] as const,
}
