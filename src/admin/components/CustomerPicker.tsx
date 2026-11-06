import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserRoundSearch } from 'lucide-react'
import { collectionQuery } from '@/queries'
import { normalizeMobile } from '@/lib/enquiries'
import { useAuth } from '@/context/AuthContext'
import { Button, Modal } from '@/components/ui'
import { SearchBox } from './AdminUI'

export interface CustomerDetails {
  name: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  /** Where the details were last seen, e.g. "Enquiry · 12 Oct" */
  from: string
  updatedAt: string
}

/**
 * Customer directory built from enquiries, proposals and quotations (one entry per mobile
 * number, latest details win). No separate customer table to keep in sync.
 */
export function useCustomers(): CustomerDetails[] {
  const { can } = useAuth()
  const enquiries = useQuery({ ...collectionQuery('enquiries'), enabled: can('leads:read') }).data ?? []
  const proposals = useQuery({ ...collectionQuery('proposals'), enabled: can('quotations:read') }).data ?? []
  const quotations = useQuery({ ...collectionQuery('quotations'), enabled: can('quotations:read') }).data ?? []
  return useMemo(() => {
    const map = new Map<string, CustomerDetails>()
    const add = (c: Omit<CustomerDetails, 'phone'> & { phone: string }) => {
      const key = normalizeMobile(c.phone) || c.phone.trim()
      if (!key || !c.name.trim()) return
      const prev = map.get(key)
      if (!prev || c.updatedAt > prev.updatedAt)
        map.set(key, {
          ...c,
          phone: key,
          email: c.email || prev?.email || '',
          address: c.address || prev?.address || '',
          city: c.city || prev?.city || '',
          state: c.state || prev?.state || '',
        })
    }
    for (const e of enquiries) add({ name: e.name, phone: e.phone, email: e.email, address: e.address ?? '', city: e.city, state: e.state ?? '', from: 'Enquiry', updatedAt: e.updatedAt ?? e.createdAt })
    for (const p of proposals) add({ name: p.customerName, phone: p.phone, email: p.email, address: p.address, city: p.city, state: p.state, from: `Proposal ${p.proposalNumber}`, updatedAt: p.updatedAt })
    for (const q of quotations) add({ name: q.customerName, phone: q.phone, email: q.email, address: q.address ?? '', city: q.city, state: q.state ?? '', from: `Quotation ${q.quoteNumber ?? ''}`.trim(), updatedAt: q.updatedAt ?? q.createdAt })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [enquiries, proposals, quotations])
}

/** "Use saved customer" button: search by name, mobile or city and fill the form. */
export function CustomerPicker({ onPick, label = 'Use saved customer' }: { onPick: (c: CustomerDetails) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const customers = useCustomers()
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return customers.filter((c) => words.every((w) => `${c.name} ${c.phone} ${c.city} ${c.email}`.toLowerCase().includes(w))).slice(0, 50)
  }, [customers, q])
  return (
    <>
      <Button type="button" size="sm" variant="secondary" leftIcon={<UserRoundSearch className="size-4" />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose a saved customer" description="From your enquiries, proposals and quotations." size="md">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, mobile or city" />
        {list.length ? (
          <ul className="mt-3 max-h-[55vh] divide-y divide-line overflow-y-auto rounded-card border border-line">
            {list.map((c) => (
              <li key={c.phone}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-ice-100/60 focus-visible:bg-ice-100/60"
                  onClick={() => { onPick(c); setOpen(false) }}
                >
                  <span>
                    <span className="block font-semibold text-ink">{c.name}</span>
                    <span className="block text-sm text-muted">{[c.phone, c.city, c.email].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{c.from}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-center text-sm text-muted">{customers.length ? 'No customer matches.' : 'No saved customers yet — they appear after you add an enquiry, proposal or quotation.'}</p>
        )}
      </Modal>
    </>
  )
}
