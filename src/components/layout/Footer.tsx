import { Link } from 'react-router';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { NAV_LINKS } from '@/config/site';
import { usePublished, useSiteContent } from '@/queries';
import { mailHref, telHref, whatsappHref } from '@/lib/format';
import { WhatsAppIcon } from '@/components/ui';
import { Logo } from './Logo';

export function Footer() {
  const content = useSiteContent();
  const services = usePublished('services');
  const topServices = services
    .filter((s) => s.status === 'published')
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);
  const year = new Date().getFullYear();

  return (
    <footer className="solar-grid-dark bg-navy-900 text-snow-200">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr]">
        <div>
          <Logo name={content.businessName} light />
          <p className="mt-4 max-w-xs text-snow-300/90">
            {content.tagline}. Serving{' '}
            {content.serviceAreas.slice(0, 4).join(', ')} and nearby districts.
          </p>
        </div>

        <nav aria-label="Footer pages">
          <h2 className="font-sans text-sm font-semibold text-snow-50">
            Pages
          </h2>
          <ul className="mt-4 space-y-2.5">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-sun-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer services">
          <h2 className="font-sans text-sm font-semibold text-snow-50">
            Services
          </h2>
          <ul className="mt-4 space-y-2.5">
            {topServices.map((s) => (
              <li key={s.id}>
                <Link to={`/services#${s.slug}`} className="hover:text-sun-300">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold text-snow-50">
            Visit or call
          </h2>
          <ul className="mt-4 space-y-3.5">
            <li className="flex gap-3">
              <MapPin
                className="mt-1 size-4 shrink-0 text-sun-400"
                aria-hidden
              />
              <address className="not-italic">{content.address}</address>
            </li>
            <li className="flex gap-3">
              <Phone
                className="mt-1 size-4 shrink-0 text-sun-400"
                aria-hidden
              />
              <a href={telHref(content.phone)} className="hover:text-sun-300">
                {content.phone}
              </a>
            </li>
            {content.whatsapp && (
              <li className="flex gap-3">
                <WhatsAppIcon className="mt-1 size-4 shrink-0 text-sun-400" />
                <a
                  href={whatsappHref(content.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sun-300"
                >
                  Chat on WhatsApp
                </a>
              </li>
            )}
            <li className="flex gap-3">
              <Mail className="mt-1 size-4 shrink-0 text-sun-400" aria-hidden />
              <a
                href={mailHref(content.email)}
                className="break-all hover:text-sun-300"
              >
                {content.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock
                className="mt-1 size-4 shrink-0 text-sun-400"
                aria-hidden
              />
              <span>{content.hours}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-700">
        <div className="container-site flex flex-col gap-2 pb-36 pt-5 text-sm text-snow-300/80 sm:flex-row sm:items-center sm:justify-between sm:py-5">
          <p>
            © {year} {content.businessName}. Prices shown on this site are
            estimates.
          </p>
          <Link to="/admin" className="hover:text-sun-300">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
