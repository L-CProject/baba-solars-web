import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import type {
  BrandSettings,
  BusinessSettings,
  CalculatorSettings,
  SeoPageKey,
  SeoSettings,
} from '@/types';
import {
  useBusiness,
  useSiteContent,
  useUpdateBusiness,
  useUpdateContent,
} from '@/queries';
import { QUALITIES, QUALITY_LABEL, breakdownTotal } from '@/lib/pricing';
import { useSeo } from '@/hooks/useSeo';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/services/api';
import { GST_STATES, STATE_OPTIONS, stateName } from '@/lib/states';
import { calculateSolar } from '@/lib/calculator';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  Button,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from '@/components/ui';
import { AdminPageHeader } from '../components/AdminUI';
import {
  DraftInput,
  DraftStringList,
  DraftTextarea,
  DraftToggle,
  EditorSection,
  SaveBar,
} from '../components/DraftFields';
import { SubsidyRulesEditor } from '../components/SubsidyRulesEditor';
import { ImageUploadField } from '../components/ImageUploadField';
import { useDraft } from '../hooks/useDraft';
import { errorMessage } from '../hooks/useCrud';
import { TEMPLATES } from './BillingPage';

const TABS = [
  { id: 'business', label: 'Business & billing' },
  { id: 'brand', label: 'Logo & SEO' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'breakdown', label: 'Package breakdown' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function SettingsPage() {
  useSeo({ title: 'Settings', path: '/admin/settings', noIndex: true });
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ??
    'business') as Tab;
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Business details printed on quotations and invoices, logo and SEO, and the assumptions behind the solar calculator."
      />
      <div
        role="tablist"
        aria-label="Settings sections"
        className="mb-6 flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id })}
            className={cn(
              'whitespace-nowrap rounded-chip border px-4 py-2 text-sm font-semibold',
              tab === t.id
                ? 'border-navy-700 bg-navy-700 text-snow-50'
                : 'border-line bg-surface text-ink-soft hover:border-steel-400',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'business' && <BusinessTab readOnly={!can('business:write')} />}
      {tab === 'brand' && <BrandTab readOnly={!can('content:write')} />}
      {tab === 'calculator' && (
        <CalculatorTab readOnly={!can('content:write')} />
      )}
      {tab === 'breakdown' && (
        <BreakdownTab readOnly={!can('business:write')} />
      )}
    </>
  );
}

function useSaveHandler<T>(
  save: (v: T) => Promise<unknown>,
  onSaved: (v: T) => void,
  label: string,
) {
  const toast = useToast();
  return async (value: T, setErrors: (e: Record<string, string>) => void) => {
    try {
      await save(value);
      onSaved(value);
      toast({ title: `${label} saved`, description: 'Changes are live.' });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast({
        tone: 'error',
        title: `${label} not saved`,
        description: errorMessage(err),
      });
    }
  };
}

// ─── Business ────────────────────────────────────────────────────────────────
function BusinessTab({ readOnly }: { readOnly: boolean }) {
  const q = useBusiness();
  if (q.isPending)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  if (q.isError)
    return (
      <ErrorState
        message={errorMessage(q.error)}
        onRetry={() => void q.refetch()}
      />
    );
  return <BusinessForm saved={q.data} readOnly={readOnly} />;
}

function BusinessForm({
  saved,
  readOnly,
}: {
  saved: BusinessSettings;
  readOnly: boolean;
}) {
  const update = useUpdateBusiness();
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } =
    useDraft<BusinessSettings>(saved);
  const handle = useSaveHandler<BusinessSettings>(
    (v) => update.mutateAsync(v),
    markSaved,
    'Business details',
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!readOnly) void handle(draft, form.setErrors);
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <fieldset disabled={readOnly} className="grid gap-6">
        <EditorSection
          title="Business identity"
          description="Printed in the header of every quotation and invoice."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="legalName"
              label="Legal name"
              required
            />
            <DraftInput
              form={form}
              path="tradeName"
              label="Trade name (shown large)"
            />
            <DraftInput
              form={form}
              path="gstin"
              label="GSTIN"
              hint="Required to issue TAX INVOICES."
              maxLength={15}
            />
            <DraftInput form={form} path="pan" label="PAN" maxLength={10} />
            <DraftInput
              form={form}
              path="cin"
              label="CIN"
              maxLength={21}
              hint="Company identification number; confirm against incorporation records."
            />
            <DraftInput
              form={form}
              path="mnreRegistration"
              label="MNRE / vendor registration no."
              hint="Printed on quotations (optional)."
            />
            <DraftInput form={form} path="website" label="Website" />
            <DraftTextarea
              form={form}
              path="address"
              label="Address"
              rows={2}
              className="sm:col-span-2"
            />
            <DraftInput form={form} path="city" label="City" />
            <Select
              label="State"
              value={draft.stateCode}
              options={STATE_OPTIONS}
              error={form.errors.stateCode}
              onChange={(e) => {
                form.set('stateCode', e.target.value);
                form.set('state', stateName(e.target.value));
              }}
              hint="Decides CGST+SGST vs IGST."
            />
            <DraftInput form={form} path="pincode" label="PIN code" />
            <DraftInput form={form} path="phone" label="Phone" />
            <DraftInput form={form} path="email" label="Email" type="email" />
          </div>
          <ImageUploadField
            label="Logo for documents (PNG or JPG)"
            value={draft.logoUrl}
            onChange={(v) => form.set('logoUrl', v)}
            error={form.errors.logoUrl}
            preview
            previewClassName="aspect-[3/1] max-w-xs object-contain bg-white"
            hint="Empty = the website logo. Upload a PNG/JPG (PDFs cannot embed WebP)."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="signatoryName"
              label="Authorised signatory name"
            />
            <DraftInput
              form={form}
              path="signatoryTitle"
              label="Signatory title"
            />
          </div>
        </EditorSection>

        <EditorSection
          title="Bank details"
          description="Printed on quotations and invoices for payments."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DraftInput
              form={form}
              path="bank.accountName"
              label="Account name"
            />
            <DraftInput
              form={form}
              path="bank.accountNumber"
              label="Account number"
              inputMode="numeric"
            />
            <DraftInput
              form={form}
              path="bank.ifsc"
              label="IFSC"
              maxLength={11}
            />
            <DraftInput form={form} path="bank.bankName" label="Bank" />
            <DraftInput form={form} path="bank.branch" label="Branch" />
            <DraftInput form={form} path="bank.upiId" label="UPI ID" />
          </div>
        </EditorSection>

        <EditorSection
          title="Invoices"
          description="Numbers run per financial year: PREFIX/2026-27/0001."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <DraftInput
              form={form}
              path="invoice.prefix"
              label="Invoice number prefix"
            />
            <Select
              label="Default design"
              value={draft.invoice.defaultTemplate}
              onChange={(e) =>
                form.set('invoice.defaultTemplate', e.target.value)
              }
              options={TEMPLATES.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
            <Input
              label="Default payment period (days)"
              type="number"
              min={0}
              max={365}
              value={draft.invoice.defaultDueDays}
              onChange={(e) =>
                form.set('invoice.defaultDueDays', Number(e.target.value))
              }
              error={form.errors['invoice.defaultDueDays']}
            />
          </div>
          <DraftToggle
            form={form}
            path="invoice.roundOff"
            label="Round the grand total to the nearest rupee"
          />
          <DraftTextarea
            form={form}
            path="invoice.defaultNotes"
            label="Default notes"
            rows={2}
          />
          <DraftTextarea
            form={form}
            path="invoice.defaultTerms"
            label="Default terms"
            rows={4}
          />
        </EditorSection>

        <EditorSection title="Quotations">
          <div className="grid gap-5 sm:grid-cols-3">
            <DraftInput
              form={form}
              path="quotation.prefix"
              label="Quotation number prefix"
            />
            <Input
              label="Valid for (days)"
              type="number"
              min={1}
              max={365}
              value={draft.quotation.validityDays}
              onChange={(e) =>
                form.set('quotation.validityDays', Number(e.target.value))
              }
              error={form.errors['quotation.validityDays']}
            />
            <div className="flex items-end">
              <DraftToggle
                form={form}
                path="quotation.showSubsidy"
                label="Show PM Surya Ghar subsidy box"
              />
            </div>
          </div>
          <DraftTextarea
            form={form}
            path="quotation.defaultPaymentTerms"
            label="Default payment terms (one per line)"
            rows={3}
          />
          <DraftTextarea
            form={form}
            path="quotation.defaultTerms"
            label="Default terms & conditions (one per line)"
            rows={6}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <DraftStringList
              form={form}
              path="quotation.inclusions"
              label="Scope: included"
              noun="item"
              max={20}
            />
            <DraftStringList
              form={form}
              path="quotation.exclusions"
              label="Scope: not included"
              noun="item"
              max={20}
            />
          </div>
        </EditorSection>
      </fieldset>
      {readOnly ? (
        <p className="text-sm text-muted">
          Only admins can change business settings.
        </p>
      ) : (
        <SaveBar
          dirty={dirty}
          saving={update.isPending}
          remoteChanged={remoteChanged}
          errorCount={Object.keys(form.errors).length}
          onDiscard={discard}
          onLoadLatest={loadLatest}
        />
      )}
    </form>
  );
}

// ─── Brand & SEO ─────────────────────────────────────────────────────────────
const SEO_PAGES: Array<{ key: SeoPageKey; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About' },
  { key: 'services', label: 'Services' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'calculator', label: 'Calculator' },
  { key: 'projects', label: 'Power plants' },
  { key: 'gallery', label: 'Images' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'contact', label: 'Contact' },
  { key: 'droneCleaning', label: 'Drone cleaning' },
  { key: 'suryaGhar', label: 'PM Surya Ghar' },
];

function BrandTab({ readOnly }: { readOnly: boolean }) {
  const content = useSiteContent();
  const update = useUpdateContent();
  const saved = useMemo(
    () => ({ brand: content.brand, seo: content.seo }),
    [content.brand, content.seo],
  );
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } =
    useDraft<{ brand: BrandSettings; seo: SeoSettings }>(saved);
  const handle = useSaveHandler<typeof draft>(
    (v) => update.mutateAsync(v),
    markSaved,
    'Logo & SEO',
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!readOnly) void handle(draft, form.setErrors);
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <fieldset disabled={readOnly} className="grid gap-6">
        <EditorSection
          title="Logo & icon"
          description="Shown in the website header, footer and loading screen. Empty = the built-in Baba Solars logo."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <ImageUploadField
              label="Full logo (header)"
              value={draft.brand.logoUrl}
              onChange={(v) => form.set('brand.logoUrl', v)}
              error={form.errors['brand.logoUrl']}
              preview
              previewClassName="aspect-[3/1] object-contain bg-white"
            />
            <ImageUploadField
              label="Square icon (footer, loader)"
              value={draft.brand.logoMarkUrl}
              onChange={(v) => form.set('brand.logoMarkUrl', v)}
              error={form.errors['brand.logoMarkUrl']}
              preview
              previewClassName="aspect-square max-w-32 object-contain bg-white"
            />
            <ImageUploadField
              label="Favicon (browser tab, square PNG)"
              value={draft.brand.faviconUrl}
              onChange={(v) => form.set('brand.faviconUrl', v)}
              error={form.errors['brand.faviconUrl']}
            />
          </div>
        </EditorSection>
        <EditorSection
          title="Search engines (SEO)"
          description="Default title and description for Google and link previews. Pages without their own text use these."
        >
          <DraftInput
            form={form}
            path="seo.siteTitle"
            label="Default page title"
            hint="About 50–60 characters."
          />
          <DraftTextarea
            form={form}
            path="seo.siteDescription"
            label="Default description"
            rows={2}
            hint="About 150–160 characters."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <DraftInput
              form={form}
              path="seo.keywords"
              label="Keywords (comma separated)"
            />
            <DraftInput
              form={form}
              path="seo.siteUrl"
              label="Website address"
              placeholder="https://babasolars.in"
              hint="Used for canonical links."
            />
            <DraftInput
              form={form}
              path="seo.googleSiteVerification"
              label="Google Search Console code"
              hint="Only the code from the meta tag."
            />
          </div>
          <ImageUploadField
            label="Share image (1200×630)"
            value={draft.seo.ogImage}
            onChange={(v) => form.set('seo.ogImage', v)}
            error={form.errors['seo.ogImage']}
            preview
            previewClassName="aspect-[1200/630] max-w-md"
          />
        </EditorSection>
        <EditorSection
          title="Per-page titles & descriptions"
          description="Leave empty to keep the built-in text for that page."
        >
          {SEO_PAGES.map((p) => (
            <div
              key={p.key}
              className="grid gap-3 rounded-card border border-line bg-snow-100/60 p-4 sm:grid-cols-[10rem_1fr_1.5fr]"
            >
              <p className="pt-2 text-sm font-semibold">{p.label}</p>
              <DraftInput
                form={form}
                path={`seo.pages.${p.key}.title`}
                label="Title"
              />
              <DraftInput
                form={form}
                path={`seo.pages.${p.key}.description`}
                label="Description"
              />
            </div>
          ))}
        </EditorSection>
      </fieldset>
      {!readOnly && (
        <SaveBar
          dirty={dirty}
          saving={update.isPending}
          remoteChanged={remoteChanged}
          errorCount={Object.keys(form.errors).length}
          onDiscard={discard}
          onLoadLatest={loadLatest}
        />
      )}
    </form>
  );
}

// ─── Calculator ──────────────────────────────────────────────────────────────
function CalculatorTab({ readOnly }: { readOnly: boolean }) {
  const content = useSiteContent();
  const update = useUpdateContent();
  const saved = useMemo(
    () => ({ calculator: content.calculator }),
    [content.calculator],
  );
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } =
    useDraft<{ calculator: CalculatorSettings }>(saved);
  const handle = useSaveHandler<typeof draft>(
    (v) => update.mutateAsync(v),
    markSaved,
    'Calculator settings',
  );
  const [testBill, setTestBill] = useState(3000);
  const c = draft.calculator;
  const n = (
    path: string,
    label: string,
    opts: {
      step?: string;
      hint?: string;
      prefix?: string;
      suffix?: string;
    } = {},
  ) => (
    <Input
      label={opts.suffix ? `${label} (${opts.suffix})` : label}
      type="number"
      step={opts.step ?? 'any'}
      min={0}
      prefix={opts.prefix}
      hint={opts.hint}
      value={String(form.get<number>(`calculator.${path}`) ?? '')}
      error={form.errors[`calculator.${path}`]}
      onChange={(e) =>
        form.set(
          `calculator.${path}`,
          e.target.value === '' ? 0 : Number(e.target.value),
        )
      }
    />
  );
  const example = useMemo(() => {
    try {
      return calculateSolar(
        {
          monthlyBill: testBill,
          tariff: c.electricity?.enabled ? 0 : c.defaultTariff,
          propertyType: 'residential',
          systemType: 'on-grid',
          roofType: 'rcc',
        },
        c,
      );
    } catch {
      return null;
    }
  }, [testBill, c]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!readOnly) void handle(draft, form.setErrors);
  };
  const slabs = c.costSlabs;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <fieldset disabled={readOnly} className="grid gap-6">
        <EditorSection
          title="Generation & savings"
          description="Used by the website calculator and by server-side estimates for quote requests."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {n('unitsPerKwPerDay', 'Units per kW per day', {
              hint: 'South-facing, no shade, after ~20 % standard losses',
            })}
            {n('defaultTariff', 'Flat tariff (fallback)', {
              prefix: '₹',
              hint: 'Per unit; used only when the slab tariff is off',
            })}
            {n('exportTariff', 'Export rate for surplus', {
              prefix: '₹',
              hint: 'Net-metering credit; 0 = ignore',
            })}
            {n('tariffEscalation', 'Tariff increase', { suffix: '% / year' })}
            {n('panelDegradation', 'Panel degradation', { suffix: '% / year' })}
            {n('co2KgPerUnit', 'CO₂ avoided', { suffix: 'kg / unit' })}
            {n('sqftPerKw', 'Roof area per kW', { suffix: 'sq ft' })}
            {n('maxKw', 'Maximum size online', { suffix: 'kW' })}
          </div>
        </EditorSection>

        <EditorSection
          title="Location, roof direction & shading"
          description="Engineering assumptions (not official data). Output relative to a south-facing, shade-free roof (1 = 100 %). Per-state values override “Units per kW per day” for that state."
        >
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {(['south', 'south-east', 'south-west', 'flat', 'east', 'west', 'north'] as const).map((d) =>
              n(`generation.orientation.${d}`, `Roof faces ${d}`, { step: '0.01' }),
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {(['none', 'light', 'moderate', 'heavy'] as const).map((sh) =>
              n(`generation.shading.${sh}`, `Shading: ${sh}`, { step: '0.01' }),
            )}
            {n('generation.extraLossPercent', 'Extra losses', { suffix: '%', hint: 'On top of standard losses' })}
          </div>
          <StateYieldEditor
            value={c.generation?.yieldByState ?? {}}
            onChange={(v) => form.set('calculator.generation.yieldByState', v)}
          />
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink-soft">Indicative tariff where no verified DISCOM tariff is set up (₹ / unit)</p>
            <p className="mb-3 text-sm text-muted">The website always marks these estimates “needs confirmation”. Defaults are CSPDCL FY 2026-27 averages, not other DISCOMs’ tariffs.</p>
            <div className="grid gap-5 sm:grid-cols-3">
              {n('indicativeTariff.residential', 'Residential', { prefix: '₹' })}
              {n('indicativeTariff.commercial', 'Commercial', { prefix: '₹' })}
              {n('indicativeTariff.industrial', 'Industrial', { prefix: '₹' })}
            </div>
          </div>
        </EditorSection>

        <EditorSection
          title="Price per kW"
          description="Before subsidy, incl. GST, for an on-grid system on an RCC roof. The website shows a ± band around it."
        >
          <div className="grid gap-2">
            {slabs.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
              >
                <Input
                  label={
                    i === slabs.length - 1
                      ? 'Up to (kW) — empty = no limit'
                      : 'Up to (kW)'
                  }
                  type="number"
                  min={0}
                  step="any"
                  value={s.upToKw ?? ''}
                  error={form.errors[`calculator.costSlabs.${i}.upToKw`]}
                  onChange={(e) =>
                    form.set(
                      `calculator.costSlabs.${i}.upToKw`,
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
                <Input
                  label="Price per kW"
                  prefix="₹"
                  type="number"
                  min={0}
                  value={s.pricePerKw}
                  error={form.errors[`calculator.costSlabs.${i}.pricePerKw`]}
                  onChange={(e) =>
                    form.set(
                      `calculator.costSlabs.${i}.pricePerKw`,
                      Number(e.target.value),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  aria-label={`Remove slab ${i + 1}`}
                  disabled={slabs.length <= 1}
                  onClick={() =>
                    form.set(
                      'calculator.costSlabs',
                      slabs.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {form.errors['calculator.costSlabs'] && (
              <p className="text-sm text-clay-700">
                {form.errors['calculator.costSlabs']}
              </p>
            )}
            <div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="size-4" />}
                disabled={slabs.length >= 10}
                onClick={() =>
                  form.set('calculator.costSlabs', [
                    ...slabs,
                    {
                      upToKw: null,
                      pricePerKw: slabs[slabs.length - 1]?.pricePerKw ?? 45000,
                    },
                  ])
                }
              >
                Add slab
              </Button>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {n('priceBand', 'Price range ±', { suffix: '%' })}
            {n('systemFactor.hybrid', 'Hybrid × price')}
            {n('systemFactor.off-grid', 'Off-grid × price')}
            {n('roofFactor.tin', 'Tin shed × price')}
            {n('roofFactor.ground', 'Ground mount × price')}
            {n('systemFactor.on-grid', 'On-grid × price')}
          </div>
        </EditorSection>

        <EditorSection
          title="Electricity bill (CSPDCL tariff)"
          description="Turns a bill into units and works out the bill with solar: telescopic energy slabs, fixed charge on load, FPPAS and duty (% of energy charges), half-bill rebate, rounding. Update after each CSERC tariff order."
        >
          <DraftToggle
            form={form}
            path="calculator.electricity.enabled"
            label="Use the slab tariff (off = one flat rate per unit)"
          />
          <DraftToggle
            form={form}
            path="calculator.electricity.halfBill.enabled"
            label="Apply Bijli Bill Half / M-Urja rebate for homes"
          />
          <Input
            label="Tariff name shown on the website"
            value={form.get<string>('calculator.electricity.label') ?? ''}
            onChange={(e) =>
              form.set('calculator.electricity.label', e.target.value)
            }
          />
          {(
            [
              ['domesticEnergy', 'LV-1 Domestic'],
              ['lv21Energy', 'LV-2.1 Non-domestic'],
              ['lv22SmallEnergy', 'LV-2.2 ≤ 15 kW'],
              ['lv22LargeEnergy', 'LV-2.2 > 15 kW'],
              ['lv5SmallEnergy', 'LV-5.2.1 Industry ≤ 25 HP'],
              ['lv5LargeEnergy', 'LV-5.2.2 Industry > 25 HP'],
            ] as const
          ).map(([key, title]) => {
            const list = c.electricity?.[key] ?? [];
            return (
              <div key={key}>
                <p className="mb-1.5 text-sm font-semibold text-ink-soft">
                  {title} energy charge (₹ / unit)
                </p>
                <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((sl, i) =>
                    n(
                      `electricity.${key}.${i}.rate`,
                      `${i === 0 ? 0 : (list[i - 1].upToUnits ?? 0) + 1}${sl.upToUnits === null ? '+' : `–${sl.upToUnits}`} units`,
                      { prefix: '₹' },
                    ),
                  )}
                </div>
              </div>
            );
          })}
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {(c.electricity?.domesticFixed ?? []).map((t, i, arr) =>
              n(
                `electricity.domesticFixed.${i}.perKw`,
                `LV-1 fixed, ${t.upToKw === null ? `above ${arr[i - 1]?.upToKw ?? 0}` : i === 0 ? `up to ${t.upToKw}` : `${arr[i - 1].upToKw}–${t.upToKw}`} kW`,
                { prefix: '₹', hint: 'Per kW per month' },
              ),
            )}
            {n('electricity.lv21FixedPerKw', 'LV-2.1 fixed', { prefix: '₹', hint: 'Per kW per month' })}
            {n('electricity.lv22SmallDemandPerKw', 'LV-2.2 ≤ 15 kW demand', { prefix: '₹', hint: 'Per kW per month' })}
            {n('electricity.lv22LargeDemandPerKw', 'LV-2.2 > 15 kW demand', { prefix: '₹', hint: 'Per kW per month' })}
            {n('electricity.lv5SmallDemandPerKw', 'LV-5.2.1 demand', { prefix: '₹', hint: 'Per kW per month' })}
            {n('electricity.lv5LargeDemandPerKw', 'LV-5.2.2 demand', { prefix: '₹', hint: 'Per kW per month' })}
            {n('electricity.lv5ThresholdKw', 'LV-5 breakpoint', { suffix: 'kW', hint: '25 HP = 18.7 kW' })}
            {n('electricity.lvMaxKw', 'LV supply limit', { suffix: 'kW', hint: 'Above this: HV-3' })}
            {n('electricity.hv3EnergyPerKvah', 'HV-3 11 kV energy', { prefix: '₹', hint: 'Per kVAh (≈ kWh)' })}
            {n('electricity.hv3DemandPerKva', 'HV-3 11 kV demand', { prefix: '₹', hint: 'Per kVA per month' })}
          </div>
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {n('electricity.fppasPercent', 'FPPAS', { suffix: '% of energy', hint: 'Changes monthly' })}
            {n('electricity.dutyDomesticPercent', 'Duty, domestic', { suffix: '%' })}
            {n('electricity.dutyNonDomesticPercent', 'Duty, non-domestic', { suffix: '%' })}
            {n('electricity.dutyIndustrialPercent', 'Duty, industrial', { suffix: '%', hint: 'Confirm from a recent bill' })}
            {n('electricity.roundTo', 'Round bill to', { prefix: '₹' })}
            {n('electricity.halfBill.percent', 'Half-bill rebate', { suffix: '%' })}
            {n('electricity.halfBill.unitsCovered', 'Rebate on first', { suffix: 'units' })}
            {n('electricity.halfBill.maxUnits', 'Only if usage up to', { suffix: 'units' })}
            {n('electricity.defaultLoadKw.domestic', 'Assumed load, home', { suffix: 'kW' })}
            {n('electricity.defaultLoadKw.commercial', 'Assumed load, commercial', { suffix: 'kW' })}
            {n('electricity.defaultLoadKw.industrial', 'Assumed load, industrial', { suffix: 'kW' })}
          </div>
        </EditorSection>

        <EditorSection
          title="Subsidy (PM Surya Ghar CFA + state schemes)"
          description="Central (MNRE): ₹30,000/kW up to 2 kW, ₹18,000 for the 3rd kW, max ₹78,000; housing societies ₹18,000/kW up to 500 kW. State schemes are added on top — Chhattisgarh: ₹15,000 for 1 kW, ₹30,000 for 2 kW and above. Used by the calculator, quotations and invoices."
        >
          <DraftToggle
            form={form}
            path="calculator.subsidy.enabled"
            label="Show subsidy in estimates"
          />
          <DraftToggle
            form={form}
            path="calculator.subsidy.hybridEligible"
            label="Hybrid (grid-connected) systems are eligible"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {n('subsidy.perKwUpTo2', 'Per kW (first 2 kW)', { prefix: '₹' })}
            {n('subsidy.perKwThird', '3rd kW', { prefix: '₹' })}
            {n('subsidy.cap', 'Maximum (homes)', { prefix: '₹' })}
            {n('subsidy.housingSocietyPerKw', 'Housing society per kW', {
              prefix: '₹',
            })}
            {n('subsidy.housingSocietyMaxKw', 'Housing society limit', {
              suffix: 'kW',
            })}
          </div>
          <SubsidyRulesEditor form={form} />
          <DraftTextarea
            form={form}
            path="calculator.disclaimer"
            label="Disclaimer under the calculator (optional)"
            rows={2}
          />
        </EditorSection>

        <EditorSection
          title="Try it"
          description="Live check with the values above (residential, on-grid)."
        >
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="Monthly bill"
              prefix="₹"
              type="number"
              min={0}
              value={testBill}
              onChange={(e) => setTestBill(Number(e.target.value))}
              wrapperClassName="w-48"
            />
            {example && (
              <p className="text-sm text-ink-soft">
                → <strong>{example.capacityKw} kW</strong>,{' '}
                {formatINR(example.costMin)}–{formatINR(example.costMax)},
                subsidy {formatINR(example.subsidy)} central +{' '}
                {formatINR(example.stateSubsidy)} state, payback{' '}
                {example.paybackYears || '—'} yrs, saves{' '}
                {formatINR(example.annualSavings)}/yr
              </p>
            )}
          </div>
        </EditorSection>
      </fieldset>
      {!readOnly && (
        <SaveBar
          dirty={dirty}
          saving={update.isPending}
          remoteChanged={remoteChanged}
          errorCount={Object.keys(form.errors).length}
          onDiscard={discard}
          onLoadLatest={loadLatest}
        />
      )}
    </form>
  );
}

// ─── Package breakdown (how a package price is itemised on quotations) ─────────
function BreakdownTab({ readOnly }: { readOnly: boolean }) {
  const q = useBusiness();
  if (q.isPending) return <Skeleton className="h-64" />;
  if (q.isError)
    return (
      <ErrorState
        message={errorMessage(q.error)}
        onRetry={() => void q.refetch()}
      />
    );
  return <BreakdownForm saved={q.data} readOnly={readOnly} />;
}

function BreakdownForm({
  saved,
  readOnly,
}: {
  saved: BusinessSettings;
  readOnly: boolean;
}) {
  const update = useUpdateBusiness();
  const { form, draft, dirty, remoteChanged, loadLatest, discard, markSaved } =
    useDraft<BusinessSettings>(saved);
  const handle = useSaveHandler<BusinessSettings>(
    (v) => update.mutateAsync({ packageBreakdown: v.packageBreakdown }),
    markSaved,
    'Package breakdown',
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!readOnly) void handle(draft, form.setErrors);
  };
  const example = 330000;
  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <fieldset disabled={readOnly} className="grid gap-6 lg:grid-cols-2">
        {QUALITIES.map((ql) => {
          const rows = draft.packageBreakdown[ql];
          const total = breakdownTotal(rows);
          return (
            <EditorSection
              key={ql}
              title={`${QUALITY_LABEL[ql]} package`}
              description={`Share of the package price per component. Example on ${formatINR(example)}.`}
            >
              <div className="grid gap-2">
                {rows.map((r, i) => (
                  <div
                    key={r.key}
                    className="grid grid-cols-[1fr_5.5rem_5rem] items-end gap-2"
                  >
                    <Input
                      label={i === 0 ? 'Component' : `Component ${i + 1}`}
                      hideLabel={i > 0}
                      value={r.name}
                      onChange={(e) =>
                        form.set(
                          `packageBreakdown.${ql}.${i}.name`,
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      label="Share %"
                      hideLabel={i > 0}
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={r.share}
                      onChange={(e) =>
                        form.set(
                          `packageBreakdown.${ql}.${i}.share`,
                          Number(e.target.value),
                        )
                      }
                    />
                    <Select
                      label="GST"
                      hideLabel={i > 0}
                      value={String(r.gstRate)}
                      onChange={(e) =>
                        form.set(
                          `packageBreakdown.${ql}.${i}.gstRate`,
                          Number(e.target.value),
                        )
                      }
                      options={[
                        { value: '5', label: '5%' },
                        { value: '12', label: '12%' },
                        { value: '18', label: '18%' },
                      ]}
                    />
                    <p className="col-span-3 -mt-1 text-xs text-muted">
                      ≈ {formatINR((example * r.share) / 100)} incl. GST · HSN{' '}
                      {r.hsn}
                    </p>
                  </div>
                ))}
              </div>
              <p
                className={cn(
                  'text-sm font-semibold',
                  Math.abs(total - 100) > 0.5
                    ? 'text-clay-700'
                    : 'text-leaf-700',
                )}
                role="status"
              >
                Total: {total}%{' '}
                {Math.abs(total - 100) > 0.5 ? '— must be 100%' : '✓'}
              </p>
              {form.errors[`packageBreakdown.${ql}`] && (
                <p className="text-sm text-clay-700" role="alert">
                  {form.errors[`packageBreakdown.${ql}`]}
                </p>
              )}
            </EditorSection>
          );
        })}
      </fieldset>
      <p className="text-sm text-muted">
        Defaults come from the Economy / Premium cost breakdowns you shared (8
        kW Waaree, mid-points). With GST-inclusive package prices the GST is
        taken out of each share, so the quotation total always equals the price
        list.
      </p>
      {!readOnly && (
        <SaveBar
          dirty={dirty}
          saving={update.isPending}
          remoteChanged={remoteChanged}
          errorCount={Object.keys(form.errors).length}
          onDiscard={discard}
          onLoadLatest={loadLatest}
        />
      )}
    </form>
  );
}

/** Per-state units/kW/day overrides (e.g. sunnier western states). Empty = the base value everywhere. */
function StateYieldEditor({ value, onChange }: { value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  const entries = Object.entries(value)
  const [code, setCode] = useState('')
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-soft">Units per kW per day by state (optional)</p>
      <div className="grid gap-2">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[1fr_8rem_auto] items-end gap-3">
            <p className="pb-2 text-sm">{stateName(k) || k}</p>
            <Input label="Units/kW/day" hideLabel type="number" step="0.01" min={0} value={v} onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })} />
            <Button variant="ghost" aria-label={`Remove ${stateName(k)}`} onClick={() => { const n = { ...value }; delete n[k]; onChange(n) }}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Add a state" value={code} onChange={(e) => setCode(e.target.value)} options={[{ value: '', label: 'Choose…' }, ...GST_STATES.filter((s) => !(s.code in value)).map((s) => ({ value: s.code, label: s.name }))]} />
          <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} disabled={!code} onClick={() => { onChange({ ...value, [code]: 4.2 }); setCode('') }}>Add</Button>
        </div>
      </div>
    </div>
  )
}
