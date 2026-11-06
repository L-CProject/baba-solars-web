import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import * as motion from 'motion/react-m'
import { useSeo } from '@/hooks/useSeo'
import type { PlanCategory } from '@/types'
import { usePublished, useSiteContent } from '@/queries'
import { EmptyState, LinkButton, Segmented, SectionHeading } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { img } from '@/data/media'
import { PriceDisclaimer, PricingCard } from '@/components/common/PricingCard'
import { SolarCalculator } from '@/components/common/SolarCalculator'
import { CompanyPricing } from '@/components/common/CompanyPricing'
import { PlanComparison } from '@/components/common/PlanComparison'
import { FaqList } from '@/components/common/FaqList'
import { CtaBand } from '@/components/common/CtaBand'
import { ReferencePlans } from '@/components/common/ReferencePlans'
import { SixMonthBadge, SixMonthPlan } from '@/components/common/SixMonthPlan'
import { SuryaGharSection } from '@/components/common/SuryaGharSection'

const CATEGORIES: PlanCategory[] = ['residential', 'commercial', 'maintenance']

export default function PricingPage() {
  const plansAll = usePublished('pricingPlans')
  const capacityPlans = usePublished('capacityPlans')
  const faqs = usePublished('faqs')
  const t = useSiteContent().pricingPage
  const reduce = useReducedMotion()
  useSeo({ title: 'Solar plans & pricing', description: 'Normal and Premium roof solar plans in Raipur (Premium includes drone panel cleaning), Waaree, Adani and Tata package prices for 3–10 kW, PM Surya Ghar subsidy up to ₹78,000, care plans and AMC.', path: '/pricing' })
  const [tab, setTab] = useState<PlanCategory>('residential')
  // Deep link /pricing#maintenance opens the care-plan tab (after mount, so prerendered HTML hydrates cleanly).
  useEffect(() => { if (window.location.hash === '#maintenance') setTab('maintenance') }, [])

  const tabs = useMemo(() => CATEGORIES.map((value) => ({ value, label: t.tabs[value].label })), [t.tabs])
  const plans = useMemo(() => plansAll.filter((p) => p.category === tab), [plansAll, tab])
  const pricingFaqs = faqs.filter((f) => f.category === 'pricing' || f.category === 'subsidy')

  return (
    <>
      <PageHero crumb="Pricing" image={img('monoPanels', 2000)} title={t.heroTitle} intro={t.heroIntro}>
        <SixMonthBadge tone="light" />
      </PageHero>

      <section className="section-y" aria-label="Normal and Premium plans">
        <div className="container-site"><PlanComparison /></div>
      </section>

      <div className="section-y border-t border-line bg-surface">
        <div className="container-site"><CompanyPricing /></div>
      </div>

      {capacityPlans.length > 0 && (
        <section className="section-y border-t border-line" id="plans">
          <div className="container-site">
            <SectionHeading kicker={t.capacityKicker} title={t.capacityTitle} intro={t.capacityIntro} />
            <ReferencePlans />
          </div>
        </section>
      )}

      <section className="section-y bg-surface solar-grid-light" id="maintenance">
        <div className="container-site">
          <SectionHeading kicker={t.rangesKicker} title={t.rangesTitle} className="mb-8 md:mb-8" />
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <Segmented<PlanCategory> label={t.tabsLabel} value={tab} onChange={setTab} options={tabs} className="w-full max-w-lg" />
            {t.tabs[tab].note && <p className="max-w-sm text-sm text-muted" aria-live="polite">{t.tabs[tab].note}</p>}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {plans.length ? (
                <div className="grid gap-6 pt-3 md:grid-cols-2 lg:grid-cols-3">{plans.map((p) => <PricingCard key={p.id} plan={p} />)}</div>
              ) : (
                <EmptyState title={t.emptyTitle} message={t.emptyMessage} action={<LinkButton to="/contact">Ask for a quote</LinkButton>} />
              )}
            </motion.div>
          </AnimatePresence>

          <PriceDisclaimer className="mt-10" />
        </div>
      </section>

      <SixMonthPlan />
      <SuryaGharSection />

      <section className="section-y" id="calculator">
        <div className="container-site">
          <SectionHeading title={t.calculatorTitle} />
          <SolarCalculator />
        </div>
      </section>

      {pricingFaqs.length > 0 && (
        <section className="section-y bg-surface solar-grid-light">
          <div className="container-site max-w-3xl">
            <SectionHeading title={t.faqTitle} />
            <FaqList faqs={pricingFaqs} />
          </div>
        </section>
      )}

      <CtaBand title={t.ctaBandTitle} />
    </>
  )
}
