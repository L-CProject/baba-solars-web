import {
  DEFAULT_BRAND,
  DEFAULT_SEO,
  DEFAULT_CALCULATOR,
  DEFAULT_PLAN_TIERS,
} from './settings-defaults';
import type { SiteContent } from '@/types';
import { DEFAULT_OFFERS } from '@/lib/offers';
import { img } from './media';
import { COMPANY_CONTACT } from '@/config/company';

export const seedContent: SiteContent = {
  calculator: DEFAULT_CALCULATOR,
  plans: DEFAULT_PLAN_TIERS,
  seo: DEFAULT_SEO,
  brand: DEFAULT_BRAND,
  offers: DEFAULT_OFFERS,
  businessName: 'Baba Solars',
  tagline: 'Accelerating the clean energy transition',
  heroTitle: 'Empowering Homes & Businesses with Clean Energy',
  heroSubtitle:
    'Expert roof solar installation for residential, commercial and industrial properties in Chhattisgarh.',
  phone: COMPANY_CONTACT.phone,
  whatsapp: COMPANY_CONTACT.whatsapp,
  email: COMPANY_CONTACT.email,
  address: COMPANY_CONTACT.address,
  hours: COMPANY_CONTACT.hours,
  announcement:
    'New: Drone solar panel cleaning · 6 months free care on every new installation',
  announcementEnabled: true,
  stats: [
    { value: '500+', label: 'roofs installed' },
    { value: '2.4 MW', label: 'capacity commissioned' },
    { value: '25 yrs', label: 'panel performance warranty' },
    { value: '48 hr', label: 'typical repair response' },
  ],
  serviceAreas: [
    'Raipur',
    'Nava Raipur',
    'Durg',
    'Bhilai',
    'Dhamtari',
    'Mahasamund',
    'Rajnandgaon',
    'Bilaspur',
  ],
  highlights: [
    { icon: 'award', title: '500+', text: 'Successful solar installations' },
    {
      icon: 'building',
      title: 'Residential & Commercial',
      text: 'Custom systems for homes and offices',
    },
    { icon: 'shield', title: '25 Years', text: 'Panel performance warranty' },
    {
      icon: 'leaf',
      title: '100% Eco-conscious',
      text: 'Single-use plastic free installs',
    },
    {
      icon: 'users',
      title: 'Expert Engineers',
      text: 'Safe installation and wiring',
    },
    {
      icon: 'headset',
      title: 'After-Sales Support',
      text: 'Regular maintenance and cleaning',
    },
    {
      icon: 'drone',
      title: 'Drone Cleaning',
      text: 'For large and hard-to-reach arrays',
    },
    {
      icon: 'calendar',
      title: '6 Months Free',
      text: 'Cleaning and care after installation',
    },
  ],
  partners: [
    'Waaree',
    'Adani Solar',
    'Tata Power Solar',
    'Vikram Solar',
    'Luminous',
    'Growatt',
    'Havells',
    'Polycab',
  ],
  videoUrl: '',
  social: { facebook: '', instagram: '', youtube: '' },

  // ─── Home page sections (previously hard-coded in HomePage.tsx) ───
  home: {
    sixMonthKicker: 'Included with every new installation',
    sixMonthTitle: "6 Months' Free Cleaning Service",
    sixMonthIntro:
      'Every new installation includes free panel cleaning for six months. Here is our team at work on recent roofs.',
    sixMonthButton: 'View all images',
    trustKicker: 'Why families and businesses trust us',
    solutionsKicker: 'Our Solar Solutions',
    solutionsTitle: 'Solar Plants: powering the future with renewables',
    solutionsIntro: 'Reliable solar installations for every property type.',
    solutionsLinkLabel: 'More details',
    solutions: [
      {
        id: 'sol-res',
        title: 'Residential Solar (Home)',
        text: 'Customised roof systems for independent houses and apartments that cut electricity bills.',
        image: img('houseWithSolar', 1000),
        link: '/services#residential-installation',
      },
      {
        id: 'sol-com',
        title: 'Commercial Solar (Office & Shops)',
        text: 'High-efficiency systems designed for offices, showrooms, clinics and retail businesses.',
        image: img('commercialRoofIndia', 1000),
        link: '/services#commercial-installation',
      },
      {
        id: 'sol-ind',
        title: 'Industrial Solar Plants',
        text: 'Large-capacity installations for factories, warehouses, mills and manufacturing units.',
        image: img('aerialRows', 1000),
        link: '/projects',
      },
    ],
    maintenanceKicker: 'After-sales care',
    maintenanceTitle: 'Maintenance & Cleaning',
    maintenanceText:
      'Regular panel cleaning, performance checks and prompt after-sales support, for systems installed by us or any other company.',
    maintenancePoints: [
      'Drone cleaning for large arrays (new)',
      'Soft-brush wash with low-TDS water',
      'Inverter and wiring health check',
      'Thermal hot-spot inspection',
      'Repair visit within 48 hours on AMC',
      '6 months free care on new installs',
    ],
    maintenancePrimaryLabel: 'Book a cleaning',
    maintenancePrimaryLink: '/contact?service=Panel%20cleaning',
    maintenanceSecondaryLabel: 'See AMC plans',
    maintenanceSecondaryLink: '/pricing#maintenance',
    missionKicker: 'Our Mission',
    missionTitle: 'Clean, affordable power for everyone in Chhattisgarh',
    missionText:
      'To empower homes, offices and businesses across Chhattisgarh with reliable, high-quality and affordable roof solar solutions, making clean and green energy accessible to everyone.',
    missionButton: 'About Baba Solars',
    whyKicker: 'Why Choose Us',
    whyTitle: 'From site survey to net metering, we handle everything',
    whyUs: [
      {
        id: 'why-1',
        title: 'High-Efficiency Panels',
        text: 'Tier-1 mono PERC and TOPCon panels with branded inverters, chosen for maximum generation in Chhattisgarh sun.',
      },
      {
        id: 'why-2',
        title: 'End-to-End Solutions',
        text: 'From site survey to installation, net metering and subsidy, we handle everything with one point of contact.',
      },
      {
        id: 'why-3',
        title: 'Expert Installation',
        text: 'Trained engineers, proper earthing and lightning protection, and tidy wiring that lasts for decades.',
      },
    ],
    calculatorKicker: 'Reliable & Cost-Effective',
    calculatorTitle: 'Reduce your monthly electricity bill by up to 90%',
    calculatorIntro:
      'Move the slider to your average bill to see a system size, estimated price, subsidy and payback.',
    areasKicker: 'Our Service Areas',
    areasTitle: 'Expert solar installation across Chhattisgarh',
    areas: [
      {
        id: 'area-raipur',
        name: 'Raipur & Nava Raipur',
        text: 'Head office in Deopuri. Surveys within 24 hours.',
        image: img('monoPanels', 900),
      },
      {
        id: 'area-dhamtari',
        name: 'Dhamtari',
        text: 'Homes, rice mills and agri-processing units.',
        image: img('groundMounted', 900),
      },
      {
        id: 'area-durg',
        name: 'Durg & Bhilai',
        text: 'Residential societies, shops and industry.',
        image: img('roofRows', 900),
      },
      {
        id: 'area-other',
        name: 'Other Districts',
        text: 'Mahasamund, Rajnandgaon, Bilaspur and more on request.',
        image: img('panelBlueSky', 900),
      },
    ],
    partnersTitle: 'Brands we install',
    benefits: [
      {
        id: 'ben-1',
        title: 'Solar Energy Benefits',
        text: 'Switch to clean, renewable power, bring your monthly bill close to zero, and protect yourself against rising tariffs.',
      },
      {
        id: 'ben-2',
        title: 'Professional Installation',
        text: 'Our team ensures safe roof mounting, clean wiring and a seamless grid connection for your home or office.',
      },
    ],
    videoText:
      'Watch our recent roof installation and see how we help homes and businesses switch to clean energy smoothly.',
    photoText:
      'See photos of recent roof installations and how we help homes and businesses switch to clean energy.',
    testimonialsKicker: 'Testimonials',
    testimonialsTitle: 'What our customers say',
  },

  // ─── Pricing page text (previously hard-coded in PricingPage.tsx / PricingCard.tsx / ReferencePlans.tsx) ───
  pricingPage: {
    heroTitle: 'Solar Pricing Plans',
    heroIntro:
      'Estimated prices for Raipur, including GST, installation and net-meter paperwork. Your exact price comes after a free survey.',
    capacityKicker: 'Solar plans by capacity',
    capacityTitle: 'Home, commercial and industrial plans',
    capacityIntro:
      'Generation, roof area and savings for each size. Prices depend on your roof and equipment, so we confirm them after a free site survey.',
    rangesKicker: 'Estimated prices',
    rangesTitle: 'Price ranges and care plans',
    tabsLabel: 'Show plans for',
    tabs: {
      residential: {
        label: 'Home systems',
        note: 'Subsidy is credited to your bank account after commissioning.',
      },
      commercial: {
        label: 'Business',
        note: 'Commercial connections are not eligible for the residential subsidy.',
      },
      maintenance: {
        label: 'Cleaning & AMC',
        note: 'For systems installed by any company.',
      },
    },
    featuredBadge: 'Most chosen',
    freeBadge: 'Included free',
    freePriceLabel: 'FREE',
    ctaLabel: 'Get an exact quote',
    emptyTitle: 'No plans listed here yet',
    emptyMessage:
      'We still offer this. Tell us what you need and we will send a quote.',
    disclaimerTitle: 'About these prices',
    disclaimerText:
      'All prices are estimates for a standard RCC roof in Raipur, including GST, and may change with panel and inverter brand, structure height, cable length, roof type and site conditions. Subsidy amounts follow PM Surya Ghar Muft Bijli Yojana for residential connections, are paid by the government directly to your bank account, and depend on eligibility and current government rules. You get a written, itemised quote after a free site survey.',
    calculatorTitle: 'Work out a size and price for your bill',
    faqTitle: 'Pricing and subsidy questions',
    ctaBandTitle: 'Get an exact, itemised quote',
  },

  // ─── Services page text (previously hard-coded in ServicesPage.tsx) ───
  servicesPage: {
    heroTitle: 'Our Services',
    heroIntro:
      'From the first survey to the twentieth cleaning. One team, one phone number.',
    groups: {
      installation: {
        title: 'Solar installation',
        intro:
          'New systems for homes, businesses and farms, sized to your bills and roof.',
      },
      maintenance: {
        title: 'Cleaning, maintenance and inspection',
        intro: 'Keep generation high. Works for systems from any installer.',
      },
      support: {
        title: 'Repair and paperwork',
        intro:
          'Fix faults, claim warranties and get your subsidy and net meter sorted.',
      },
    },
    dustTitle: 'Dirty panels quietly cost you money',
    dustText:
      "Raipur's dust, construction and bird droppings can cut output by 15–25% within a few weeks. On a 3 kW system that is roughly 60–90 units a month you pay for again.",
    dustButton: 'See cleaning and AMC prices',
    dustStats: [
      { value: '15–25%', label: 'output lost to dust' },
      { value: '2–4 weeks', label: 'cleaning interval in dry months' },
      { value: '₹499', label: 'single cleaning visit from' },
      { value: '48 hr', label: 'repair response on AMC Plus' },
    ],
  },

  // ─── About page (previously hard-coded in AboutPage.tsx) ───
  about: {
    heroTitle: 'A Raipur team that installs and looks after roof solar',
    heroIntro:
      '{businessName} began as a local electrical contractor. Today we design, install and maintain solar systems for families, shops, schools and factories across Chhattisgarh.',
    storyTitle: 'Why we do this',
    story: [
      'Raipur gets strong sun for most of the year, and electricity bills keep climbing. A well-built roof system pays for itself in four to six years and keeps working for twenty-five.',
      'But we kept seeing systems that were badly sized, shaded by water tanks, never cleaned, or abandoned by the installer after the first fault. So we built a company that does both: careful installation and long-term care.',
      'Our engineers and technicians are local, trained in electrical safety, and reachable on the same number for years.',
    ],
    missionTitle: 'Our mission',
    missionText:
      'Make clean, reliable solar power affordable for every home and business in Chhattisgarh, and keep it producing for its full life.',
    principlesTitle: 'How we work',
    principlesIntro: 'Four things we hold ourselves to on every job.',
    principles: [
      {
        id: 'pr-1',
        title: 'Size it honestly',
        text: 'We size systems to your bills and roof, not to the biggest number we can sell. If 2 kW is enough, we say so.',
      },
      {
        id: 'pr-2',
        title: 'Show every rupee',
        text: 'Quotes list panel and inverter brand, structure, cabling and labour separately, so you can compare.',
      },
      {
        id: 'pr-3',
        title: 'Build for 25 years',
        text: 'Hot-dip galvanised structures, proper earthing and lightning arresters, and cable routing that survives the monsoon.',
      },
      {
        id: 'pr-4',
        title: 'Stay after handover',
        text: 'Cleaning, inspection and repair are half our work. We service systems from any installer.',
      },
    ],
    timelineTitle: 'Ten years in Raipur',
    timeline: [
      {
        id: 'tl-2016',
        year: '2016',
        text: 'Started as an electrical contracting team in Deopuri, Raipur.',
      },
      {
        id: 'tl-2019',
        year: '2019',
        text: 'First roof solar installations for homes in Raipur.',
      },
      {
        id: 'tl-2022',
        year: '2022',
        text: 'Began commercial and industrial projects in Dhamtari and Durg.',
      },
      {
        id: 'tl-2024',
        year: '2024',
        text: 'Added a dedicated cleaning and maintenance crew.',
      },
      {
        id: 'tl-2026',
        year: '2026',
        text: 'Crossed 500 roofs and 2.4 MW installed.',
      },
    ],
    ctaTitle: 'Talk to an engineer, not a salesperson',
  },

  // ─── Call-to-action band shown at the bottom of most pages ───
  cta: {
    title: 'Find out what your roof can produce',
    text: 'A free site survey takes about 30 minutes. We check shading, structure and your bills, then give you a written quote.',
    primaryLabel: 'Book a free survey',
    primaryLink: '/contact',
    whatsappLabel: 'WhatsApp us',
  },
};
