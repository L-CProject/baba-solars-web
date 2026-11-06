import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Calculator,
  CircleAlert,
  IndianRupee,
  Leaf,
  Ruler,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { ConsumerCategory, PropertyType, Quality, RoofDirection, RoofType, ShadingLevel, SystemType } from '@/types';
import { useSeo } from '@/hooks/useSeo';
import { usePublished, useCompanyPrices, useSiteContent } from '@/queries';
import {
  QUALITIES,
  QUALITY_LABEL,
  packagePrice,
  packageSizes,
} from '@/lib/pricing';
import {
  CALC_LIMITS,
  calculateSolar,
  validateCalculatorInput,
  type CalculatorInput,
} from '@/lib/calculator';
import {
  formatINR,
  formatLakh,
  formatNumber,
  whatsappHref,
} from '@/lib/format';
import { cn } from '@/lib/cn';
import { stateRuleFor } from '@/lib/subsidy';
import { defaultDiscom } from '@/lib/tariffRegistry';
import { ConsumerSegmented, LocationFields, SiteFactorFields, TariffNotice, type LocationValue } from '@/components/common/CalculatorFields';
import { CATEGORY_LABEL, type BillBreakdown } from '@/lib/electricityBill';
import {
  Button,
  Input,
  LinkButton,
  Segmented,
  Select,
  SectionHeading,
  WhatsAppIcon,
} from '@/components/ui';
import { PageHero } from '@/components/common/PageHero';
import { FaqList } from '@/components/common/FaqList';
import { CtaBand } from '@/components/common/CtaBand';
import { QuoteRequestModal } from '@/components/common/SolarCalculator';
import { img } from '@/data/media';

type NumField = number | '';
const toNum = (v: NumField) => (v === '' ? 0 : v);
const parse = (s: string): NumField => (s === '' ? '' : Math.max(0, Number(s)));
const lakhRange = (a: number, b: number) =>
  a >= 100000
    ? `₹${formatNumber(a / 100000)} – ${formatNumber(b / 100000)} lakh`
    : `${formatINR(a)} – ${formatINR(b)}`;

/** Dedicated solar calculator page (header → Calculator). All assumptions are set in Admin → Settings → Calculator. */
export default function CalculatorPage() {
  const content = useSiteContent();
  const s = content.calculator;
  const faqs = usePublished('faqs');
  useSeo({
    title: 'Solar calculator: size, cost, subsidy & savings',
    description:
      'Free roof solar calculator for homes, businesses and industries in Raipur and Chhattisgarh: system size from your bill (official CSPDCL tariff), PM Surya Ghar subsidy, payback and 25-year savings.',
    path: '/calculator',
  });

  const [mode, setMode] = useState<'bill' | 'units'>('bill');
  const [bill, setBill] = useState<NumField>(3000);
  const [units, setUnits] = useState<NumField>(350);
  // No tariff input: the engine uses the verified DISCOM tariff where configured (CSPDCL), else an
  // indicative rate that is clearly labelled as needing confirmation.
  const [fixed, setFixed] = useState<NumField>('');
  const [fppas, setFppas] = useState<NumField>('');
  const [consumer, setConsumer] = useState<ConsumerCategory>('residential');
  const [society, setSociety] = useState(false);
  const propertyType: PropertyType = consumer === 'residential' && society ? 'housing-society' : consumer;
  const [direction, setDirection] = useState<RoofDirection>('south');
  const [shading, setShading] = useState<ShadingLevel>('none');
  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [roofType, setRoofType] = useState<RoofType>('rcc');
  const [sanctioned, setSanctioned] = useState<NumField>('');
  const [roofArea, setRoofArea] = useState<NumField>('');
  const [override, setOverride] = useState<NumField>('');
  const defaultState = s.subsidy.defaultStateCode || '22';
  const [location, setLocation] = useState<LocationValue>({ country: 'IN', stateCode: defaultState, discomId: defaultDiscom(defaultState) });
  const stateCode = location.stateCode;
  const [quoteOpen, setQuoteOpen] = useState(false);
  const companies = useCompanyPrices();
  const [companyId, setCompanyId] = useState('');
  const [quality, setQuality] = useState<Quality>('normal');
  const [params] = useSearchParams();
  // Deep links from the pricing table: /calculator?company=co-waaree&kw=5&quality=premium
  useEffect(() => {
    const c = params.get('company');
    const kw = Number(params.get('kw'));
    const q = params.get('quality');
    if (c && companies.some((x) => x.id === c)) setCompanyId(c);
    if (kw > 0) setOverride(kw);
    if (q === 'normal' || q === 'premium') setQuality(q);
  }, [params, companies]);
  const company = companies.find((c) => c.id === companyId);

  const input: CalculatorInput = {
    mode,
    monthlyBill: toNum(bill),
    monthlyUnits: toNum(units),
    tariff: 0,
    fixedCharges: toNum(fixed) || null,
    fppasPercent: fppas === '' ? null : fppas,
    propertyType,
    systemType,
    roofType,
    sanctionedLoadKw: sanctioned === '' ? null : sanctioned,
    roofAreaSqft: roofArea === '' ? null : roofArea,
    capacityOverride: override === '' ? null : override,
    stateCode,
    discomId: location.discomId,
    country: location.country,
    roofDirection: direction,
    shading,
  };
  const errors = validateCalculatorInput(input);
  if (override !== '' && (override < 0.5 || override > s.maxKw))
    errors.capacityOverride = `Choose between 0.5 and ${s.maxKw} kW.`;
  const valid = !Object.keys(errors).length;
  const base = useMemo(
    () => calculateSolar(input, s),
    [JSON.stringify(input), s],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const pkg = company ? packagePrice(company, base.capacityKw, quality) : null;
  const r = useMemo(
    () =>
      pkg ? calculateSolar({ ...input, costOverride: pkg.price }, s) : base,
    [base, pkg?.price],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const sizes = packageSizes(companies);
  const calcFaqs = faqs
    .filter((f) => f.category === 'subsidy' || f.category === 'pricing')
    .slice(0, 6);
  const maxCum = Math.max(1, ...r.cumulative);
  const billNow = r.billNow;
  const slabMode = r.tariffSource.mode === 'slab';

  const shareText = `Hi ${content.businessName}, I used your solar calculator: ${r.capacityKw} kW ${systemType}${pkg ? ` (${company!.name} ${QUALITY_LABEL[quality]}, ${formatINR(pkg.price)})` : ''} for a ${propertyType} property (about ${r.monthlyUnits} units/month). ${pkg ? '' : `Estimate ${formatINR(r.costMin)}–${formatINR(r.costMax)}, `}subsidy ${formatINR(r.subsidy + r.stateSubsidy)}. Please share an exact quote.`;

  return (
    <>
      <PageHero
        crumb="Calculator"
        title="Solar calculator"
        image={img('monoPanels', 2000)}
        intro="Find the right system size for your roof, the PM Surya Ghar subsidy, your new electricity bill and how quickly solar pays for itself."
      />

      <section className="section-y">
        <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Inputs */}
          <form
            className="grid content-start gap-6 rounded-panel border border-line bg-surface p-5 shadow-card md:p-8"
            onSubmit={(e) => e.preventDefault()}
            noValidate
            aria-label="Calculator inputs"
          >
            <div className="flex items-center gap-2">
              <Calculator className="size-5 text-steel-600" aria-hidden />
              <h2 className="font-sans text-lg font-semibold">
                Your electricity use
              </h2>
            </div>
            <Segmented<'bill' | 'units'>
              label="I know my"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'bill', label: 'Monthly bill (₹)' },
                { value: 'units', label: 'Monthly units (kWh)' },
              ]}
            />
            {mode === 'bill' ? (
              <Input
                label="Average monthly electricity bill"
                prefix="₹"
                type="number"
                inputMode="numeric"
                min={CALC_LIMITS.billMin}
                value={bill}
                onChange={(e) => {
                  setBill(parse(e.target.value));
                  setOverride('');
                }}
                error={errors.monthlyBill}
                hint="Use the average of summer and winter bills."
              />
            ) : (
              <Input
                label="Average units per month (kWh)"
                type="number"
                inputMode="numeric"
                min={1}
                value={units}
                onChange={(e) => {
                  setUnits(parse(e.target.value));
                  setOverride('');
                }}
                error={errors.monthlyUnits}
                hint="Printed as “units consumed” on your electricity bill."
              />
            )}
            <details className="group rounded-field border border-line bg-snow-100/50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink-soft">
                From your bill (optional, more accurate)
              </summary>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Input
                  label="Fixed / demand charges on bill"
                  prefix="₹"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={fixed}
                  onChange={(e) => setFixed(parse(e.target.value))}
                  error={errors.fixedCharges}
                  hint="Blank = worked out from your sanctioned load. Not saved by solar."
                />
                {slabMode && (
                  <Input
                    label="FPPAS on your bill (%)"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    max={CALC_LIMITS.fppasMax}
                    value={fppas}
                    placeholder={String(s.electricity.fppasPercent)}
                    onChange={(e) => setFppas(parse(e.target.value))}
                    error={errors.fppasPercent}
                    hint={`Changes monthly. Blank = ${s.electricity.fppasPercent}%.`}
                  />
                )}
              </div>
            </details>

            <div className="flex items-center gap-2 border-t border-line pt-6">
              <Sun className="size-5 text-steel-600" aria-hidden />
              <h2 className="font-sans text-lg font-semibold">Your property</h2>
            </div>
            <ConsumerSegmented
              value={consumer}
              onChange={(v) => {
                setConsumer(v);
                setOverride('');
              }}
            />
            {consumer === 'residential' && (
              <label className="-mt-2 flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={society} onChange={(e) => setSociety(e.target.checked)} className="size-4 accent-navy-700" />
                Housing society / RWA (common facilities)
              </label>
            )}
            <LocationFields
              value={location}
              showCountry
              onChange={(v) => {
                setLocation(v);
                setOverride('');
              }}
            />
            <SiteFactorFields
              direction={direction}
              shading={shading}
              onDirection={(v) => { setDirection(v); setOverride(''); }}
              onShading={(v) => { setShading(v); setOverride(''); }}
            />
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
            <p className="-mt-3 text-sm text-muted">
              {systemType === 'on-grid'
                ? 'Connected to the grid with net metering — lowest cost, eligible for subsidy.'
                : systemType === 'hybrid'
                  ? 'Grid + battery backup for power cuts. Costs more because of the battery.'
                  : 'Battery only, no grid. Not eligible for PM Surya Ghar subsidy.'}
            </p>
            <p className="-mt-3 text-sm text-muted">
              {stateRuleFor(stateCode, s.subsidy)
                ? `${stateRuleFor(stateCode, s.subsidy)!.schemeName} is added to the central subsidy for eligible homes.`
                : 'Central PM Surya Ghar subsidy only — no state scheme set up for this state.'}
            </p>
            <div className="grid gap-5 border-t border-line pt-6">
              <div className="flex items-center gap-2">
                <IndianRupee className="size-5 text-steel-600" aria-hidden />
                <h2 className="font-sans text-lg font-semibold">
                  Brand & quality
                </h2>
              </div>
              <Select
                label="Company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                options={[
                  { value: '', label: 'Any brand (average estimate)' },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
                hint={
                  company
                    ? `${company.qualities[quality].panelWattage} Wp ${company.qualities[quality].panelTechnology} · ${company.qualities[quality].inverterBrand} inverter`
                    : 'Pick Waaree, Adani or Tata for their exact package price.'
                }
              />
              <Segmented<Quality>
                label="Material quality"
                value={quality}
                onChange={setQuality}
                options={QUALITIES.map((q) => ({
                  value: q,
                  label: QUALITY_LABEL[q],
                }))}
              />
              <div>
                <p className="mb-1.5 text-sm font-semibold text-ink-soft">
                  Package sizes
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Package sizes"
                >
                  {sizes.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      aria-pressed={r.capacityKw === kw}
                      onClick={() => setOverride(kw)}
                      className={cn(
                        'rounded-chip border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                        r.capacityKw === kw
                          ? 'border-navy-700 bg-navy-700 text-snow-50'
                          : 'border-line bg-surface text-ink-soft hover:border-steel-400',
                      )}
                    >
                      {kw} kW
                    </button>
                  ))}
                  {override !== '' && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-muted underline underline-offset-2"
                      onClick={() => setOverride('')}
                    >
                      Use suggested size
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Installation"
                value={roofType}
                onChange={(e) => setRoofType(e.target.value as RoofType)}
                options={[
                  { value: 'rcc', label: 'Flat RCC roof' },
                  { value: 'tin', label: 'Tin / metal shed' },
                  { value: 'ground', label: 'Ground mounted' },
                ]}
              />
              <Input
                label="Sanctioned load (kW, optional)"
                type="number"
                step="0.5"
                min={0}
                value={sanctioned}
                onChange={(e) => setSanctioned(parse(e.target.value))}
                error={errors.sanctionedLoadKw}
                hint={consumer === 'residential' ? 'On your bill. Sets fixed charges and limits home system size.' : 'Contract demand on your bill. Sets the demand charge.'}
              />
              <Input
                label="Shadow-free roof area (sq ft, optional)"
                type="number"
                min={0}
                value={roofArea}
                onChange={(e) => setRoofArea(parse(e.target.value))}
                error={errors.roofAreaSqft}
                hint={`About ${s.sqftPerKw} sq ft per kW.`}
              />
              <Input
                label="Choose your own size (kW, optional)"
                type="number"
                step="0.5"
                min={0.5}
                value={override}
                onChange={(e) => setOverride(parse(e.target.value))}
                error={errors.capacityOverride}
                hint={`We suggest ${r.recommendedKw} kW.`}
              />
            </div>
          </form>

          {/* Results */}
          <div
            className={cn(
              'grid content-start gap-5 transition-opacity',
              !valid && 'opacity-50',
            )}
            aria-live="polite"
          >
            {!valid && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-card bg-sun-300/40 p-4 text-sm text-navy-800"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {Object.values(errors)[0]}
              </p>
            )}
            <div className="rounded-panel bg-navy-900 p-6 text-snow-50 shadow-card md:p-8">
              <p className="text-sm text-snow-300">
                {override === '' ? 'Recommended system' : 'Your system'}
              </p>
              <p className="mt-1 font-display text-5xl tabular-nums">
                {formatNumber(r.capacityKw)}{' '}
                <span className="font-sans text-xl text-snow-300">kW</span>
              </p>
              <p className="mt-2 text-sm text-snow-200">
                For about {formatNumber(r.monthlyUnits)} units a month ·
                generates ~{formatNumber(r.monthlyGeneration)} units/month ·
                needs ~{formatNumber(r.roofAreaSqft)} sq ft
              </p>
              <dl className="mt-6 grid gap-4 border-t border-snow-50/15 pt-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-snow-300">
                    {pkg
                      ? `${company!.name} ${QUALITY_LABEL[quality]}`
                      : 'System cost (est.)'}
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {pkg
                      ? formatINR(pkg.price)
                      : lakhRange(r.costMin, r.costMax)}
                  </dd>
                  {pkg && (
                    <dd className="text-xs text-snow-300">
                      {pkg.exact ? 'Package price, incl. GST' : pkg.basis}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-snow-300">Total subsidy</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-sun-300">
                    {r.subsidy + r.stateSubsidy
                      ? `– ${formatINR(r.subsidy + r.stateSubsidy)}`
                      : 'Not applicable'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-snow-300">Final payable after subsidy</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {formatINR(r.netCost)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-1.5 rounded-field bg-snow-50/10 p-4 text-sm">
              <dl className="grid gap-1.5" aria-label="Subsidy breakdown">
                <div className="flex justify-between gap-3">
                  <dt className="text-snow-300">Total system cost</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatINR(pkg ? pkg.price : r.costMid)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-snow-300">Central subsidy (PM Surya Ghar)</dt>
                  <dd className="whitespace-nowrap font-semibold tabular-nums text-sun-300">
                    – {formatINR(r.subsidy)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-snow-300">
                    State subsidy
                    {r.subsidyDetail.stateScheme
                      ? ` (${r.subsidyDetail.stateScheme})`
                      : r.subsidyDetail.stateName
                        ? ` (${r.subsidyDetail.stateName})`
                        : ''}
                  </dt>
                  <dd className="whitespace-nowrap font-semibold tabular-nums text-sun-300">
                    – {formatINR(r.stateSubsidy)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-snow-50/15 pt-1.5">
                  <dt className="font-semibold">Final payable amount</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatINR(r.netCost)}
                  </dd>
                </div>
              </dl>
                {r.subsidyDetail.notes.map((n) => (
                  <p key={n} className="text-xs text-snow-300">
                    {n}
                  </p>
                ))}
                {!pkg && (
                  <p className="text-xs text-snow-300">
                    Based on the middle of the estimated price range. Choose a
                    brand for the exact package price.
                  </p>
                )}
              </div>
            </div>

            {r.warnings.length > 0 && valid && (
              <ul className="grid gap-2">
                {r.warnings.map((w) => (
                  <li
                    key={w}
                    className="flex items-start gap-2 rounded-card border border-sun-500/40 bg-sun-300/25 p-3 text-sm text-navy-800"
                  >
                    <CircleAlert
                      className="mt-0.5 size-4 shrink-0 text-sun-500"
                      aria-hidden
                    />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            <TariffNotice source={r.tariffSource} />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  icon: IndianRupee,
                  label: 'Bill now → with solar',
                  value: `${formatINR(billNow)} → ${formatINR(r.newMonthlyBill)}`,
                  sub: 'per month (year 1)',
                },
                {
                  icon: TrendingUp,
                  label: 'Savings in year 1',
                  value: formatINR(r.annualSavings),
                  sub: `${formatINR(r.monthlySavings)} a month`,
                },
                {
                  icon: Zap,
                  label: 'Payback',
                  value: r.paybackYears ? `${r.paybackYears} years` : '—',
                  sub: 'with rising tariffs',
                },
                {
                  icon: TrendingUp,
                  label: '25-year savings',
                  value: formatLakh(r.lifetimeSavings),
                  sub: r.roi25 ? `${r.roi25}% return on cost` : '',
                },
                {
                  icon: Leaf,
                  label: 'CO₂ avoided',
                  value: `${r.co2TonnesPerYear} t / year`,
                  sub: `≈ ${Math.round(r.co2TonnesPerYear * 45)} trees`,
                },
                {
                  icon: Ruler,
                  label: 'Roof space',
                  value: `~${formatNumber(r.roofAreaSqft)} sq ft`,
                  sub: r.maxKwForRoof
                    ? `your roof fits ~${r.maxKwForRoof} kW`
                    : 'shadow-free',
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-card border border-line bg-surface p-4 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <k.icon className="size-4" aria-hidden />
                    {k.label}
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-ink">
                    {k.value}
                  </p>
                  {k.sub && <p className="text-xs text-muted">{k.sub}</p>}
                </div>
              ))}
            </div>

            {r.billBreakdown && r.billWithSolar && (
              <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
                <table className="w-full min-w-[22rem] text-sm">
                  <caption className="px-5 pt-4 text-left font-semibold text-ink">
                    Your monthly electricity bill ({r.tariffSource.label})
                    <span className="block text-xs font-normal text-muted">
                      {CATEGORY_LABEL[r.billBreakdown.category]} ·{' '}
                      {formatNumber(r.billBreakdown.loadKw)} kW load
                      {sanctioned === '' ? ' (assumed)' : ''}
                    </span>
                  </caption>
                  <thead className="text-ink-soft">
                    <tr className="border-b border-line">
                      <th scope="col" className="px-5 py-2 text-left font-semibold">
                        Charge
                      </th>
                      <th scope="col" className="px-5 py-2 text-right font-semibold">
                        Now
                      </th>
                      <th scope="col" className="px-5 py-2 text-right font-semibold">
                        With solar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {(
                      [
                        ['Units billed', (b) => `${formatNumber(b.units)} kWh`],
                        ['Energy charges (slab-wise)', (b) => formatINR(b.energyCharges)],
                        ['Fixed / demand charges', (b) => formatINR(b.fixedCharges)],
                        [`FPPAS (${r.billBreakdown.fppasPercent}%)`, (b) => formatINR(b.fppas)],
                        [`Electricity duty (${r.billBreakdown.dutyPercent}%)`, (b) => formatINR(b.duty)],
                        ...(propertyType === 'residential' ? [['Half bill rebate (M-Urja)', (b: BillBreakdown) => (b.rebate ? `– ${formatINR(b.rebate)}` : '—')]] : []),
                      ] as [string, (b: BillBreakdown) => string][]
                    ).map(([label, f]) => (
                      <tr key={label} className="border-b border-line">
                        <th scope="row" className="px-5 py-2 text-left font-normal text-ink-soft">
                          {label}
                        </th>
                        <td className="px-5 py-2 text-right">{f(r.billBreakdown!)}</td>
                        <td className="px-5 py-2 text-right">{f(r.billWithSolar!)}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="px-5 py-2.5 text-left font-semibold text-ink">
                        Bill payable (rounded)
                      </th>
                      <td className="px-5 py-2.5 text-right font-semibold">
                        {formatINR(r.billBreakdown.payable)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-leaf-700">
                        {formatINR(r.billWithSolar.payable)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="px-5 pb-3 text-xs text-muted">
                  Energy slabs:{' '}
                  {r.billBreakdown.slabs
                    .map((l) => `${formatNumber(l.units)} × ₹${l.rate.toFixed(2)}`)
                    .join(' + ') || '0'}
                  . Fixed charges are a monthly minimum and stay with solar.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
              <table className="w-full min-w-[26rem] text-sm">
                <caption className="px-5 pt-4 text-left font-semibold text-ink">
                  Compare brands for {formatNumber(r.capacityKw)} kW
                </caption>
                <thead className="text-ink-soft">
                  <tr className="border-b border-line">
                    <th
                      scope="col"
                      className="px-5 py-2 text-left font-semibold"
                    >
                      Company
                    </th>
                    {QUALITIES.map((q) => (
                      <th
                        key={q}
                        scope="col"
                        className="px-5 py-2 text-right font-semibold"
                      >
                        {QUALITY_LABEL[q]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        'border-b border-line last:border-0',
                        c.id === companyId && 'bg-sun-300/20',
                      )}
                    >
                      <th
                        scope="row"
                        className="px-5 py-2.5 text-left font-medium"
                      >
                        {c.name}
                      </th>
                      {QUALITIES.map((q) => {
                        const p = packagePrice(c, r.capacityKw, q);
                        const selected = c.id === companyId && q === quality;
                        return (
                          <td key={q} className="px-5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setCompanyId(c.id);
                                setQuality(q);
                              }}
                              aria-pressed={selected}
                              className={cn(
                                'rounded-field px-2 py-1 font-semibold tabular-nums',
                                selected
                                  ? 'bg-navy-700 text-snow-50'
                                  : 'hover:bg-ice-100',
                              )}
                            >
                              {p ? formatINR(p.price) : '—'}
                              {p && !p.exact && (
                                <span className="ml-0.5 text-xs font-normal opacity-70">
                                  *
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 pb-3 text-xs text-muted">
                Prices include GST.{' '}
                {sizes.includes(r.capacityKw)
                  ? 'Exact package prices.'
                  : '* Estimated between the nearest package sizes — choose a package size for the exact price.'}{' '}
                Tap a price to select it.
              </p>
            </div>

            <figure className="rounded-card border border-line bg-surface p-5 shadow-soft">
              <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">
                  Cumulative savings vs. cost
                </span>
                <span className="text-xs text-muted">
                  Bars: savings to date · line: your net cost{' '}
                  {formatINR(r.netCost)}
                </span>
              </figcaption>
              <div
                className="relative mt-4 h-40"
                role="img"
                aria-label={`Savings pass the net cost after about ${r.paybackYears || 'more than 25'} years and reach ${formatINR(r.lifetimeSavings)} after 25 years.`}
              >
                <div
                  className="absolute inset-x-0 border-t-2 border-dashed border-clay-500/70"
                  style={{
                    bottom: `${Math.min(100, (r.netCost / maxCum) * 100)}%`,
                  }}
                  aria-hidden
                />
                <div className="flex h-full items-end gap-[3px]">
                  {r.cumulative.map((v, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 rounded-t-[3px]',
                        v >= r.netCost ? 'bg-leaf-500' : 'bg-steel-400/70',
                      )}
                      style={{ height: `${Math.max(2, (v / maxCum) * 100)}%` }}
                      title={`Year ${i + 1}: ${formatINR(v)}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>Year 1</span>
                <span>Year 13</span>
                <span>Year 25</span>
              </div>
            </figure>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1"
                disabled={!valid}
                onClick={() => setQuoteOpen(true)}
              >
                Get a written quote
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
          </div>
        </div>
      </section>

      <section className="section-y border-t border-line bg-snow-100/60">
        <div className="container-site grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading title="How we calculate" />
            <ul className="mt-5 grid gap-2 text-ink-soft">
              {r.assumptions.map((a) => (
                <li key={a}>• {a}</li>
              ))}
              <li>
                • Size: your monthly units ÷ (units per kW per day × 30), rounded to the
                nearest 0.5 kW
                {consumer === 'residential'
                  ? ', within your sanctioned load'
                  : ''}
                .
              </li>
              <li>
                • Price:{' '}
                {s.costSlabs
                  .map(
                    (sl, i) =>
                      `${sl.upToKw ? `up to ${sl.upToKw} kW` : `above ${s.costSlabs[i - 1]?.upToKw ?? 0} kW`} ${formatINR(sl.pricePerKw)}/kW`,
                  )
                  .join(' · ')}{' '}
                (on-grid, RCC roof, incl. GST), ±{s.priceBand}%.
              </li>
              <li>
                • Subsidy (PM Surya Ghar): ₹{formatNumber(s.subsidy.perKwUpTo2)}
                /kW for the first 2 kW and ₹{formatNumber(s.subsidy.perKwThird)}{' '}
                for the 3rd kW, up to {formatINR(s.subsidy.cap)} for homes;{' '}
                {formatINR(s.subsidy.housingSocietyPerKw)}/kW for housing
                societies. Paid to your bank after commissioning.
                {s.subsidy.states
                  .filter((x) => x.enabled)
                  .map(
                    (x) =>
                      ` ${x.schemeName}: ${[...x.slabs]
                        .sort((a, b) => a.fromKw - b.fromKw)
                        .map((sl) => `${formatINR(sl.amount)} from ${sl.fromKw} kW`)
                        .join(', ')}.`,
                  )
                  .join('')}
              </li>
              <li>
                • Savings: {slabMode ? 'your bill now minus the bill on the units you still take from the grid' : 'units you use at your tariff'}, rising{' '}
                {s.tariffEscalation}% a year
                {s.exportTariff
                  ? `; surplus exported at ₹${s.exportTariff}/unit`
                  : ''}
                .
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted">
              {s.disclaimer ||
                'These are estimates. Your exact price and generation are confirmed after a free site survey.'}{' '}
              <Link
                to="/pm-surya-ghar"
                className="font-semibold underline underline-offset-2"
              >
                About PM Surya Ghar
              </Link>
            </p>
          </div>
          {calcFaqs.length > 0 && (
            <div>
              <SectionHeading title="Questions about cost & subsidy" />
              <div className="mt-5">
                <FaqList faqs={calcFaqs} />
              </div>
            </div>
          )}
        </div>
      </section>
      <CtaBand />

      <QuoteRequestModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        summary={{
          capacityKw: r.capacityKw,
          systemType,
          propertyType,
          roofType,
          tariff: r.effectiveTariff,
          monthlyBill: billNow,
          monthlyUnits: r.monthlyUnits,
          discomId: location.discomId,
          tariffVerified: r.tariffSource.verified,
          estimatedCost: r.costMid,
          subsidy: r.subsidy + r.stateSubsidy,
          netCost: r.netCost,
          companyId: company?.id ?? null,
          quality,
          label: pkg ? `${company!.name} ${QUALITY_LABEL[quality]}` : undefined,
          stateCode,
        }}
      />
    </>
  );
}
