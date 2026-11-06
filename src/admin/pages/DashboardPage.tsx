import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  AlarmClock, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, CalendarRange, CircleAlert, Clock3, FilePen, FileText, FolderKanban, Gift,
  GalleryHorizontal, HelpCircle, Image, Images, Inbox, Mail, MessageSquareQuote, Minus, PhoneCall, Plus, ReceiptIndianRupee, RefreshCw, Sparkles,
  Tag, TrendingUp, Wrench, type LucideIcon,
} from 'lucide-react'
import type { DashboardAnalytics, DashboardRangeKey } from '@/types/api'
import { useAdminDashboard, useDashboardAnalytics } from '@/queries'
import { useAuth } from '@/context/AuthContext'
import { useSeo } from '@/hooks/useSeo'
import { formatDate, formatDateTime, formatLakh } from '@/lib/format'
import { ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, capacityLabel, enquiryDisplayName, enquiryTypeOf } from '@/lib/enquiries'
import { cn } from '@/lib/cn'
import { Button, EmptyState } from '@/components/ui'
import { ToneBadge } from '../components/AdminUI'
import { enquiryTone, quotationTone } from '../constants'
import {
  CapacityBars, ChartCard, ChartEmpty, ChartSkeleton, MonthlyBars, Sparkline, StatusDoughnut, TimelineChart, TypeComparison,
} from '../components/dashboard/DashboardCharts'

const RANGES: Array<{ key: DashboardRangeKey; label: string; short: string }> = [
  { key: 'all', label: 'All time', short: 'All' },
  { key: 'today', label: 'Today', short: 'Today' },
  { key: '7d', label: 'Last 7 days', short: '7 days' },
  { key: '30d', label: 'Last 30 days', short: '30 days' },
  { key: 'month', label: 'This month', short: 'Month' },
  { key: 'custom', label: 'Custom range', short: 'Custom' },
]
const isRange = (v: string | null): v is DashboardRangeKey => RANGES.some((r) => r.key === v)
const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
const nf = new Intl.NumberFormat('en-IN')

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  useSeo({ title: 'Dashboard', path: '/admin', noIndex: true })
  const { can, user } = useAuth()
  const canLeads = can('leads:read')
  const [params, setParams] = useSearchParams()

  // Filter lives in the URL (?range=7d, ?range=custom&from=…&to=…) so a refresh or shared link keeps it.
  const range: DashboardRangeKey = isRange(params.get('range')) ? (params.get('range') as DashboardRangeKey) : 'all'
  const from = isDay(params.get('from')) ? params.get('from')! : undefined
  const to = isDay(params.get('to')) ? params.get('to')! : undefined
  const customReady = range !== 'custom' || (!!from && !!to && from <= to)
  const query = useMemo(() => (range === 'custom' ? { range, from, to } : { range }), [range, from, to])

  const analytics = useDashboardAnalytics(query, canLeads && customReady)
  const dash = useAdminDashboard()
  const a = analytics.data
  const d = dash.data
  const loading = canLeads && analytics.isPending && customReady
  const refreshing = analytics.isFetching && !analytics.isPending

  const setRange = (key: DashboardRangeKey, extra: Record<string, string> = {}) => {
    const next = new URLSearchParams(params)
    next.delete('from'); next.delete('to')
    if (key === 'all') next.delete('range'); else next.set('range', key)
    for (const [k, v] of Object.entries(extra)) next.set(k, v)
    setParams(next, { replace: true })
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-steel-600">{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</p>
          <h1 className="mt-0.5 text-[1.75rem] leading-tight sm:text-3xl">Dashboard</h1>
          {a && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Clock3 className="size-3.5" aria-hidden /> Live data · updated {formatDateTime(a.generatedAt)}
              {refreshing && <RefreshCw className="size-3.5 animate-spin text-steel-500" aria-label="Refreshing" />}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
          {can('leads:read') && <HeaderLink to="/admin/enquiries" icon={Inbox}>Enquiries</HeaderLink>}
          {can('quotations:write') && <HeaderLink to="/admin/proposals?new=1" icon={Plus}>New proposal</HeaderLink>}
          {can('quotations:write') && <HeaderLink to="/admin/quotations?new=1" icon={Plus} primary>New quotation</HeaderLink>}
        </div>
      </div>

      {canLeads && (
        <>
          <RangeFilter range={range} from={from} to={to} onChange={setRange} label={a?.range.label} />

          {analytics.isError && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-clay-500/30 bg-clay-100/70 p-4 text-sm">
              <span className="inline-flex items-center gap-2 text-clay-700"><CircleAlert className="size-4.5" aria-hidden />
                {analytics.error instanceof Error ? analytics.error.message : 'The dashboard data could not be loaded.'}
              </span>
              <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="size-4" aria-hidden />} onClick={() => void analytics.refetch()}>Try again</Button>
            </div>
          )}

          {!customReady ? (
            <div className="mb-8"><ChartEmpty message="Pick a start and an end date (start on or before end) to see this range." height={140} /></div>
          ) : (
            <div className={cn('transition-opacity duration-200', refreshing && 'opacity-70')} aria-busy={loading || refreshing || undefined}>
              <LeadCards a={a} loading={loading} />

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Enquiries over time" subtitle={a ? `${a.range.label}${a.timeline.granularity !== 'day' ? ` · per ${a.timeline.granularity}` : ' · per day'}` : undefined}>
                  {loading || !a ? <ChartSkeleton height={260} /> : <TimelineChart data={a.timeline} />}
                </ChartCard>
                <ChartCard title="Enquiry status" subtitle="Where each lead is now">
                  {loading || !a ? <ChartSkeleton height={240} /> : <StatusDoughnut data={a.status} />}
                </ChartCard>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title="Home vs Commercial" subtitle="What customers need">
                  {loading || !a ? <ChartSkeleton height={180} /> : <TypeComparison data={a.types} />}
                </ChartCard>
                <ChartCard className="lg:col-span-2" title="Solar capacity requested" subtitle="From the enquiry form and calculator">
                  {loading || !a ? <ChartSkeleton height={220} /> : <CapacityBars data={a.capacity} notGiven={a.capacityNotGiven} />}
                </ChartCard>
              </div>

              <RecentLeads a={a} loading={loading} />

              <ChartCard className="mt-6" title="Monthly lead comparison" subtitle="Last 12 months · all enquiries vs converted (not affected by the date filter)">
                {loading || !a ? <ChartSkeleton height={240} /> : <MonthlyBars data={a.monthly} />}
              </ChartCard>
            </div>
          )}
        </>
      )}

      <BusinessSection dash={dash} />
      {!canLeads && !d && dash.isError && <EmptyState title="Dashboard unavailable" message="The data could not be loaded. Reload the page to try again." />}
    </div>
  )
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function RangeFilter({ range, from, to, onChange, label }: { range: DashboardRangeKey; from?: string; to?: string; onChange: (k: DashboardRangeKey, extra?: Record<string, string>) => void; label?: string }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  const [draft, setDraft] = useState({ from: from ?? '', to: to ?? today })
  const apply = () => { if (draft.from && draft.to && draft.from <= draft.to) onChange('custom', { from: draft.from, to: draft.to }) }
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[1.25rem] border border-line/80 bg-surface p-2 shadow-soft md:flex-row md:items-center md:justify-between">
      <div role="radiogroup" aria-label="Date range" className="no-scrollbar -m-0.5 flex gap-1 overflow-x-auto p-0.5">
        {RANGES.map((r) => {
          const active = range === r.key
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => (r.key === 'custom' ? onChange('custom', draft.from && draft.to && draft.from <= draft.to ? draft : {}) : onChange(r.key))}
              className={cn(
                'shrink-0 rounded-field px-3.5 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sun-500',
                active ? 'bg-navy-700 text-snow-50 shadow-soft' : 'text-ink-soft hover:bg-ice-100 hover:text-ink',
              )}
            >
              <span className="sm:hidden">{r.short}</span><span className="max-sm:hidden">{r.label}</span>
            </button>
          )
        })}
      </div>
      {range === 'custom' ? (
        <form className="flex flex-wrap items-end gap-2 px-1 pb-1 md:pb-0" onSubmit={(e) => { e.preventDefault(); apply() }}>
          <label className="grid gap-0.5 text-xs font-medium text-muted">From
            <input type="date" value={draft.from} max={draft.to || today} onChange={(e) => setDraft((x) => ({ ...x, from: e.target.value }))} className="h-9 rounded-field border border-line bg-canvas px-2.5 text-sm text-ink focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40" />
          </label>
          <label className="grid gap-0.5 text-xs font-medium text-muted">To
            <input type="date" value={draft.to} min={draft.from || undefined} max={today} onChange={(e) => setDraft((x) => ({ ...x, to: e.target.value }))} className="h-9 rounded-field border border-line bg-canvas px-2.5 text-sm text-ink focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-sun-400/40" />
          </label>
          <Button type="submit" size="sm" disabled={!draft.from || !draft.to || draft.from > draft.to}>Apply</Button>
        </form>
      ) : (
        <p className="inline-flex items-center gap-1.5 px-2 pb-1 text-sm text-muted md:pb-0"><CalendarRange className="size-4" aria-hidden /> Showing: <span className="font-semibold text-ink-soft">{label ?? RANGES.find((r) => r.key === range)?.label}</span></p>
      )}
    </div>
  )
}

// ─── Cards ────────────────────────────────────────────────────────────────────

const PREV_LABEL: Partial<Record<DashboardRangeKey, string>> = { today: 'vs yesterday', '7d': 'vs previous 7 days', '30d': 'vs previous 30 days', month: 'vs same days before', custom: 'vs previous period' }

/** Change vs the previous period — only when the server says older data exists for it. */
function Trend({ now, prev, range, tone = 'light' }: { now: number; prev: number | undefined; range: DashboardRangeKey; tone?: 'light' | 'dark' }) {
  if (prev === undefined) return null
  const diff = now - prev
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus
  const text = diff === 0 ? 'No change' : pct !== null ? `${diff > 0 ? '+' : ''}${pct}%` : `${diff > 0 ? '+' : ''}${nf.format(diff)}`
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', tone === 'dark'
      ? 'text-snow-200'
      : diff > 0 ? 'text-leaf-700' : diff < 0 ? 'text-clay-700' : 'text-muted')}
      title={`${nf.format(prev)} in the previous period`}>
      <Icon className="size-3.5" aria-hidden />{text} <span className={cn('font-normal', tone === 'dark' ? 'text-snow-300/80' : 'text-muted')}>{PREV_LABEL[range]}</span>
    </span>
  )
}

function LeadCards({ a, loading }: { a?: DashboardAnalytics; loading: boolean }) {
  const c = a?.cards
  const p = a?.previous ?? undefined
  const range = a?.range.key ?? 'all'
  const v = (n: number | undefined) => (n === undefined ? '—' : nf.format(n))
  const pct = (n?: number) => (c && c.total && n !== undefined ? `${Math.round((n / c.total) * 100)}% of enquiries` : '')
  const q = (s: string) => {
    const base = new URLSearchParams()
    if (s) base.set('status', s)
    return `/admin/enquiries${base.toString() ? `?${base}` : ''}`
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
      {/* Hero: total enquiries */}
      <Link to="/admin/enquiries" className="dash-rise group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 p-6 text-snow-50 shadow-card transition-shadow duration-300 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500">
        <span className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-sun-400/20 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-snow-300">Total enquiries</p>
            {loading || !c ? <span className="mt-2 block h-11 w-28 rounded-field bg-snow-50/10" /> : <p className="mt-1 font-display text-5xl font-semibold tabular-nums tracking-tight">{v(c.total)}</p>}
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-snow-50/10 text-sun-300 ring-1 ring-inset ring-snow-50/15"><Inbox className="size-5" aria-hidden /></span>
        </div>
        <div className="relative mt-3">
          {a && <Sparkline points={a.timeline.points} />}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            {c && p ? <Trend now={c.total} prev={p.total} range={range} tone="dark" /> : <span className="text-snow-300/90">{a?.range.label ?? ' '}</span>}
            <span className="inline-flex items-center gap-1 font-semibold text-sun-300 transition-transform duration-200 group-hover:translate-x-0.5">View all <ArrowRight className="size-4" aria-hidden /></span>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <StatCard to={q('new')} icon={Sparkles} accent="blue" label="New leads" value={v(c?.new)} sub={pct(c?.new) || 'Not yet looked at'} loading={loading} trend={c && p && <Trend now={c.new} prev={p.new} range={range} />} />
        <StatCard to={q('contacted,follow-up,interested,site-visit,proposal,quoted')} icon={PhoneCall} accent="orange" label="Contacted" value={v(c?.contacted)} sub="Reached, in progress" loading={loading} trend={c && p && <Trend now={c.contacted} prev={p.contacted} range={range} />} />
        <StatCard to={q('closed-all')} icon={BadgeCheck} accent="green" label="Closed" value={v(c?.closed)} sub={c ? `${nf.format(c.converted)} converted` : ' '} loading={loading} trend={c && p && <Trend now={c.closed} prev={p.closed} range={range} />} />
        <StatCard to="/admin/enquiries" icon={Clock3} accent="violet" label="Recent enquiries" value={v(c?.recent7d)} sub="Last 7 days" loading={loading} />
        <StatCard to="/admin/projects" icon={FolderKanban} accent="slate" label="Total projects" value={v(c?.projects)} sub={c ? `${nf.format(c.projectsPublished)} live on website` : ' '} loading={loading} />
        <StatCard to="/admin/services" icon={Wrench} accent="slate" label="Active services" value={v(c?.activeServices)} sub="Published on website" loading={loading} />
        <StatCard to="/admin/offers" icon={Gift} accent="slate" label="Published offers" value={v(c?.publishedOffers)} sub="Live today" loading={loading} className="col-span-2 md:col-span-2 lg:col-span-2 xl:col-span-2" />
      </div>
    </div>
  )
}

const ACCENTS = {
  blue: { chip: 'bg-ice-100 text-steel-600 ring-steel-500/15', bar: 'bg-steel-500' },
  orange: { chip: 'bg-sun-300/25 text-sun-500 ring-sun-500/20', bar: 'bg-sun-400' },
  green: { chip: 'bg-leaf-100 text-leaf-700 ring-leaf-500/20', bar: 'bg-leaf-500' },
  violet: { chip: 'bg-[#efedfb] text-[#5143b8] ring-[#6250d6]/15', bar: 'bg-[#6250d6]' },
  slate: { chip: 'bg-snow-200 text-navy-600 ring-navy-500/10', bar: 'bg-navy-300' },
} as const

function StatCard({ to, icon: Icon, accent, label, value, sub, loading, trend, className }: {
  to: string; icon: LucideIcon; accent: keyof typeof ACCENTS; label: string; value: string; sub: string; loading: boolean; trend?: ReactNode; className?: string
}) {
  const ac = ACCENTS[accent]
  return (
    <Link to={to} className={cn(
      'dash-rise group relative flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-line/80 bg-surface p-4 shadow-soft transition-[transform,box-shadow,border-color] duration-200 ease-soft sm:p-5',
      'hover:-translate-y-0.5 hover:border-steel-400/40 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500 motion-reduce:hover:translate-y-0',
      className,
    )}>
      <span className={cn('absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100', ac.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.8rem] font-medium leading-snug text-muted sm:text-sm">{label}</span>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset', ac.chip)}><Icon className="size-4.5" aria-hidden /></span>
      </div>
      {loading ? <span className="skeleton mt-3 block h-8 w-16 rounded-field" /> : <p className="mt-2 font-display text-[1.75rem] font-semibold leading-none tabular-nums text-ink sm:text-3xl">{value}</p>}
      <p className="mt-2 truncate text-xs text-muted sm:text-[0.8rem]">{sub}</p>
      {trend && <div className="mt-1.5">{trend}</div>}
    </Link>
  )
}

// ─── Recent 10 leads ──────────────────────────────────────────────────────────

function RecentLeads({ a, loading }: { a?: DashboardAnalytics; loading: boolean }) {
  const leads = a?.recentLeads ?? []
  return (
    <section className="dash-rise mt-6 overflow-hidden rounded-[1.25rem] border border-line/80 bg-surface shadow-soft" aria-labelledby="recent-leads-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 id="recent-leads-title" className="font-sans text-base font-semibold text-ink">Recent 10 leads</h2>
          <p className="text-sm text-muted">Newest first · {a?.range.label ?? ''}</p>
        </div>
        <Link to="/admin/enquiries" className="inline-flex h-9 items-center gap-1.5 rounded-field bg-navy-700 px-3.5 text-sm font-semibold text-snow-50 shadow-soft transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500">
          View all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>
      {loading ? (
        <div className="grid gap-2 p-5">{Array.from({ length: 5 }, (_, i) => <span key={i} className="skeleton h-10 rounded-field" />)}</div>
      ) : !leads.length ? (
        <div className="p-5"><ChartEmpty message="No enquiries in this period yet." height={140} /></div>
      ) : (
        <>
          {/* Table on tablets and larger */}
          <div className="overflow-x-auto max-md:hidden">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">The 10 most recent enquiries</caption>
              <thead className="bg-snow-100/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  {['Customer', 'Mobile', 'Email', 'Type', 'Capacity', 'Received', 'Status'].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold first:pl-6 last:pr-6">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((e) => {
                  const t = enquiryTypeOf(e)
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-ice-100/50">
                      <td className="max-w-[14rem] px-4 py-3 pl-6">
                        <Link to={`/admin/enquiries?open=${encodeURIComponent(e.id)}`} className={cn('block truncate font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-sun-500', e.name ? 'text-ink' : 'italic text-muted')}>{enquiryDisplayName(e)}</Link>
                        {e.city && <span className="block truncate text-xs text-muted">{e.city}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{e.phone || <span className="text-muted">—</span>}</td>
                      <td className="max-w-[13rem] truncate px-4 py-3 text-ink-soft">{e.email || <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3">{t ? <TypePill type={t} /> : <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{capacityLabel(e) || <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft" title={formatDateTime(e.createdAt)}>{formatDate(e.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 pr-6"><ToneBadge tone={enquiryTone[e.status]}>{ENQUIRY_STATUS_LABEL[e.status]}</ToneBadge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Cards on phones */}
          <ul className="divide-y divide-line md:hidden">
            {leads.map((e) => {
              const t = enquiryTypeOf(e)
              return (
                <li key={e.id}>
                  <Link to={`/admin/enquiries?open=${encodeURIComponent(e.id)}`} className="block px-5 py-3.5 transition-colors hover:bg-ice-100/50">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn('min-w-0 truncate font-semibold', e.name ? 'text-ink' : 'italic text-muted')}>{enquiryDisplayName(e)}</p>
                      <ToneBadge tone={enquiryTone[e.status]}>{ENQUIRY_STATUS_LABEL[e.status]}</ToneBadge>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-soft">
                      {e.phone && <span className="inline-flex items-center gap-1 tabular-nums"><PhoneCall className="size-3.5 text-muted" aria-hidden />{e.phone}</span>}
                      {e.email && <span className="inline-flex min-w-0 items-center gap-1 break-all"><Mail className="size-3.5 shrink-0 text-muted" aria-hidden />{e.email}</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">{[t ? ENQUIRY_TYPE_LABEL[t] : '', capacityLabel(e), formatDate(e.createdAt)].filter(Boolean).join(' · ')}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

function TypePill({ type }: { type: 'home' | 'commercial' }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-chip px-2.5 py-0.5 text-xs font-semibold', type === 'home' ? 'bg-ice-100 text-steel-600' : 'bg-sun-300/25 text-[#9a5c00]')}>
      <span className={cn('size-1.5 rounded-full', type === 'home' ? 'bg-steel-500' : 'bg-sun-500')} aria-hidden />{type === 'home' ? 'Home' : 'Commercial'}
    </span>
  )
}

// ─── Sales & website (existing dashboard data, restyled) ─────────────────────

function BusinessSection({ dash }: { dash: ReturnType<typeof useAdminDashboard> }) {
  const { can } = useAuth()
  const d = dash.data
  const leads = d?.leads
  const tiles = [
    { label: 'Follow-ups due', value: leads ? nf.format(leads.followUpsDue) : '—', sub: leads?.followUpsOverdue ? `${leads.followUpsOverdue} overdue` : 'None overdue', to: '/admin/enquiries?followUp=due', icon: AlarmClock, show: can('leads:read'), warn: !!leads?.followUpsOverdue },
    { label: 'Open proposals', value: d?.proposals ? nf.format(d.proposals.open) : '—', sub: d?.proposals ? `${formatLakh(d.proposals.openValue)} proposed` : '', to: '/admin/proposals', icon: FilePen, show: can('quotations:read') },
    { label: 'Open quotations', value: d?.quotations ? nf.format(d.quotations.open) : '—', sub: d?.quotations ? `${formatLakh(d.quotations.pipeline)} in pipeline` : '', to: '/admin/quotations', icon: FileText, show: can('quotations:read') },
    { label: 'Accepted value', value: d?.quotations ? formatLakh(d.quotations.acceptedValue) : '—', sub: 'Net after subsidy', to: '/admin/quotations', icon: TrendingUp, show: can('quotations:read') },
    { label: 'Billed this month', value: d?.billing ? formatLakh(d.billing.billed) : '—', sub: d?.billing ? `${formatLakh(d.billing.due)} due · ${d.billing.overdue} overdue` : '', to: '/admin/billing', icon: ReceiptIndianRupee, show: can('invoices:read') },
  ].filter((t) => t.show)

  const w = d?.website
  const website = [
    { label: 'Pricing plans', to: '/admin/pricing', icon: Tag, ...(w?.pricingPlans ?? { published: 0, draft: 0 }) },
    { label: 'Services', to: '/admin/services', icon: Wrench, ...(w?.services ?? { published: 0, draft: 0 }) },
    { label: 'Projects', to: '/admin/projects', icon: Image, ...(w?.projects ?? { published: 0, draft: 0 }) },
    { label: 'Testimonials', to: '/admin/reviews-faqs', icon: MessageSquareQuote, ...(w?.testimonials ?? { published: 0, draft: 0 }) },
    { label: 'Gallery photos', to: '/admin/gallery', icon: Images, ...(w?.gallery ?? { published: 0, draft: 0 }) },
    { label: 'Banner slides', to: '/admin/slides', icon: GalleryHorizontal, ...(w?.heroSlides ?? { published: 0, draft: 0 }) },
    { label: 'FAQs', to: '/admin/reviews-faqs?tab=faqs', icon: HelpCircle, ...(w?.faqs ?? { published: 0, draft: 0 }) },
  ]
  const quotes = d?.recentQuotations ?? []

  return (
    <>
      {tiles.length > 0 && (
        <>
          <SectionTitle>Sales pipeline</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            {tiles.map(({ label, value, sub, to, icon: Icon, warn }, i) => (
              <Link key={label} to={to} className={cn('dash-rise group flex min-w-0 items-center gap-3 rounded-[1.1rem] border border-line/80 bg-surface p-4 shadow-soft transition-[box-shadow,border-color] duration-200 hover:border-steel-400/40 hover:shadow-card focus-visible:outline-2 focus-visible:outline-sun-500', tiles.length % 2 === 1 && i === tiles.length - 1 && 'max-md:col-span-2')}>
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', warn ? 'bg-clay-100 text-clay-700' : 'bg-ice-100 text-navy-600')}><Icon className="size-4.5" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted">{label}</span>
                  <span className="block font-display text-xl font-semibold tabular-nums text-ink">{dash.isPending ? '…' : value}</span>
                  <span className="block truncate text-xs text-muted">{sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Website content</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {website.map(({ label, to, icon: Icon, published, draft }) => (
          <Link key={label} to={to} className="dash-rise rounded-[1.1rem] border border-line/80 bg-surface p-4 shadow-soft transition-[box-shadow,border-color] duration-200 hover:border-steel-400/40 hover:shadow-card focus-visible:outline-2 focus-visible:outline-sun-500">
            <Icon className="size-4.5 text-steel-500" aria-hidden />
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">{dash.isPending ? '…' : published}</p>
            <p className="text-sm font-medium text-ink-soft">{label}</p>
            <p className="text-xs text-muted">{draft ? `${draft} hidden` : 'All live'}</p>
          </Link>
        ))}
      </div>

      {can('quotations:read') && (
        <section className="dash-rise mt-6 overflow-hidden rounded-[1.25rem] border border-line/80 bg-surface shadow-soft">
          <header className="flex items-center justify-between px-5 pb-2 pt-4 sm:px-6">
            <h2 className="font-sans text-base font-semibold">Latest quotations</h2>
            <Link to="/admin/quotations" className="inline-flex items-center gap-1 text-sm font-semibold text-steel-600 hover:text-ink">View all <ArrowRight className="size-3.5" aria-hidden /></Link>
          </header>
          <ul className="divide-y divide-line">
            {quotes.length ? quotes.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{q.customerName}</p>
                  <p className="truncate text-sm text-muted">{q.quoteNumber ?? 'Website request'} · {q.capacityKw} kW · {formatLakh(q.netCost)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <ToneBadge tone={quotationTone[q.status]}>{q.status}</ToneBadge>
                  <p className="mt-1 text-xs text-muted">{formatDate(q.createdAt)}</p>
                </div>
              </li>
            )) : <li className="p-5"><EmptyState title="No quotations yet" message="Create one from an enquiry or proposal." /></li>}
          </ul>
        </section>
      )}
    </>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-9 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted">{children}</h2>
}

function HeaderLink({ to, icon: Icon, children, primary }: { to: string; icon: LucideIcon; children: ReactNode; primary?: boolean }) {
  return (
    <Link to={to} className={cn(
      'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-field px-4 text-sm font-semibold shadow-soft transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500',
      primary ? 'bg-primary text-snow-50 hover:bg-primary-hover' : 'border border-line bg-surface text-ink hover:bg-ice-100',
    )}>
      <Icon className="size-4" aria-hidden /> {children}
    </Link>
  )
}
