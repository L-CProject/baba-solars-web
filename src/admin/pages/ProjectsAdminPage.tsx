import { useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Project, ProjectCategory, PublishStatus } from '@/types'
import { useCollection } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { createId } from '@/lib/id'
import { formatMonth } from '@/lib/format'
import { Button, ConfirmDialog, EmptyState, Input, Modal, Segmented, Select, Textarea, Toggle } from '@/components/ui'
import { ProjectArt } from '@/components/common/ProjectArt'
import { SmartImage } from '@/components/common/SmartImage'
import { AdminPageHeader, DataTable, FilterSelect, IconAction, SearchBox, StatusBadge, Toolbar, linesToList, listToLines } from '../components/AdminUI'
import { useCrud } from '../hooks/useCrud'
import { ImageUploadField } from '../components/ImageUploadField'

const catOptions: Array<{ value: ProjectCategory; label: string }> = [
  { value: 'residential', label: 'Home' }, { value: 'commercial', label: 'Commercial' }, { value: 'industrial', label: 'Industrial' }, { value: 'maintenance', label: 'Maintenance' },
]

const blank = (): Project => ({
  id: createId('prj'), title: '', location: 'Raipur', category: 'residential', capacityKw: 3, completedOn: new Date().toISOString().slice(0, 7),
  summary: '', highlights: [], imageUrl: '', featured: false, status: 'published',
})

export default function ProjectsAdminPage() {
  const projects = useCollection('projects')
  useSeo({ title: 'Projects', path: '/admin/projects', noIndex: true })
  const crud = useCrud('projects', 'Project')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<ProjectCategory | 'all'>('all')

  const rows = useMemo(() => projects
    .filter((p) => (cat === 'all' || p.category === cat) && `${p.title} ${p.location}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.completedOn.localeCompare(a.completedOn)), [projects, q, cat])

  return (
    <>
      <AdminPageHeader title="Power plants & projects" description="Published projects appear on the Power Plants page." actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blank())}>Add project</Button>} />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search projects" />
        <FilterSelect label="Type" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, ...catOptions]} />
      </Toolbar>
      <DataTable
        caption="Projects"
        rows={rows}
        empty={<EmptyState title="No projects found" action={<Button onClick={() => crud.openNew(blank())}>Add project</Button>} />}
        columns={[
          { header: 'Project', cell: (p) => (
            <div className="flex gap-3">
              <div className="h-12 w-18 shrink-0 overflow-hidden rounded-field bg-ice-100">
                {p.imageUrl ? <SmartImage src={p.imageUrl} alt="" className="size-full" /> : <ProjectArt seed={p.id} category={p.category} className="size-full" />}
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-ink">{p.title || 'Untitled'}{p.featured && <Star className="size-3.5 fill-sun-400 text-sun-400" aria-label="Featured" />}</p>
                <p className="text-muted">{p.location}</p>
              </div>
            </div>) },
          { header: 'Type', cell: (p) => catOptions.find((c) => c.value === p.category)?.label },
          { header: 'Size', cell: (p) => `${p.capacityKw} kW` },
          { header: 'Completed', cell: (p) => formatMonth(p.completedOn) },
          { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
          { header: 'Actions', className: 'text-right', cell: (p) => (
            <div className="flex items-center justify-end gap-1.5">
              <IconAction label={p.featured ? 'Remove from featured' : 'Feature on home page'} onClick={() => crud.quickUpdate({ ...p, featured: !p.featured }, p.featured ? 'Removed from featured' : 'Featured on home page')}>
                <Star className={p.featured ? 'size-4 fill-sun-400 text-sun-400' : 'size-4'} />
              </IconAction>
              <IconAction label={p.status === 'published' ? 'Move to draft' : 'Publish'} onClick={() => crud.quickUpdate({ ...p, status: p.status === 'published' ? 'draft' : 'published' }, p.status === 'published' ? 'Moved to draft' : 'Published')}>
                {p.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </IconAction>
              <IconAction label={`Edit ${p.title}`} onClick={() => crud.openEdit(p)}><Pencil className="size-4" /></IconAction>
              <IconAction label={`Delete ${p.title}`} danger onClick={() => crud.setDeleting(p)}><Trash2 className="size-4" /></IconAction>
            </div>) },
        ]}
      />
      <Modal open={!!crud.editing} onClose={crud.close} title={crud.isNew ? 'Add project' : 'Edit project'} size="lg"
        footer={<><Button variant="secondary" onClick={crud.close}>Cancel</Button><Button type="submit" form="project-form" loading={crud.saving}>{crud.isNew ? 'Add project' : 'Save changes'}</Button></>}>
        {crud.editing && <ProjectForm initial={crud.editing} onSave={(p) => void crud.save(p)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this project?" message={`"${crud.deleting?.title}" will be removed from the gallery.`} confirmLabel="Delete project" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function ProjectForm({ initial, onSave }: { initial: Project; onSave: (p: Project) => void }) {
  const [p, setP] = useState(initial)
  const [highlights, setHighlights] = useState(listToLines(initial.highlights))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imgError, setImgError] = useState(false)
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!p.title.trim()) errs.title = 'Enter a project name.'
    if (!p.location.trim()) errs.location = 'Enter a location.'
    if (!(p.capacityKw > 0)) errs.capacityKw = 'Size must be more than 0.'
    if (p.imageUrl && !/^(https?:\/\/|\/|data:image\/)/.test(p.imageUrl)) errs.imageUrl = 'Use a full https:// link or a path like /images/site.jpg'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSave({ ...p, highlights: linesToList(highlights) })
  }

  return (
    <form id="project-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Input label="Project name" required value={p.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
      <Input label="Location" required value={p.location} onChange={(e) => set('location', e.target.value)} error={errors.location} />
      <Select label="Type" value={p.category} onChange={(e) => set('category', e.target.value as ProjectCategory)} options={catOptions} />
      <Input label="Size (kW)" type="number" step="0.5" min={0.5} value={p.capacityKw} onChange={(e) => set('capacityKw', Number(e.target.value))} error={errors.capacityKw} />
      <Input label="Completed (month)" type="month" value={p.completedOn} onChange={(e) => set('completedOn', e.target.value)} />
      <ImageUploadField label="Photo (optional)" value={p.imageUrl} onChange={(v) => { set('imageUrl', v); setImgError(false) }} error={errors.imageUrl} hint="Upload a photo, or leave empty to use an illustration." />
      <div className="sm:col-span-2 overflow-hidden rounded-card border border-line bg-ice-100">
        {p.imageUrl && !imgError ? (
          <img src={p.imageUrl} alt="Preview" className="aspect-[16/7] w-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="relative">
            <ProjectArt seed={p.id} category={p.category} className="aspect-[16/7] w-full" />
            {imgError && <p className="absolute inset-x-0 bottom-0 bg-clay-100/90 p-2 text-center text-sm text-clay-700">The image could not load. Check the URL.</p>}
          </div>
        )}
      </div>
      <Textarea label="Summary" rows={3} value={p.summary} onChange={(e) => set('summary', e.target.value)} wrapperClassName="sm:col-span-2" />
      <Textarea label="Highlights" hint="One per line, e.g. “Bill cut from ₹3,100 to ₹290”." rows={3} value={highlights} onChange={(e) => setHighlights(e.target.value)} wrapperClassName="sm:col-span-2" />
      <Segmented<PublishStatus> label="Status" value={p.status} onChange={(v) => set('status', v)} options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
      <div className="self-end"><Toggle label="Feature on home page" checked={p.featured} onChange={(v) => set('featured', v)} /></div>
    </form>
  )
}
