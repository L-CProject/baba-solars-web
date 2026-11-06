import type { Invoice, Quotation, QuotationTemplate } from '@/types'
import { api } from '@/services/api'
import { browserFolderStore } from './browserFolderStore'
import type { DocumentStore, SaveResult } from './types'

export * from './types'
export { browserFolderStore, chooseDocumentsFolder, forgetDocumentsFolder, folderAccessSupported } from './browserFolderStore'

/** The active document store. A future backend store implements the same `DocumentStore` interface. */
export const documentStore = (): DocumentStore => browserFolderStore

/**
 * Generate the PDF + Excel of a saved quotation and store both
 * (file names: "<number> - <client>.pdf/.xlsx" in Quotations/<client>/).
 */
export async function saveQuotationFiles(q: Quotation, template: QuotationTemplate = 'classic'): Promise<SaveResult> {
  if (!q.quoteNumber) throw new Error('Save the quotation first.')
  const [pdf, xlsx] = await Promise.all([api.quotationPdf(q.id, template), api.quotationXlsx(q.id)])
  return documentStore().save(
    { kind: 'quotation', recordId: q.id, docNumber: q.quoteNumber, clientName: q.customerName, docDate: q.quoteDate ?? q.createdAt.slice(0, 10), amount: q.estimatedCost, record: q },
    { pdf, xlsx },
  )
}

/** Same for an invoice / bill (Billing/<client>/). */
export async function saveInvoiceFiles(inv: Invoice): Promise<SaveResult> {
  const [pdf, xlsx] = await Promise.all([api.invoicePdf(inv.id, inv.template), api.invoiceXlsx(inv.id)])
  return documentStore().save(
    { kind: 'billing', recordId: inv.id, docNumber: inv.invoiceNumber, clientName: inv.customerName, docDate: inv.invoiceDate, amount: inv.grandTotal, record: inv },
    { pdf, xlsx },
  )
}
