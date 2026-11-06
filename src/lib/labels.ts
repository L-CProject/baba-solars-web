import type { PropertyType } from '@/types'

/** One set of labels for property / consumer types (forms, PDFs, Excel). */
export const PROPERTY_LABEL: Record<PropertyType, string> = {
  residential: 'Residential',
  'housing-society': 'Housing society (RWA/GHS)',
  commercial: 'Commercial',
  industrial: 'Industrial',
}
export const PROPERTY_OPTIONS = (Object.keys(PROPERTY_LABEL) as PropertyType[]).map((value) => ({ value, label: PROPERTY_LABEL[value] }))
