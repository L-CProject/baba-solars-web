import { usePublished } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { SURYA_GHAR } from '@/config/site'
import { img } from '@/data/media'
import { LinkButton, SectionHeading } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { SuryaGharSection } from '@/components/common/SuryaGharSection'
import { SolarCalculator } from '@/components/common/SolarCalculator'
import { FaqList } from '@/components/common/FaqList'
import { CtaBand } from '@/components/common/CtaBand'

export default function SuryaGharPage() {
  const faqs = usePublished('faqs')
  useSeo({
    title: 'PM Surya Ghar Muft Bijli Yojana Subsidy in Raipur',
    description: `PM Surya Ghar Muft Bijli Yojana: subsidy up to ₹78,000, eligibility, how to apply, official links and the ${SURYA_GHAR.deadlineLabel} scheme end date. Help from Baba Solars, Raipur.`,
    path: '/pm-surya-ghar',
  })
  const subsidyFaqs = faqs.filter((f) => f.category === 'subsidy')

  return (
    <>
      <PageHero
        crumb="PM Surya Ghar"
        image={img('houseWithSolar', 2000)}
        title="PM Surya Ghar: Muft Bijli Yojana"
        intro="Subsidy of up to ₹78,000 on home roof solar. Here are the official amounts, eligibility, steps and links in one place."
      >
        <LinkButton href={SURYA_GHAR.portal} external variant="accent" size="lg">Open pmsuryaghar.gov.in</LinkButton>
      </PageHero>

      <SuryaGharSection variant="full" />

      <section className="section-y">
        <div className="container-site">
          <SectionHeading title="See your subsidy and savings" intro="Move the slider to your monthly bill. The calculator uses the official subsidy slabs." />
          <SolarCalculator />
        </div>
      </section>

      {subsidyFaqs.length > 0 && (
        <section className="section-y bg-surface solar-grid-light">
          <div className="container-site max-w-3xl">
            <SectionHeading title="Subsidy questions" />
            <FaqList faqs={subsidyFaqs} />
          </div>
        </section>
      )}

      <CtaBand title="Apply before the scheme period ends" text={`The scheme is implemented till ${SURYA_GHAR.deadlineLabel} as per MNRE guidelines. Book a free survey and we will help with the portal and paperwork.`} />
    </>
  )
}
