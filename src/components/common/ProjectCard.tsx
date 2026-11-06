import { MapPin } from 'lucide-react'
import type { Project } from '@/types'
import { formatMonth } from '@/lib/format'
import { Badge } from '@/components/ui'
import { ProjectArt } from './ProjectArt'
import { SmartImage } from './SmartImage'

const categoryLabel: Record<Project['category'], string> = {
  residential: 'Home', commercial: 'Commercial', industrial: 'Industrial', maintenance: 'Maintenance',
}

export function ProjectCard({ project, onOpen }: { project: Project; onOpen?: (p: Project) => void }) {
  const body = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden bg-ice-100">
        {project.imageUrl ? (
          <SmartImage src={project.imageUrl} alt={`${project.title}, ${project.location}`} className="size-full" />
        ) : (
          <ProjectArt seed={project.id} category={project.category} className="size-full" />
        )}
        <Badge tone="neutral" className="absolute left-3 top-3 bg-surface/90">{categoryLabel[project.category]}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-5 text-left">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-sans text-lg font-semibold">{project.title}</h3>
          <span className="shrink-0 font-display text-lg text-steel-600">{project.capacityKw} kW</span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-3.5" aria-hidden />{project.location}, {formatMonth(project.completedOn)}</p>
        <p className="mt-3 text-ink-soft">{project.summary}</p>
      </div>
    </>
  )

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft card-lift text-left"
        aria-haspopup="dialog"
      >
        {body}
      </button>
    )
  }
  return <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft">{body}</article>
}
