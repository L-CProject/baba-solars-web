import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import * as motion from 'motion/react-m';
import {
  CircleAlert,
  ExternalLink,
  Hourglass,
  Landmark,
  Phone,
} from 'lucide-react';
import { SURYA_GHAR } from '@/config/site';
import { useSiteContent } from '@/queries';
import { whatsappHref } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useSkipEntrance } from '@/lib/ssg';
import { LinkButton, WhatsAppIcon } from '@/components/ui';
import { SolarParticles } from './SolarParticles';

/* ── Verified facts (MNRE guidelines + Cabinet release). Do not edit without a source. ── */
/** [size, central CFA, Chhattisgarh state subsidy, combined] — CG: ₹15,000 for 1 kW, ₹30,000 for 2 kW and above. */
export const subsidySlabs: Array<[string, string, string, string]> = [
  ['1 kW', '₹30,000', '₹15,000', '₹45,000'],
  ['2 kW', '₹60,000', '₹30,000', '₹90,000'],
  ['3 kW and above', '₹78,000', '₹30,000', '₹1,08,000'],
];

export const eligibility = [
  'Residential electricity connection with your local DISCOM (you need the consumer account number)',
  'Grid-connected roof solar system tagged to that residential connection',
  'You pay for the system yourself (capex model); subsidy is credited after installation',
  'Panels must be made-in-India DCR modules; non-DCR panels make the installation ineligible',
  'Installation by a vendor registered on the National Portal',
  'Shops, offices and other non-residential connections are not eligible',
];

export const applySteps = [
  'Register on pmsuryaghar.gov.in with your state, DISCOM and consumer number',
  'Choose a registered vendor and agree on the system and price',
  'Get the system installed and upload details and geo-tagged photos on the portal',
  'DISCOM inspects the system and installs the net meter',
  'Subsidy (CFA) is credited to your bank account (or loan account) through the portal',
];

export const officialLinks = [
  { label: 'National Portal — apply & track', href: SURYA_GHAR.portal },
  { label: 'MNRE scheme guidelines (PDF)', href: SURYA_GHAR.guidelinesPdf },
  { label: 'Cabinet approval — PM India', href: SURYA_GHAR.cabinetRelease },
  {
    label: 'Suryamitra technician training — NIMI',
    href: SURYA_GHAR.suryamitraTraining,
  },
];

/**
 * Days left until the published end date (null once it has passed, undefined until mounted).
 * Computed after mount so prerendered HTML (built on another day) hydrates without a mismatch.
 */
function useDaysLeft(iso: string) {
  const [days, setDays] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    const end = new Date(`${iso}T23:59:59+05:30`).getTime();
    const diff = Math.ceil((end - Date.now()) / 86_400_000);
    setDays(diff >= 0 ? diff : null);
  }, [iso]);
  return days;
}

export function SuryaGharDeadline({ className }: { className?: string }) {
  const days = useDaysLeft(SURYA_GHAR.deadlineIso);
  return (
    <div
      role="note"
      className={cn(
        'flex gap-3 rounded-card border-2 border-sun-400 bg-sun-300/15 p-4 text-snow-100',
        className,
      )}
    >
      <Hourglass className="mt-0.5 size-6 shrink-0 text-sun-300" aria-hidden />
      <div>
        {days !== null ? (
          <p className="font-semibold text-snow-50">
            Scheme period ends{' '}
            <span className="text-sun-300">{SURYA_GHAR.deadlineLabel}</span>
            {days !== undefined && (
              <span className="ml-2 inline-block rounded-chip bg-sun-400 px-2 py-0.5 text-xs font-bold text-navy-900">
                {days} days left
              </span>
            )}
          </p>
        ) : (
          <p className="font-semibold text-snow-50">
            The published scheme period ({SURYA_GHAR.deadlineLabel}) has ended.
            Check the portal for the current status.
          </p>
        )}
        <p className="mt-1 text-sm text-snow-300">
          As per the MNRE guidelines, the scheme is implemented till{' '}
          {SURYA_GHAR.deadlineLabel}. No extension has been officially notified
          as of October 2026. Always confirm the latest date on
          pmsuryaghar.gov.in.
        </p>
      </div>
    </div>
  );
}

interface SuryaGharSectionProps {
  /** compact = home/pricing band; full = dedicated page with eligibility and steps */
  variant?: 'compact' | 'full';
  className?: string;
}

/** Prominent PM Surya Ghar: Muft Bijli Yojana section. All figures are from official sources. */
export function SuryaGharSection({
  variant = 'compact',
  className,
}: SuryaGharSectionProps) {
  const content = useSiteContent();
  const reduce = useReducedMotion();
  const skip = useSkipEntrance();
  const full = variant === 'full';

  return (
    <section
      id="pm-surya-ghar"
      aria-labelledby="psg-title"
      className={cn(
        'section-y solar-grid-dark overflow-hidden bg-navy-800 text-snow-100',
        className,
      )}
    >
      <SolarParticles rays />
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-sun-400/10 blur-3xl"
        aria-hidden
      />
      <div className="container-site relative">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <motion.div
            initial={skip ? false : { opacity: 0, y: reduce ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="inline-flex items-center gap-2 rounded-chip border border-snow-50/25 bg-snow-50/10 px-3 py-1 text-sm font-semibold text-sun-300">
              <Landmark className="size-4" aria-hidden /> Government of India
              scheme
            </p>
            <h2
              id="psg-title"
              className="mt-4 text-3xl text-snow-50 md:text-[2.6rem]"
            >
              PM Surya Ghar:{' '}
              <span className="text-shine">Muft Bijli Yojana</span>
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-snow-300">
              Central subsidy of up to{' '}
              <strong className="text-snow-50">₹78,000</strong> on home roof
              solar. The scheme aims to give one crore households free
              electricity of{' '}
              <strong className="text-snow-50">{SURYA_GHAR.freeUnits}</strong>.
              We help you with the portal, paperwork, net metering and subsidy
              follow-up.
            </p>

            <SuryaGharDeadline className="mt-6" />

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <LinkButton
                href={SURYA_GHAR.portal}
                external
                variant="accent"
                size="lg"
                rightIcon={<ExternalLink className="size-4" />}
              >
                Apply on official portal
              </LinkButton>
              <LinkButton
                to={`/contact?service=${encodeURIComponent('Subsidy and net metering help')}`}
                variant="light"
                size="lg"
              >
                Get help applying
              </LinkButton>
              {content.whatsapp && (
                <LinkButton
                  href={whatsappHref(
                    content.whatsapp,
                    'Hi, I want help with the PM Surya Ghar subsidy.',
                  )}
                  external
                  variant="ghost"
                  size="lg"
                  leftIcon={<WhatsAppIcon className="size-5" />}
                  className="text-snow-50 hover:bg-navy-700 hover:text-snow-50"
                >
                  Ask on WhatsApp
                </LinkButton>
              )}
            </div>
            {!full && (
              <LinkButton
                to="/pm-surya-ghar"
                variant="ghost"
                className="mt-3 px-0 text-sun-300 hover:bg-transparent hover:text-sun-400"
              >
                Eligibility, steps &amp; official links →
              </LinkButton>
            )}
          </motion.div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-card border border-navy-600 bg-navy-900/60">
              <table className="w-full text-left">
                <caption className="border-b border-navy-600 px-5 py-3 text-left text-sm font-semibold text-snow-50">
                  Subsidy for homes in Chhattisgarh
                </caption>
                <thead className="text-xs uppercase tracking-wide text-snow-300">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold sm:px-5">
                      Size
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold sm:px-5">
                      Central
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold sm:px-5">
                      State (CG)
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold sm:px-5">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subsidySlabs.map(([size, central, state, total], i) => (
                    <motion.tr
                      key={size}
                      className="border-t border-navy-600"
                      initial={
                        skip ? false : { opacity: 0, x: reduce ? 0 : 16 }
                      }
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.12 }}
                    >
                      <td className="px-3 py-3.5 text-sm sm:px-5">{size}</td>
                      <td className="px-3 py-3.5 tabular-nums sm:px-5">{central}</td>
                      <td className="px-3 py-3.5 tabular-nums sm:px-5">{state}</td>
                      <td className="px-3 py-3.5 font-display text-lg text-snow-50 tabular-nums sm:px-5">
                        {total}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-navy-600 px-5 py-3 text-xs leading-relaxed text-snow-300">
                ₹30,000/kW for the first 2 kW + ₹18,000 for the 3rd kW; no extra
                subsidy above 3 kW. Special category states get ₹33,000 and
                ₹19,800/kW. Housing societies (GHS/RWA): ₹18,000/kW for common
                facilities, up to 500 kW. Chhattisgarh adds ₹15,000 (1 kW) or
                ₹30,000 (2 kW and above) per household. Sources: MNRE
                guidelines, Govt. of Chhattisgarh.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-card border border-navy-600 bg-navy-900/60 p-4">
                <dt className="text-snow-300">National helpline</dt>
                <dd className="mt-1">
                  <a
                    href={`tel:${SURYA_GHAR.helpline}`}
                    className="inline-flex items-center gap-1.5 font-display text-xl text-snow-50 hover:text-sun-300"
                  >
                    <Phone className="size-4" aria-hidden />
                    {SURYA_GHAR.helpline}
                  </a>
                </dd>
              </div>
              <div className="rounded-card border border-navy-600 bg-navy-900/60 p-4">
                <dt className="text-snow-300">Solar loan</dt>
                <dd className="mt-1 text-snow-50">
                  Collateral-free loans of around 7% for systems up to 3 kW
                  (rate stated at launch)
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {full && (
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            <div className="rounded-card border border-navy-600 bg-navy-900/60 p-6">
              <h3 className="font-sans text-lg font-semibold text-snow-50">
                Who is eligible
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-snow-200">
                {eligibility.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-sun-400"
                      aria-hidden
                    />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card border border-navy-600 bg-navy-900/60 p-6">
              <h3 className="font-sans text-lg font-semibold text-snow-50">
                How to apply
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-snow-200">
                {applySteps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sun-400 text-xs font-bold text-navy-900">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-card border border-navy-600 bg-navy-900/60 p-6">
              <h3 className="font-sans text-lg font-semibold text-snow-50">
                Official links
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {officialLinks.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-2 text-snow-100 underline decoration-navy-500 underline-offset-4 hover:text-sun-300"
                    >
                      <ExternalLink
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {l.label}
                    </a>
                  </li>
                ))}
                <li className="pt-1 text-snow-300">
                  Helpline:{' '}
                  <a
                    href={`tel:${SURYA_GHAR.helpline}`}
                    className="font-semibold text-snow-50"
                  >
                    {SURYA_GHAR.helpline}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        )}

        <p className="mt-8 flex gap-2 text-xs text-snow-300/90">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          Baba Solars is a private installer, not a government body. Subsidy
          amounts, eligibility and dates are set by MNRE and can change; the
          official portal is the final word.
        </p>
      </div>
    </section>
  );
}
