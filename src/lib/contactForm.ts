import type { CapacityChoice, EnquiryType } from '@/types'
import { CAPACITY_CHOICE_LABEL, CAPACITY_KW_OPTIONS, validateContactMethod } from './enquiries'

/**
 * Website contact form values (strings, as typed / selected).
 * The ONLY required condition is a valid mobile number OR a valid email address.
 */
export interface ContactValues {
  name: string
  phone: string
  email: string
  city: string
  /** '' = not chosen */
  enquiryType: EnquiryType | ''
  /** A kW option ('5'), 'custom', 'not-sure' or '' (not chosen). */
  capacity: string
  /** Free kW value when capacity = 'custom' (optional). */
  customKw: string
  service: string
  message: string
}

export type ContactErrors = Partial<Record<keyof ContactValues, string>>

export const ENQUIRY_TYPE_OPTIONS: Array<{ value: EnquiryType; label: string; hint: string }> = [
  { value: 'home', label: 'Home / Residential', hint: 'House, villa or flat roof' },
  { value: 'commercial', label: 'Commercial', hint: 'Shop, office, factory, institution' },
]

/** Solar capacity choices (optional). */
export const CAPACITY_OPTIONS: Array<{ value: string; label: string }> = [
  ...CAPACITY_KW_OPTIONS.map((n) => ({ value: String(n), label: `${n} kW` })),
  { value: 'custom', label: CAPACITY_CHOICE_LABEL.custom },
  { value: 'not-sure', label: CAPACITY_CHOICE_LABEL['not-sure'] },
]

/** Initial capacity from a link like /contact?kw=5 (unknown numbers become "Other / Custom"). */
export function capacityFromParam(kw: string | null | undefined): Pick<ContactValues, 'capacity' | 'customKw'> {
  const v = String(kw ?? '').trim()
  if (!v) return { capacity: '', customKw: '' }
  if (CAPACITY_OPTIONS.some((o) => o.value === v)) return { capacity: v, customKw: '' }
  return Number(v) > 0 ? { capacity: 'custom', customKw: v } : { capacity: '', customKw: '' }
}

/** Mobile OR email (each validated when filled in); the custom kW must be a positive number if given. */
export function validateContact(v: ContactValues): ContactErrors {
  const errs: ContactErrors = { ...(validateContactMethod(v.phone, v.email) as ContactErrors) }
  if (v.enquiryType && v.enquiryType !== 'home' && v.enquiryType !== 'commercial') errs.enquiryType = 'Choose Home / Residential or Commercial.'
  if (v.capacity && !CAPACITY_OPTIONS.some((o) => o.value === v.capacity)) errs.capacity = 'Choose a capacity from the list.'
  if (v.capacity === 'custom' && v.customKw.trim()) {
    const n = Number(v.customKw)
    if (!Number.isFinite(n) || n <= 0 || n > 100000) errs.customKw = 'Enter the capacity in kW, e.g. 12.'
  }
  return errs
}

/** What the API receives for the capacity answer. */
export function capacityPayload(v: Pick<ContactValues, 'capacity' | 'customKw'>): { capacityKw: number | null; capacityChoice: CapacityChoice | null } {
  if (v.capacity === 'not-sure') return { capacityKw: null, capacityChoice: 'not-sure' }
  if (v.capacity === 'custom') {
    const n = Number(v.customKw)
    return v.customKw.trim() && n > 0 ? { capacityKw: n, capacityChoice: null } : { capacityKw: null, capacityChoice: 'custom' }
  }
  const n = Number(v.capacity)
  return { capacityKw: v.capacity && n > 0 ? n : null, capacityChoice: null }
}

/** Order used to focus the first invalid field. */
export const CONTACT_FIELD_ORDER: Array<keyof ContactValues> = ['name', 'phone', 'email', 'city', 'enquiryType', 'capacity', 'customKw', 'service', 'message']
