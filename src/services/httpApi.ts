/**
 * The API used by every page and hook, implemented over HTTP (server/ — Express + PostgreSQL).
 * Method names and shapes match the previous browser-only adapter, so pages did not change; the
 * lead-management, owner, team and paginated-list methods are new.
 *
 * PDFs and Excel files are still generated in the browser from server data (no extra load on
 * the server, same output as before). Previews are calculated with the same shared rules the
 * server applies on save (src/lib/*).
 */
import type {
  BusinessSettings, CatalogItem, CollectionItem, CollectionKey, Company, Database, Enquiry, EnquiryDetail, EnquiryStatus, Invoice, InvoiceInput,
  InvoiceList, InvoiceTemplate, LeadStats, OrderedCollectionKey, Paginated, Payment, Proposal, ProposalStatus, PublicCollectionKey, Quality,
  Quotation, QuotationStatus, QuotationTemplate, Role, SiteContent, StaffUser, EnquiryActivity,
} from '@/types'
import type {
  AuthProfile, DashboardAnalytics, DashboardRangeKey, DataSnapshot, EnquiryImportResult, EnquiryInput, EnquirySave, InvoiceQuery, PricedPackage, PublicSite, QuotationRequestInput,
  QuotationSave, UploadResult,
} from '@/types/api'
import type { ProposalInput } from '@/lib/proposals'
import { deriveProposal } from '@/lib/proposals'
import { deriveInvoice, deriveQuotation } from '@/lib/documents'
import { calculateSolar } from '@/lib/calculator'
import { addDaysISO, todayISO } from '@/lib/files'
import { normalizeMobile } from '@/lib/enquiries'
import { compressImage } from '@/lib/images'
import { ApiError } from './errors'
import { http, setCsrfToken, type Query } from './http'
import { addToOutbox, flushOutbox, isRetryable } from './enquiryOutbox'

const PUBLIC_KEYS: PublicCollectionKey[] = ['pricingPlans', 'capacityPlans', 'services', 'projects', 'testimonials', 'faqs', 'heroSlides', 'gallery']
const isPublicKey = (k: CollectionKey): k is PublicCollectionKey => (PUBLIC_KEYS as string[]).includes(k)
const enc = encodeURIComponent

/** Version of the published site data last loaded (used to decide if prerendered HTML can be hydrated). */
let publishedVersion: string | null = null

// ─── Query shapes for server-side tables ─────────────────────────────────────
export interface ListParams { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc'; from?: string; to?: string }
export interface EnquiryListParams extends ListParams { status?: string; source?: string; assignedTo?: string; followUp?: 'due' | 'overdue' | 'today' | 'upcoming' | 'any'; enquiryType?: 'home' | 'commercial' }
export interface ProposalListParams extends ListParams { status?: string; enquiryId?: string }
export interface QuotationListParams extends ListParams { status?: string; enquiryId?: string }
export interface CatalogListParams extends ListParams { category?: CatalogItem['category'] }
export type RecentActivity = EnquiryActivity & { enquiryName: string }
export interface OwnerDashboard {
  stats: LeadStats
  recentActivity: RecentActivity[]
  followUpsDue: Enquiry[]
  latestEnquiries: Enquiry[]
  team: Array<{ userId: string | null; name: string; total: number; open: number; converted: number; followUpsDue: number }>
  today: string
}
export interface AdminDashboard {
  leads: LeadStats | null
  recentEnquiries: Enquiry[]
  proposals: { open: number; openValue: number; draft: number } | null
  quotations: { open: number; pipeline: number; pending: number; acceptedValue: number } | null
  billing: { billed: number; due: number; overdue: number } | null
  recentQuotations: Quotation[]
  website: Record<PublicCollectionKey, { published: number; draft: number }>
}
export interface AssignableUser { id: string; name: string; role: Role }
export type ContactActivityInput = { type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note'; outcome?: string | null; note: string; status?: EnquiryStatus; followUpOn?: string | null }

async function pdfContext() {
  const [business, content] = await Promise.all([httpApi.getBusiness(), httpApi.getContent()])
  return { business, content }
}
const loadPdf = () => import('@/pdf')
const loadExcel = () => import('@/excel')

export const httpApi = {
  publishedVersion: () => publishedVersion,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string, portal: 'admin' | 'owner' = 'admin'): Promise<AuthProfile> {
    if (!email.trim() || !password) throw new ApiError('Enter your email and password.', { code: 'validation' })
    const res = await http.post<AuthProfile & { csrfToken: string }>('/auth/login', { email, password, portal }, { quiet401: true })
    setCsrfToken(res.csrfToken)
    return { user: res.user, permissions: res.permissions }
  },
  async me(): Promise<AuthProfile & { portal?: 'admin' | 'owner' }> {
    const res = await http.get<AuthProfile & { csrfToken: string; portal: 'admin' | 'owner' }>('/auth/me', undefined, { quiet401: true })
    setCsrfToken(res.csrfToken)
    return res
  },
  async logout(): Promise<void> {
    await http.post('/auth/logout').catch(() => undefined)
    setCsrfToken('')
  },
  changePassword: (currentPassword: string, newPassword: string) => http.post<void>('/auth/password', { currentPassword, newPassword }),

  // ─── Public website ────────────────────────────────────────────────────────
  async loadSite(): Promise<PublicSite> {
    const site = await http.get<PublicSite>('/site')
    publishedVersion = site.version
    return site
  },
  getContent: () => http.get<SiteContent>('/content'),

  async getCollection<K extends CollectionKey>(key: K): Promise<Database[K]> {
    if (isPublicKey(key)) return http.get<Database[K]>(`/collections/${key}`)
    if (key === 'enquiries') return http.get<Database[K]>('/enquiries/all')
    if (key === 'proposals') return (await http.get<Paginated<Proposal>>('/proposals', { all: 1 })).items as Database[K]
    return (await http.get<Paginated<Quotation>>('/quotations', { all: 1 })).items as Database[K]
  },

  async upsertItem<K extends CollectionKey>(key: K, item: CollectionItem<K>): Promise<CollectionItem<K>> {
    if (isPublicKey(key)) return http.put<CollectionItem<K>>(`/collections/${key}/${enc((item as { id: string }).id)}`, item)
    if (key === 'enquiries') return (await httpApi.saveEnquiry(item as EnquirySave)).enquiry as CollectionItem<K>
    throw new ApiError('Save proposals and quotations from their own forms.', { code: 'bad_request' })
  },

  async removeItem(key: CollectionKey, id: string): Promise<void> {
    if (isPublicKey(key)) return http.del(`/collections/${key}/${enc(id)}`)
    return http.del(`/${key}/${enc(id)}`)
  },

  reorder: <K extends OrderedCollectionKey>(key: K, ids: string[]) => http.put<Database[K]>(`/collections/${key}/order`, { ids }),
  updateContent: (patch: Partial<SiteContent>) => http.put<SiteContent>('/content', patch),

  /** Website forms → POST /public/enquiries (idempotent per submissionId). Kept for retry when offline. */
  async submitEnquiry(input: EnquiryInput): Promise<Enquiry> {
    const body = {
      name: input.name, phone: input.phone ?? '', email: input.email ?? '', city: input.city ?? '', state: input.state ?? '', service: input.service,
      message: input.message ?? '', source: input.source, enquiryType: input.enquiryType, propertyType: input.propertyType, capacityKw: input.capacityKw ?? null,
      capacityChoice: input.capacityChoice ?? null,
      monthlyBill: input.monthlyBill ?? null, submissionId: input.submissionId, createdAt: input.createdAt,
    }
    try { return await http.post<Enquiry>('/public/enquiries', body) } catch (e) { if (isRetryable(e)) addToOutbox('enquiry', body); throw e }
  },
  /** Calculator "Request this quote" → the server prices it again and saves an enquiry with the estimate. */
  async submitQuotation(input: QuotationRequestInput): Promise<Enquiry> {
    const body = { ...input, email: input.email ?? '', city: input.city ?? '' }
    try { return await http.post<Enquiry>('/public/quote-requests', body) } catch (e) { if (isRetryable(e)) addToOutbox('quote', body); throw e }
  },
  /** Re-send website enquiries saved while offline (called on load and when the browser is back online). */
  flushEnquiryOutbox: () => flushOutbox((kind, body) => http.post(kind === 'quote' ? '/public/quote-requests' : '/public/enquiries', body)),

  // ─── Enquiries & lead management ───────────────────────────────────────────
  listEnquiries: (p: EnquiryListParams) => http.get<Paginated<Enquiry>>('/enquiries', p as Query),
  getEnquiry: (id: string) => http.get<EnquiryDetail>(`/enquiries/${enc(id)}`),
  enquiryStats: () => http.get<LeadStats>('/enquiries/stats'),
  assignableUsers: () => http.get<AssignableUser[]>('/enquiries/assignable-users'),
  async saveEnquiry(input: EnquirySave, opts: { createProposal?: boolean } = {}): Promise<{ enquiry: Enquiry; proposal: Proposal | null }> {
    const { assignedToName: _n, lastContactedAt: _l, contactCount: _c, updatedAt: _u, origin: _o, submissionId: _s, ...body } = input
    return http.put(`/enquiries/${enc(input.id)}${opts.createProposal ? '?createProposal=true' : ''}`, body)
  },
  setEnquiryStatus: (id: string, status: EnquiryStatus, note = '', followUpOn?: string | null) =>
    http.patch<EnquiryDetail>(`/enquiries/${enc(id)}/status`, { status, note, ...(followUpOn !== undefined ? { followUpOn } : {}) }),
  assignEnquiry: (id: string, userId: string | null, note = '') => http.patch<EnquiryDetail>(`/enquiries/${enc(id)}/assign`, { userId, note }),
  logEnquiryActivity: (id: string, a: ContactActivityInput) => http.post<EnquiryDetail>(`/enquiries/${enc(id)}/activities`, a),
  scheduleFollowUp: (id: string, f: { dueOn: string; note?: string; assignedTo?: string | null }) => http.post<EnquiryDetail>(`/enquiries/${enc(id)}/follow-ups`, { note: '', ...f }),
  completeFollowUp: (id: string, followUpId: string, status: 'done' | 'cancelled', note = '') =>
    http.patch<EnquiryDetail>(`/enquiries/${enc(id)}/follow-ups/${enc(followUpId)}`, { status, note }),
  importEnquiries: (rows: Array<Partial<Enquiry>>) => http.post<EnquiryImportResult>('/enquiries/import', { rows }),
  async enquiriesXlsx(ids?: string[]): Promise<Blob> {
    const list = await http.post<Enquiry[]>('/enquiries/export', ids ? { ids } : {})
    return (await loadExcel()).enquiriesXlsx(list)
  },
  ownerDashboard: () => http.get<OwnerDashboard>('/owner/dashboard'),
  adminDashboard: () => http.get<AdminDashboard>('/admin/dashboard'),
  /** Lead analytics for one date filter (cards, charts, recent 10 leads) — aggregated by the server. */
  dashboardAnalytics: (q: { range: DashboardRangeKey; from?: string; to?: string }, signal?: AbortSignal) =>
    http.get<DashboardAnalytics>('/admin/dashboard/analytics', q as Query, { signal }),

  // ─── Team (admin) ──────────────────────────────────────────────────────────
  listUsers: () => http.get<StaffUser[]>('/users'),
  createUser: (u: { name: string; email: string; role: Role; password: string; isActive?: boolean }) => http.post<StaffUser>('/users', u),
  updateUser: (id: string, u: Partial<Pick<StaffUser, 'name' | 'email' | 'role' | 'isActive'>>) => http.patch<StaffUser>(`/users/${enc(id)}`, u),
  resetUserPassword: (id: string, password: string) => http.put<void>(`/users/${enc(id)}/password`, { password }),

  // ─── Proposals ─────────────────────────────────────────────────────────────
  listProposals: (p: ProposalListParams) => http.get<Paginated<Proposal>>('/proposals', p as Query),
  saveProposal: (id: string | null, input: ProposalInput) => (id ? http.put<Proposal>(`/proposals/${enc(id)}`, input) : http.post<Proposal>('/proposals', input)),
  duplicateProposal: (id: string) => http.post<Proposal>(`/proposals/${enc(id)}/duplicate`),
  setProposalStatus: (id: string, status: ProposalStatus) => http.patch<Proposal>(`/proposals/${enc(id)}/status`, { status }),
  convertProposal: (id: string) => http.post<Quotation>(`/proposals/${enc(id)}/convert`),
  async proposalPdf(id: string): Promise<Blob> {
    const [p, ctx] = await Promise.all([http.get<Proposal>(`/proposals/${enc(id)}`), pdfContext()])
    return (await loadPdf()).proposalPdf(p, ctx)
  },
  async proposalPreviewPdf(input: ProposalInput, id?: string): Promise<Blob> {
    const [ctx, existing] = await Promise.all([pdfContext(), id ? http.get<Proposal>(`/proposals/${enc(id)}`).catch(() => undefined) : undefined])
    const { discountError: _d, annualSavings: _s, paybackYears: _p, ...totals } = deriveProposal(input, { calc: ctx.content.calculator, businessStateCode: ctx.business.stateCode })
    const now = new Date().toISOString()
    const p: Proposal = {
      ...input, ...totals, id: existing?.id ?? 'preview', phone: normalizeMobile(input.phone) || input.phone, quotationId: input.quotationId ?? existing?.quotationId ?? null,
      proposalNumber: existing?.proposalNumber ?? 'DRAFT', createdAt: existing?.createdAt ?? now, updatedAt: now,
    }
    return (await loadPdf()).proposalPdf(p, ctx)
  },

  // ─── Business settings ─────────────────────────────────────────────────────
  getBusiness: () => http.get<BusinessSettings>('/business'),
  updateBusiness: (patch: Partial<BusinessSettings>) => http.put<BusinessSettings>('/business', patch),

  // ─── Companies & package prices ────────────────────────────────────────────
  listCompanies: () => http.get<Company[]>('/companies'),
  saveCompany: (c: Company) => http.put<Company>(`/companies/${enc(c.id)}`, c),
  deleteCompany: (id: string) => http.del(`/companies/${enc(id)}`),
  priceQuote: (companyId: string, capacityKw: number, quality: Quality, supplyType: 'intra' | 'inter' = 'intra') =>
    http.post<PricedPackage>(`/companies/${enc(companyId)}/price`, { capacityKw, quality, supplyType }),

  // ─── Product catalog ───────────────────────────────────────────────────────
  async listCatalog(): Promise<CatalogItem[]> { return (await http.get<Paginated<CatalogItem>>('/catalog', { all: 1 })).items },
  listCatalogPage: (p: CatalogListParams) => http.get<Paginated<CatalogItem>>('/catalog', p as Query),
  saveCatalogItem: (item: CatalogItem) => http.put<CatalogItem>(`/catalog/${enc(item.id)}`, item),
  deleteCatalogItem: (id: string) => http.del(`/catalog/${enc(id)}`),

  // ─── Quotations ────────────────────────────────────────────────────────────
  listQuotations: (p: QuotationListParams) => http.get<Paginated<Quotation>>('/quotations', p as Query),
  getQuotation: (id: string) => http.get<Quotation>(`/quotations/${enc(id)}`),
  saveQuotation: (id: string, input: QuotationSave) => http.put<Quotation>(`/quotations/${enc(id)}`, input),
  setQuotationStatus: (id: string, status: QuotationStatus) => http.patch<Quotation>(`/quotations/${enc(id)}/status`, { status }),
  async quotationPdf(id: string, template?: QuotationTemplate): Promise<Blob> {
    const [q, ctx] = await Promise.all([httpApi.getQuotation(id), pdfContext()])
    return (await loadPdf()).quotationPdf(q, ctx, template)
  },
  async quotationXlsx(id: string): Promise<Blob> {
    const [q, ctx] = await Promise.all([httpApi.getQuotation(id), pdfContext()])
    return (await loadExcel()).quotationXlsx(q, ctx)
  },
  async quotationPreviewPdf(input: QuotationSave, id?: string, template?: QuotationTemplate): Promise<Blob> {
    const [ctx, companies, existing] = await Promise.all([pdfContext(), httpApi.listCompanies(), id ? httpApi.getQuotation(id).catch(() => undefined) : undefined])
    const derived = deriveQuotation(input, { business: ctx.business, calc: ctx.content.calculator, companies, existing })
    const date = input.quoteDate || todayISO()
    const now = new Date().toISOString()
    const q: Quotation = {
      ...input, ...derived, id: existing?.id ?? 'preview', source: existing?.source ?? 'admin', quoteNumber: existing?.quoteNumber ?? 'DRAFT', quoteDate: date,
      validUntil: input.validUntil ?? addDaysISO(date, ctx.business.quotation.validityDays),
      paymentTerms: input.paymentTerms || ctx.business.quotation.defaultPaymentTerms, terms: input.terms || ctx.business.quotation.defaultTerms,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    }
    return (await loadPdf()).quotationPdf(q, ctx, template)
  },
  convertToInvoice: (id: string) => http.post<Invoice>(`/quotations/${enc(id)}/invoice`),

  // ─── Invoices ──────────────────────────────────────────────────────────────
  listInvoices: (q: InvoiceQuery) => http.get<InvoiceList>('/invoices', q as Query),
  getInvoice: (id: string) => http.get<Invoice>(`/invoices/${enc(id)}`),
  createInvoice: (input: InvoiceInput) => http.post<Invoice>('/invoices', input),
  updateInvoice: (id: string, input: InvoiceInput) => http.put<Invoice>(`/invoices/${enc(id)}`, input),
  deleteInvoice: (id: string) => http.del(`/invoices/${enc(id)}`),
  addPayment: (id: string, p: Omit<Payment, 'id'>) => http.post<Invoice>(`/invoices/${enc(id)}/payments`, p),
  removePayment: (id: string, paymentId: string) => http.del<Invoice>(`/invoices/${enc(id)}/payments/${enc(paymentId)}`),
  async invoicePdf(id: string, template?: InvoiceTemplate): Promise<Blob> {
    const [inv, ctx] = await Promise.all([httpApi.getInvoice(id), pdfContext()])
    return (await loadPdf()).invoicePdf(inv, ctx, template)
  },
  async invoiceXlsx(id: string): Promise<Blob> {
    const [inv, ctx] = await Promise.all([httpApi.getInvoice(id), pdfContext()])
    return (await loadExcel()).invoiceXlsx(inv, ctx)
  },
  async invoicePreviewPdf(input: InvoiceInput, id?: string): Promise<Blob> {
    const [ctx, existing] = await Promise.all([pdfContext(), id ? httpApi.getInvoice(id).catch(() => undefined) : undefined])
    const payments = [...(existing?.payments ?? []), ...(input.initialPayment ? [{ id: 'preview', ...input.initialPayment }] : [])]
    const derived = deriveInvoice(input, payments, ctx.business, ctx.content.calculator)
    const { initialPayment: _ip, ...rest } = input
    const now = new Date().toISOString()
    const inv: Invoice = {
      ...rest, ...derived, payments, id: existing?.id ?? 'preview', invoiceNumber: existing?.invoiceNumber ?? 'DRAFT',
      dueDate: input.dueDate ?? addDaysISO(input.invoiceDate, ctx.business.invoice.defaultDueDays), terms: input.terms || ctx.business.invoice.defaultTerms,
      paymentMethod: input.paymentMethod || payments[0]?.method || '', isOverdue: false, createdAt: existing?.createdAt ?? now, updatedAt: now,
    }
    return (await loadPdf()).invoicePdf(inv, ctx, input.template)
  },

  // ─── Uploads: resized in the browser, stored by the server (/uploads/…) ────
  async uploadImage(file: File): Promise<UploadResult> {
    const blob = await compressImage(file, 1600)
    return http.post<UploadResult>('/uploads', undefined, { raw: { data: blob, type: blob.type || file.type } })
  },

  // ─── Backup, restore, reset ────────────────────────────────────────────────
  resetData: () => http.post<void>('/admin/reset-website', { confirm: 'RESET WEBSITE CONTENT' }),
  exportSnapshot: ({ includeLeads = false } = {}) => http.get<DataSnapshot>('/admin/backup', { includeLeads: includeLeads ? 1 : 0 }),
  async importSnapshot(snapshot: unknown): Promise<{ imported: string[] }> {
    const snap = snapshot as Partial<DataSnapshot>
    if (!snap || typeof snap !== 'object' || typeof snap.data !== 'object' || snap.data === null) throw new ApiError('This is not a Baba Solars data file.', { code: 'validation' })
    return http.post<{ imported: string[] }>('/admin/backup/restore', snap)
  },

  /** Calculator helper (runs in the browser with the live settings). */
  calculate: calculateSolar,
}

export type HttpApi = typeof httpApi
