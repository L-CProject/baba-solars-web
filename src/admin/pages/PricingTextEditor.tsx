import type { FormEvent } from 'react'
import type { PlanCategory, PricingPageContent, PricingPlan } from '@/types'
import { useSiteContent, useUpdateContent } from '@/queries'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/services/api'
import { errorsUnder, hasErrors, validateContent } from '@/lib/schemas'
import { PriceDisclaimer, PricingCard } from '@/components/common/PricingCard'
import { DraftInput, DraftTextarea, EditorSection, SaveBar } from '../components/DraftFields'
import { useDraft } from '../hooks/useDraft'
import { errorMessage } from '../hooks/useCrud'

const TAB_KEYS: Array<{ key: PlanCategory; name: string }> = [
  { key: 'residential', name: 'Home' }, { key: 'commercial', name: 'Commercial' }, { key: 'maintenance', name: 'Cleaning & AMC' },
]

const SAMPLE: PricingPlan = {
  id: 'preview', name: '3 kW Family Home', category: 'residential', capacityKw: 3, priceMin: 165000, priceMax: 185000, subsidy: 78000,
  priceUnit: '', idealFor: 'Most 2–3 BHK homes', monthlyGeneration: '330–390 units', roofArea: '240–300 sq ft',
  features: ['6 × 550 Wp panels', 'Maximum subsidy slab'], featured: true, badge: '', ctaLabel: '', status: 'published', order: 0, updatedAt: '',
}

/** Admin → Pricing → Page text & buttons: headings, tab labels/notes, badges, default button and disclaimer. */
export function PricingTextEditor() {
  const content = useSiteContent()
  const update = useUpdateContent()
  const toast = useToast()
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } = useDraft<PricingPageContent>(content.pricingPage)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = errorsUnder(validateContent({ ...content, pricingPage: draft }), 'pricingPage')
    form.setErrors(errs)
    if (hasErrors(errs)) { toast({ tone: 'error', title: 'Fix the highlighted fields' }); return }
    try {
      const saved = await update.mutateAsync({ pricingPage: draft })
      markSaved(saved.pricingPage)
      toast({ title: 'Pricing page text saved', description: 'The website shows the change now.' })
    } catch (err) {
      if (err instanceof ApiError) form.setErrors(errorsUnder(err.fieldErrors, 'pricingPage'))
      toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) })
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-6">
          <EditorSection title="Top banner">
            <DraftInput form={form} path="heroTitle" label="Page title" required />
            <DraftTextarea form={form} path="heroIntro" label="Intro text" rows={2} />
          </EditorSection>

          <EditorSection title="“Plans by capacity” section" description="Heading above the capacity cards (edit the cards in the Capacity plans tab).">
            <div className="grid gap-5 sm:grid-cols-2">
              <DraftInput form={form} path="capacityKicker" label="Small line above heading" />
              <DraftInput form={form} path="capacityTitle" label="Heading" />
            </div>
            <DraftTextarea form={form} path="capacityIntro" label="Intro" rows={2} />
          </EditorSection>

          <EditorSection title="“Estimated prices” section & tabs">
            <div className="grid gap-5 sm:grid-cols-2">
              <DraftInput form={form} path="rangesKicker" label="Small line above heading" />
              <DraftInput form={form} path="rangesTitle" label="Heading" />
              <DraftInput form={form} path="tabsLabel" label="Tabs label" className="sm:col-span-2" />
            </div>
            {TAB_KEYS.map(({ key, name }) => (
              <div key={key} className="grid gap-3 rounded-card border border-line bg-snow-100/60 p-4 sm:grid-cols-[12rem_1fr]">
                <DraftInput form={form} path={`tabs.${key}.label`} label={`${name} tab label`} required />
                <DraftInput form={form} path={`tabs.${key}.note`} label={`${name} tab note`} />
              </div>
            ))}
            <div className="grid gap-5 sm:grid-cols-2">
              <DraftInput form={form} path="emptyTitle" label="Empty tab: title" />
              <DraftInput form={form} path="emptyMessage" label="Empty tab: message" />
            </div>
          </EditorSection>

          <EditorSection title="Card defaults" description="Used by every price card unless the plan sets its own ribbon or button text.">
            <div className="grid gap-5 sm:grid-cols-2">
              <DraftInput form={form} path="ctaLabel" label="Default button label" required />
              <DraftInput form={form} path="featuredBadge" label="Ribbon on highlighted plans" required />
              <DraftInput form={form} path="freeBadge" label="Ribbon on free plans" required />
              <DraftInput form={form} path="freePriceLabel" label="Price text for free plans" />
            </div>
          </EditorSection>

          <EditorSection title="Disclaimer, calculator & FAQ">
            <DraftInput form={form} path="disclaimerTitle" label="Disclaimer title" />
            <DraftTextarea form={form} path="disclaimerText" label="Disclaimer text" rows={5} hint="Empty hides the disclaimer box." />
            <div className="grid gap-5 sm:grid-cols-2">
              <DraftInput form={form} path="calculatorTitle" label="Calculator heading" />
              <DraftInput form={form} path="faqTitle" label="FAQ heading" />
              <DraftInput form={form} path="ctaBandTitle" label="Bottom call-to-action title" className="sm:col-span-2" />
            </div>
          </EditorSection>
        </div>

        <aside aria-label="Live preview" className="xl:sticky xl:top-4 xl:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Live preview (sample plan)</p>
          <div className="pointer-events-none grid select-none gap-4 pt-3" inert>
            <PricingCard plan={SAMPLE} text={draft} />
            <PriceDisclaimer text={draft} />
          </div>
        </aside>
      </div>
      <SaveBar dirty={dirty} saving={update.isPending} remoteChanged={remoteChanged} errorCount={Object.keys(form.errors).length} onDiscard={discard} onLoadLatest={loadLatest} />
    </form>
  )
}
