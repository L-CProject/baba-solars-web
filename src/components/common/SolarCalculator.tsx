import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/services/errors';
import { buildPayload, newSubmissionId, submitWebsiteEnquiry } from '@/services/enquiryIntegrations';
import { Link } from 'react-router';
import {
  ArrowRight,
  CircleCheck,
  Minus,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import type { ConsumerCategory, PropertyType, Quality, RoofDirection, RoofType, ShadingLevel, SystemType } from '@/types';
import {
  calculateSolar,
  validateCalculatorInput,
  CALC_LIMITS,
  type CalculatorInput,
} from '@/lib/calculator';
import { formatINR, formatNumber, whatsappHref } from '@/lib/format';
import {
  indianPhone,
  optionalEmail,
  required,
  validate,
} from '@/lib/validation';
import {
  useCompanyPrices,
  useSiteContent,
  useSubmitQuotation,
} from '@/queries';
import { QUALITIES, QUALITY_LABEL, packagePrice } from '@/lib/pricing';
import { defaultDiscom } from '@/lib/tariffRegistry';
import { useToast } from '@/context/ToastContext';
import {
  Button,
  Input,
  LinkButton,
  Modal,
  Segmented,
  Select,
  WhatsAppIcon,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  ConsumerSegmented,
  LocationFields,
  SiteFactorFields,
  TariffNotice,
  type LocationValue,
} from './CalculatorFields';

const BILL_MIN = CALC_LIMITS.billMin;
const BILL_MAX = 100000;
const CONSUMER_LABEL: Record<ConsumerCategory, string> = { residential: 'residential', commercial: 'commercial', industrial: 'industrial' };

/** Quick estimate (home & pricing pages). The full version with units, load and roof area is /calculator. */
export function SolarCalculator({ compact = false }: { compact?: boolean }) {
  const content = useSiteContent();
  const settings = content.calculator;
  const [bill, setBill] = useState(2500);
  const [consumer, setConsumer] = useState<ConsumerCategory>('residential');
  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [roofType, setRoofType] = useState<RoofType>('rcc');
  const [direction, setDirection] = useState<RoofDirection>('south');
  const [shading, setShading] = useState<ShadingLevel>('none');
  const defaultState = settings.subsidy.defaultStateCode || '22';
  const [location, setLocation] = useState<LocationValue>({ country: 'IN', stateCode: defaultState, discomId: defaultDiscom(defaultState) });
  const [override, setOverride] = useState<number | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const companies = useCompanyPrices();
  const [companyId, setCompanyId] = useState('');
  const [quality, setQuality] = useState<Quality>('normal');
  const company = companies.find((c) => c.id === companyId);
  const propertyType: PropertyType = consumer;

  // Tariff is never typed on the website: the engine picks the verified DISCOM tariff (or an indicative one).
  const input: CalculatorInput = {
    monthlyBill: bill,
    tariff: 0,
    propertyType,
    systemType,
    roofType,
    capacityOverride: override,
    stateCode: location.stateCode,
    discomId: location.discomId,
    country: location.country,
    roofDirection: direction,
    shading,
  };
  const errors = validateCalculatorInput(input);
  const valid = !Object.keys(errors).length;
  const inputKey = JSON.stringify(input);
  const result = useMemo(() => {
    const base = calculateSolar(input, settings);
    const pkg = company ? packagePrice(company, base.capacityKw, quality) : null;
    return pkg
      ? { ...calculateSolar({ ...input, costOverride: pkg.price }, settings), pkg }
      : { ...base, pkg: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, settings, company, quality]);

  const adjust = (delta: number) =>
    setOverride(Math.min(settings.maxKw, Math.max(1, result.capacityKw + delta)));
  const billPct =
    ((Math.max(BILL_MIN, Math.min(bill, BILL_MAX)) - BILL_MIN) / (BILL_MAX - BILL_MIN)) * 100;
  const subsidyTotal = result.subsidy + result.stateSubsidy;

  const shareText = `Hi ${content.businessName}, I used your calculator: ${result.capacityKw} kW ${systemType} system for a ${CONSUMER_LABEL[consumer]} property, monthly bill ${formatINR(bill)}. Estimated cost ${formatINR(result.costMin)}–${formatINR(result.costMax)}. Please share an exact quote.`;

  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-panel border border-line bg-surface shadow-card',
        !compact && 'lg:grid-cols-[1fr_1.05fr]',
      )}
    >
      {/* Inputs */}
      <div className="min-w-0 p-5 sm:p-6 md:p-8">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="calc-bill" className="text-sm font-semibold text-ink-soft">
              Average monthly electricity bill
            </label>
            <span className="font-display text-2xl text-ink tabular-nums">{formatINR(bill)}</span>
          </div>
          <input
            id="calc-bill"
            type="range"
            min={BILL_MIN}
            max={BILL_MAX}
            step={100}
            value={Math.max(BILL_MIN, Math.min(bill, BILL_MAX))}
            onChange={(e) => {
              setBill(Number(e.target.value));
              setOverride(null);
            }}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full accent-navy-700"
            style={{
              background: `linear-gradient(to right, var(--color-sun-400) ${billPct}%, var(--color-snow-300) ${billPct}%)`,
            }}
            aria-valuetext={formatINR(bill)}
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{formatINR(BILL_MIN)}</span>
            <span>₹1,00,000</span>
          </div>
          <Input
            label="Or type your bill amount"
            type="number"
            inputMode="numeric"
            min={CALC_LIMITS.billMin}
            max={CALC_LIMITS.billMax}
            prefix="₹"
            value={bill || ''}
            error={errors.monthlyBill}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBill(Number.isFinite(v) ? Math.max(0, v) : 0);
              setOverride(null);
            }}
            wrapperClassName="mt-4"
          />
        </div>

        <div className="mt-6 grid gap-5">
          <ConsumerSegmented
            value={consumer}
            onChange={(v) => {
              setConsumer(v);
              setOverride(null);
            }}
          />
          <LocationFields value={location} onChange={(v) => { setLocation(v); setOverride(null); }} />
          <Segmented<SystemType>
            label="System type"
            value={systemType}
            onChange={setSystemType}
            options={[
              { value: 'on-grid', label: 'On-grid' },
              { value: 'hybrid', label: 'Hybrid' },
              { value: 'off-grid', label: 'Off-grid' },
            ]}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Brand"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              options={[
                { value: '', label: 'Any brand (estimate)' },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Segmented<Quality>
              label="Plan"
              value={quality}
              onChange={setQuality}
              options={QUALITIES.map((q) => ({ value: q, label: QUALITY_LABEL[q] }))}
            />
          </div>
          <SiteFactorFields direction={direction} shading={shading} onDirection={(v) => { setDirection(v); setOverride(null); }} onShading={(v) => { setShading(v); setOverride(null); }} />
          <Select
            label="Roof type"
            value={roofType}
            onChange={(e) => setRoofType(e.target.value as RoofType)}
            options={[
              { value: 'rcc', label: 'Flat RCC roof' },
              { value: 'tin', label: 'Tin / metal shed' },
              { value: 'ground', label: 'Ground mounted' },
            ]}
          />
        </div>
      </div>

      {/* Results */}
      <div
        className={cn(
          'min-w-0 border-t border-line bg-gradient-to-br from-ice-100 to-snow-200/70 p-5 sm:p-6 md:p-8 lg:border-l lg:border-t-0',
          !valid && 'opacity-60',
        )}
        aria-live="polite"
      >
        {!valid && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-field bg-sun-300/40 p-3 text-sm text-navy-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {Object.values(errors)[0]}
          </p>
        )}
        <p className="text-sm text-muted">Suggested system size</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => adjust(-0.5)}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink hover:border-steel-400"
            aria-label="Decrease system size by 0.5 kW"
          >
            <Minus className="size-4" />
          </button>
          <p className="font-display text-5xl text-ink tabular-nums">
            {formatNumber(result.capacityKw)}
            <span className="ml-1 font-sans text-xl text-muted">kW</span>
          </p>
          <button
            type="button"
            onClick={() => adjust(0.5)}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink hover:border-steel-400"
            aria-label="Increase system size by 0.5 kW"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          You use about {formatNumber(result.monthlyUnits)} units a month.
          {override !== null && override !== result.recommendedKw && (
            <>
              {' '}
              We suggest {result.recommendedKw} kW.{' '}
              <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => setOverride(null)}>
                Reset
              </button>
            </>
          )}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-steel-400/30 pt-6">
          <div className="col-span-2">
            <dt className="text-sm text-muted">
              {result.pkg ? `${company!.name} ${QUALITY_LABEL[quality]} price` : 'Estimated system cost'}
            </dt>
            <dd className="font-display text-2xl text-ink tabular-nums">
              {result.pkg ? formatINR(result.pkg.price) : `${formatINR(result.costMin)} – ${formatINR(result.costMax)}`}
            </dd>
            {result.pkg && (
              <dd className="text-xs text-muted">
                {result.pkg.exact ? 'Package price incl. GST' : `${result.pkg.basis} (incl. GST)`}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-sm text-muted">Subsidy (estimated)</dt>
            <dd className="text-lg font-semibold text-leaf-700 tabular-nums">
              {subsidyTotal ? `– ${formatINR(subsidyTotal)}` : 'Not applicable'}
            </dd>
            {subsidyTotal > 0 ? (
              <dd className="text-xs text-muted tabular-nums">
                Central {formatINR(result.subsidy)}
                {result.stateSubsidy ? ` + ${result.subsidyDetail.stateName || 'State'} ${formatINR(result.stateSubsidy)}` : ''}
              </dd>
            ) : (
              result.subsidyDetail.notes[0] && <dd className="text-xs text-muted">{result.subsidyDetail.notes[0]}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm text-muted">Final payable after subsidy</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatINR(result.netCost)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Savings per year</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatINR(result.annualSavings)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Payback</dt>
            <dd className="text-lg font-semibold tabular-nums">{result.paybackYears ? `${result.paybackYears} years` : '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Roof space needed</dt>
            <dd className="text-lg font-semibold tabular-nums">~{formatNumber(result.roofAreaSqft)} sq ft</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">25-year savings</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatINR(result.lifetimeSavings)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          Generates ~{formatNumber(result.annualUnits)} units a year ({result.effectiveYield} units/kW/day) and avoids ~{result.co2TonnesPerYear} tonnes of CO₂.
        </p>
        {result.warnings.map((w) => (
          <p key={w} className="mt-2 text-xs text-navy-800">{w}</p>
        ))}
        <TariffNotice source={result.tariffSource} className="mt-4" />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setQuoteOpen(true)} size="lg" className="flex-1" disabled={!valid}>
            Request this quote
          </Button>
          {content.whatsapp && (
            <LinkButton
              href={whatsappHref(content.whatsapp, shareText)}
              external
              variant="secondary"
              size="lg"
              leftIcon={<WhatsAppIcon className="size-5" />}
            >
              Send on WhatsApp
            </LinkButton>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          {settings.disclaimer || (
            <>
              Estimate only. Actual price, generation and subsidy depend on the site survey, equipment and government rules.
            </>
          )}{' '}
          <Link to="/pricing" className="underline underline-offset-2">See pricing notes</Link>.
        </p>
        {compact !== true && (
          <Link
            to="/calculator"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink underline-offset-2 hover:underline"
          >
            Detailed calculator: units, sanctioned load, roof space & 25-year savings <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      <QuoteRequestModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        summary={{
          capacityKw: result.capacityKw,
          systemType,
          propertyType,
          roofType,
          tariff: result.effectiveTariff,
          monthlyBill: bill,
          monthlyUnits: result.monthlyUnits,
          estimatedCost: result.costMid,
          subsidy: result.subsidy + result.stateSubsidy,
          netCost: result.netCost,
          companyId: company?.id ?? null,
          quality,
          label: result.pkg ? `${company!.name} ${QUALITY_LABEL[quality]}` : undefined,
          stateCode: location.stateCode,
          discomId: location.discomId,
          tariffVerified: result.tariffSource.verified,
        }}
      />
    </div>
  );
}

export interface QuoteSummary {
  capacityKw: number;
  systemType: SystemType;
  propertyType: PropertyType;
  roofType: RoofType;
  tariff: number;
  monthlyBill: number;
  estimatedCost: number;
  subsidy: number;
  netCost: number;
  companyId?: string | null;
  quality?: Quality;
  label?: string;
  /** GST state code chosen in the calculator (state subsidy). */
  stateCode?: string;
  discomId?: string;
  monthlyUnits?: number;
  tariffVerified?: boolean;
}

export function QuoteRequestModal({
  open,
  onClose,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  summary: QuoteSummary;
}) {
  const { mutateAsync: submitQuotation } = useSubmitQuotation();
  const toast = useToast();
  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Raipur',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof values, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  /** One id per request: retrying after an error never creates a duplicate. */
  const submissionId = useRef('');

  const close = () => {
    onClose();
    setTimeout(() => {
      setDone(false);
      setServerError('');
    }, 250);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(values, {
      name: [required('your name')],
      phone: [indianPhone],
      email: [optionalEmail],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setServerError('');
    if (!submissionId.current) submissionId.current = newSubmissionId();
    const createdAt = new Date().toISOString();
    const service = `${summary.capacityKw} kW ${summary.systemType} solar (calculator quote request)`;
    const payload = buildPayload({
      submissionId: submissionId.current,
      createdAt,
      name: values.name,
      phone: values.phone,
      email: values.email,
      enquiryType: summary.propertyType === 'residential' || summary.propertyType === 'housing-society' ? 'home' : 'commercial',
      capacityKw: summary.capacityKw,
      message: `Calculator quote: ${summary.capacityKw} kW ${summary.systemType}${summary.label ? ` (${summary.label})` : ''}, bill ${formatINR(summary.monthlyBill)}/month. Estimate ${formatINR(summary.estimatedCost)}, subsidy ${formatINR(summary.subsidy)}, after subsidy ${formatINR(summary.netCost)}.`,
      city: values.city,
      service,
      source: 'calculator',
      page: typeof window !== 'undefined' ? window.location.href : '',
    });
    try {
      // Resolves only when the server saved the request; failures go to the catch below.
      await submitWebsiteEnquiry(
        payload,
        () => submitQuotation({
          customerName: values.name,
          phone: values.phone,
          email: values.email,
          city: values.city,
          capacityKw: summary.capacityKw,
          systemType: summary.systemType,
          propertyType: summary.propertyType,
          roofType: summary.roofType,
          tariff: summary.tariff,
          monthlyBill: Math.round(summary.monthlyBill),
          companyId: summary.companyId ?? null,
          quality: summary.quality,
          stateCode: summary.stateCode,
          discomId: summary.discomId,
          monthlyUnits: summary.monthlyUnits,
          tariffVerified: summary.tariffVerified,
          submissionId: submissionId.current,
          createdAt,
        }),
      );
      submissionId.current = '';
      setDone(true);
      toast({ title: 'Quote request sent' });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        const fe = err.fieldErrors as Record<string, string>;
        setErrors({ name: fe.customerName ?? fe.name, phone: fe.phone, email: fe.email });
      }
      setServerError(
        err instanceof Error ? err.message : 'Could not send request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={done ? 'Request noted' : 'Get a written quote'}
      description={
        done
          ? undefined
          : `${summary.capacityKw} kW ${summary.systemType}${summary.label ? ` · ${summary.label}` : ''} system, about ${formatINR(summary.netCost)} after subsidy.`
      }
      size="sm"
    >
      {done ? (
        <div className="flex flex-col items-start gap-3">
          <CircleCheck className="size-9 text-leaf-500" aria-hidden />
          <p className="text-ink-soft">
            Thanks, {values.name.trim().split(' ')[0]}. Your request is saved and our engineer will call you to fix a site-survey time.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button variant="ghost" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <Input
            label="Full name"
            required
            autoComplete="name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            error={errors.name}
          />
          <Input
            label="Mobile number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) =>
              setValues((v) => ({ ...v, phone: e.target.value }))
            }
            error={errors.phone}
          />
          <Input
            label="Email (optional)"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) =>
              setValues((v) => ({ ...v, email: e.target.value }))
            }
            error={errors.email}
          />
          <Input
            label="City or area"
            value={values.city}
            onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
          />
          {serverError && (
            <p
              role="alert"
              className="rounded-field bg-clay-100 p-3 text-sm text-clay-700"
            >
              {serverError}
            </p>
          )}
          <Button type="submit" loading={submitting} size="lg">
            {submitting ? 'Sending…' : 'Send quote request'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
