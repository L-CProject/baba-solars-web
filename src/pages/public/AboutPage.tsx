import { useSiteContent } from '@/queries'
import { fillTokens } from '@/lib/schemas'
import { useSeo } from '@/hooks/useSeo'
import { Card, Reveal, SectionHeading } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { img } from '@/data/media'
import { CtaBand } from '@/components/common/CtaBand'

export default function AboutPage() {
  const content = useSiteContent()
  const about = content.about
  useSeo({ title: 'About us', description: 'Baba Solars is a Raipur-based roof solar installer and maintenance company serving homes and businesses across Chhattisgarh.', path: '/about' })

  return (
    <>
      <PageHero crumb="About Us" image={img('crewOnRoof', 2000)} title={about.heroTitle} intro={fillTokens(about.heroIntro, content)} />

      <section className="section-y">
        <div className="container-site grid gap-12 lg:grid-cols-2">
          <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
            <h2 className="mb-2 text-3xl md:text-4xl">{about.storyTitle}</h2>
            {about.story.map((para, i) => <p key={i}>{fillTokens(para, content)}</p>)}
          </div>
          <Card tone="warm" className="p-8">
            <h2 className="text-2xl">{about.missionTitle}</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-soft">{fillTokens(about.missionText, content)}</p>
            <dl className="mt-8 grid grid-cols-2 gap-6">
              {content.stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="font-display text-3xl text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </section>

      <section className="section-y bg-surface solar-grid-light">
        <div className="container-site">
          <SectionHeading title={about.principlesTitle} intro={about.principlesIntro} />
          <div className="grid gap-5 sm:grid-cols-2">
            {about.principles.map((p, i) => (
              <Reveal key={p.id} index={i % 2}>
                <Card tone="plain" className="card-lift h-full bg-canvas shadow-soft">
                  <h3 className="font-sans text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-muted">{p.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-site grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl md:text-4xl">{about.timelineTitle}</h2>
          <ol className="space-y-6">
            {about.timeline.map((t) => (
              <li key={t.id} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-line pb-6 last:border-0">
                <span className="font-display text-xl text-steel-600">{t.year}</span>
                <p className="text-lg text-ink-soft">{t.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-y bg-surface solar-grid-light">
        <div className="container-site grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl">Areas we serve</h2>
            <p className="mt-3 text-muted">{content.serviceAreas.join(', ')} and other districts on request.</p>
          </div>
          <div>
            <h2 className="text-3xl">Our office</h2>
            <address className="mt-3 not-italic text-muted">{content.address}</address>
            <p className="mt-2 text-muted">{content.hours}</p>
          </div>
        </div>
      </section>

      <CtaBand title={about.ctaTitle} />
    </>
  )
}
