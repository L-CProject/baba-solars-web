import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { usePublished } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import type { Faq } from '@/types'
import { cn } from '@/lib/cn'
import { Button, EmptyState, Input, LinkButton } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { img } from '@/data/media'
import { FaqList } from '@/components/common/FaqList'
import { CtaBand } from '@/components/common/CtaBand'

const cats: Array<{ value: Faq['category'] | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'subsidy', label: 'Subsidy' },
  { value: 'maintenance', label: 'Maintenance' },
]

export default function FaqsPage() {
  const faqs = usePublished('faqs')
  useSeo({ title: 'Frequently asked questions', description: 'Answers about roof solar cost, PM Surya Ghar subsidy, installation time, roof space, cleaning and warranties in Raipur.', path: '/faqs' })
  const [cat, setCat] = useState<Faq['category'] | 'all'>('all')
  const [q, setQ] = useState('')

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase()
    return faqs.filter((f) => (cat === 'all' || f.category === cat) && (!s || `${f.question} ${f.answer}`.toLowerCase().includes(s)))
  }, [faqs, cat, q])

  return (
    <>
      <PageHero crumb="FAQs" image={img('panelSky', 2000)} title="Frequently Asked Questions" intro="Can't find yours? Call or WhatsApp and an engineer will answer." />
      <section className="section-y">
        <div className="container-site max-w-3xl">
          <div className="relative mb-5">
            <Input label="Search questions" hideLabel placeholder="Search, e.g. subsidy, cleaning, roof" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
            <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" aria-hidden />
          </div>
          <div role="group" aria-label="Filter by topic" className="mb-8 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c.value} type="button" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}
                className={cn('rounded-chip border px-4 py-2 text-sm font-semibold', cat === c.value ? 'border-navy-700 bg-navy-700 text-snow-50' : 'border-line bg-surface text-ink-soft hover:border-steel-400')}>
                {c.label}
              </button>
            ))}
          </div>
          <h2 className="sr-only">Questions and answers</h2>
          {visible.length ? (
            <FaqList key={`${cat}-${q}`} faqs={visible} />
          ) : (
            <EmptyState
              title="No matching questions"
              message="Try a different word, or ask us directly."
              action={<div className="flex gap-2"><Button variant="secondary" onClick={() => { setQ(''); setCat('all') }}>Clear search</Button><LinkButton to="/contact">Ask a question</LinkButton></div>}
            />
          )}
        </div>
      </section>
      <CtaBand />
    </>
  )
}
