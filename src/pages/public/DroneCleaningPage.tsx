import { Link } from 'react-router'
import { usePublished } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { img } from '@/data/media'
import { LinkButton, SectionHeading } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { DroneCleaningSection } from '@/components/common/DroneCleaningSection'
import { enquiryLink, FEATURED_SERVICE_IDS } from '@/hooks/useFeaturedService'
import { SixMonthBadge, SixMonthPlan } from '@/components/common/SixMonthPlan'
import { FaqList } from '@/components/common/FaqList'
import { CtaBand } from '@/components/common/CtaBand'

const steps = [
  { title: 'Free site check', text: 'We look at array size, height, access and dust level, then share a written quote.' },
  { title: 'Before reading', text: 'We note inverter generation and take aerial photos before cleaning.' },
  { title: 'Drone-assisted cleaning', text: 'The drone works row by row over the array; our team supervises from the ground.' },
  { title: 'After report', text: 'You get after photos and the generation reading, plus any faults we spotted.' },
]

const fits = [
  'Large roofs of factories, warehouses and schools',
  'Tall buildings where carrying water and people up is difficult',
  'Ground-mounted and agricultural solar plants',
  'Sheds and roofs that are unsafe to walk on',
]

export default function DroneCleaningPage() {
  const faqs = usePublished('faqs')
  const services = usePublished('services')
  const droneEnquiryLink = enquiryLink(services.find((s) => s.id === FEATURED_SERVICE_IDS.drone)?.title ?? 'Drone solar panel cleaning')
  useSeo({
    title: 'Drone Solar Panel Cleaning in Raipur',
    description: 'Drone-assisted solar panel cleaning for large roofs, sheds and solar plants in Raipur and Chhattisgarh, with before/after photos and generation readings.',
    path: '/drone-cleaning',
  })
  const droneFaqs = faqs.filter((f) => f.id.startsWith('f-drone'))

  return (
    <>
      <PageHero
        crumb="Drone Cleaning"
        image={img('aerialRows', 2000)}
        title="Drone Solar Panel Cleaning"
        intro="Faster, safer cleaning for big and hard-to-reach solar arrays across Chhattisgarh."
      >
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton to={droneEnquiryLink} variant="accent" size="lg">Book a free site check</LinkButton>
          <SixMonthBadge tone="light" />
        </div>
      </PageHero>

      <DroneCleaningSection variant="page" />

      <div className="container-site">
        <p className="flex flex-col gap-3 rounded-card border border-sun-500/40 bg-sun-300/20 p-5 text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span><strong className="text-ink">Included with the Premium plan.</strong> New Premium installations come with drone-based panel cleaning. Normal-plan and other customers can book it separately.</span>
          <Link to="/pricing#plans-compare" className="shrink-0 font-semibold text-ink underline underline-offset-4">Compare Normal &amp; Premium</Link>
        </p>
      </div>

      <section className="section-y">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading kicker="How it works" title="Four simple steps" className="mb-8 md:mb-8" />
            <ol className="space-y-5">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display text-lg text-navy-900">{i + 1}</span>
                  <div>
                    <h3 className="font-sans text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1 text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-panel border border-line bg-surface p-6 shadow-soft md:p-8">
            <h2 className="text-2xl md:text-3xl">Best suited for</h2>
            <ul className="mt-5 space-y-3">
              {fits.map((f) => (
                <li key={f} className="flex gap-3 text-ink-soft"><span className="mt-2 size-2 shrink-0 rounded-full bg-sun-400" aria-hidden />{f}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">Small home roofs are often quicker to clean by hand. We will tell you honestly which method suits your roof.</p>
            <LinkButton to={droneEnquiryLink} className="mt-6">Ask for a quote</LinkButton>
          </div>
        </div>
      </section>

      <SixMonthPlan className="pt-0" />

      {droneFaqs.length > 0 && (
        <section className="section-y bg-surface solar-grid-light">
          <div className="container-site max-w-3xl">
            <SectionHeading title="Drone cleaning questions" />
            <FaqList faqs={droneFaqs} />
          </div>
        </section>
      )}

      <CtaBand title="Get your panels cleaned by drone" text="Share your location and array size. We will check the site and send a written quote." />
    </>
  )
}
