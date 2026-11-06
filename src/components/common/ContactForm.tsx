import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Building2, CircleAlert, Home, Info, Send } from 'lucide-react';
import type { EnquirySource, EnquiryType } from '@/types';
import { usePublished, useSubmitEnquiry } from '@/queries';
import { ApiError } from '@/services/errors';
import {
  CAPACITY_OPTIONS,
  CONTACT_FIELD_ORDER,
  ENQUIRY_TYPE_OPTIONS,
  capacityFromParam,
  capacityPayload,
  validateContact,
  type ContactErrors,
  type ContactValues,
} from '@/lib/contactForm';
import { buildPayload, newSubmissionId, submitWebsiteEnquiry } from '@/services/enquiryIntegrations';
import { Button, Input, Select, SuccessDialog, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

type Status = 'idle' | 'submitting' | 'error';

interface ContactFormProps {
  defaultService?: string;
  defaultMessage?: string;
  defaultCity?: string;
  defaultType?: EnquiryType;
  defaultKw?: string;
  source?: EnquirySource;
}

/** Service pre-selected when the visitor came without a specific one (the home installation service). */
export const DEFAULT_SERVICE_SLUG = 'residential-installation';

const TYPE_ICONS: Record<EnquiryType, typeof Home> = { home: Home, commercial: Building2 };

/**
 * Website enquiry form.
 *  • Only a valid mobile number OR email is required — every other field is optional.
 *  • Submits straight to the backend API; success = the server saved it → "Thank You!" popup.
 *  • No WhatsApp, no redirect. Errors from the API are shown as they are.
 */
export function ContactForm({
  defaultService = '',
  defaultMessage = '',
  defaultCity = 'Raipur',
  defaultType,
  defaultKw = '',
  source = 'contact',
}: ContactFormProps) {
  const services = usePublished('services');
  const { mutateAsync: submitEnquiry } = useSubmitEnquiry();
  const uid = useId();
  const initial = (): ContactValues => ({
    name: '',
    phone: '',
    email: '',
    city: defaultCity,
    enquiryType: defaultType ?? '',
    ...capacityFromParam(defaultKw),
    service: defaultService,
    message: defaultMessage,
  });
  const [values, setValues] = useState<ContactValues>(initial);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [serverError, setServerError] = useState('');
  const [thanksOpen, setThanksOpen] = useState(false);
  /** One id per filled-in form: re-sending after an error never creates a duplicate enquiry. */
  const submissionId = useRef('');
  /** Synchronous guard against double clicks / double Enter before React re-renders. */
  const inFlight = useRef(false);
  const customKwRef = useRef<HTMLInputElement>(null);

  // Links like /contact?service=… can change while the page stays mounted.
  useEffect(() => {
    setValues((v) => ({ ...v, service: defaultService || v.service, message: defaultMessage || v.message, ...(defaultType ? { enquiryType: defaultType } : {}) }));
  }, [defaultService, defaultMessage, defaultType]);

  const serviceOptions = [
    ...services.map((s) => ({ value: s.title, label: s.title })),
    { value: 'General enquiry', label: 'Something else' },
  ];
  if (values.service && !serviceOptions.some((o) => o.value === values.service))
    serviceOptions.unshift({ value: values.service, label: values.service });

  const update = <K extends keyof ContactValues>(k: K, v: ContactValues[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (status === 'error') setStatus('idle');
    // Mobile and email are "one of the two": typing in either clears the shared message.
    const contact = k === 'phone' || k === 'email';
    if (errors[k] || (contact && (errors.phone || errors.email)) || (k === 'capacity' && errors.customKw)) {
      setErrors((er) => ({ ...er, [k]: undefined, ...(contact ? { phone: undefined, email: undefined } : {}), ...(k === 'capacity' ? { customKw: undefined } : {}) }));
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const errs = validateContact(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = CONTACT_FIELD_ORDER.find((k) => errs[k]);
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    setStatus('submitting');
    setServerError('');
    if (!submissionId.current) submissionId.current = newSubmissionId();
    const createdAt = new Date().toISOString();
    const { capacityKw, capacityChoice } = capacityPayload(values);
    const enquiryType = values.enquiryType || undefined;
    const fields = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      city: values.city.trim(),
      service: values.service.trim(),
      message: values.message.trim(),
    };
    try {
      await submitWebsiteEnquiry(
        buildPayload({ submissionId: submissionId.current, createdAt, ...fields, enquiryType, capacityKw, source, page: typeof window !== 'undefined' ? window.location.href : '' }),
        () => submitEnquiry({ ...fields, source, enquiryType, capacityKw, capacityChoice, submissionId: submissionId.current, createdAt }),
      );
      // Saved by the server: reset the form and show the Thank You popup.
      submissionId.current = '';
      setValues({ ...initial(), service: '', message: '' });
      setErrors({});
      setStatus('idle');
      setThanksOpen(true);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        const fe = err.fieldErrors as Record<string, string>;
        setErrors({ ...fe, capacity: fe.capacityKw ?? fe.capacityChoice } as ContactErrors);
      }
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong while sending your enquiry. Please try again.',
      );
      setStatus('error');
    } finally {
      inFlight.current = false;
    }
  };

  const submitting = status === 'submitting';
  const contactHintId = `${uid}-contact-hint`;
  const contactError = errors.phone && errors.phone === errors.email ? errors.phone : '';

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-busy={submitting || undefined} aria-label="Enquiry form">
        <p id={contactHintId} className={cn(
          'flex items-start gap-2.5 rounded-field border px-3.5 py-3 text-sm',
          contactError ? 'border-clay-500/40 bg-clay-100/70 text-clay-700' : 'border-ice-300/70 bg-ice-100/70 text-navy-600',
        )} role={contactError ? 'alert' : undefined}>
          {contactError ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span>{contactError || <>Only a <strong className="font-semibold">mobile number or email</strong> is required — every other field is optional.</>}</span>
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id={`${uid}-name`}
            label="Full name"
            autoComplete="name"
            maxLength={120}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name}
          />
          <Input
            id={`${uid}-city`}
            label="City or area"
            autoComplete="address-level2"
            maxLength={120}
            value={values.city}
            onChange={(e) => update('city', e.target.value)}
            error={errors.city}
          />
          <Input
            id={`${uid}-phone`}
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            maxLength={16}
            value={values.phone}
            onChange={(e) => update('phone', e.target.value)}
            error={contactError ? undefined : errors.phone}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone && !contactError ? `${uid}-phone-error` : contactHintId}
          />
          <Input
            id={`${uid}-email`}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            maxLength={200}
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            error={contactError ? undefined : errors.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email && !contactError ? `${uid}-email-error` : contactHintId}
          />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-ink-soft">What do you need?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ENQUIRY_TYPE_OPTIONS.map((o) => {
              const Icon = TYPE_ICONS[o.value];
              const checked = values.enquiryType === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    'group relative flex cursor-pointer items-center gap-3.5 rounded-card border-2 bg-surface p-4 transition-[border-color,background-color,box-shadow] duration-200',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sun-500',
                    checked ? 'border-navy-700 bg-ice-100/60 shadow-soft' : 'border-line hover:border-steel-400',
                  )}
                >
                  <input
                    id={o.value === 'home' ? `${uid}-enquiryType` : undefined}
                    type="radio"
                    name={`${uid}-enquiryType`}
                    value={o.value}
                    checked={checked}
                    onChange={() => update('enquiryType', o.value)}
                    className="sr-only"
                  />
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-field transition-colors', checked ? 'bg-navy-700 text-snow-50' : 'bg-ice-100 text-navy-600')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{o.label}</span>
                    <span className="block text-sm text-muted">{o.hint}</span>
                  </span>
                  <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors', checked ? 'border-navy-700' : 'border-navy-300')}>
                    <span className={cn('size-2.5 rounded-full bg-navy-700 transition-transform duration-200', checked ? 'scale-100' : 'scale-0')} />
                  </span>
                </label>
              );
            })}
          </div>
          {errors.enquiryType && <p className="text-sm text-clay-700" role="alert">{errors.enquiryType}</p>}
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-ink-soft">
            Solar capacity <span className="font-normal text-muted">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2" id={`${uid}-capacity`} tabIndex={-1}>
            {CAPACITY_OPTIONS.map((o) => {
              const checked = values.capacity === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    'cursor-pointer select-none rounded-chip border px-3.5 py-2 text-sm font-semibold tabular-nums transition-colors duration-150',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sun-500',
                    checked ? 'border-navy-700 bg-navy-700 text-snow-50 shadow-soft' : 'border-line bg-surface text-ink-soft hover:border-steel-400 hover:text-ink',
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-capacity`}
                    value={o.value}
                    checked={checked}
                    onChange={() => {
                      update('capacity', o.value);
                      if (o.value === 'custom') window.setTimeout(() => customKwRef.current?.focus(), 30);
                    }}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {errors.capacity && <p className="text-sm text-clay-700" role="alert">{errors.capacity}</p>}
          {values.capacity === 'custom' && (
            <Input
              ref={customKwRef}
              id={`${uid}-customKw`}
              label="Your capacity in kW (optional)"
              type="number"
              inputMode="decimal"
              min={0.5}
              step="any"
              placeholder="e.g. 12"
              wrapperClassName="mt-2 max-w-xs"
              value={values.customKw}
              onChange={(e) => update('customKw', e.target.value)}
              error={errors.customKw}
            />
          )}
        </fieldset>

        <Select
          id={`${uid}-service`}
          label="Service"
          options={serviceOptions}
          placeholder="Choose a service (optional)"
          value={values.service}
          onChange={(e) => update('service', e.target.value)}
          error={errors.service}
        />

        <Textarea
          id={`${uid}-message`}
          label="Message"
          maxLength={4000}
          placeholder="e.g. Monthly bill around ₹2,500, flat RCC roof of about 900 sq ft. (optional)"
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
          error={errors.message}
        />

        {status === 'error' && (
          <div role="alert" className="flex gap-3 rounded-field border border-clay-500/30 bg-clay-100/60 p-4 text-sm">
            <CircleAlert className="size-5 shrink-0 text-clay-500" aria-hidden />
            <div>
              <p className="font-semibold text-ink">Your enquiry was not submitted</p>
              <p className="text-ink-soft">{serverError} Your details are still filled in — please try again.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">We only use your details to reply to this enquiry.</p>
          <Button type="submit" size="lg" loading={submitting} rightIcon={<Send className="size-4" aria-hidden />} className="w-full sm:w-auto">
            {submitting ? 'Submitting…' : status === 'error' ? 'Try again' : 'Submit enquiry'}
          </Button>
        </div>
      </form>

      <SuccessDialog open={thanksOpen} onClose={() => setThanksOpen(false)} title="Thank You!">
        <p>Your enquiry has been submitted successfully.</p>
        <p>Our team will contact you soon.</p>
      </SuccessDialog>
    </>
  );
}
