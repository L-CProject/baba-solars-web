import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Wallet,
} from 'lucide-react';
import type {
  DocumentTitle,
  Invoice,
  InvoiceInput,
  InvoiceStatus,
  InvoiceTemplate,
  LineItem,
  PaymentMethod,
} from '@/types';
import {
  useAddPayment,
  useBusiness,
  useCreateInvoice,
  useDeleteInvoice,
  useInvoice,
  useInvoices,
  useRemovePayment,
  useUpdateInvoice,
} from '@/queries';
import { useSeo } from '@/hooks/useSeo';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, ApiError, type InvoiceQuery } from '@/services/api';
import { computeTotals, formatINR2 } from '@/lib/totals';
import { STATE_OPTIONS, stateName } from '@/lib/states';
import { addDaysISO, printBlob, safeFileName, todayISO } from '@/lib/files';
import { formatDate } from '@/lib/format';
import { indianPhone, optionalEmail, validate } from '@/lib/validation';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  Modal,
  Select,
  Skeleton,
  Textarea,
  type BadgeTone,
} from '@/components/ui';
import {
  AdminPageHeader,
  FilterSelect,
  IconAction,
  FilterDate,
  SearchBox,
  SortSelect,
  Toolbar,
} from '../components/AdminUI';
import {
  blankLine,
  LineItemsEditor,
  TotalsPanel,
} from '../components/LineItemsEditor';
import { PdfPreviewModal } from '../components/PdfPreview';
import { CatalogPicker } from '../components/CatalogPicker';
import { CustomerPicker } from '../components/CustomerPicker';
import { errorMessage } from '../hooks/useCrud';
import { InvoiceSubsidyEditor } from '../components/InvoiceSubsidyEditor';
import { useSaveDocuments } from '../hooks/useDocuments';

export const TEMPLATES: Array<{
  value: InvoiceTemplate;
  label: string;
  text: string;
}> = [
  {
    value: 'classic',
    label: 'Classic GST',
    text: 'Bordered tax invoice with every tax column — preferred by accountants.',
  },
  {
    value: 'modern',
    label: 'Modern',
    text: 'Navy header, summary cards and zebra rows — friendly for customers.',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    text: 'Clean black & white, lots of white space — prints well on any printer.',
  },
  {
    value: 'tally',
    label: 'Tally style',
    text: 'Same layout as your TallyPrime sales orders: bordered grid, Output CGST/SGST rows, HSN summary.',
  },
];
export const DOC_TITLES: Array<{ value: DocumentTitle; label: string }> = [
  { value: 'Tax Invoice', label: 'Tax Invoice' },
  { value: 'Proforma Invoice', label: 'Proforma Invoice (PI)' },
  { value: 'Sales Order', label: 'Sales Order' },
  { value: 'Bill of Supply', label: 'Bill of Supply (no GST registration)' },
];
export const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer (NEFT/RTGS/IMPS)' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'loan', label: 'Solar loan / finance' },
  { value: 'other', label: 'Other' },
];
const methodLabel = (m: string) =>
  METHODS.find((x) => x.value === m)?.label ?? m;

function payBadge(inv: Invoice): { tone: BadgeTone; label: string } {
  if (inv.status === 'cancelled')
    return { tone: 'neutral', label: 'Cancelled' };
  if (inv.status === 'draft') return { tone: 'neutral', label: 'Draft' };
  if (inv.paymentStatus === 'paid') return { tone: 'success', label: 'Paid' };
  if (inv.isOverdue) return { tone: 'danger', label: 'Overdue' };
  if (inv.paymentStatus === 'partial')
    return { tone: 'warning', label: 'Partly paid' };
  return { tone: 'info', label: 'Unpaid' };
}

const fileFor = (inv: Pick<Invoice, 'invoiceNumber' | 'customerName'>) =>
  `Invoice-${safeFileName(inv.invoiceNumber)}-${safeFileName(inv.customerName)}.pdf`;

export default function BillingPage() {
  useSeo({ title: 'Billing', path: '/admin/billing', noIndex: true });
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState<InvoiceQuery>({
    page: 1,
    pageSize: 20,
    sort: 'date_desc',
  });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Invoice | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(params.get('open'));
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const list = useInvoices(query);
  const del = useDeleteInvoice();
  const toast = useToast();

  // Debounced search → server query
  useEffect(() => {
    const t = setTimeout(
      () =>
        setQuery((q) =>
          q.q === (search || undefined)
            ? q
            : { ...q, q: search || undefined, page: 1 },
        ),
      300,
    );
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    const id = params.get('open');
    if (id) {
      setViewing(id);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const setFilter = <K extends keyof InvoiceQuery>(k: K, v: InvoiceQuery[K]) =>
    setQuery((q) => ({ ...q, [k]: v || undefined, page: 1 }));
  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const doDelete = async () => {
    const inv = deleting;
    setDeleting(null);
    if (!inv) return;
    try {
      await del.mutateAsync(inv.id);
      toast({ title: `Invoice ${inv.invoiceNumber} deleted` });
    } catch (e) {
      toast({
        tone: 'error',
        title: 'Not deleted',
        description: errorMessage(e),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Billing"
        description="GST invoices for solar systems and services: payments, dues, PDF and printing."
        actions={
          can('invoices:write') && (
            <>
              <LinkButton to="/admin/products" variant="secondary">Products & rates</LinkButton>
              <Button
                leftIcon={<Plus className="size-4" />}
                onClick={() => setEditing('new')}
              >
                New invoice
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Invoices',
            value: data ? String(data.summary.count) : '…',
            icon: FileText,
          },
          {
            label: 'Billed',
            value: data ? formatINR2(data.summary.billed) : '…',
            icon: IndianRupee,
          },
          {
            label: 'Received',
            value: data ? formatINR2(data.summary.paid) : '…',
            icon: Wallet,
            tone: 'text-leaf-700',
          },
          {
            label: 'Outstanding',
            value: data ? formatINR2(data.summary.due) : '…',
            icon: IndianRupee,
            tone: 'text-sun-500',
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-card border border-line bg-surface p-4 shadow-soft"
          >
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{k.label}</span>
              <k.icon className="size-4" aria-hidden />
            </div>
            <p
              className={cn(
                'mt-1 font-display text-lg tabular-nums text-ink sm:text-2xl',
                k.tone,
              )}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>
      <p className="-mt-2 mb-4 text-xs text-muted">
        Totals follow the filters below (cancelled invoices excluded).
      </p>

      <Toolbar>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search number, customer, phone, GSTIN, reference"
        />
        <FilterSelect
          label="Payment"
          value={query.paymentStatus ?? ''}
          onChange={(v) =>
            setFilter('paymentStatus', v as InvoiceQuery['paymentStatus'])
          }
          options={[
            { value: '', label: 'All' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partly paid' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' },
          ]}
        />
        <FilterSelect
          label="Status"
          value={query.status ?? ''}
          onChange={(v) => setFilter('status', v as InvoiceStatus)}
          options={[
            { value: '', label: 'All' },
            { value: 'issued', label: 'Issued' },
            { value: 'draft', label: 'Draft' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <FilterDate label="From" value={query.from ?? ''} onChange={(v) => setFilter('from', v)} />
        <FilterDate label="To" value={query.to ?? ''} min={query.from || undefined} onChange={(v) => setFilter('to', v)} />
        <SortSelect
          value={query.sort ?? 'date_desc'}
          onChange={(v) => setFilter('sort', v as InvoiceQuery['sort'])}
          options={[
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'amount_desc', label: 'Amount: high → low' },
            { value: 'amount_asc', label: 'Amount: low → high' },
            { value: 'due_asc', label: 'Due date' },
          ]}
        />
        {(query.from ||
          query.to ||
          query.status ||
          query.paymentStatus ||
          query.q) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setQuery({ page: 1, pageSize: 20, sort: 'date_desc' });
            }}
          >
            Clear filters
          </Button>
        )}
      </Toolbar>

      {list.isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState
          title="Invoices could not load"
          message={errorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : !data?.items.length ? (
        <EmptyState
          title={
            data?.total === 0 &&
            !query.q &&
            !query.status &&
            !query.paymentStatus
              ? 'No invoices yet'
              : 'No invoices match'
          }
          message="Create an invoice here, or convert an accepted quotation."
          action={
            can('invoices:write') ? (
              <Button onClick={() => setEditing('new')}>New invoice</Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={cn(
            'overflow-x-auto rounded-card border border-line bg-surface shadow-soft transition-opacity',
            list.isFetching && 'opacity-70',
          )}
        >
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead className="border-b border-line bg-snow-200/60 text-ink-soft">
              <tr>
                {[
                  'Invoice',
                  'Customer',
                  'Total',
                  'Paid / due',
                  'Status',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(
                      'px-4 py-3 font-semibold',
                      h === 'Actions' && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((inv) => {
                const b = payBadge(inv);
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-line last:border-0 hover:bg-ice-100/40"
                  >
                    <td className="px-4 py-3 align-top">
                      <button
                        className="text-left font-semibold text-ink hover:underline"
                        onClick={() => setViewing(inv.id)}
                      >
                        {inv.invoiceNumber}
                      </button>
                      <p className="text-muted">
                        {formatDate(inv.invoiceDate)}
                        {inv.documentTitle &&
                        inv.documentTitle !== 'Tax Invoice'
                          ? ` · ${inv.documentTitle}`
                          : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-ink">
                        {inv.customerName}
                      </p>
                      <p className="text-muted">
                        {[inv.phone, inv.city].filter(Boolean).join(', ')}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-semibold tabular-nums">
                      {formatINR2(inv.grandTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums">
                      <p className="text-leaf-700">
                        {formatINR2(inv.amountPaid)}
                      </p>
                      <p
                        className={
                          inv.amountDue > 0 ? 'text-sun-500' : 'text-muted'
                        }
                      >
                        {formatINR2(inv.amountDue)} due
                        {inv.dueDate && inv.amountDue > 0
                          ? ` · ${formatDate(inv.dueDate)}`
                          : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={b.tone}>{b.label}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconAction
                          label={`Open ${inv.invoiceNumber}`}
                          onClick={() => setViewing(inv.id)}
                        >
                          <Eye className="size-4" />
                        </IconAction>
                        {can('invoices:write') && (
                          <IconAction
                            label={`Edit ${inv.invoiceNumber}`}
                            onClick={() => setEditing(inv)}
                          >
                            <Pencil className="size-4" />
                          </IconAction>
                        )}
                        {can('invoices:delete') && (
                          <IconAction
                            label={`Delete ${inv.invoiceNumber}`}
                            danger
                            onClick={() => setDeleting(inv)}
                          >
                            <Trash2 className="size-4" />
                          </IconAction>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
            <span className="text-muted">
              {data.total} invoice{data.total === 1 ? '' : 's'} · page{' '}
              {data.page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<ChevronLeft className="size-4" />}
                disabled={data.page <= 1}
                onClick={() =>
                  setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))
                }
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                rightIcon={<ChevronRight className="size-4" />}
                disabled={data.page >= pages}
                onClick={() =>
                  setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <InvoiceEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(inv) => {
            setEditing(null);
            setViewing(inv.id);
          }}
        />
      )}
      {viewing && (
        <InvoiceDetail
          id={viewing}
          onClose={() => setViewing(null)}
          onEdit={(inv) => {
            setViewing(null);
            setEditing(inv);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this invoice?"
        message={`Invoice ${deleting?.invoiceNumber} will be permanently removed. For GST records it is usually better to edit it and set the status to Cancelled.`}
        confirmLabel="Delete invoice"
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

// ─── Detail: payments + PDF ──────────────────────────────────────────────────
function InvoiceDetail({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit: (inv: Invoice) => void;
}) {
  const { data: inv, isPending, isError, error, refetch } = useInvoice(id);
  const { can } = useAuth();
  const addPayment = useAddPayment();
  const removePayment = useRemovePayment();
  const toast = useToast();
  const docs = useSaveDocuments();
  const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [pay, setPay] = useState({
    date: todayISO(),
    amount: '',
    method: 'upi' as PaymentMethod,
    reference: '',
    note: '',
  });
  const [payError, setPayError] = useState('');
  const tpl = template ?? inv?.template ?? 'classic';

  const submitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!inv) return;
    const amount = Number(pay.amount);
    if (!Number.isFinite(amount) || !(amount > 0))
      return setPayError('Enter an amount greater than 0.');
    if (!pay.date)
      return setPayError('Choose the date the payment was received.');
    if (amount > inv.amountDue + 0.001)
      return setPayError(
        `That is more than the balance due (${formatINR2(inv.amountDue)}).`,
      );
    setPayError('');
    try {
      const updated = await addPayment.mutateAsync({ id: inv.id, payment: { ...pay, amount } });
      if (updated) void docs.saveInvoice(updated, true);
      setPay((p) => ({ ...p, amount: '', reference: '', note: '' }));
      toast({ title: 'Payment recorded', description: formatINR2(amount) });
    } catch (err) {
      setPayError(errorMessage(err));
    }
  };
  const quickPrint = async () => {
    if (!inv) return;
    setPrinting(true);
    try {
      printBlob(await api.invoicePdf(inv.id, tpl));
    } catch (e) {
      toast({
        tone: 'error',
        title: 'Could not print',
        description: errorMessage(e),
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={inv ? `Invoice ${inv.invoiceNumber}` : 'Invoice'}
        description={
          inv
            ? `${inv.customerName} · ${formatDate(inv.invoiceDate)}`
            : undefined
        }
        size="lg"
        footer={
          inv && (
            <>
              {can('invoices:write') && (
                <Button
                  variant="secondary"
                  leftIcon={<Pencil className="size-4" />}
                  onClick={() => onEdit(inv)}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="secondary"
                leftIcon={<Printer className="size-4" />}
                onClick={() => void quickPrint()}
                loading={printing}
              >
                Print
              </Button>
              <Button
                leftIcon={<Eye className="size-4" />}
                onClick={() => setPdfOpen(true)}
              >
                Preview & download PDF
              </Button>
            </>
          )
        }
      >
        {isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
          </div>
        ) : isError || !inv ? (
          <ErrorState
            message={errorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ['Total', formatINR2(inv.grandTotal)],
                ['Paid', formatINR2(inv.amountPaid)],
                ['Due', formatINR2(inv.amountDue)],
                ['Due date', formatDate(inv.dueDate ?? '')],
                ...(inv.subsidy?.show && inv.subsidy.total > 0
                  ? [
                      ['Central subsidy', formatINR2(inv.subsidy.central)],
                      ['State subsidy', formatINR2(inv.subsidy.state)],
                      ['Total subsidy', formatINR2(inv.subsidy.total)],
                      ['Net cost after subsidy', formatINR2(inv.subsidy.netCost)],
                    ]
                  : []),
              ].map(([k, v]) => (
                <div key={k} className="rounded-field bg-snow-200/60 p-3">
                  <p className="text-xs text-muted">{k}</p>
                  <p className="font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={payBadge(inv).tone}>{payBadge(inv).label}</Badge>
              <span className="text-sm text-muted">
                {inv.placeOfSupply} ·{' '}
                {inv.supplyType === 'intra' ? 'CGST + SGST' : 'IGST'} ·{' '}
                {inv.items.length} line{inv.items.length === 1 ? '' : 's'}
              </span>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-soft">
                Invoice design
              </legend>
              <TemplatePicker value={tpl} onChange={setTemplate} />
            </fieldset>

            <section>
              <h3 className="mb-2 font-sans text-base font-semibold">
                Payments
              </h3>
              {inv.payments.length ? (
                <ul className="divide-y divide-line rounded-card border border-line">
                  {inv.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-semibold tabular-nums">
                          {formatINR2(p.amount)}{' '}
                          <span className="font-normal text-muted">
                            · {methodLabel(p.method)}
                          </span>
                        </p>
                        <p className="text-muted">
                          {formatDate(p.date)}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.note ? ` · ${p.note}` : ''}
                        </p>
                      </div>
                      {can('invoices:write') && (
                        <IconAction
                          label="Remove payment"
                          danger
                          onClick={() =>
                            void removePayment
                              .mutateAsync({ id: inv.id, paymentId: p.id })
                              .then(
                                (updated) => {
                                  toast({ title: 'Payment removed' });
                                  if (updated) void docs.saveInvoice(updated, true);
                                },
                                (e) =>
                                  toast({
                                    tone: 'error',
                                    title: 'Not removed',
                                    description: errorMessage(e),
                                  }),
                              )
                          }
                        >
                          <Trash2 className="size-4" />
                        </IconAction>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No payments recorded yet.</p>
              )}
              {can('invoices:write') &&
                inv.status === 'issued' &&
                inv.amountDue > 0 && (
                  <form
                    onSubmit={submitPayment}
                    className="mt-3 grid gap-3 rounded-card border border-line bg-snow-100/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
                    noValidate
                  >
                    <Input
                      label="Amount received"
                      prefix="₹"
                      type="number"
                      min={0}
                      step="any"
                      value={pay.amount}
                      onChange={(e) =>
                        setPay({ ...pay, amount: e.target.value })
                      }
                      placeholder={String(inv.amountDue)}
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={pay.date}
                      onChange={(e) => setPay({ ...pay, date: e.target.value })}
                    />
                    <Select
                      label="Method"
                      value={pay.method}
                      onChange={(e) =>
                        setPay({
                          ...pay,
                          method: e.target.value as PaymentMethod,
                        })
                      }
                      options={METHODS}
                    />
                    <Input
                      label="Reference / UTR"
                      value={pay.reference}
                      onChange={(e) =>
                        setPay({ ...pay, reference: e.target.value })
                      }
                    />
                    {payError && (
                      <p
                        role="alert"
                        className="text-sm text-clay-700 sm:col-span-2 lg:col-span-4"
                      >
                        {payError}
                      </p>
                    )}
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                      <Button
                        type="submit"
                        loading={addPayment.isPending}
                        leftIcon={<Wallet className="size-4" />}
                      >
                        Record payment
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setPay({ ...pay, amount: String(inv.amountDue) })
                        }
                      >
                        Full balance
                      </Button>
                    </div>
                  </form>
                )}
            </section>
          </div>
        )}
      </Modal>
      {inv && (
        <PdfPreviewModal
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          title={`Invoice ${inv.invoiceNumber}`}
          filename={fileFor(inv)}
          excel={{ filename: fileFor(inv).replace(/\.pdf$/, '.xlsx'), load: () => api.invoiceXlsx(inv.id) }}
          onSaveFiles={can('invoices:write') ? () => docs.saveInvoice({ ...inv, template: tpl }) : undefined}
          load={() => api.invoicePdf(inv.id, tpl)}
          reloadKey={`${inv.id}-${tpl}-${inv.updatedAt}`}
          toolbar={
            <Select
              label="Design"
              hideLabel
              value={tpl}
              onChange={(e) => setTemplate(e.target.value as InvoiceTemplate)}
              options={TEMPLATES.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
          }
        />
      )}
    </>
  );
}

export function TemplatePicker({
  value,
  onChange,
}: {
  value: InvoiceTemplate;
  onChange: (t: InvoiceTemplate) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      role="radiogroup"
      aria-label="Invoice template"
    >
      {TEMPLATES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'rounded-card border p-3 text-left transition-colors',
            value === t.value
              ? 'border-navy-700 bg-ice-100 ring-2 ring-sun-400/50'
              : 'border-line bg-surface hover:border-steel-400',
          )}
        >
          <TemplateThumb t={t.value} />
          <p className="mt-2 text-sm font-semibold text-ink">
            {t.label}
            {value === t.value ? ' · Selected' : ''}
          </p>
          <p className="text-xs text-muted">{t.text}</p>
          <span
            className={cn(
              'mt-2 inline-flex rounded-chip px-2.5 py-1 text-xs font-semibold',
              value === t.value
                ? 'bg-navy-700 text-white'
                : 'bg-snow-200 text-ink-soft',
            )}
          >
            {value === t.value ? 'Selected' : 'Select Template'}
          </span>
        </button>
      ))}
    </div>
  );
}

function TemplateThumb({ t }: { t: InvoiceTemplate }) {
  return (
    <div
      className="aspect-[4/3] overflow-hidden rounded-[0.5rem] border border-line bg-white p-1.5"
      aria-hidden
    >
      {t === 'tally' && (
        <div className="mx-auto mb-1 h-1.5 w-1/3 bg-navy-900" />
      )}
      {t === 'tally' && (
        <div className="grid grid-cols-2 border border-navy-900">
          <div className="h-7 border-r border-navy-900" />
          <div className="grid grid-rows-2">
            <div className="border-b border-navy-900" />
            <div />
          </div>
        </div>
      )}
      {t === 'modern' && (
        <div className="-m-1.5 mb-1 h-5 bg-navy-700">
          <div className="h-full w-1/3 border-b-2 border-sun-400" />
        </div>
      )}
      {t === 'classic' && <div className="mb-1 h-2 bg-navy-700" />}
      {t === 'minimal' && (
        <div className="mb-1 h-3 w-1/2 rounded-sm bg-navy-900" />
      )}
      <div className={cn('grid grid-cols-2 gap-1', t === 'tally' && 'hidden')}>
        <div
          className={cn(
            'h-5 rounded-sm',
            t === 'modern' ? 'bg-snow-200' : 'border border-line',
          )}
        />
        <div
          className={cn(
            'h-5 rounded-sm',
            t === 'modern'
              ? 'bg-snow-200'
              : t === 'classic'
                ? 'border border-line'
                : '',
          )}
        />
      </div>
      <div
        className={cn(
          'mt-1 h-2',
          t === 'modern'
            ? 'bg-navy-700'
            : t === 'classic'
              ? 'bg-ice-100'
              : t === 'tally'
                ? 'border border-navy-900'
                : 'border-b border-navy-900',
        )}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'h-1.5',
            t !== 'tally' && 'mt-0.5',
            t === 'modern' && i % 2
              ? 'bg-snow-200'
              : t === 'tally'
                ? 'border-x border-navy-900'
                : 'border-b border-line',
            t === 'classic' && 'border-x',
          )}
        />
      ))}
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────
function toInput(
  inv: Invoice | null,
  defaults: {
    template: InvoiceTemplate;
    dueDays: number;
    notes: string;
    stateCode: string;
  },
): InvoiceInput {
  if (!inv) {
    const date = todayISO();
    return {
      documentTitle: 'Tax Invoice',
      reference: '',
      invoiceDate: date,
      dueDate: addDaysISO(date, defaults.dueDays),
      template: defaults.template,
      status: 'issued',
      quotationId: null,
      customerName: '',
      phone: '',
      email: '',
      address: '',
      city: 'Raipur',
      state: stateName(defaults.stateCode) || 'Chhattisgarh',
      stateCode: defaults.stateCode || '22',
      gstin: '',
      items: [blankLine()],
      discountType: 'amount',
      discountValue: 0,
      paymentMethod: '',
      notes: defaults.notes,
      terms: '',
      initialPayment: null,
      subsidy: null,
    };
  }
  return {
    documentTitle: inv.documentTitle ?? 'Tax Invoice',
    reference: inv.reference ?? '',
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    template: inv.template,
    status: inv.status,
    quotationId: inv.quotationId,
    customerName: inv.customerName,
    phone: inv.phone,
    email: inv.email,
    address: inv.address,
    city: inv.city,
    state: inv.state,
    stateCode: inv.stateCode,
    gstin: inv.gstin,
    items: inv.items,
    discountType: inv.discountType,
    discountValue: inv.discountValue,
    paymentMethod: inv.paymentMethod,
    notes: inv.notes,
    terms: inv.terms,
    initialPayment: null,
    subsidy: inv.subsidy
      ? {
          show: inv.subsidy.show,
          auto: inv.subsidy.auto,
          capacityKw: inv.subsidy.capacityKw,
          propertyType: inv.subsidy.propertyType,
          systemType: inv.subsidy.systemType,
          central: inv.subsidy.auto ? null : inv.subsidy.central,
          state: inv.subsidy.auto ? null : inv.subsidy.state,
        }
      : null,
  };
}

function InvoiceEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Invoice | null;
  onClose: () => void;
  onSaved: (inv: Invoice) => void;
}) {
  const business = useBusiness().data;
  const create = useCreateInvoice();
  const update = useUpdateInvoice();
  const toast = useToast();
  const docs = useSaveDocuments();
  const isNew = !initial;
  const [f, setF] = useState<InvoiceInput>(() =>
    toInput(initial, {
      template: 'classic',
      dueDays: 15,
      notes: '',
      stateCode: '22',
    }),
  );
  const [receivedNow, setReceivedNow] = useState({
    amount: '',
    method: 'upi' as PaymentMethod,
    reference: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [seeded, setSeeded] = useState(!isNew);
  const formTouched = useRef(false);
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (seeded || !business) return;
    if (formTouched.current) {
      setSeeded(true);
      return;
    }
    setF(
      toInput(null, {
        template: business.invoice.defaultTemplate,
        dueDays: business.invoice.defaultDueDays,
        notes: business.invoice.defaultNotes,
        stateCode: business.stateCode,
      }),
    );
    setSeeded(true);
  }, [business, seeded]);

  const set = <K extends keyof InvoiceInput>(k: K, v: InvoiceInput[K]) => {
    formTouched.current = true;
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k as string];
      return n;
    });
  };
  const supplyType: 'intra' | 'inter' =
    !business || f.stateCode === business.stateCode ? 'intra' : 'inter';
  const totals = useMemo(
    () =>
      computeTotals(f.items, {
        supplyType,
        discountType: f.discountType,
        discountValue: f.discountValue,
        roundOff: business?.invoice.roundOff ?? true,
      }),
    [f.items, f.discountType, f.discountValue, supplyType, business],
  );
  const paidBefore = initial?.amountPaid ?? 0;

  const payload = (): InvoiceInput => ({
    ...f,
    initialPayment:
      isNew && Number(receivedNow.amount) > 0
        ? {
            date: f.invoiceDate,
            amount: Number(receivedNow.amount),
            method: receivedNow.method,
            reference: receivedNow.reference,
            note: 'Received with invoice',
          }
        : null,
  });

  const check = () => {
    const errs: Record<string, string> = {};
    if (!f.customerName.trim()) errs.customerName = 'Enter the customer name.';
    if (f.phone) {
      const m = indianPhone(f.phone);
      if (m) errs.phone = m;
    }
    const em = validate({ email: f.email }, { email: [optionalEmail] }).email;
    if (em) errs.email = em;
    if (!f.invoiceDate) errs.invoiceDate = 'Choose the invoice date.';
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin))
      errs.gstin = 'Enter a valid 15-character GSTIN.';
    else if (f.gstin && f.gstin.slice(0, 2) !== f.stateCode)
      errs.gstin = 'GSTIN state code does not match the selected state.';
    if (f.dueDate && f.dueDate < f.invoiceDate)
      errs.dueDate = 'Due date cannot be before the invoice date.';
    if (!f.items.length) errs.items = 'Add at least one item.';
    f.items.forEach((it, i) => {
      if (!it.name.trim()) errs[`items.${i}.name`] = 'Enter an item name.';
      if (!Number.isFinite(it.quantity) || !(it.quantity > 0))
        errs[`items.${i}.quantity`] =
          'Quantity must be a number greater than 0.';
      if (!Number.isFinite(it.rate) || it.rate <= 0)
        errs[`items.${i}.rate`] = 'Enter a valid selling price greater than 0.';
    });
    if (!Number.isFinite(f.discountValue) || f.discountValue < 0)
      errs.discountValue = 'Enter a valid discount of 0 or more.';
    else if (f.discountType === 'percent' && f.discountValue > 100)
      errs.discountValue = 'Discount cannot exceed 100%.';
    else if (f.discountType === 'amount' && f.discountValue > totals.subtotal)
      errs.discountValue = 'Discount cannot exceed the subtotal.';
    const recv = Number(receivedNow.amount);
    if (
      isNew &&
      receivedNow.amount !== '' &&
      (!Number.isFinite(recv) || recv < 0)
    )
      errs.received = 'Enter a valid amount of 0 or more.';
    else if (isNew && recv > totals.grandTotal)
      errs.received = 'Amount received is more than the invoice total.';
    if (!isNew && paidBefore > totals.grandTotal)
      errs.items = `Payments already received (${formatINR2(paidBefore)}) exceed the new total.`;
    return errs;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = check();
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast({
        tone: 'error',
        title: 'Fix the highlighted fields',
        description: Object.values(errs)[0],
      });
      return;
    }
    try {
      const saved = isNew
        ? await create.mutateAsync(payload())
        : await update.mutateAsync({ id: initial!.id, input: payload() });
      if (!saved) return;
      void docs.saveInvoice(saved, true);
      toast({
        title: isNew
          ? `Invoice ${saved.invoiceNumber} created`
          : 'Invoice saved',
        description: `${formatINR2(saved.grandTotal)} · ${saved.paymentStatus}`,
      });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast({
        tone: 'error',
        title: 'Invoice not saved',
        description: errorMessage(err),
      });
    }
  };

  return (
    <>
      <Modal
        open
        onClose={() => !saving && onClose()}
        title={isNew ? 'New invoice' : `Edit ${initial!.invoiceNumber}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Eye className="size-4" />}
              onClick={() => {
                const errs = check();
                setErrors(errs);
                if (!Object.keys(errs).length) setPreview(true);
              }}
            >
              Preview PDF
            </Button>
            <Button type="submit" form="invoice-form" loading={saving}>
              {isNew ? 'Create invoice' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form
          id="invoice-form"
          onSubmit={submit}
          noValidate
          className="grid gap-6"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-soft">
              Invoice design
            </legend>
            <TemplatePicker
              value={f.template}
              onChange={(t) => set('template', t)}
            />
          </fieldset>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Invoice date"
              type="date"
              required
              value={f.invoiceDate}
              onChange={(e) => set('invoiceDate', e.target.value)}
              error={errors.invoiceDate}
            />
            <Input
              label="Due date"
              type="date"
              value={f.dueDate ?? ''}
              onChange={(e) => set('dueDate', e.target.value || null)}
              error={errors.dueDate}
            />
            <Select
              label="Status"
              value={f.status}
              onChange={(e) => set('status', e.target.value as InvoiceStatus)}
              options={[
                { value: 'issued', label: 'Issued' },
                { value: 'draft', label: 'Draft' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Select
              label="Preferred payment method"
              value={f.paymentMethod}
              onChange={(e) =>
                set('paymentMethod', e.target.value as PaymentMethod | '')
              }
              options={[{ value: '', label: '—' }, ...METHODS]}
            />
            <Select
              label="Document type"
              value={f.documentTitle}
              onChange={(e) =>
                set('documentTitle', e.target.value as DocumentTitle)
              }
              options={DOC_TITLES}
              wrapperClassName="lg:col-span-2"
            />
            <Input
              label="Buyer's ref. / order no."
              value={f.reference}
              onChange={(e) => set('reference', e.target.value)}
              wrapperClassName="lg:col-span-2"
              hint="e.g. PO number or quotation no."
            />
            {isNew && (
              <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">
                The invoice number ({business?.invoice.prefix ?? 'BS/INV'}/…) is
                assigned automatically and in sequence when you create it.
              </p>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-3">
              <h3 className="font-sans text-base font-semibold">Bill to</h3>
              <CustomerPicker
                onPick={(c) => {
                  set('customerName', c.name);
                  set('phone', c.phone);
                  if (c.email) set('email', c.email);
                  if (c.address) set('address', c.address);
                  if (c.city) set('city', c.city);
                }}
              />
            </div>
            <Input
              label="Customer / business name"
              required
              value={f.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              error={errors.customerName}
            />
            <Input
              label="Mobile"
              type="tel"
              value={f.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={errors.phone}
            />
            <Input
              label="Email"
              type="email"
              value={f.email}
              onChange={(e) => set('email', e.target.value)}
              error={errors.email}
            />
            <Input
              label="Address"
              value={f.address}
              onChange={(e) => set('address', e.target.value)}
              wrapperClassName="sm:col-span-2"
            />
            <Input
              label="City"
              value={f.city}
              onChange={(e) => set('city', e.target.value)}
            />
            <Select
              label="State (place of supply)"
              value={f.stateCode}
              onChange={(e) =>
                setF((p) => ({
                  ...p,
                  stateCode: e.target.value,
                  state: stateName(e.target.value),
                }))
              }
              options={STATE_OPTIONS}
            />
            <Input
              label="Customer GSTIN (B2B)"
              value={f.gstin}
              maxLength={15}
              onChange={(e) => set('gstin', e.target.value.toUpperCase())}
              error={errors.gstin}
              hint="Leave empty for individuals."
            />
            <div className="flex items-center text-sm text-muted">
              {supplyType === 'intra'
                ? 'Same state: CGST + SGST'
                : 'Other state: IGST'}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-sans text-base font-semibold">
                Products & services
              </h3>
              <CatalogPicker
                onPick={(line) =>
                  set('items', [
                    ...f.items.filter((it) => it.name.trim() || it.rate),
                    line,
                  ])
                }
              />
            </div>
            <LineItemsEditor
              items={f.items}
              onChange={(items: LineItem[]) => set('items', items)}
              totals={totals}
              errors={errors}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <div className="grid content-start gap-4 sm:grid-cols-2">
              <Select
                label="Extra discount"
                value={f.discountType}
                onChange={(e) =>
                  set('discountType', e.target.value as 'amount' | 'percent')
                }
                options={[
                  { value: 'amount', label: 'Amount (₹)' },
                  { value: 'percent', label: 'Percent (%)' },
                ]}
              />
              <Input
                label={
                  f.discountType === 'percent' ? 'Discount %' : 'Discount ₹'
                }
                type="number"
                min={0}
                step="any"
                value={f.discountValue}
                onChange={(e) => set('discountValue', Number(e.target.value))}
                error={errors.discountValue}
                hint="Applied before GST, spread across lines."
              />
              {isNew ? (
                <div className="grid gap-3 rounded-card border border-line bg-snow-100/60 p-4 sm:col-span-2 sm:grid-cols-3">
                  <p className="text-sm font-semibold text-ink-soft sm:col-span-3">
                    Payment received now (optional)
                  </p>
                  <Input
                    label="Amount"
                    prefix="₹"
                    type="number"
                    min={0}
                    step="any"
                    value={receivedNow.amount}
                    onChange={(e) =>
                      setReceivedNow({ ...receivedNow, amount: e.target.value })
                    }
                    error={errors.received}
                  />
                  <Select
                    label="Method"
                    value={receivedNow.method}
                    onChange={(e) =>
                      setReceivedNow({
                        ...receivedNow,
                        method: e.target.value as PaymentMethod,
                      })
                    }
                    options={METHODS}
                  />
                  <Input
                    label="Reference"
                    value={receivedNow.reference}
                    onChange={(e) =>
                      setReceivedNow({
                        ...receivedNow,
                        reference: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-muted sm:col-span-2">
                  Payments are recorded from the invoice view (
                  {formatINR2(paidBefore)} received so far).
                </p>
              )}
            </div>
            <TotalsPanel
              totals={totals}
              supplyType={supplyType}
              extra={[
                ...(isNew && Number(receivedNow.amount) > 0
                  ? [
                      {
                        label: 'Received now',
                        value: -Number(receivedNow.amount),
                        tone: 'good' as const,
                      },
                      {
                        label: 'Balance due',
                        value: Math.max(
                          0,
                          totals.grandTotal - Number(receivedNow.amount),
                        ),
                        strong: true,
                        tone: 'warn' as const,
                      },
                    ]
                  : []),
                ...(!isNew && paidBefore > 0
                  ? [
                      {
                        label: 'Paid',
                        value: -paidBefore,
                        tone: 'good' as const,
                      },
                      {
                        label: 'Balance due',
                        value: Math.max(0, totals.grandTotal - paidBefore),
                        strong: true,
                        tone: 'warn' as const,
                      },
                    ]
                  : []),
              ]}
            />
          </section>

          <InvoiceSubsidyEditor
            input={f}
            grandTotal={totals.grandTotal}
            onChange={(v) => set('subsidy', v)}
            errors={errors}
          />
          <section className="grid gap-4 sm:grid-cols-2">
            <Textarea
              label="Notes (printed)"
              rows={3}
              value={f.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
            <Textarea
              label="Terms (printed)"
              rows={3}
              value={f.terms}
              onChange={(e) => set('terms', e.target.value)}
              hint="Leave empty to use the default terms from Settings."
            />
          </section>
        </form>
      </Modal>
      <PdfPreviewModal
        open={preview}
        onClose={() => setPreview(false)}
        title="Invoice preview (not saved yet)"
        filename={`Invoice-draft-${safeFileName(f.customerName || 'customer')}.pdf`}
        load={() => api.invoicePreviewPdf(payload(), initial?.id)}
        reloadKey={f.template}
        toolbar={
          <Select
            label="Design"
            hideLabel
            value={f.template}
            onChange={(e) => set('template', e.target.value as InvoiceTemplate)}
            options={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
          />
        }
      />
    </>
  );
}
