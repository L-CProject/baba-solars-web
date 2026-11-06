import { Check, MapPin } from 'lucide-react'
import { usePublished, useSiteContent } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { img } from '@/data/media'
import { Icon, LinkButton, linkTarget, Reveal, SectionHeading, SmartLink } from '@/components/ui'
import { HeroSlider } from '@/components/common/HeroSlider'
import { ImageCarousel } from '@/components/common/ImageCarousel'
import { SmartImage } from '@/components/common/SmartImage'
import { SolarInfographic } from '@/components/common/SolarInfographic'
import { PartnersMarquee } from '@/components/common/PartnersMarquee'
import { VideoSection } from '@/components/common/VideoSection'
import { PlanComparison } from '@/components/common/PlanComparison'
import { SolarCalculator } from '@/components/common/SolarCalculator'
import { Testimonials } from '@/components/common/Testimonials'
import { CtaBand } from '@/components/common/CtaBand'
import { HighlightStrip } from '@/components/common/HighlightStrip'
import { DroneCleaningSection } from '@/components/common/DroneCleaningSection'
import { SixMonthBadge, SixMonthPlan } from '@/components/common/SixMonthPlan'
import { SuryaGharSection } from '@/components/common/SuryaGharSection'
import { OfferSection } from '@/components/common/OfferSection'
import { useLiveOffers } from '@/components/common/OfferRibbon'

export default function HomePage() {
  const content = useSiteContent()
  const home = content.home
  const slides = usePublished('heroSlides')
  const photos = usePublished('gallery')
  const testimonials = usePublished('testimonials')
  const offerLive = useLiveOffers().length > 0
  useSeo({ path: '/' })

  return (
    <>
      {/* 0. Live offer first — the most prominent block on the site (Admin → Offers; hidden when none is live).
          The offer marquee in the header links here. */}
      <OfferSection />

      {/* 1. Banner slider */}
      <HeroSlider slides={slides} eager={!offerLive} />

      {/* 1b. NEW: Drone cleaning · 6-month plan · PM Surya Ghar promo tiles */}
      <HighlightStrip className="pt-8 md:pt-10" />

      {/* 2. Solar calculator — placed high so visitors find it straight after the banner */}
      <section id="calculator" className="section-y">
        <div className="container-site">
          <SectionHeading
            kicker={home.calculatorKicker}
            title={home.calculatorTitle}
            intro={home.calculatorIntro}
          />
          <SolarCalculator />
        </div>
      </section>

      {/* 2a. Normal vs Premium plans (drone cleaning is Premium-only) */}
      <section className="border-t border-line bg-snow-200/40 py-12 md:py-16">
        <div className="container-site"><PlanComparison id="home-plans" /></div>
      </section>

      {/* 2b. 6 Months' Free Cleaning Service + photo slider */}
      <section className="section-y">
        <div className="container-site">
          <SixMonthBadge className="mb-3" />
          <SectionHeading
            kicker={home.sixMonthKicker}
            title={home.sixMonthTitle}
            intro={home.sixMonthIntro}
            action={home.sixMonthButton ? <LinkButton to="/gallery" variant="secondary">{home.sixMonthButton}</LinkButton> : undefined}
          />
          <ImageCarousel items={photos} label="Recent installation and cleaning photos" />
        </div>
      </section>

      {/* 3. Empowering homes + highlights */}
      <section className="section-y bg-surface solar-grid-light">
        <div className="container-site">
          <SectionHeading align="center" kicker={home.trustKicker} title={content.heroTitle} intro={content.heroSubtitle} />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {content.highlights.map((h, i) => (
              <Reveal as="li" index={i % 4} key={`${i}-${h.title}`} className="card-lift flex flex-col items-center rounded-card border border-line bg-canvas px-3 py-6 text-center shadow-soft sm:px-4">
                <span className="grid size-14 place-items-center rounded-full bg-ice-200 text-navy-700"><Icon name={h.icon} className="size-6" /></span>
                <p className="mt-4 font-display text-lg leading-tight text-ink sm:text-xl">{h.title}</p>
                <p className="mt-1.5 text-sm text-muted">{h.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Our Solar Solutions / Solar Plants */}
      <section className="section-y">
        <div className="container-site">
          <SectionHeading kicker={home.solutionsKicker} title={home.solutionsTitle} intro={home.solutionsIntro} />
          <div className="grid gap-6 md:grid-cols-3">
            {home.solutions.map((s, i) => (
              <Reveal key={s.id} index={i} className="h-full">
              <SmartLink to={s.link} className="card-lift group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft">
                <div className="aspect-[4/3] overflow-hidden">
                  <SmartImage src={s.image} alt={s.title} className="size-full transition-transform duration-700 ease-soft group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-sans text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                  {home.solutionsLinkLabel && <span className="mt-auto pt-5 font-semibold text-navy-700 underline decoration-ice-300 decoration-2 underline-offset-4 group-hover:decoration-sun-400">{home.solutionsLinkLabel}</span>}
                </div>
              </SmartLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4b. NEW: Drone Solar Panel Cleaning showcase */}
      <DroneCleaningSection />

      {/* 5. Maintenance & Cleaning */}
      <section className="section-y bg-ice-100/60">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="grid grid-cols-2 gap-4">
            <SmartImage src={img('technicianWorking', 900)} alt="Technician servicing solar panels" className="aspect-[3/4] w-full rounded-card shadow-card" />
            <SmartImage src={img('manOnRoof', 900)} alt="Inspection on a roof solar system" className="mt-10 aspect-[3/4] w-full rounded-card shadow-card" />
          </div>
          <div>
            {home.maintenanceKicker && <p className="mb-2 font-semibold text-steel-600">{home.maintenanceKicker}</p>}
            <h2 className="text-3xl md:text-[2.6rem]">{home.maintenanceTitle}</h2>
            <p className="mt-4 text-lg text-muted">{home.maintenanceText}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {home.maintenancePoints.map((t, i) => (
                <li key={`${i}-${t}`} className="flex gap-2.5 text-ink-soft"><Check className="mt-1 size-4 shrink-0 text-leaf-500" aria-hidden />{t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {home.maintenancePrimaryLabel && <LinkButton {...linkTarget(home.maintenancePrimaryLink)}>{home.maintenancePrimaryLabel}</LinkButton>}
              {home.maintenanceSecondaryLabel && <LinkButton {...linkTarget(home.maintenanceSecondaryLink, '/pricing')} variant="secondary">{home.maintenanceSecondaryLabel}</LinkButton>}
            </div>
          </div>
        </div>
      </section>

      {/* 5b. NEW: 6-month free service & maintenance plan */}
      <SixMonthPlan />

      {/* 6. Our Mission + infographic */}
      <section className="section-y">
        <div className="container-site grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            {home.missionKicker && <p className="mb-2 font-semibold text-steel-600">{home.missionKicker}</p>}
            <h2 className="text-3xl md:text-[2.6rem]">{home.missionTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{home.missionText}</p>
            {home.missionButton && <LinkButton to="/about" variant="secondary" className="mt-7">{home.missionButton}</LinkButton>}
          </div>
          <div className="rounded-panel border border-line bg-surface p-5 shadow-soft md:p-8">
            <SolarInfographic />
          </div>
        </div>
      </section>

      {/* 7. Why Choose Us */}
      <section className="section-y bg-surface solar-grid-light">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            {home.whyKicker && <p className="mb-2 font-semibold text-steel-600">{home.whyKicker}</p>}
            <h2 className="text-3xl md:text-[2.6rem]">{home.whyTitle}</h2>
            <ol className="mt-8 space-y-6">
              {home.whyUs.map((w, i) => (
                <li key={w.id} className="flex gap-5">
                  <span className="w-14 shrink-0 font-display text-4xl font-bold leading-none text-steel-400">{String(i + 1).padStart(2, '0')}.</span>
                  <div>
                    <h3 className="font-sans text-lg font-semibold">{w.title}</h3>
                    <p className="mt-1 text-muted">{w.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <SmartImage src={img('crewOnRoof', 1200)} alt="Baba Solars installation team on a roof" className="aspect-[4/3] w-full rounded-panel shadow-lift" />
        </div>
      </section>

      {/* 9. PM Surya Ghar: Muft Bijli Yojana (verified figures, deadline, official links) */}
      <SuryaGharSection />

      {/* 10. Our Service Areas */}
      <section className="section-y">
        <div className="container-site">
          <SectionHeading kicker={home.areasKicker} title={home.areasTitle} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {home.areas.map((a, i) => (
              <Reveal key={a.id} index={i}>
              <SmartLink
                to={`/contact?service=${encodeURIComponent('Home roof installation')}&city=${encodeURIComponent(a.name.split(' ')[0])}`}
                className="card-lift group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-card p-5 text-snow-50 shadow-soft"
              >
                <SmartImage src={a.image} alt="" className="absolute inset-0 -z-10 size-full transition-transform duration-700 ease-soft group-hover:scale-105" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-transparent" aria-hidden />
                <MapPin className="mb-2 size-5 text-sun-300" aria-hidden />
                <h3 className="font-sans text-xl font-semibold text-snow-50">{a.name}</h3>
                <p className="mt-1 text-sm text-snow-200">{a.text}</p>
                {home.solutionsLinkLabel && <span className="mt-3 text-sm font-semibold text-sun-300">{home.solutionsLinkLabel}</span>}
              </SmartLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Partners */}
      {content.partners.length > 0 && (
        <section className="border-y border-line bg-surface py-12" aria-labelledby="partners-title">
          <div className="container-site">
            <h2 id="partners-title" className="mb-8 text-center font-sans text-base font-semibold text-muted">{home.partnersTitle}</h2>
          </div>
          <PartnersMarquee names={content.partners} />
        </section>
      )}

      {/* 12. Solar Energy Benefits / Professional Installation + 13. Video */}
      <section className="section-y">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <ol className="space-y-8">
              {home.benefits.map((b, i) => (
                <li key={b.id} className="flex gap-5">
                  <span className="w-14 shrink-0 font-display text-4xl font-bold leading-none text-steel-400">{String(i + 1).padStart(2, '0')}.</span>
                  <div>
                    <h2 className="text-2xl md:text-3xl">{b.title}</h2>
                    <p className="mt-2 text-lg text-muted">{b.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-muted">{content.videoUrl ? home.videoText : home.photoText}</p>
          </div>
          <VideoSection videoUrl={content.videoUrl} poster={img('rooftopInstalled', 1400)} />
        </div>
      </section>

      {/* 14. Testimonials */}
      {testimonials.length > 0 && (
        <section className="section-y bg-surface solar-grid-light">
          <div className="container-site">
            <SectionHeading kicker={home.testimonialsKicker} title={home.testimonialsTitle} />
            <Testimonials items={testimonials.slice(0, 6)} />
          </div>
        </section>
      )}

      <CtaBand />
    </>
  )
}
