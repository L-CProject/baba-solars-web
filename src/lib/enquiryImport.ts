import type { Enquiry, EnquirySource, EnquiryStatus, FieldErrors, PropertyType } from '@/types'
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, normalizeMobile, validateEnquiry } from '@/lib/enquiries'

/**
 * Excel / CSV enquiry import: column mapping and row conversion (pure, unit-tested).
 * Column names in the file may differ — `autoMap` matches common names, the admin can change
 * any mapping in the preview.
 */

export type ImportField =
  | 'name' | 'phone' | 'email' | 'address' | 'city' | 'state' | 'pincode' | 'service'
  | 'propertyType' | 'capacityKw' | 'monthlyBill' | 'source' | 'status' | 'message' | 'notes' | 'createdAt' | 'followUpOn'

export const IMPORT_FIELDS: Array<{ key: ImportField; label: string; required?: boolean; aliases: string[] }> = [
  { key: 'name', label: 'Customer name', required: true, aliases: ['name', 'customer', 'customer name', 'full name', 'client', 'client name', 'contact name', 'naam'] },
  { key: 'phone', label: 'Mobile', required: true, aliases: ['mobile', 'phone', 'mobile number', 'phone number', 'contact', 'contact number', 'whatsapp', 'mobile no', 'phone no', 'cell'] },
  { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'email address', 'mail'] },
  { key: 'address', label: 'Address', aliases: ['address', 'full address', 'site address'] },
  { key: 'city', label: 'City / location', aliases: ['city', 'location', 'area', 'town', 'village', 'district', 'place'] },
  { key: 'state', label: 'State', aliases: ['state', 'province'] },
  { key: 'pincode', label: 'PIN code', aliases: ['pin', 'pincode', 'pin code', 'postal code', 'zip'] },
  { key: 'service', label: 'Requirement', required: true, aliases: ['requirement', 'service', 'need', 'needs', 'interest', 'product', 'enquiry for', 'inquiry for', 'subject', 'requirement details'] },
  { key: 'propertyType', label: 'Property type', aliases: ['property', 'property type', 'type', 'category', 'consumer type', 'segment'] },
  { key: 'capacityKw', label: 'System capacity (kW)', aliases: ['capacity', 'kw', 'capacity kw', 'capacity (kw)', 'system size', 'size', 'system capacity', 'system capacity (kw)'] },
  { key: 'monthlyBill', label: 'Monthly bill (₹)', aliases: ['bill', 'monthly bill', 'electricity bill', 'monthly bill (₹)', 'avg bill', 'average bill'] },
  { key: 'source', label: 'Source', aliases: ['source', 'lead source', 'channel', 'medium'] },
  { key: 'status', label: 'Status', aliases: ['status', 'stage', 'lead status'] },
  { key: 'message', label: 'Message', aliases: ['message', 'comments', 'comment', 'remarks', 'details', 'description'] },
  { key: 'notes', label: 'Internal notes', aliases: ['notes', 'note', 'internal notes', 'follow up notes'] },
  { key: 'createdAt', label: 'Enquiry date', aliases: ['date', 'enquiry date', 'inquiry date', 'created', 'created at', 'received', 'lead date'] },
  { key: 'followUpOn', label: 'Follow-up date', aliases: ['follow-up', 'follow up', 'followup', 'follow-up date', 'next follow up', 'callback'] },
]

/** Mapping: field → column index (-1 = not imported). */
export type ColumnMapping = Record<ImportField, number>

const norm = (s: string) => s.toLowerCase().replace(/[_\-.:]+/g, ' ').replace(/\s+/g, ' ').trim()

export function autoMap(headers: string[]): ColumnMapping {
  const h = headers.map(norm)
  const used = new Set<number>()
  const out = {} as ColumnMapping
  // Pass 1: exact names for every field. Pass 2: whole-word matches ("Customer Mobile No." → Mobile),
  // never substrings — "city" must not match "Capacity".
  for (const f of IMPORT_FIELDS) {
    const idx = h.findIndex((x, i) => !used.has(i) && (f.aliases.includes(x) || norm(f.label) === x))
    out[f.key] = idx
    if (idx >= 0) used.add(idx)
  }
  const hasWords = (x: string, a: string) => ` ${x.replace(/[()]/g, ' ')} `.includes(` ${a} `)
  for (const f of IMPORT_FIELDS) {
    if (out[f.key] >= 0) continue
    const idx = h.findIndex((x, i) => !used.has(i) && f.aliases.some((a) => a.length > 2 && hasWords(x, a)))
    out[f.key] = idx
    if (idx >= 0) used.add(idx)
  }
  return out
}

export function missingRequired(m: ColumnMapping): string[] {
  return IMPORT_FIELDS.filter((f) => f.required && m[f.key] < 0).map((f) => f.label)
}

function pick<T extends string>(raw: string, options: Array<{ value: T; label: string }>, extra: Record<string, T> = {}): T | undefined {
  const v = norm(raw)
  if (!v) return undefined
  return (
    options.find((o) => o.value === v || norm(o.label) === v)?.value ??
    extra[v] ??
    options.find((o) => norm(o.label).includes(v) || v.includes(o.value))?.value
  )
}

const SOURCE_ALIASES: Record<string, EnquirySource> = {
  website: 'contact', web: 'contact', 'contact form': 'contact', calculator: 'calculator', wa: 'whatsapp', 'whats app': 'whatsapp',
  call: 'phone', 'phone call': 'phone', telephone: 'phone', walkin: 'walk-in', office: 'walk-in', facebook: 'social', instagram: 'social',
  'social media': 'social', reference: 'referral', manual: 'manual', excel: 'import', import: 'import',
}
const STATUS_ALIASES: Record<string, EnquiryStatus> = {
  open: 'new', fresh: 'new', pending: 'pending', called: 'contacted', 'follow up': 'follow-up', 'follow-up required': 'follow-up', followup: 'follow-up',
  interested: 'interested', 'site visit': 'site-visit', survey: 'site-visit', proposal: 'proposal', 'proposal sent': 'proposal',
  quotation: 'quoted', 'quote sent': 'quoted', 'quotation sent': 'quoted', converted: 'converted', won: 'converted', booked: 'converted',
  closed: 'closed', 'not interested': 'not-interested', lost: 'not-interested', rejected: 'not-interested',
}
const PROPERTY_OPTIONS: Array<{ value: PropertyType; label: string }> = [
  { value: 'residential', label: 'Residential' },
  { value: 'housing-society', label: 'Housing society' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
]
const PROPERTY_ALIASES: Record<string, PropertyType> = {
  home: 'residential', house: 'residential', domestic: 'residential', society: 'housing-society', rwa: 'housing-society',
  shop: 'commercial', business: 'commercial', office: 'commercial', factory: 'industrial', industry: 'industrial',
}

const toNumber = (raw: string): number | null => {
  const v = raw.replace(/[₹,\s]|rs\.?|kw/gi, '')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

/** Excel serial date (e.g. 45567) or common text dates → YYYY-MM-DD. '' if not a date. */
export function toIsoDate(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (/^\d{4,5}(\.\d+)?$/.test(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 86400000)
    return d.getUTCFullYear() > 1990 ? d.toISOString().slice(0, 10) : ''
  }
  const dmy = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? 2000 + Number(y) : Number(y)
    const dt = new Date(Date.UTC(year, Number(m) - 1, Number(d)))
    return dt.getUTCMonth() === Number(m) - 1 ? dt.toISOString().slice(0, 10) : ''
  }
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const t = Date.parse(v)
  return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10)
}

export interface ImportRow {
  /** 1-based row number in the file (after the header). */
  line: number
  values: Partial<Enquiry>
  errors: FieldErrors
}

/** Convert one raw row to an enquiry draft + validation errors. */
export function convertRow(raw: string[], m: ColumnMapping, line: number): ImportRow {
  const get = (f: ImportField) => (m[f] >= 0 ? String(raw[m[f]] ?? '').trim() : '')
  const errors: FieldErrors = {}
  const phoneRaw = get('phone')
  const cap = toNumber(get('capacityKw'))
  const bill = toNumber(get('monthlyBill'))
  if (Number.isNaN(cap)) errors.capacityKw = `“${get('capacityKw')}” is not a number.`
  if (Number.isNaN(bill)) errors.monthlyBill = `“${get('monthlyBill')}” is not a number.`
  const statusRaw = get('status')
  const sourceRaw = get('source')
  const propRaw = get('propertyType')
  const status = statusRaw ? pick(statusRaw, ENQUIRY_STATUSES, STATUS_ALIASES) : 'new'
  const source = sourceRaw ? pick(sourceRaw, ENQUIRY_SOURCES, SOURCE_ALIASES) : 'import'
  const propertyType = propRaw ? pick(propRaw, PROPERTY_OPTIONS, PROPERTY_ALIASES) : undefined
  if (statusRaw && !status) errors.status = `Unknown status “${statusRaw}”.`
  if (sourceRaw && !source) errors.source = `Unknown source “${sourceRaw}”.`
  if (propRaw && !propertyType) errors.propertyType = `Unknown property type “${propRaw}”.`
  const created = toIsoDate(get('createdAt'))
  if (get('createdAt') && !created) errors.createdAt = `“${get('createdAt')}” is not a date.`
  const follow = toIsoDate(get('followUpOn'))
  if (get('followUpOn') && !follow) errors.followUpOn = `“${get('followUpOn')}” is not a date.`
  const values: Partial<Enquiry> = {
    name: get('name'),
    phone: normalizeMobile(phoneRaw) || phoneRaw,
    email: get('email'),
    address: get('address'),
    city: get('city'),
    state: get('state'),
    pincode: get('pincode').replace(/\s/g, ''),
    service: get('service'),
    message: get('message'),
    notes: get('notes'),
    propertyType,
    capacityKw: cap === null || Number.isNaN(cap) ? null : cap,
    monthlyBill: bill === null || Number.isNaN(bill) ? null : bill,
    status: status ?? 'new',
    source: source ?? 'import',
    createdAt: created ? `${created}T09:00:00.000Z` : undefined,
    followUpOn: follow || null,
  }
  return { line, values, errors: { ...validateEnquiry(values), ...errors } }
}

export function convertRows(rows: string[][], m: ColumnMapping): ImportRow[] {
  return rows.map((r, i) => convertRow(r, m, i + 1))
}
