import { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import type { CatalogItem, LineItem } from '@/types';
import { useCatalog } from '@/queries';
import { catalogLine } from '@/lib/catalog';
import { formatINR2 } from '@/lib/totals';
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { SearchBox } from './AdminUI';

function useFiltered(q: string) {
  const { data, isPending } = useCatalog();
  const list = useMemo(
    () =>
      (data ?? []).filter((c) =>
        `${c.name} ${c.hsn} ${c.description}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [data, q],
  );
  return { list, isPending };
}

/** "Add from catalog" — pick a product (from the supplier sales orders) as an invoice line. */
export function CatalogPicker({
  onPick,
}: {
  onPick: (line: LineItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { list, isPending } = useFiltered(q);
  const pick = (c: CatalogItem) => {
    onPick(catalogLine(c));
    setOpen(false);
  };
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<PackagePlus className="size-4" />}
        onClick={() => setOpen(true)}
      >
        Add from catalog
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a product"
        description="Kits, structure, cables, hardware and services with HSN codes and GST."
        size="lg"
      >
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search product or HSN"
        />
        <div className="mt-3 max-h-[55dvh] overflow-y-auto">
          {isPending ? (
            <Skeleton className="h-40" />
          ) : !list.length ? (
            <EmptyState title="No products match" />
          ) : (
            <ul className="divide-y divide-line rounded-card border border-line">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-ice-100/60"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        HSN {c.hsn || '—'} · {c.unit}
                        {c.description ? ` · ${c.description}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      <span className="block font-semibold tabular-nums">
                        {formatINR2(c.rate)}
                      </span>
                      <span className="text-xs text-muted">
                        +{c.gstRate}% GST
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}

/** Billing → Products: manage the catalog. */
