import { useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import type { GalleryCategory, GalleryImage, PublishStatus } from '@/types'
import { useCollection } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { createId } from '@/lib/id'
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Segmented, Select } from '@/components/ui'
import { SmartImage } from '@/components/common/SmartImage'
import { GALLERY_CATEGORIES } from '@/pages/public/GalleryPage'
import { AdminPageHeader, FilterSelect, IconAction, StatusBadge, Toolbar } from '../components/AdminUI'
import { useCrud } from '../hooks/useCrud'
import { ImageUploadField } from '../components/ImageUploadField'

const blank = (order: number): GalleryImage => ({ id: createId('g'), imageUrl: '', caption: '', category: 'installation', status: 'published', order })
const label = (c: GalleryCategory) => GALLERY_CATEGORIES.find((x) => x.value === c)?.label ?? c

export default function GalleryAdminPage() {
  const gallery = useCollection('gallery')
  useSeo({ title: 'Gallery', path: '/admin/gallery', noIndex: true })
  const crud = useCrud('gallery', 'Photo')
  const [cat, setCat] = useState<GalleryCategory | 'all'>('all')
  const nextOrder = Math.max(0, ...gallery.map((g) => g.order)) + 1
  const rows = useMemo(() => gallery.filter((g) => cat === 'all' || g.category === cat).sort((a, b) => a.order - b.order), [gallery, cat])

  return (
    <>
      <AdminPageHeader
        title="Gallery"
        description="Photos shown on the Images page and in the home page photo slider."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blank(nextOrder))}>Add photo</Button>}
      />
      <Toolbar>
        <FilterSelect label="Category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, ...GALLERY_CATEGORIES]} />
        <p className="text-sm text-muted sm:ml-auto">{gallery.filter((g) => g.status === 'published').length} published of {gallery.length}</p>
      </Toolbar>
      {rows.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((g) => (
            <li key={g.id} className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
              <SmartImage src={g.imageUrl} alt={g.caption} className="aspect-[4/3] w-full" />
              <div className="p-4">
                <div className="flex items-center gap-2"><StatusBadge status={g.status} /><Badge tone="info">{label(g.category)}</Badge></div>
                <p className="mt-2 font-semibold text-ink">{g.caption || 'No caption'}</p>
                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <IconAction label={g.status === 'published' ? 'Hide photo' : 'Publish photo'} onClick={() => crud.quickUpdate({ ...g, status: g.status === 'published' ? 'draft' : 'published' }, g.status === 'published' ? 'Photo hidden' : 'Photo published')}>
                    {g.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </IconAction>
                  <IconAction label={`Edit photo ${g.caption}`} onClick={() => crud.openEdit(g)}><Pencil className="size-4" /></IconAction>
                  <IconAction label={`Delete photo ${g.caption}`} danger onClick={() => crud.setDeleting(g)}><Trash2 className="size-4" /></IconAction>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No photos here" message="Add installation photos to show them on the website." action={<Button onClick={() => crud.openNew(blank(nextOrder))}>Add photo</Button>} />
      )}
      <Modal open={!!crud.editing} onClose={crud.close} title={crud.isNew ? 'Add photo' : 'Edit photo'}
        footer={<><Button variant="secondary" onClick={crud.close}>Cancel</Button><Button type="submit" form="gallery-form" loading={crud.saving}>{crud.isNew ? 'Add photo' : 'Save changes'}</Button></>}>
        {crud.editing && <PhotoForm initial={crud.editing} onSave={(g) => void crud.save(g)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this photo?" message="It will be removed from the website gallery and home slider." confirmLabel="Delete photo" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function PhotoForm({ initial, onSave }: { initial: GalleryImage; onSave: (g: GalleryImage) => void }) {
  const [g, setG] = useState(initial)
  const [error, setError] = useState('')
  const set = <K extends keyof GalleryImage>(k: K, v: GalleryImage[K]) => setG((x) => ({ ...x, [k]: v }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!g.imageUrl.trim()) { setError('Add a photo URL or a path like /images/site-1.jpg.'); return }
    onSave(g)
  }
  return (
    <form id="gallery-form" onSubmit={submit} noValidate className="grid gap-5">
      <ImageUploadField label="Photo" required value={g.imageUrl} onChange={(v) => { set('imageUrl', v); setError('') }} error={error} hint="Upload a photo, or paste https://… or /images/file.jpg" />
      <Input label="Caption" value={g.caption} onChange={(e) => set('caption', e.target.value)} placeholder="3 kW home system, Deopuri" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Category" value={g.category} onChange={(e) => set('category', e.target.value as GalleryCategory)} options={GALLERY_CATEGORIES} />
        <Input label="Display order" type="number" value={g.order} onChange={(e) => set('order', Number(e.target.value))} />
      </div>
      <Segmented<PublishStatus> label="Status" value={g.status} onChange={(v) => set('status', v)} options={[{ value: 'draft', label: 'Hidden' }, { value: 'published', label: 'Published' }]} />
    </form>
  )
}
