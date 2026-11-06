import { useSearchParams } from 'react-router';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { usePublished, useSiteContent } from '@/queries';
import { useSeo } from '@/hooks/useSeo';
import { mailHref, telHref, whatsappHref } from '@/lib/format';
import { Card, WhatsAppIcon } from '@/components/ui';
import { PageHero } from '@/components/common/PageHero';
import { img } from '@/data/media';
import { ContactForm } from '@/components/common/ContactForm';

export default function ContactPage() {
  const content = useSiteContent();
  const pricingPlans = usePublished('pricingPlans');
  const [params] = useSearchParams();
  useSeo({
    title: 'Contact us',
    description: `Call, WhatsApp or visit Baba Solars in Deopuri, Raipur. Book a free roof solar site survey.`,
    path: '/contact',
  });

  const plan = pricingPlans.find((p) => p.id === params.get('plan'));
  const defaultService =
    params.get('service') ??
    (plan
      ? plan.id === 'plan-six-month-care'
        ? '6-month free care plan'
        : plan.category === 'maintenance'
          ? 'Annual maintenance (AMC)'
          : plan.category === 'commercial'
            ? 'Commercial and industrial solar'
            : 'Home roof installation'
      : '');
  const offer = (content.offers ?? []).find((o) => o.id === params.get('offer') && o.enabled);
  const defaultMessage = plan
    ? `I'm interested in the ${plan.name} plan. Please share an exact quote.`
    : (params.get('message') ??
      (offer ? `I'm interested in the ${offer.badge || offer.title} offer. Please share the details.` : ''));
  const typeParam = params.get('type');
  // Pre-select Home / Commercial only when the link says so (the choice is optional).
  const defaultType =
    typeParam === 'commercial' || typeParam === 'home'
      ? typeParam
      : plan
        ? plan.category === 'commercial'
          ? 'commercial'
          : 'home'
        : undefined;
  const mapUrl =
    content.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.address)}`;
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(content.address)}&output=embed`;

  const methods = [
    {
      icon: <Phone className="size-5" aria-hidden />,
      label: 'Call',
      value: content.phone,
      href: telHref(content.phone),
    },
    ...(content.whatsapp
      ? [
          {
            icon: <WhatsAppIcon className="size-5" />,
            label: 'WhatsApp',
            value: 'Usually replies within an hour',
            href: whatsappHref(content.whatsapp),
            external: true,
          },
        ]
      : []),
    {
      icon: <Mail className="size-5" aria-hidden />,
      label: 'Email',
      value: content.email,
      href: mailHref(content.email),
    },
  ];

  return (
    <>
      <PageHero
        title="Contact Us"
        crumb="Contact Us"
        image={img('holdingPanel', 2000)}
        intro="Book a free site survey or ask us anything. We reply within one working day."
      />
      <section className="section-y">
        <div className="container-site grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <Card id="enquiry" className="scroll-mt-28 p-6 md:p-9">
            <h2 className="mb-6 text-2xl">Send an enquiry</h2>
            <ContactForm
              defaultService={defaultService}
              defaultMessage={defaultMessage}
              defaultType={defaultType}
              defaultKw={params.get('kw') ?? ''}
              defaultCity={params.get('city') ?? 'Raipur'}
              source={
                plan ? 'pricing' : params.get('service') ? 'service' : 'contact'
              }
            />
          </Card>

          <div className="space-y-4">
            {methods.map((m) => (
              <a
                key={m.label}
                href={m.href}
                {...(m.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-soft card-lift"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-field bg-ice-100 text-navy-700">
                  {m.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">
                    {m.label}
                  </span>
                  <span className="block break-words text-sm text-muted">
                    {m.value}
                  </span>
                </span>
              </a>
            ))}
            <Card tone="warm">
              <div className="flex gap-3">
                <MapPin
                  className="mt-1 size-5 shrink-0 text-steel-600"
                  aria-hidden
                />
                <address className="not-italic text-ink-soft">
                  {content.address}
                </address>
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex font-semibold text-navy-700 underline underline-offset-2"
              >
                Open address in Google Maps
              </a>
              <p className="mt-3 flex gap-3 text-ink-soft">
                <Clock
                  className="mt-0.5 size-5 shrink-0 text-steel-600"
                  aria-hidden
                />
                {content.hours}
              </p>
            </Card>
          </div>
        </div>
      </section>
      <section className="pb-16 md:pb-24">
        <div className="container-site">
          <div className="overflow-hidden rounded-panel border border-line bg-ice-100 shadow-soft">
            <iframe
              title="Map showing Baba Solars office in Deopuri, Raipur"
              src={mapSrc}
              className="h-80 w-full md:h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
