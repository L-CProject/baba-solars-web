import { usePublished, useSiteContent } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import type { ServiceGroup } from '@/types'
import { EmptyState, LinkButton, SectionHeading } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { img } from '@/data/media'
import { ServiceCard } from '@/components/common/ServiceCard'
import { CtaBand } from '@/components/common/CtaBand'
import { DroneCleaningSection } from '@/components/common/DroneCleaningSection'
import { SixMonthBadge, SixMonthPlan } from '@/components/common/SixMonthPlan'

const GROUP_KEYS: ServiceGroup[] = ['installation', 'maintenance', 'support']

export default function ServicesPage() {
  const published = usePublished('services')
  const sp = useSiteContent().servicesPage
  const groups = GROUP_KEYS.map((key) => ({ key, ...sp.groups[key] }))
  useSeo({ title: 'Solar services', description: 'Roof solar installation, drone solar panel cleaning, 6-month free care plan, AMC, inspection, inverter repair and PM Surya Ghar subsidy help in Raipur and Chhattisgarh.', path: '/services' })

  return (
    <>
      <PageHero crumb="Our Services" image={img('installerOnRoof', 2000)} title={sp.heroTitle} intro={sp.heroIntro}>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g.key} href={`#${g.key}`} className="rounded-chip border border-snow-50/30 bg-snow-50/10 px-4 py-2 text-sm font-semibold text-snow-50 backdrop-blur hover:bg-snow-50/20">{g.title}</a>
          ))}
          <a href="#drone-cleaning" className="badge-glow relative rounded-chip bg-accent px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-sun-300">New: Drone cleaning</a>
        </div>
        <div className="mt-4">
          <SixMonthBadge tone="light" />
        </div>
      </PageHero>

      {/* NEW: Drone Solar Panel Cleaning, shown first */}
      <DroneCleaningSection variant="page" />

      {published.length === 0 && (
        <div className="container-site section-y"><EmptyState title="Services are being updated" message="Call or WhatsApp us and we will tell you what we offer." action={<LinkButton to="/contact">Contact us</LinkButton>} /></div>
      )}

      {groups.map((g, i) => {
        const items = published.filter((s) => s.group === g.key)
        if (!items.length) return null
        return (
          <section key={g.key} id={g.key} className={i % 2 ? 'section-y bg-surface solar-grid-light' : 'section-y'}>
            <div className="container-site">
              <SectionHeading title={g.title} intro={g.intro} />
              <div className="grid gap-5 pt-3 md:grid-cols-2 lg:grid-cols-3">{items.map((s) => <ServiceCard key={s.id} service={s} detailed />)}</div>
            </div>
          </section>
        )
      })}

      {/* NEW: 6-month free service & maintenance plan */}
      <SixMonthPlan />

      <section className="section-y pt-0 md:pt-0">
        <div className="container-site grid items-center gap-10 rounded-panel border border-line bg-ice-100/60 p-8 md:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl">{sp.dustTitle}</h2>
            <p className="mt-3 text-lg text-ink-soft">{sp.dustText}</p>
            {sp.dustButton && <LinkButton to="/pricing#maintenance" className="mt-6">{sp.dustButton}</LinkButton>}
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {sp.dustStats.map(({ value, label }, i) => (
              <div key={`${i}-${label}`} className="rounded-card bg-surface p-5 shadow-soft">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-2xl text-ink">{value}</dd>
                <dd className="mt-1 text-sm text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
