import { Link } from 'react-router'
import { Check } from 'lucide-react'
import type { Service } from '@/types'
import { cn } from '@/lib/cn'
import { Card, Icon } from '@/components/ui'

export function ServiceCard({ service, detailed = false }: { service: Service; detailed?: boolean }) {
  return (
    <Card
      as="article"
      interactive
      className={cn('relative flex h-full flex-col', service.highlight && 'border-sun-400 ring-1 ring-sun-400/60')}
      id={detailed ? service.slug : undefined}
    >
      {service.highlight && (
        <span className="badge-glow absolute -top-3 right-5 rounded-chip bg-accent px-3 py-1 text-xs font-semibold text-navy-900">{service.highlight}</span>
      )}
      <div className={cn('mb-4 grid size-11 place-items-center rounded-field', service.highlight ? 'bg-sun-300/40 text-navy-800' : 'bg-ice-100 text-navy-700')}>
        <Icon name={service.icon} className="size-5" />
      </div>
      <h3 className="font-sans text-lg font-semibold">{service.title}</h3>
      <p className="mt-2 text-muted">{detailed ? service.description : service.summary}</p>
      {detailed && (
        <ul className="mt-4 space-y-2">
          {service.includes.map((i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-soft"><Check className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-hidden />{i}</li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-sm font-semibold text-steel-600">{service.startingPrice}</span>
        <Link
          to={`/contact?service=${encodeURIComponent(service.title)}`}
          className="text-sm font-semibold text-ink underline decoration-ice-300 decoration-2 underline-offset-4 hover:decoration-sun-400"
          aria-label={`Enquire about ${service.title}`}
        >
          Enquire
        </Link>
      </div>
    </Card>
  )
}
