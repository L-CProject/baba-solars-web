import { useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import type { IconName, PublishStatus, Service, ServiceGroup } from '@/types'
import { useCollection } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { createId } from '@/lib/id'
import { slugify } from '@/lib/format'
import { Button, ConfirmDialog, EmptyState, Icon, ICON_OPTIONS, Input, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { AdminPageHeader, DataTable, FilterSelect, IconAction, SearchBox, StatusBadge, Toolbar, linesToList, listToLines } from '../components/AdminUI'
import { useCrud } from '../hooks/useCrud'

const groupOptions: Array<{ value: ServiceGroup; label: string }> = [
  { value: 'installation', label: 'Installation' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'support', label: 'Repair & support' },
]

const blank = (order: number): Service => ({
  id: createId('svc'), slug: '', title: '', group: 'installation', icon: 'sun', summary: '', description: '', includes: [], startingPrice: '', status: 'published', order,
})

export default function ServicesAdminPage() {
  const services = useCollection('services')
  useSeo({ title: 'Services', path: '/admin/services', noIndex: true })
  const crud = useCrud('services', 'Service')
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<ServiceGroup | 'all'>('all')
  const nextOrder = Math.max(0, ...services.map((s) => s.order)) + 1

  const rows = useMemo(() => services
    .filter((s) => (group === 'all' || s.group === group) && `${s.title} ${s.summary}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.order - b.order), [services, q, group])

  return (
    <>
      <AdminPageHeader title="Services" description="Shown on the Services page, home page and contact form." actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => crud.openNew(blank(nextOrder))}>Add service</Button>} />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search services" />
        <FilterSelect label="Group" value={group} onChange={setGroup} options={[{ value: 'all', label: 'All' }, ...groupOptions]} />
      </Toolbar>
      <DataTable
        caption="Services"
        rows={rows}
        empty={<EmptyState title="No services found" action={<Button onClick={() => crud.openNew(blank(nextOrder))}>Add service</Button>} />}
        columns={[
          { header: 'Service', cell: (s) => (
            <div className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-field bg-ice-100 text-navy-700"><Icon name={s.icon} className="size-4" /></span>
              <div><p className="font-semibold text-ink">{s.title || 'Untitled'}</p><p className="max-w-sm text-muted">{s.summary}</p></div>
            </div>) },
          { header: 'Group', cell: (s) => groupOptions.find((g) => g.value === s.group)?.label },
          { header: 'Starting price', cell: (s) => <span className="text-ink-soft">{s.startingPrice || '—'}</span> },
          { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
          { header: 'Actions', className: 'text-right', cell: (s) => (
            <div className="flex items-center justify-end gap-1.5">
              <IconAction label={s.status === 'published' ? 'Move to draft' : 'Publish'} onClick={() => crud.quickUpdate({ ...s, status: s.status === 'published' ? 'draft' : 'published' }, s.status === 'published' ? 'Moved to draft' : 'Published')}>
                {s.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </IconAction>
              <IconAction label={`Edit ${s.title}`} onClick={() => crud.openEdit(s)}><Pencil className="size-4" /></IconAction>
              <IconAction label={`Delete ${s.title}`} danger onClick={() => crud.setDeleting(s)}><Trash2 className="size-4" /></IconAction>
            </div>) },
        ]}
      />
      <Modal open={!!crud.editing} onClose={crud.close} title={crud.isNew ? 'Add service' : 'Edit service'} size="lg"
        footer={<><Button variant="secondary" onClick={crud.close}>Cancel</Button><Button type="submit" form="service-form" loading={crud.saving}>{crud.isNew ? 'Add service' : 'Save changes'}</Button></>}>
        {crud.editing && <ServiceForm initial={crud.editing} onSave={(s) => void crud.save(s)} />}
      </Modal>
      <ConfirmDialog open={!!crud.deleting} title="Delete this service?" message={`"${crud.deleting?.title}" will be removed from the website.`} confirmLabel="Delete service" onConfirm={() => void crud.confirmDelete()} onCancel={() => crud.setDeleting(null)} />
    </>
  )
}

function ServiceForm({ initial, onSave }: { initial: Service; onSave: (s: Service) => void }) {
  const [s, setS] = useState(initial)
  const [includes, setIncludes] = useState(listToLines(initial.includes))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof Service>(k: K, v: Service[K]) => setS((x) => ({ ...x, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!s.title.trim()) errs.title = 'Enter a service name.'
    if (!s.summary.trim()) errs.summary = 'Enter a one-line summary.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSave({ ...s, slug: s.slug || slugify(s.title), includes: linesToList(includes) })
  }

  return (
    <form id="service-form" onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Input label="Service name" required value={s.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
      <Input label="URL anchor (slug)" value={s.slug} placeholder={slugify(s.title) || 'auto-generated'} onChange={(e) => set('slug', slugify(e.target.value))} />
      <Select label="Group" value={s.group} onChange={(e) => set('group', e.target.value as ServiceGroup)} options={groupOptions} />
      <Select label="Icon" value={s.icon} onChange={(e) => set('icon', e.target.value as IconName)} options={ICON_OPTIONS} />
      <Input label="Summary" required value={s.summary} onChange={(e) => set('summary', e.target.value)} error={errors.summary} wrapperClassName="sm:col-span-2" />
      <Textarea label="Description" rows={3} value={s.description} onChange={(e) => set('description', e.target.value)} wrapperClassName="sm:col-span-2" />
      <Textarea label="What's included" hint="One per line." rows={4} value={includes} onChange={(e) => setIncludes(e.target.value)} wrapperClassName="sm:col-span-2" />
      <Input label="Starting price text" placeholder="From ₹499 per visit" value={s.startingPrice} onChange={(e) => set('startingPrice', e.target.value)} />
      <Input label="Display order" type="number" value={s.order} onChange={(e) => set('order', Number(e.target.value))} />
      <Segmented<PublishStatus> label="Status" value={s.status} onChange={(v) => set('status', v)} options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} className="sm:col-span-2" />
    </form>
  )
}
