import { useMemo, useState } from 'react'
import { Check, MapPin, Search } from 'lucide-react'
import { usePublished } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import type { Project, ProjectCategory } from '@/types'
import { formatMonth } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button, EmptyState, Input, LinkButton, Modal } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { img } from '@/data/media'
import { ProjectCard } from '@/components/common/ProjectCard'
import { ProjectArt } from '@/components/common/ProjectArt'
import { SmartImage } from '@/components/common/SmartImage'
import { CtaBand } from '@/components/common/CtaBand'

const filters: Array<{ value: ProjectCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'Homes' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'maintenance', label: 'Maintenance' },
]

export default function ProjectsPage() {
  const projects = usePublished('projects')
  useSeo({ title: 'Power plants and projects', description: 'Roof solar installations and maintenance work by Baba Solars across Raipur, Durg, Bhilai, Dhamtari and Chhattisgarh.', path: '/projects' })
  const [filter, setFilter] = useState<ProjectCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Project | null>(null)

  const published = projects.filter((p) => p.status === 'published')
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return published
      .filter((p) => filter === 'all' || p.category === filter)
      .filter((p) => !q || `${p.title} ${p.location} ${p.summary}`.toLowerCase().includes(q))
      .sort((a, b) => b.completedOn.localeCompare(a.completedOn))
  }, [published, filter, query])

  const totalKw = published.reduce((s, p) => s + p.capacityKw, 0)

  return (
    <>
      <PageHero crumb="Power Plants" image={img('commercialRoofIndia', 2000)} title="Power Plants & Projects" intro={`A selection of ${published.length} recent installations and service jobs, totalling ${totalKw} kW.`} />

      <section className="section-y">
        <div className="container-site">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div role="group" aria-label="Filter projects by type" className="flex flex-wrap gap-2">
              {filters.map((f) => {
                const count = f.value === 'all' ? published.length : published.filter((p) => p.category === f.value).length
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={filter === f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'rounded-chip border px-4 py-2 text-sm font-semibold transition-colors',
                      filter === f.value ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-surface text-ink-soft hover:border-steel-400',
                    )}
                  >
                    {f.label} <span className="opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>
            <div className="relative w-full lg:max-w-xs">
              <Input label="Search projects" hideLabel placeholder="Search by name or place" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
              <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" aria-hidden />
            </div>
          </div>

          <h2 className="sr-only">Projects</h2>
          <p className="sr-only" aria-live="polite">{visible.length} projects shown</p>

          {visible.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => <ProjectCard key={p.id} project={p} onOpen={setActive} />)}
            </div>
          ) : (
            <EmptyState
              title="No projects match"
              message={query ? `Nothing found for “${query}”. Try a town name like Raipur or Durg.` : 'No projects in this category yet.'}
              action={<Button variant="secondary" onClick={() => { setFilter('all'); setQuery('') }}>Show all projects</Button>}
            />
          )}
        </div>
      </section>

      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title ?? ''} size="lg"
        footer={<><Button variant="secondary" onClick={() => setActive(null)}>Close</Button><LinkButton to="/contact">Plan a similar system</LinkButton></>}>
        {active && (
          <div>
            <div className="overflow-hidden rounded-card bg-ice-100">
              {active.imageUrl ? <SmartImage src={active.imageUrl} alt={active.title} className="aspect-[16/9] w-full" /> : <ProjectArt seed={active.id} category={active.category} className="aspect-[16/9] w-full" />}
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
              <div><dt className="text-muted">Capacity</dt><dd className="font-semibold">{active.capacityKw} kW</dd></div>
              <div><dt className="text-muted">Completed</dt><dd className="font-semibold">{formatMonth(active.completedOn)}</dd></div>
              <div><dt className="text-muted">Location</dt><dd className="flex items-center gap-1 font-semibold"><MapPin className="size-3.5" aria-hidden />{active.location}</dd></div>
            </dl>
            <p className="mt-5 text-lg text-ink-soft">{active.summary}</p>
            {active.highlights.length > 0 && (
              <ul className="mt-4 space-y-2">
                {active.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-1 size-4 text-leaf-500" aria-hidden />{h}</li>)}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <CtaBand title="Your roof could be next" />
    </>
  )
}
