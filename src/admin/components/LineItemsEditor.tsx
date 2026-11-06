import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FieldErrors, LineItem } from '@/types';
import { createId } from '@/lib/id';
import { GST_RATE_OPTIONS, formatINR2, type Totals } from '@/lib/totals';
import { Button } from '@/components/ui';
import { IconAction } from './AdminUI';
import { cn } from '@/lib/cn';

export const blankLine = (): LineItem => ({
  id: createId('ln'),
  name: '',
  description: '',
  hsn: '',
  unit: 'Nos',
  quantity: 1,
  rate: 0,
  discountPct: 0,
  gstRate: 18,
});

const cell =
  'h-9 w-full rounded-[0.5rem] border border-line bg-surface px-2 text-sm focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40';
const num = (v: string) => (v === '' ? 0 : Number(v));

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  totals: Totals;
  errors?: FieldErrors;
  showDiscount?: boolean;
  max?: number;
  /** Show the Labour / Installation / Transport / … quick-add buttons. */
  quickAdd?: boolean;
}

/**
 * Editable price lines for quotations and invoices. Desktop: a compact table; phones: one
 * card per line. Amounts on the right are live previews; the server recomputes on save.
 */
export function LineItemsEditor({
  items,
  onChange,
  totals,
  errors = {},
  showDiscount = true,
  max = 100,
  quickAdd = true,
}: Props) {
  const update = (i: number, patch: Partial<LineItem>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const err = (i: number, k: string) => errors[`items.${i}.${k}`];

  return (
    <div className="grid gap-3">
      {errors.items && (
        <p role="alert" className="text-sm text-clay-700">
          {errors.items}
        </p>
      )}
      <div className="grid gap-3">
        {items.map((it, i) => (
          <div
            key={it.id}
            className="rounded-card border border-line bg-snow-100/60 p-3"
          >
            <div className="grid gap-2 md:grid-cols-[1fr_6rem_6rem_6rem]">
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                Item
                <input
                  className={cn(cell, err(i, 'name') && 'border-clay-500')}
                  value={it.name}
                  placeholder="e.g. Solar PV modules"
                  aria-invalid={!!err(i, 'name') || undefined}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                {err(i, 'name') && (
                  <span className="font-normal text-clay-700">
                    {err(i, 'name')}
                  </span>
                )}
              </label>
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                HSN/SAC
                <input
                  className={cell}
                  value={it.hsn}
                  inputMode="numeric"
                  onChange={(e) =>
                    update(i, {
                      hsn: e.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                Unit
                <input
                  className={cell}
                  value={it.unit}
                  onChange={(e) =>
                    update(i, { unit: e.target.value.slice(0, 12) })
                  }
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                SKU (optional)
                <input
                  className={cell}
                  value={it.sku ?? ''}
                  onChange={(e) =>
                    update(i, { sku: e.target.value.slice(0, 40) })
                  }
                />
              </label>
            </div>
            <label className="mt-2 grid gap-1 text-xs font-semibold text-ink-soft">
              Description (optional)
              <input
                className={cell}
                value={it.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </label>
            <div
              className={cn(
                'mt-2 grid grid-cols-2 gap-2',
                showDiscount
                  ? 'sm:grid-cols-[1fr_1fr_1fr_1fr_auto]'
                  : 'sm:grid-cols-[1fr_1fr_1fr_auto]',
              )}
            >
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                Qty
                <input
                  className={cn(cell, err(i, 'quantity') && 'border-clay-500')}
                  type="number"
                  min={0}
                  step="any"
                  value={it.quantity}
                  onChange={(e) => update(i, { quantity: num(e.target.value) })}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                Rate (₹, excl. GST)
                <input
                  className={cn(cell, err(i, 'rate') && 'border-clay-500')}
                  type="number"
                  min={0}
                  step="any"
                  value={it.rate}
                  onChange={(e) => update(i, { rate: num(e.target.value) })}
                />
              </label>
              {showDiscount && (
                <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                  Discount %
                  <input
                    className={cell}
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={it.discountPct}
                    onChange={(e) =>
                      update(i, {
                        discountPct: Math.min(100, num(e.target.value)),
                      })
                    }
                  />
                </label>
              )}
              <label className="grid gap-1 text-xs font-semibold text-ink-soft">
                GST
                <select
                  className={cell}
                  value={String(it.gstRate)}
                  onChange={(e) =>
                    update(i, { gstRate: Number(e.target.value) })
                  }
                >
                  {[
                    ...GST_RATE_OPTIONS,
                    ...(GST_RATE_OPTIONS.some(
                      (o) => Number(o.value) === it.gstRate,
                    )
                      ? []
                      : [
                          {
                            value: String(it.gstRate),
                            label: `${it.gstRate}%`,
                          },
                        ]),
                  ].map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-1 sm:justify-end">
                <div className="text-right text-sm">
                  <p className="font-semibold tabular-nums text-ink">
                    {formatINR2(totals.lines[i]?.total ?? 0)}
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    taxable {formatINR2(totals.lines[i]?.taxable ?? 0)}
                  </p>
                </div>
                <div className="flex">
                  <IconAction
                    label={`Move line ${i + 1} up`}
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="size-4" />
                  </IconAction>
                  <IconAction
                    label={`Move line ${i + 1} down`}
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                  >
                    <ArrowDown className="size-4" />
                  </IconAction>
                  <IconAction
                    label={`Remove line ${i + 1}`}
                    danger
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </IconAction>
                </div>
              </div>
            </div>
            {(err(i, 'quantity') || err(i, 'rate')) && (
              <p className="mt-1 text-xs text-clay-700">
                {err(i, 'quantity') || err(i, 'rate')}
              </p>
            )}
            {!it.hsn && (
              <p className="mt-1 text-xs text-sun-700">
                HSN/SAC is missing — confirm the applicable code before issuing
                a tax document.
              </p>
            )}
          </div>
        ))}
      </div>
      {!items.length && (
        <p className="rounded-field border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
          No price lines yet.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="size-4" />}
          onClick={() => onChange([...items, blankLine()])}
          disabled={items.length >= max}
        >
          Add custom item
        </Button>
        {quickAdd && (
          <>
            <span className="text-xs text-muted">Quick add:</span>
            {EXPENSES.map((x) => (
              <button
                key={x.name}
                type="button"
                disabled={items.length >= max}
                onClick={() => onChange([...items, { ...blankLine(), ...x }])}
                className="rounded-chip border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft hover:border-steel-400 disabled:opacity-40"
              >
                + {x.name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** One-tap lines for charges that are not products (rate is entered by the admin). */
const EXPENSES: Array<Partial<LineItem>> = [
  { name: 'Labour charges', unit: 'LOT', hsn: '', gstRate: 18 },
  { name: 'Installation & commissioning', unit: 'kW', hsn: '995442', gstRate: 18 },
  { name: 'Transportation', unit: 'LOT', hsn: '996511', gstRate: 18 },
  { name: 'Nuts, bolts & fasteners', unit: 'LOT', hsn: '73181500', gstRate: 18 },
  { name: 'Wires, cables & connectors', unit: 'LOT', hsn: '85446090', gstRate: 18 },
  { name: 'Other expenses', unit: 'LOT', hsn: '', gstRate: 18 },
];

/** Totals panel shown under the line items. */
export function TotalsPanel({
  totals,
  supplyType,
  extra,
}: {
  totals: Totals;
  supplyType: 'intra' | 'inter';
  extra?: Array<{
    label: string;
    value: number;
    tone?: 'good' | 'warn';
    strong?: boolean;
  }>;
}) {
  const rows: Array<{
    label: string;
    value: number;
    tone?: 'good' | 'warn';
    strong?: boolean;
  }> = [
    { label: 'Sub total', value: totals.subtotal },
    ...(totals.itemDiscount + totals.overallDiscount > 0
      ? [
          {
            label: 'Discount',
            value: -(totals.itemDiscount + totals.overallDiscount),
            tone: 'good' as const,
          },
        ]
      : []),
    { label: 'Taxable value', value: totals.taxableAmount },
    ...(supplyType === 'intra'
      ? [
          { label: 'CGST', value: totals.cgst },
          { label: 'SGST', value: totals.sgst },
        ]
      : [{ label: 'IGST', value: totals.igst }]),
    ...(totals.roundOff
      ? [{ label: 'Round off', value: totals.roundOff }]
      : []),
    { label: 'Grand total', value: totals.grandTotal, strong: true },
    ...(extra ?? []),
  ];
  return (
    <dl className="grid gap-1.5 rounded-card border border-line bg-snow-100/70 p-4 text-sm">
      {rows.map((r) => (
        <div
          key={r.label}
          className={cn(
            'flex justify-between gap-4',
            r.strong &&
              'border-t border-line pt-2 text-base font-semibold text-ink',
          )}
        >
          <dt className={cn('text-ink-soft', r.strong && 'text-ink')}>
            {r.label}
          </dt>
          <dd
            className={cn(
              'tabular-nums',
              r.tone === 'good' && 'text-leaf-700',
              r.tone === 'warn' && 'text-sun-500',
            )}
          >
            {r.value < 0 ? `– ${formatINR2(-r.value)}` : formatINR2(r.value)}
          </dd>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted">
        {supplyType === 'intra'
          ? 'Intra-state supply: CGST + SGST.'
          : 'Inter-state supply: IGST.'}{' '}
        Final figures are recalculated when you save.
      </p>
    </dl>
  );
}
