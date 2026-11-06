import { Phone } from 'lucide-react';
import { useSiteContent } from '@/queries';
import { telHref, whatsappHref } from '@/lib/format';
import { LinkButton, linkTarget, WhatsAppIcon } from '@/components/ui';
import { SolarParticles } from './SolarParticles';

/** Bottom call-to-action. Text and button come from Admin → Site content → Call-to-action; pages may override the title. */
export function CtaBand({ title, text }: { title?: string; text?: string }) {
  const content = useSiteContent();
  const cta = content.cta;
  return (
    <section className="section-y">
      <div className="container-site">
        <div className="solar-grid-dark overflow-hidden rounded-panel bg-navy-800 px-6 py-12 text-snow-100 md:px-14 md:py-16">
          <SolarParticles rays />
          <svg
            className="pointer-events-none absolute -bottom-6 right-0 hidden h-64 w-80 overflow-visible md:block"
            viewBox="0 0 320 256"
            aria-hidden
          >
            <circle cx="250" cy="60" r="34" fill="var(--color-sun-400)" />
            <g
              fill="var(--color-steel-500)"
              stroke="var(--color-navy-500)"
              strokeWidth="2"
            >
              <polygon points="20,250 120,250 140,160 40,160" />
              <polygon points="130,250 230,250 250,160 150,160" />
              <polygon points="240,250 340,250 360,160 260,160" />
            </g>
          </svg>
          <div className="relative max-w-2xl">
            <h2 className="text-3xl text-snow-50 md:text-4xl">
              {title || cta.title}
            </h2>
            <p className="mt-3 text-lg text-snow-300">{text ?? cta.text}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton
                {...linkTarget(cta.primaryLink)}
                variant="accent"
                size="lg"
              >
                {cta.primaryLabel}
              </LinkButton>
              {content.whatsapp && (
                <LinkButton
                  href={whatsappHref(content.whatsapp)}
                  external
                  variant="light"
                  size="lg"
                  leftIcon={<WhatsAppIcon className="size-5" />}
                >
                  {cta.whatsappLabel || 'WhatsApp us'}
                </LinkButton>
              )}
              <LinkButton
                href={telHref(content.phone)}
                variant="ghost"
                size="lg"
                leftIcon={<Phone className="size-5" />}
                className="text-snow-100 hover:bg-navy-700 hover:text-snow-50"
              >
                {content.phone}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
