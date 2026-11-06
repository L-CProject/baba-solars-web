import { BadgeCheck, TriangleAlert } from 'lucide-react'
import type { ConsumerCategory, RoofDirection, ShadingLevel } from '@/types'
import { GST_STATES } from '@/lib/states'
import { COUNTRIES, defaultDiscom, discomsFor, type TariffSource } from '@/lib/tariffRegistry'
import { Segmented, Select } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Shared inputs for the home-page calculator and the full calculator page. */

export const CONSUMER_OPTIONS: Array<{ value: ConsumerCategory; label: string }> = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
]

export const DIRECTION_OPTIONS: Array<{ value: RoofDirection; label: string }> = [
  { value: 'south', label: 'South (best)' },
  { value: 'south-east', label: 'South-east' },
  { value: 'south-west', label: 'South-west' },
  { value: 'flat', label: 'Panels laid flat' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
  { value: 'north', label: 'North' },
]

export const SHADING_OPTIONS: Array<{ value: ShadingLevel; label: string }> = [
  { value: 'none', label: 'No shade' },
  { value: 'light', label: 'Light (morning / evening)' },
  { value: 'moderate', label: 'Moderate (part of day)' },
  { value: 'heavy', label: 'Heavy (trees, buildings)' },
]

const STATE_OPTIONS = GST_STATES.map((s) => ({ value: s.code, label: s.name })).sort((a, b) => a.label.localeCompare(b.label))

export interface LocationValue {
  country: string
  stateCode: string
  discomId: string
}

export function ConsumerSegmented({ value, onChange }: { value: ConsumerCategory; onChange: (v: ConsumerCategory) => void }) {
  return <Segmented<ConsumerCategory> label="Consumer type" value={value} onChange={onChange} options={CONSUMER_OPTIONS} />
}

export function LocationFields({ value, onChange, showCountry = false, className }: { value: LocationValue; onChange: (v: LocationValue) => void; showCountry?: boolean; className?: string }) {
  const india = value.country === 'IN'
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2', className)}>
      {showCountry && (
        <Select
          label="Country"
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value })}
          options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
        />
      )}
      {india && (
        <>
          <Select
            label="State"
            value={value.stateCode}
            onChange={(e) => onChange({ ...value, stateCode: e.target.value, discomId: defaultDiscom(e.target.value) })}
            options={STATE_OPTIONS}
          />
          <Select
            wrapperClassName={showCountry ? 'sm:col-span-2' : undefined}
            label="Electricity company (DISCOM)"
            value={value.discomId}
            onChange={(e) => onChange({ ...value, discomId: e.target.value })}
            options={discomsFor(value.stateCode).map((d) => ({ value: d.id, label: d.name }))}
          />
        </>
      )}
    </div>
  )
}

export function SiteFactorFields({ direction, shading, onDirection, onShading }: { direction: RoofDirection; shading: ShadingLevel; onDirection: (v: RoofDirection) => void; onShading: (v: ShadingLevel) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Select label="Roof faces" value={direction} onChange={(e) => onDirection(e.target.value as RoofDirection)} options={DIRECTION_OPTIONS} />
      <Select label="Shading on the roof" value={shading} onChange={(e) => onShading(e.target.value as ShadingLevel)} options={SHADING_OPTIONS} />
    </div>
  )
}

/** "Verified tariff" badge, or a clear "needs confirmation" notice. */
export function TariffNotice({ source, className }: { source: TariffSource; className?: string }) {
  if (source.verified)
    return (
      <p className={cn('flex items-start gap-2 text-xs text-ink-soft', className)}>
        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-leaf-700" aria-hidden />
        <span>
          Bill worked out with the official {source.label} tariff{source.effectiveFrom ? ` (from ${new Date(source.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}
          {source.sourceUrl && (
            <>
              {' · '}
              <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">source</a>
            </>
          )}
        </span>
      </p>
    )
  return (
    <p role="note" className={cn('flex items-start gap-2 rounded-field bg-sun-300/35 p-3 text-xs text-navy-800', className)}>
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span><strong>Estimate needs confirmation.</strong> {source.notes[0]}</span>
    </p>
  )
}
