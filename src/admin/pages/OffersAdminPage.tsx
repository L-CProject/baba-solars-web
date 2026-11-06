import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, ExternalLink, Gift, ImagePlus, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import type { Offer, OfferImage, OfferSlab } from '@/types'
import { useSiteContent, useUpdateContent } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/services/api'
import { createId } from '@/lib/id'
import { formatINR } from '@/lib/format'
import { DIWALI_OFFER, normalizeOffer, offerThumb, offerDateRange, offerStatus, validateOffer, type OfferStatus } from '@/lib/offers'
import { Badge, Button, ConfirmDialog, EmptyState, Input, LinkButton, Modal, Select, Textarea, Toggle, type BadgeTone } from '@/components/ui'
import { AdminPageHeader, IconAction } from '../components/AdminUI'
import { errorMessage } from '../hooks/useCrud'
import { ImageUploadField } from '../components/ImageUploadField'

const blankSlab = (): OfferSlab => ({ id: createId('slab'), capacity: '', gifts: '' })
const blankOffer = (): Offer => ({
  id: createId('offer'), enabled: true, badge: '', title: '', description: '', slabs: [blankSlab()],
  bookingAmount: null, luckyDrawText: '', ctaLabel: 'Enquiry Now', images: [], validFrom: '', validUntil: '', terms: '',
})
const blankImage = (): OfferImage => ({ id: createId('img'), url: '', alt: '' })

const STATUS: Record<OfferStatus, { label: string; tone: BadgeTone }> = {
  live: { label: 'Live on website', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  ended: { label: 'Ended', tone: 'warning' },
  disabled: { label: 'Disabled', tone: 'neutral' },
}

/** Admin → Offers: add, edit, delete, enable/disable the offers shown on the home page. */
export default function OffersAdminPage() {
  const content = useSiteContent()
  const offers = content.offers ?? []
  const update = useUpdateContent()
  const toast = useToast()
  useSeo({ title: 'Offers', path: '/admin/offers', noIndex: true })
  const [editing, setEditing] = useState<{ offer: Offer; isNew: boolean } | null>(null)
  const [deleting, setDeleting] = useState<Offer | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  /** Saves the whole list (same storage as every other website text). */
  const saveList = async (list: Offer[], title: string, description?: string) => {
    try {
      await update.mutateAsync({ offers: list })
      toast({ title, description })
      return true
    } catch (e) {
      if (e instanceof ApiError && editing) {
        // Field errors come back as "offers.<i>.<field>" — show the ones for the offer being edited.
        const i = list.findIndex((o) => o.id === editing.offer.id)
        const prefix = `offers.${i}.`
        setFormErrors(Object.fromEntries(Object.entries(e.fieldErrors).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v])))
      }
      toast({ tone: 'error', title: 'Offer not saved', description: errorMessage(e) })
      return false
    }
  }

  const saveOffer = async (o: Offer) => {
    // An empty poster slot would be dropped silently when saving — ask for the image instead.
    const missing = Object.fromEntries(o.images.flatMap((img, i) => (img.url.trim() ? [] : [[`images.${i}.url`, 'Upload an image or remove this poster.']])))
    if (Object.keys(missing).length) { setFormErrors(missing); return }
    const clean = { ...normalizeOffer(o), updatedAt: new Date().toISOString() }
    const errs = validateOffer(clean)
    setFormErrors(errs)
    if (Object.keys(errs).length) return
    const exists = offers.some((x) => x.id === clean.id)
    const list = exists ? offers.map((x) => (x.id === clean.id ? clean : x)) : [...offers, clean]
    if (await saveList(list, exists ? 'Offer saved' : 'Offer added', clean.enabled ? 'The home page now shows it.' : 'It is disabled, so the home page does not show it.')) {
      setEditing(null)
      setFormErrors({})
    }
  }

  const toggle = (o: Offer) =>
    void saveList(offers.map((x) => (x.id === o.id ? { ...x, enabled: !x.enabled, updatedAt: new Date().toISOString() } : x)), o.enabled ? 'Offer disabled' : 'Offer enabled', o.enabled ? 'Hidden from the home page.' : 'Now shown on the home page.')

  const remove = async () => {
    if (!deleting) return
    const ok = await saveList(offers.filter((x) => x.id !== deleting.id), 'Offer deleted')
    if (ok) setDeleting(null)
  }

  const restoreDiwali = () =>
    void saveList([...offers, { ...structuredClone(DIWALI_OFFER), id: offers.some((o) => o.id === DIWALI_OFFER.id) ? createId('offer') : DIWALI_OFFER.id }], 'Diwali offer added')

  return (
    <>
      <AdminPageHeader
        title="Offers"
        description="The live offer leads the home page, has its own /offers page and a marquee on every page. An offer shows only when it is enabled and inside its dates."
        actions={
          <>
            <LinkButton href="/offers" external variant="secondary" leftIcon={<ExternalLink className="size-4" />}>View on website</LinkButton>
            <Button leftIcon={<Plus className="size-4" />} onClick={() => { setFormErrors({}); setEditing({ offer: blankOffer(), isNew: true }) }}>Add offer</Button>
          </>
        }
      />

      {offers.length ? (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li key={o.id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-start">
              {o.images[0] ? (
                <img src={offerThumb(o.images[0])} alt="" className="h-24 w-20 shrink-0 rounded-field border border-line object-cover" loading="lazy" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-field bg-sun-300/30 text-sun-500"><Gift className="size-6" aria-hidden /></span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS[offerStatus(o)].tone}>{STATUS[offerStatus(o)].label}</Badge>
                  {o.badge && <span className="text-sm text-muted">{o.badge}</span>}
                  {offerDateRange(o) && <span className="inline-flex items-center gap-1 text-sm text-muted"><CalendarDays className="size-3.5" aria-hidden />{offerDateRange(o)}</span>}
                  {o.images.length > 0 && <span className="text-sm text-muted">· {o.images.length} poster{o.images.length > 1 ? 's' : ''}</span>}
                </div>
                <p className="mt-1 font-semibold text-ink">{o.title || 'Untitled offer'}</p>
                {o.description && <p className="text-sm text-muted">{o.description}</p>}
                {o.slabs.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                    {o.slabs.map((s) => <li key={s.id} className="rounded-chip border border-line bg-canvas px-2.5 py-0.5"><span className="font-semibold">{s.capacity}</span>: {s.gifts}</li>)}
                  </ul>
                )}
                <p className="mt-2 text-sm text-muted">
                  {[o.bookingAmount != null ? `Booking ${formatINR(o.bookingAmount)}` : '', o.luckyDrawText].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3">
                <Toggle label="Show on site" checked={o.enabled} onChange={() => toggle(o)} />
                <IconAction label={`Edit offer ${o.title}`} onClick={() => { setFormErrors({}); setEditing({ offer: structuredClone(o), isNew: false }) }}><Pencil className="size-4" /></IconAction>
                <IconAction label={`Delete offer ${o.title}`} danger onClick={() => setDeleting(o)}><Trash2 className="size-4" /></IconAction>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Gift className="size-6" aria-hidden />}
          title="No offers"
          message="The home page offer section is hidden until you add and enable an offer."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" leftIcon={<RotateCcw className="size-4" />} onClick={restoreDiwali}>Add the Diwali offer</Button>
              <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing({ offer: blankOffer(), isNew: true })}>Add offer</Button>
            </div>
          }
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => !update.isPending && setEditing(null)}
        title={editing?.isNew ? 'Add offer' : 'Edit offer'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={update.isPending}>Cancel</Button>
            <Button type="submit" form="offer-form" loading={update.isPending}>{editing?.isNew ? 'Add offer' : 'Save changes'}</Button>
          </>
        }
      >
        {editing && <OfferForm key={editing.offer.id} initial={editing.offer} errors={formErrors} onSave={(o) => void saveOffer(o)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this offer?"
        message={`"${deleting?.title}" will be removed. To only hide it, turn it off instead.`}
        confirmLabel="Delete offer"
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function OfferForm({ initial, errors, onSave }: { initial: Offer; errors: Record<string, string>; onSave: (o: Offer) => void }) {
  const [o, setO] = useState<Offer>(initial)
  const set = <K extends keyof Offer>(k: K, v: Offer[K]) => setO((x) => ({ ...x, [k]: v }))
  const setSlab = (i: number, patch: Partial<OfferSlab>) => setO((x) => ({ ...x, slabs: x.slabs.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
  const setImage = (i: number, patch: Partial<OfferImage>) => setO((x) => ({ ...x, images: x.images.map((m, j) => (j === i ? { ...m, ...patch } : m)) }))
  /** A new file replaces the old one, so its pre-sized copies and size no longer apply. */
  const setImageUrl = (i: number, url: string) => setO((x) => ({
    ...x,
    images: x.images.map((m, j) => (j === i ? { id: m.id, url, alt: m.alt, ...(m.slabId ? { slabId: m.slabId } : {}) } : m)),
  }))
  const moveImage = (i: number, d: -1 | 1) => setO((x) => {
    const list = [...x.images]
    const j = i + d
    if (j < 0 || j >= list.length) return x
    ;[list[i], list[j]] = [list[j], list[i]]
    return { ...x, images: list }
  })
  const slabOptions = [{ value: '', label: 'General poster' }, ...o.slabs.filter((s) => s.capacity.trim()).map((s) => ({ value: s.id, label: `With the ${s.capacity} slab` }))]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave(o)
  }

  return (
    <form id="offer-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Toggle label="Show on the home page" checked={o.enabled} onChange={(v) => set('enabled', v)} description="Turn off to hide the offer without deleting it." />
      </div>
      <Input label="Badge (small label)" placeholder="Diwali Dhamaka Offer" value={o.badge} onChange={(e) => set('badge', e.target.value)} />
      <Input label="Button text" placeholder="Enquiry Now" value={o.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} hint="Opens the contact form." />
      <Input label="Title" required value={o.title} onChange={(e) => set('title', e.target.value)} error={errors.title} wrapperClassName="sm:col-span-2" placeholder="Solar lagwao, gifts uthao! ☀️📱🚗" />
      <Textarea label="Description" rows={2} value={o.description} onChange={(e) => set('description', e.target.value)} error={errors.description} wrapperClassName="sm:col-span-2" />

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-semibold text-ink-soft">kW slabs and gifts</legend>
        <ul className="space-y-3">
          {o.slabs.map((s, i) => (
            <li key={s.id} className="grid gap-3 rounded-field border border-line bg-canvas p-3 sm:grid-cols-[9rem_1fr_auto] sm:items-start">
              <Input label="Capacity" placeholder="3 kW" value={s.capacity} onChange={(e) => setSlab(i, { capacity: e.target.value })} error={errors[`slabs.${i}.capacity`]} />
              <Input label="Gift(s)" placeholder="TV + Speaker / RO + Induction" value={s.gifts} onChange={(e) => setSlab(i, { gifts: e.target.value })} error={errors[`slabs.${i}.gifts`]} />
              <div className="flex justify-end sm:pt-7">
                <IconAction label={`Remove slab ${s.capacity || i + 1}`} danger onClick={() => set('slabs', o.slabs.filter((_, j) => j !== i))}><X className="size-4" /></IconAction>
              </div>
            </li>
          ))}
        </ul>
        <Button variant="secondary" size="sm" className="mt-3" leftIcon={<Plus className="size-4" />} onClick={() => set('slabs', [...o.slabs, blankSlab()])} disabled={o.slabs.length >= 12}>Add slab</Button>
      </fieldset>

      <Input
        label="Booking amount (₹)"
        type="number"
        min={0}
        prefix="₹"
        value={o.bookingAmount ?? ''}
        onChange={(e) => set('bookingAmount', e.target.value === '' ? null : Number(e.target.value))}
        error={errors.bookingAmount}
        hint="Leave empty to hide."
      />
      <Textarea label="Lucky draw text" rows={2} value={o.luckyDrawText} onChange={(e) => set('luckyDrawText', e.target.value)} placeholder="Every booking gets a lucky draw coupon — win a Mahindra BE 6!" />
      <Input label="Starts on" type="date" value={o.validFrom} onChange={(e) => set('validFrom', e.target.value)} error={errors.validFrom} hint="Optional. Hidden on the website before this date." />
      <Input label="Ends on" type="date" value={o.validUntil} min={o.validFrom || undefined} onChange={(e) => set('validUntil', e.target.value)} error={errors.validUntil} hint="Optional. Hidden automatically after this date." />
      <Input label="Terms line" value={o.terms} onChange={(e) => set('terms', e.target.value)} wrapperClassName="sm:col-span-2" placeholder="T&C apply. Offer and gifts subject to applicable terms and conditions." />

      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold text-ink-soft">Posters &amp; banners</legend>
        <p className="mb-3 text-sm text-muted">The first poster leads the slider. Link a poster to a kW slab to show it on that slab’s card.</p>
        {o.images.length ? (
          <ul className="space-y-3">
            {o.images.map((img, i) => (
              <li key={img.id} className="grid gap-3 rounded-field border border-line bg-canvas p-3 sm:grid-cols-[5.5rem_1fr_auto]">
                {img.url ? (
                  <img src={offerThumb(img)} alt="" className="h-28 w-[5.5rem] rounded-field border border-line object-cover" loading="lazy" />
                ) : (
                  <span className="grid h-28 w-[5.5rem] place-items-center rounded-field border border-dashed border-line text-muted"><ImagePlus className="size-6" aria-hidden /></span>
                )}
                <div className="grid min-w-0 gap-3">
                  <ImageUploadField label={`Poster ${i + 1} image`} value={img.url} onChange={(url) => setImageUrl(i, url)} error={errors[`images.${i}.url`]} hint="" />
                  <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                    <Input label="Description (alt text)" value={img.alt} onChange={(e) => setImage(i, { alt: e.target.value })} error={errors[`images.${i}.alt`]} placeholder="3 kW system: free Smart TV + speaker" />
                    <Select label="Show with" value={img.slabId ?? ''} onChange={(e) => setImage(i, { slabId: e.target.value || undefined })} options={slabOptions} error={errors[`images.${i}.slabId`]} />
                  </div>
                </div>
                <div className="flex items-start justify-end gap-1.5 sm:flex-col">
                  <IconAction label={`Move poster ${i + 1} up`} onClick={() => moveImage(i, -1)} disabled={i === 0}><ArrowUp className="size-4" /></IconAction>
                  <IconAction label={`Move poster ${i + 1} down`} onClick={() => moveImage(i, 1)} disabled={i === o.images.length - 1}><ArrowDown className="size-4" /></IconAction>
                  <IconAction label={`Remove poster ${i + 1}`} danger onClick={() => set('images', o.images.filter((_, j) => j !== i))}><Trash2 className="size-4" /></IconAction>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-field border border-dashed border-line p-4 text-sm text-muted">No posters yet — the offer shows as text only.</p>
        )}
        <Button variant="secondary" size="sm" className="mt-3" leftIcon={<ImagePlus className="size-4" />} onClick={() => set('images', [...o.images, blankImage()])} disabled={o.images.length >= 12}>Add poster</Button>
      </fieldset>
    </form>
  )
}
