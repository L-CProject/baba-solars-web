import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BusinessSettings, CatalogItem, Company, Enquiry, Invoice, InvoiceInput, Payment, ProposalStatus, QuotationStatus } from '@/types'
import { api, type EnquirySave, type InvoiceQuery, type QuotationSave } from '@/services/api'
import type { ProposalInput } from '@/lib/proposals'
import { adminKeys, siteKeys } from './keys'
import { companiesQuery } from './site'
import { broadcastChange } from './SiteSync'

/** Back-office hooks: business settings, companies, quotations documents, invoices, users. */

export const useBusiness = () => useQuery({ queryKey: adminKeys.business(), queryFn: api.getBusiness, staleTime: 60_000 })

export function useUpdateBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<BusinessSettings>) => api.updateBusiness(patch),
    onSuccess: (data) => { qc.setQueryData(adminKeys.business(), data); broadcastChange('admin') },
  })
}

export const useCompanies = () => useQuery(companiesQuery())

export function useSaveCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: Company) => api.saveCompany(c),
    onSettled: () => { broadcastChange('admin'); return qc.invalidateQueries({ queryKey: siteKeys.companies() }) },
  })
}
export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSettled: () => qc.invalidateQueries({ queryKey: siteKeys.companies() }),
  })
}

const quotationsKey = siteKeys.collection('quotations')

export function useSaveQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuotationSave }) => api.saveQuotation(id, data),
    onSettled: () => { broadcastChange(); return Promise.all([qc.invalidateQueries({ queryKey: quotationsKey }), qc.invalidateQueries({ queryKey: ['admin'] })]) },
  })
}

export function useQuotationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuotationStatus }) => api.setQuotationStatus(id, status),
    onSettled: () => { broadcastChange(); return Promise.all([qc.invalidateQueries({ queryKey: quotationsKey }), qc.invalidateQueries({ queryKey: ['admin'] })]) },
  })
}

export function useConvertToInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.convertToInvoice(id),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: quotationsKey }), qc.invalidateQueries({ queryKey: siteKeys.collection('enquiries') }), qc.invalidateQueries({ queryKey: ['admin'] })]),
  })
}

export const useInvoices = (q: InvoiceQuery, enabled = true) =>
  useQuery({ queryKey: adminKeys.invoiceList(q), queryFn: () => api.listInvoices(q), placeholderData: keepPreviousData, enabled })

export const useInvoice = (id: string | null) =>
  useQuery({ queryKey: adminKeys.invoice(id ?? ''), queryFn: () => api.getInvoice(id!), enabled: !!id })

function useInvoiceMutation<V>(fn: (v: V) => Promise<Invoice | void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => { if (data) qc.setQueryData(adminKeys.invoice(data.id), data) },
    onSettled: () => { broadcastChange('admin'); return qc.invalidateQueries({ queryKey: adminKeys.invoices() }) },
  })
}

export const useCreateInvoice = () => useInvoiceMutation((input: InvoiceInput) => api.createInvoice(input))
export const useUpdateInvoice = () => useInvoiceMutation(({ id, input }: { id: string; input: InvoiceInput }) => api.updateInvoice(id, input))
export const useDeleteInvoice = () => useInvoiceMutation((id: string) => api.deleteInvoice(id))
export const useAddPayment = () => useInvoiceMutation(({ id, payment }: { id: string; payment: Omit<Payment, 'id'> }) => api.addPayment(id, payment))
export const useRemovePayment = () => useInvoiceMutation(({ id, paymentId }: { id: string; paymentId: string }) => api.removePayment(id, paymentId))

export const useCatalog = (enabled = true) => useQuery({ queryKey: [...adminKeys.all, 'catalog'], queryFn: api.listCatalog, enabled })
export function useCatalogMutations() {
  const qc = useQueryClient()
  const done = () => Promise.all([qc.invalidateQueries({ queryKey: [...adminKeys.all, 'catalog'] }), qc.invalidateQueries({ queryKey: ['admin', 'list', 'catalog'] })])
  return {
    save: useMutation({ mutationFn: (item: CatalogItem) => api.saveCatalogItem(item), onSettled: done }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteCatalogItem(id), onSettled: done }),
  }
}

// ─── Enquiries & proposals ─────────────────────────────────────────────────
const enquiriesKey = siteKeys.collection('enquiries')
const proposalsKey = siteKeys.collection('proposals')
const leadKeys = () => [enquiriesKey, proposalsKey, quotationsKey]

function useLeadMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      broadcastChange('admin')
      // Lists (server tables), dashboards and the full lists used by pickers.
      return Promise.all([...leadKeys().map((queryKey) => qc.invalidateQueries({ queryKey })), qc.invalidateQueries({ queryKey: ['admin'] })])
    },
  })
}

export const useSaveEnquiry = () => useLeadMutation(({ data, createProposal }: { data: EnquirySave; createProposal?: boolean }) => api.saveEnquiry(data, { createProposal }))
export const useImportEnquiries = () => useLeadMutation((rows: Array<Partial<Enquiry>>) => api.importEnquiries(rows))
export const useSaveProposal = () => useLeadMutation(({ id, data }: { id: string | null; data: ProposalInput }) => api.saveProposal(id, data))
export const useDuplicateProposal = () => useLeadMutation((id: string) => api.duplicateProposal(id))
export const useProposalStatus = () => useLeadMutation(({ id, status }: { id: string; status: ProposalStatus }) => api.setProposalStatus(id, status))
export const useConvertProposal = () => useLeadMutation((id: string) => api.convertProposal(id))
