import { useMemo, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import type {
  AreaCard,
  Highlight,
  LinkCard,
  SiteContent,
  Stat,
  TextItem,
  TimelineItem,
} from '@/types';
import { useSiteContent, useUpdateContent } from '@/queries';
import { useToast } from '@/context/ToastContext';
import { useSeo } from '@/hooks/useSeo';
import { ApiError } from '@/services/api';
import { createId } from '@/lib/id';
import { hasErrors, validateContent } from '@/lib/schemas';
import { ICON_OPTIONS, LinkButton } from '@/components/ui';
import { SmartImage } from '@/components/common/SmartImage';
import { AdminPageHeader } from '../components/AdminUI';
import {
  DraftInput,
  DraftItemList,
  DraftStringList,
  DraftTextarea,
  DraftToggle,
  EditorSection,
  SaveBar,
} from '../components/DraftFields';
import { DataPublishing } from '../components/DataPublishing';
import { useDraft } from '../hooks/useDraft';
import { errorMessage } from '../hooks/useCrud';

/** Pricing page text (Admin → Pricing), brand/SEO/calculator (Admin → Settings) and offers (Admin → Offers) have their own editors. */
type EditableContent = Omit<
  SiteContent,
  'pricingPage' | 'brand' | 'seo' | 'calculator' | 'offers' | 'updatedAt'
>;

const SECTIONS = [
  { id: 'contact', label: 'Business & contact' },
  { id: 'home', label: 'Home page' },
  { id: 'services-page', label: 'Services page' },
  { id: 'about', label: 'About page' },
  { id: 'cta', label: 'Call-to-action' },
  { id: 'media', label: 'Offer, brands & video' },
  { id: 'data', label: 'Backup & restore' },
];

const thumb = (src: string) => (
  <SmartImage
    src={src}
    alt=""
    className="aspect-[4/3] w-full rounded-field border border-line"
  />
);
const textItem = (): TextItem => ({
  id: createId('item'),
  title: '',
  text: '',
});

export default function ContentPage() {
  const content = useSiteContent();
  const update = useUpdateContent();
  const toast = useToast();
  useSeo({ title: 'Site content', path: '/admin/content', noIndex: true });
  const [params, setParams] = useSearchParams();
  const tab = SECTIONS.some((x) => x.id === params.get('tab')) ? params.get('tab')! : SECTIONS[0].id;
  const setTab = (id: string) => setParams({ tab: id }, { replace: true });

  const editable = useMemo<EditableContent>(() => {
    const {
      pricingPage: _pricing,
      brand: _b,
      seo: _s,
      calculator: _c,
      offers: _o,
      updatedAt: _u,
      ...rest
    } = content;
    return rest;
  }, [content]);
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } =
    useDraft<EditableContent>(editable);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateContent({ ...content, ...draft });
    delete errs['pricingPage'];
    for (const k of Object.keys(errs))
      if (k.startsWith('pricingPage.')) delete errs[k];
    form.setErrors(errs);
    if (hasErrors(errs)) {
      toast({
        tone: 'error',
        title: 'Fix the highlighted fields',
        description: Object.values(errs)[0],
      });
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        const section = el?.closest('section[id]')?.id;
        if (section && section !== tab) setTab(section);
        window.setTimeout(() => el?.focus(), 30);
      }, 30);
      return;
    }
    try {
      const saved = await update.mutateAsync(draft);
      const {
        pricingPage: _p,
        brand: _b,
        seo: _s,
        calculator: _c,
        offers: _o,
        updatedAt: _u,
        ...rest
      } = saved;
      markSaved(rest);
      toast({
        title: 'Content saved',
        description: 'The website now shows your changes.',
      });
    } catch (err) {
      if (err instanceof ApiError) form.setErrors(err.fieldErrors);
      toast({
        tone: 'error',
        title: 'Content not saved',
        description: errorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Site content"
        description="Texts, lists and contact details used across the website. Pricing page text is under Pricing."
        actions={
          <LinkButton
            href="/"
            external
            variant="secondary"
            leftIcon={<ExternalLink className="size-4" />}
          >
            View website
          </LinkButton>
        }
      />
      <div
        role="tablist"
        aria-label="Content sections"
        className="sticky top-14 z-20 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line bg-snow-100/95 px-4 backdrop-blur lg:top-0 md:-mx-8 md:px-8"
      >
        {SECTIONS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${tab === x.id ? 'border-sun-500 text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="grid gap-6">
        <EditorSection
          id="contact"
          hidden={tab !== 'contact'}
          title="Business & contact details"
          description="Shown in the header, footer, contact page and buttons."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="businessName"
              label="Business name"
              required
            />
            <DraftInput form={form} path="tagline" label="Tagline" />
            <DraftInput
              form={form}
              path="phone"
              label="Phone"
              type="tel"
              required
            />
            <DraftInput
              form={form}
              path="whatsapp"
              label="WhatsApp number (optional)"
              hint="Enter only after confirming this number is WhatsApp-enabled. Leave blank to hide WhatsApp links."
            />
            <DraftInput
              form={form}
              path="email"
              label="Email"
              type="email"
              required
            />
            <DraftInput form={form} path="hours" label="Opening hours" />
            <DraftTextarea
              form={form}
              path="address"
              label="Address"
              rows={2}
              className="sm:col-span-2"
            />
            <DraftInput
              form={form}
              path="mapUrl"
              label="Google Maps link (optional)"
              trim
              className="sm:col-span-2"
            />
            <DraftInput
              form={form}
              path="social.facebook"
              label="Facebook page"
              trim
            />
            <DraftInput
              form={form}
              path="social.instagram"
              label="Instagram"
              trim
            />
            <DraftInput
              form={form}
              path="social.youtube"
              label="YouTube channel"
              trim
            />
            <DraftInput
              form={form}
              path="social.linkedin"
              label="LinkedIn"
              trim
            />
          </div>
          <p className="text-sm text-muted">
            Logo, favicon and SEO titles are under{' '}
            <a
              href="/admin/settings?tab=brand"
              className="font-semibold underline underline-offset-2"
            >
              Settings → Logo &amp; SEO
            </a>
            .
          </p>
          <DraftStringList
            form={form}
            path="serviceAreas"
            label="Service areas"
            noun="area"
            max={30}
            hint="Shown in the footer and About page."
          />
        </EditorSection>

        <EditorSection
          id="home"
          hidden={tab !== 'home'}
          title="Home page"
          description="Every section of the home page, top to bottom. Banner slides and gallery photos have their own screens."
        >
          <DraftInput
            form={form}
            path="home.sixMonthTitle"
            label="“6 months free” section: heading"
            required
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.sixMonthKicker"
              label="Small line above heading"
            />
            <DraftInput
              form={form}
              path="home.sixMonthButton"
              label="Button (to gallery)"
              hint="Empty hides the button."
            />
          </div>
          <DraftTextarea
            form={form}
            path="home.sixMonthIntro"
            label="Intro"
            rows={2}
          />

          <hr className="border-line" />
          <DraftInput
            form={form}
            path="home.trustKicker"
            label="Trust section: small line"
          />
          <DraftInput
            form={form}
            path="heroTitle"
            label="Trust section: heading"
            required
          />
          <DraftTextarea
            form={form}
            path="heroSubtitle"
            label="Trust section: text"
            rows={2}
          />
          <DraftItemList<EditableContent, Stat & { id?: string }>
            form={form}
            path="stats"
            label="Stats (About page)"
            noun="stat"
            max={6}
            fields={[
              { key: 'value', label: 'Value', placeholder: '500+' },
              {
                key: 'label',
                label: 'Label',
                placeholder: 'roofs installed',
              },
            ]}
            create={() => ({ value: '', label: '' })}
          />
          <DraftItemList<EditableContent, Highlight & { id?: string }>
            form={form}
            path="highlights"
            label="Highlight tiles"
            noun="tile"
            max={12}
            fields={[
              { key: 'title', label: 'Title' },
              { key: 'text', label: 'Text' },
              {
                key: 'icon',
                label: 'Icon',
                kind: 'select',
                options: ICON_OPTIONS,
              },
            ]}
            create={() => ({ icon: 'sun', title: '', text: '' })}
          />

          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.solutionsKicker"
              label="Solutions: small line"
            />
            <DraftInput
              form={form}
              path="home.solutionsTitle"
              label="Solutions: heading"
            />
            <DraftInput
              form={form}
              path="home.solutionsIntro"
              label="Solutions: intro"
            />
            <DraftInput
              form={form}
              path="home.solutionsLinkLabel"
              label="Card link text"
              hint="Also used on service-area cards."
            />
          </div>
          <DraftItemList<EditableContent, LinkCard>
            form={form}
            path="home.solutions"
            label="Solution cards"
            noun="card"
            max={6}
            renderAside={(c) => thumb(c.image)}
            fields={[
              { key: 'title', label: 'Title' },
              {
                key: 'link',
                label: 'Link',
                kind: 'link',
                placeholder: '/services',
              },
              { key: 'text', label: 'Text', kind: 'textarea' },
              { key: 'image', label: 'Image URL', kind: 'image', span: 2 },
            ]}
            create={() => ({
              id: createId('sol'),
              title: '',
              text: '',
              image: '',
              link: '/services',
            })}
          />

          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.maintenanceKicker"
              label="Maintenance: small line"
            />
            <DraftInput
              form={form}
              path="home.maintenanceTitle"
              label="Maintenance: heading"
            />
          </div>
          <DraftTextarea
            form={form}
            path="home.maintenanceText"
            label="Maintenance: text"
            rows={2}
          />
          <DraftStringList
            form={form}
            path="home.maintenancePoints"
            label="Maintenance: tick list"
            noun="point"
            max={10}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.maintenancePrimaryLabel"
              label="Main button label"
            />
            <DraftInput
              form={form}
              path="home.maintenancePrimaryLink"
              label="Main button link"
              trim
            />
            <DraftInput
              form={form}
              path="home.maintenanceSecondaryLabel"
              label="Second button label"
            />
            <DraftInput
              form={form}
              path="home.maintenanceSecondaryLink"
              label="Second button link"
              trim
            />
          </div>

          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.missionKicker"
              label="Mission: small line"
            />
            <DraftInput
              form={form}
              path="home.missionButton"
              label="Mission: button"
              hint="Links to About. Empty hides it."
            />
          </div>
          <DraftInput
            form={form}
            path="home.missionTitle"
            label="Mission: heading"
          />
          <DraftTextarea
            form={form}
            path="home.missionText"
            label="Mission: text"
            rows={3}
          />

          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.whyKicker"
              label="Why us: small line"
            />
            <DraftInput
              form={form}
              path="home.whyTitle"
              label="Why us: heading"
            />
          </div>
          <DraftItemList<EditableContent, TextItem>
            form={form}
            path="home.whyUs"
            label="Why us: numbered reasons"
            noun="reason"
            max={6}
            fields={[
              { key: 'title', label: 'Title', span: 2 },
              { key: 'text', label: 'Text', kind: 'textarea' },
            ]}
            create={textItem}
          />

          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.calculatorKicker"
              label="Calculator: small line"
            />
            <DraftInput
              form={form}
              path="home.calculatorTitle"
              label="Calculator: heading"
            />
          </div>
          <DraftTextarea
            form={form}
            path="home.calculatorIntro"
            label="Calculator: intro"
            rows={2}
          />

          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="home.areasKicker"
              label="Service areas: small line"
            />
            <DraftInput
              form={form}
              path="home.areasTitle"
              label="Service areas: heading"
            />
          </div>
          <DraftItemList<EditableContent, AreaCard>
            form={form}
            path="home.areas"
            label="Service-area cards"
            noun="area"
            max={8}
            renderAside={(a) => thumb(a.image)}
            fields={[
              { key: 'name', label: 'Name' },
              { key: 'text', label: 'Text' },
              { key: 'image', label: 'Image URL', kind: 'image', span: 2 },
            ]}
            create={() => ({
              id: createId('area'),
              name: '',
              text: '',
              image: '',
            })}
          />

          <hr className="border-line" />
          <DraftItemList<EditableContent, TextItem>
            form={form}
            path="home.benefits"
            label="Benefits (next to the video)"
            noun="benefit"
            max={4}
            fields={[
              { key: 'title', label: 'Title', span: 2 },
              { key: 'text', label: 'Text', kind: 'textarea' },
            ]}
            create={textItem}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftTextarea
              form={form}
              path="home.videoText"
              label="Text when a video is set"
              rows={2}
            />
            <DraftTextarea
              form={form}
              path="home.photoText"
              label="Text when there is no video"
              rows={2}
            />
            <DraftInput
              form={form}
              path="home.partnersTitle"
              label="Brands strip heading"
            />
            <DraftInput
              form={form}
              path="home.testimonialsTitle"
              label="Testimonials heading"
            />
          </div>
        </EditorSection>

        <EditorSection
          id="services-page"
          hidden={tab !== 'services-page'}
          title="Services page"
          description="The service cards themselves are edited under Services."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="servicesPage.heroTitle"
              label="Page title"
            />
            <DraftInput
              form={form}
              path="servicesPage.heroIntro"
              label="Intro"
            />
            {(['installation', 'maintenance', 'support'] as const).map((g) => (
              <div
                key={g}
                className="grid gap-3 rounded-card border border-line bg-snow-100/60 p-4 sm:col-span-2 sm:grid-cols-[14rem_1fr]"
              >
                <DraftInput
                  form={form}
                  path={`servicesPage.groups.${g}.title`}
                  label={`${g[0].toUpperCase() + g.slice(1)} group: heading`}
                />
                <DraftInput
                  form={form}
                  path={`servicesPage.groups.${g}.intro`}
                  label="Intro"
                />
              </div>
            ))}
            <DraftInput
              form={form}
              path="servicesPage.dustTitle"
              label="Dust box: heading"
            />
            <DraftInput
              form={form}
              path="servicesPage.dustButton"
              label="Dust box: button"
            />
          </div>
          <DraftTextarea
            form={form}
            path="servicesPage.dustText"
            label="Dust box: text"
            rows={2}
          />
          <DraftItemList<EditableContent, Stat & { id?: string }>
            form={form}
            path="servicesPage.dustStats"
            label="Dust box: figures"
            noun="figure"
            max={4}
            fields={[
              { key: 'value', label: 'Value' },
              { key: 'label', label: 'Label' },
            ]}
            create={() => ({ value: '', label: '' })}
          />
        </EditorSection>

        <EditorSection
          id="about"
          hidden={tab !== 'about'}
          title="About page"
          description={
            <>
              Use{' '}
              <code className="rounded bg-snow-200 px-1">
                {'{businessName}'}
              </code>{' '}
              to insert the business name.
            </>
          }
        >
          <DraftInput form={form} path="about.heroTitle" label="Page title" />
          <DraftTextarea
            form={form}
            path="about.heroIntro"
            label="Intro"
            rows={2}
          />
          <DraftInput
            form={form}
            path="about.storyTitle"
            label="Story heading"
          />
          <DraftStringList
            form={form}
            path="about.story"
            label="Story paragraphs"
            noun="paragraph"
            max={6}
            multiline
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="about.missionTitle"
              label="Mission box: heading"
            />
            <DraftInput
              form={form}
              path="about.principlesTitle"
              label="Principles: heading"
            />
          </div>
          <DraftTextarea
            form={form}
            path="about.missionText"
            label="Mission box: text"
            rows={2}
          />
          <DraftInput
            form={form}
            path="about.principlesIntro"
            label="Principles: intro"
          />
          <DraftItemList<EditableContent, TextItem>
            form={form}
            path="about.principles"
            label="Principles"
            noun="principle"
            max={8}
            fields={[
              { key: 'title', label: 'Title', span: 2 },
              { key: 'text', label: 'Text', kind: 'textarea' },
            ]}
            create={textItem}
          />
          <DraftInput
            form={form}
            path="about.timelineTitle"
            label="Timeline heading"
          />
          <DraftItemList<EditableContent, TimelineItem>
            form={form}
            path="about.timeline"
            label="Timeline"
            noun="milestone"
            max={15}
            fields={[
              { key: 'year', label: 'Year' },
              { key: 'text', label: 'What happened' },
            ]}
            create={() => ({ id: createId('tl'), year: '', text: '' })}
          />
          <DraftInput
            form={form}
            path="about.ctaTitle"
            label="Bottom call-to-action title"
          />
        </EditorSection>

        <EditorSection
          id="cta"
          hidden={tab !== 'cta'}
          title="Call-to-action band"
          description="The dark box at the bottom of most pages. Some pages set their own title."
        >
          <DraftInput
            form={form}
            path="cta.title"
            label="Default title"
            required
          />
          <DraftTextarea form={form} path="cta.text" label="Text" rows={2} />
          <div className="grid gap-5 sm:grid-cols-3">
            <DraftInput
              form={form}
              path="cta.primaryLabel"
              label="Main button label"
              required
            />
            <DraftInput
              form={form}
              path="cta.primaryLink"
              label="Main button link"
              trim
            />
            <DraftInput
              form={form}
              path="cta.whatsappLabel"
              label="WhatsApp button label"
            />
          </div>
        </EditorSection>

        <EditorSection id="media" hidden={tab !== 'media'} title="Offer, brands & video">
          <DraftToggle
            form={form}
            path="announcementEnabled"
            label="Show offer in the top bar"
            hint="Shown in the rotating bar above the menu on every page."
          />
          <DraftInput
            form={form}
            path="announcement"
            label="Announcement text"
            disabled={!draft.announcementEnabled}
          />
          <DraftStringList
            form={form}
            path="partners"
            label="Brands we install"
            noun="brand"
            max={30}
            hint="Scrolling brand strip. Empty list hides it."
          />
          <DraftInput
            form={form}
            path="videoUrl"
            label="Installation video (YouTube link)"
            placeholder="https://www.youtube.com/watch?v=…"
            trim
            hint="Leave empty to show a photo with a link to the gallery."
          />
        </EditorSection>

        <SaveBar
          dirty={dirty}
          saving={update.isPending}
          remoteChanged={remoteChanged}
          errorCount={Object.keys(form.errors).length}
          onDiscard={discard}
          onLoadLatest={loadLatest}
        />
      </form>

      {tab === 'data' && <DataPublishing />}
    </>
  );
}
