import type { EnquiryStatus, ProposalStatus, QuotationStatus } from '@/types'
import type { BadgeTone } from '@/components/ui'

export const enquiryTone: Record<EnquiryStatus, BadgeTone> = {
  new: 'warning', pending: 'warning', contacted: 'info', 'follow-up': 'warning', interested: 'info', 'site-visit': 'info', proposal: 'info', quoted: 'info',
  converted: 'success', 'not-interested': 'danger', closed: 'neutral',
}
export const proposalTone: Record<ProposalStatus, BadgeTone> = { draft: 'neutral', sent: 'info', accepted: 'success', rejected: 'danger', converted: 'success' }
export const quotationTone: Record<QuotationStatus, BadgeTone> = { pending: 'warning', sent: 'info', accepted: 'success', rejected: 'danger' }
