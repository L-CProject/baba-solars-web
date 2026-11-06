import type { FormEvent } from 'react'
import { Drone } from 'lucide-react'
import type { PlanComparisonRow, PlanTiersContent, Quality } from '@/types'
import { validatePlanTiers } from '@/lib/plans'
import { useSiteContent, useUpdateContent } from '@/queries'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/services/api'
import { createId } from '@/lib/id'
import { errorsUnder } from '@/lib/schemas'
import { DraftInput, DraftItemList, DraftStringList, DraftTextarea, DraftToggle, EditorSection, SaveBar } from '../components/DraftFields'
import { useDraft } from '../hooks/useDraft'
import { errorMessage } from '../hooks/useCrud'

/**
 * Admin → Pricing → Normal & Premium plans. Plan names, price text, features and the comparison
 * table. Drone cleaning is a Premium benefit: the switch is on for Premium and off for Normal by default.
 */
export function PlanTiersEditor() {
  const content = useSiteContent()
  const update = useUpdateContent()
  const toast = useToast()
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } = useDraft<PlanTiersContent>(content.plans)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validatePlanTiers(draft)
    form.setErrors(errs)
    if (Object.keys(errs).length) { toast({ tone: 'error', title: 'Fix the highlighted fields', description: Object.values(errs)[0] }); return }
    try {
      const saved = await update.mutateAsync({ plans: draft })
      markSaved(saved.plans)
      toast({ title: 'Plans saved', description: 'The Pricing and Home pages show the change now.' })
    } catch (err) {
      if (err instanceof ApiError) form.setErrors(errorsUnder(err.fieldErrors, 'plans'))
      toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) })
    }
  }

  const plan = (q: Quality, title: string) => (
    <EditorSection title={title} description={q === 'premium' ? 'Premium should include everything in Normal plus its extra benefits.' : 'Standard installation and included services.'}>
      <div className="grid gap-5 sm:grid-cols-2">
        <DraftInput form={form} path={`${q}.name`} label="Plan name" required />
        <DraftInput form={form} path={`${q}.badge`} label="Ribbon (optional)" hint="e.g. Most popular" />
        <DraftInput form={form} path={`${q}.tagline`} label="One-line description" className="sm:col-span-2" />
        <DraftInput form={form} path={`${q}.priceLabel`} label="Price text (optional)" hint="Empty = “From ₹…” worked out from Companies & rates." />
        <DraftInput form={form} path={`${q}.ctaLabel`} label="Button label" />
      </div>
      <DraftStringList form={form} path={`${q}.features`} label="Features & benefits" noun="feature" max={14} />
      <div className="flex items-start gap-3 rounded-card border border-line bg-snow-100/60 p-4">
        <Drone className="mt-1 size-5 shrink-0 text-steel-600" aria-hidden />
        <div className="flex-1">
          <DraftToggle form={form} path={`${q}.droneCleaning`} label="Drone-based panel cleaning included"
            hint={q === 'normal' ? 'Keep this off: drone cleaning is a Premium benefit.' : 'Shown as “Drone cleaning included” on the Premium card and in the table.'} />
        </div>
      </div>
    </EditorSection>
  )

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid content-start gap-6">
        <EditorSection title="Section heading">
          <DraftToggle form={form} path="enabled" label="Show the Normal vs Premium comparison" hint="On the Pricing page and the Home page." />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput form={form} path="kicker" label="Small line above heading" />
            <DraftInput form={form} path="title" label="Heading" required />
          </div>
          <DraftTextarea form={form} path="intro" label="Intro" rows={2} />
        </EditorSection>
        <div className="grid gap-6 xl:grid-cols-2">
          {plan('normal', 'Normal plan')}
          {plan('premium', 'Premium plan')}
        </div>
        <EditorSection title="Comparison table" description="Row by row. A “Drone-based panel cleaning” row is always added from the switches above.">
          <DraftItemList<PlanTiersContent, PlanComparisonRow>
            form={form} path="rows" label="Rows" noun="row" max={16}
            fields={[{ key: 'label', label: 'Feature', span: 2 }, { key: 'normal', label: 'Normal' }, { key: 'premium', label: 'Premium' }]}
            create={() => ({ id: createId('row'), label: '', normal: 'Included', premium: 'Included' })}
          />
          <DraftInput form={form} path="droneTitle" label="Drone cleaning note: title" />
          <DraftTextarea form={form} path="droneText" label="Drone cleaning note: text" rows={3} />
          <DraftTextarea form={form} path="footnote" label="Footnote" rows={2} />
        </EditorSection>
      </div>
      <SaveBar dirty={dirty} saving={update.isPending} remoteChanged={remoteChanged} errorCount={Object.keys(form.errors).length} onDiscard={discard} onLoadLatest={loadLatest} />
    </form>
  )
}
