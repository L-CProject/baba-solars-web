/** Static fallbacks. Business details, logo and SEO text are edited in the admin panel (stored in the database). */
export const SITE = {
  /** Canonical site URL: Admin → Settings → Logo & SEO → Website address, else VITE_SITE_URL, else this. */
  url: ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://babasolars.in').replace(/\/+$/, ''),
  defaultTitle: 'Baba Solars | Roof Solar, Drone Panel Cleaning & PM Surya Ghar Subsidy in Raipur',
  defaultDescription:
    'Baba Solars installs roof solar, offers drone solar panel cleaning, a 6-month care plan and PM Surya Ghar subsidy help for homes and businesses across Raipur and Chhattisgarh.',
  /** Prefix for per-browser conveniences in localStorage (never used for site data). */
  storagePrefix: 'baba-solars:v2:',
  subsidyPortal: 'https://pmsuryaghar.gov.in',
} as const

/**
 * PM Surya Ghar: Muft Bijli Yojana — official facts only.
 * Sources (checked Oct 2026):
 *  - MNRE "Guidelines for PM-Surya Ghar: Muft Bijli Yojana – CFA to Residential Consumers"
 *  - Cabinet approval, pmindia.gov.in (29 Feb 2024)
 *  - DoT allotment of short code 15555
 * Re-check before every launch; the government can change amounts or extend the date.
 */
export const SURYA_GHAR = {
  portal: 'https://pmsuryaghar.gov.in',
  guidelinesPdf: 'https://cdnbbsr.s3waas.gov.in/s303412aef4dcdee4f934f7bf599f89783/uploads/2026/10/202610011688339072.pdf',
  cabinetRelease: 'https://www.pmindia.gov.in/en/news_updates/cabinet-approves-pm-surya-ghar-muft-bijli-yojana/',
  mnre: 'https://mnre.gov.in',
  suryamitraTraining: 'https://suryaghar.nimiprojects.in/public/pm_surya_ghar/public/',
  helpline: '15555',
  /** Implementation period stated in the MNRE guidelines. No official extension notified as of Oct 2026. */
  deadlineLabel: '31 March 2027',
  deadlineIso: '2027-03-31',
  freeUnits: 'up to 300 units/month',
  /**
   * Photo shown in the top highlight bar for PM Surya Ghar. Empty = scheme icon in a tricolour ring.
   * NOTE: Under the Emblems and Names (Prevention of Improper Use) Act, 1950 (Schedule entry 9-A), the
   * pictorial representation of the Prime Minister cannot be used for trade/business without prior
   * permission of the Central Government. Add a photo only if the client has that permission.
   * Put the file in /public/images/ and set e.g. '/images/pm-surya-ghar.jpg'.
   */
  photo: '' as string,
  photoAlt: 'PM Surya Ghar Muft Bijli Yojana',
} as const

/** Same menu order as the client's original site (empty Blog/Careers/Ventures removed). */
export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/gallery', label: 'Images' },
  { to: '/services', label: 'Our Services' },
  { to: '/drone-cleaning', label: 'Drone Cleaning' },
  { to: '/projects', label: 'Power Plants' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/pm-surya-ghar', label: 'PM Surya Ghar' },
  { to: '/about', label: 'About Us' },
  { to: '/faqs', label: 'FAQs' },
  { to: '/contact', label: 'Contact Us' },
] as const
