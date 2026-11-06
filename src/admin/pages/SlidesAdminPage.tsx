import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import type { HeroSlide, PublishStatus } from '@/types'
import { useCollection } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { createId } from '@/lib/id'
import { Button, ConfirmDialog, EmptyState, Input, Modal, Segmented, Textarea } from '@/components/ui'
import { SmartImage } from '@/components/common/SmartImage'
import { AdminPageHeader, IconAction, StatusBadge } from '../components/AdminUI'
import { useCrud } from '../hooks/useCrud'
import { ImageUploadField } from '../components/ImageUploadField'
import { useReorderList } from '../hooks/useReorderList'

const blank = (order: number): HeroSlide => ({
  id: createId('slide'), kicker: '', title: '', subtitle: '', imageUrl: '', ctaLabel: 'Get a free quote', ctaLink: '/contact', status: 'published', order,
})

export default function SlidesAdminPage() {
  const heroSlides = useCollection('heroSlides')
  useSeo({ title: 'Banner slides', path: '/admin/slides', noIndex: true })
  const crud = useCrud('heroSlides', 'Slide')
  const rows = [...heroSlides].sort((a, b) => a.order - b.order)
  const nextOrder = Math.max(0, ...heroSlides.map((s) => s.order)) + 1

  // Fixed: the old version saved two separate updates from a stale copy, so one was lost.
  const { move } = useReorderList('heroSlides')

  return (
    <>
      <AdminPageHeader
        title="Banner slides"
        description="The full-width slider at the top of the home page. Published slides play in this order."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blank(nextOrder))}>Add slide</Button>}
      />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-3 shadow-soft sm:flex-row sm:items-center">
              <SmartImage src={s.imageUrl} alt="" className="aspect-[16/9] w-full shrink-0 rounded-field sm:w-44" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={s.status} /><span className="text-sm text-muted">{s.kicker}</span></div>
                <p className="mt-1 font-semibold text-ink">{s.title || 'Untitled slide'}</p>
                <p className="truncate text-sm text-muted">Button: {s.ctaLabel || '—'} → {s.ctaLink || '—'}</p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-1.5">
                <IconAction label={`Move ${s.title} up`} disabled={i === 0} onClick={() => move(s.id, -1)}><ArrowUp className="size-4" /></IconAction>
                <IconAction label={`Move ${s.title} down`} disabled={i === rows.length - 1} onClick={() => move(s.id, 1)}><ArrowDown className="size-4" /></IconAction>
                <IconAction label={s.status === 'published' ? 'Hide slide' : 'Publish slide'} onClick={() => crud.quickUpdate({ ...s, status: s.status === 'published' ? 'draft' : 'published' }, s.status === 'published' ? 'Slide hidden' : 'Slide published')}>
                  {s.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconAction>
                <IconAction label={`Edit slide ${s.title}`} onClick={() => crud.openEdit(s)}><Pencil className="size-4" /></IconAction>
                <IconAction label={`Delete slide ${s.title}`} danger onClick={() => crud.setDeleting(s)}><Trash2 className="size-4" /></IconAction>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No banner slides" message="Without slides the home page starts directly with the offer section." action={<Button onClick={() => crud.openNew(blank(nextOrder))}>Add slide</Button>} />
      )}
      <Modal open={!!crud.editing} onClose={crud.close} title={crud.isNew ? 'Add banner slide' : 'Edit banner slide'} size="lg"
        footer={<><Button variant="secondary" onClick={crud.close}>Cancel</Button><Button type="submit" form="slide-form" loading={crud.saving}>{crud.isNew ? 'Add slide' : 'Save changes'}</Button></>}>
        {crud.editing && <SlideForm initial={crud.editing} onSave={(s) => void crud.save(s)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this slide?" message={`"${crud.deleting?.title}" will be removed from the home page banner.`} confirmLabel="Delete slide" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function SlideForm({ initial, onSave }: { initial: HeroSlide; onSave: (s: HeroSlide) => void }) {
  const [s, setS] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof HeroSlide>(k: K, v: HeroSlide[K]) => setS((x) => ({ ...x, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!s.title.trim()) errs.title = 'Enter a heading.'
    if (!s.imageUrl.trim()) errs.imageUrl = 'Add a photo URL or a path like /images/banner-1.jpg.'
    setErrors(errs)
    if (!Object.keys(errs).length) onSave(s)
  }

  return (
    <form id="slide-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="overflow-hidden rounded-card border border-line sm:col-span-2">
        <div className="relative">
          <SmartImage src={s.imageUrl} alt="Slide preview" className="aspect-[21/9] w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 to-navy-900/10 p-5 text-snow-50">
            {s.kicker && <span className="rounded-chip bg-sun-400 px-2.5 py-0.5 text-xs font-semibold text-navy-900">{s.kicker}</span>}
            <p className="mt-2 max-w-sm font-display text-xl leading-tight">{s.title || 'Slide heading'}</p>
          </div>
        </div>
      </div>
      <ImageUploadField label="Photo" required value={s.imageUrl} onChange={(v) => set('imageUrl', v)} error={errors.imageUrl} hint="Wide photo, at least 1600 px. Upload, or paste https://… or /images/file.jpg" wrapperClassName="sm:col-span-2" />
      <Input label="Small line above heading" placeholder="6 months' free cleaning service" value={s.kicker} onChange={(e) => set('kicker', e.target.value)} />
      <Segmented<PublishStatus> label="Status" value={s.status} onChange={(v) => set('status', v)} options={[{ value: 'draft', label: 'Hidden' }, { value: 'published', label: 'Published' }]} />
      <Input label="Heading" required value={s.title} onChange={(e) => set('title', e.target.value)} error={errors.title} wrapperClassName="sm:col-span-2" />
      <Textarea label="Text" rows={2} value={s.subtitle} onChange={(e) => set('subtitle', e.target.value)} wrapperClassName="sm:col-span-2" />
      <Input label="Button label" value={s.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} />
      <Input label="Button link" placeholder="/contact" value={s.ctaLink} onChange={(e) => set('ctaLink', e.target.value.trim())} hint="A page like /pricing or a full https:// link." />
    </form>
  )
}
