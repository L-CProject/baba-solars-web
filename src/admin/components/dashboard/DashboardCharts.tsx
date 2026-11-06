import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardAnalytics } from '@/types/api'
import type { EnquiryStatus } from '@/types'
import { cn } from '@/lib/cn'

/**
 * Dashboard charts (recharts). Colours are the brand blue/orange plus validated categorical
 * slots (scripts: dataviz validate_palette — all checks pass on the light surface). Every chart has
 * visible numbers next to its colours (legend values / direct labels), so colour is never the only cue.
 */
export const VIZ = {
  blue: '#1f6fc4', // steel-500 (brand)
  orange: '#f39200', // sun-500 (brand)
  aqua: '#1baf7a',
  violet: '#6250d6',
  magenta: '#e87ba4',
  neutral: '#94a3b8',
  grid: '#e3eaf3',
  axis: '#52637c',
} as const

const nf = new Intl.NumberFormat('en-IN')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]}` }
const month = (ym: string, withYear = false) => { const [y, m] = ym.split('-'); return `${MONTHS[Number(m) - 1]}${withYear ? ` ${y}` : ` ’${y.slice(2)}`}` }

// ─── Shared pieces ──────────────────────────────────────────────────────────────

export function ChartCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('dash-rise flex min-w-0 flex-col rounded-[1.25rem] border border-line/80 bg-surface p-5 shadow-soft sm:p-6', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  )
}

export function ChartEmpty({ message = 'No enquiries in this period yet.', height = 220 }: { message?: string; height?: number }) {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-line bg-snow-100/60 px-4 text-center text-sm text-muted" style={{ height }}>
      {message}
    </div>
  )
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <div className="skeleton w-full rounded-card" style={{ height }} aria-hidden />
}

function TooltipBox({ title, rows }: { title: string; rows: Array<{ color?: string; label: string; value: string }> }) {
  return (
    <div className="min-w-36 rounded-field border border-line bg-surface px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-ink-soft">
          <span className="inline-flex items-center gap-1.5">{r.color && <span className="size-2.5 rounded-full" style={{ background: r.color }} />}{r.label}</span>
          <span className="font-semibold tabular-nums text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

const axisProps = { tick: { fill: VIZ.axis, fontSize: 12 }, tickLine: false, axisLine: false } as const

// ─── 1. Enquiries over time (area) ─────────────────────────────────────────────

export function TimelineChart({ data }: { data: DashboardAnalytics['timeline'] }) {
  const total = data.points.reduce((s, p) => s + p.total, 0)
  if (!total) return <ChartEmpty height={260} />
  const label = (b: string) => (data.granularity === 'month' ? month(b.slice(0, 7)) : day(b))
  const tipTitle = (b: string) => (data.granularity === 'month' ? month(b.slice(0, 7), true) : data.granularity === 'week' ? `Week of ${day(b)}` : day(b))
  return (
    <div className="h-[260px] w-full" role="img" aria-label={`Enquiries over time: ${total} in total, grouped by ${data.granularity}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIZ.blue} stopOpacity={0.28} />
              <stop offset="100%" stopColor={VIZ.blue} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={VIZ.grid} />
          <XAxis dataKey="bucket" tickFormatter={label} minTickGap={24} {...axisProps} />
          <YAxis allowDecimals={false} width={44} {...axisProps} />
          <Tooltip
            cursor={{ stroke: VIZ.axis, strokeDasharray: '3 3' }}
            content={({ active, payload }) => active && payload?.length
              ? <TooltipBox title={tipTitle(String(payload[0].payload.bucket))} rows={[{ color: VIZ.blue, label: 'Enquiries', value: nf.format(Number(payload[0].value)) }]} />
              : null}
          />
          <Area type="monotone" dataKey="total" name="Enquiries" stroke={VIZ.blue} strokeWidth={2} fill="url(#dash-area)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={!prefersReducedMotion()} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── 2. Status distribution (doughnut) ─────────────────────────────────────────

const STATUS_GROUPS: Array<{ key: string; label: string; color: string; statuses: EnquiryStatus[] }> = [
  { key: 'new', label: 'New', color: VIZ.blue, statuses: ['new'] },
  { key: 'pending', label: 'Pending', color: VIZ.magenta, statuses: ['pending'] },
  { key: 'progress', label: 'In progress', color: VIZ.orange, statuses: ['contacted', 'follow-up', 'interested', 'site-visit', 'proposal', 'quoted'] },
  { key: 'converted', label: 'Converted', color: VIZ.aqua, statuses: ['converted'] },
  { key: 'lost', label: 'Not interested', color: VIZ.violet, statuses: ['not-interested'] },
  { key: 'closed', label: 'Closed', color: VIZ.neutral, statuses: ['closed'] },
]

export function StatusDoughnut({ data }: { data: DashboardAnalytics['status'] }) {
  const groups = STATUS_GROUPS.map((g) => ({ ...g, count: data.filter((d) => g.statuses.includes(d.status)).reduce((s, d) => s + d.count, 0) }))
  const total = groups.reduce((s, g) => s + g.count, 0)
  if (!total) return <ChartEmpty height={240} />
  const shown = groups.filter((g) => g.count > 0)
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,180px)_1fr] lg:grid-cols-1">
      <div className="relative mx-auto aspect-square w-full max-w-[190px]" role="img" aria-label={`Status of ${total} enquiries: ${shown.map((g) => `${g.label} ${g.count}`).join(', ')}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={shown} dataKey="count" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={shown.length > 1 ? 2 : 0} cornerRadius={4} stroke="#fff" strokeWidth={2} isAnimationActive={!prefersReducedMotion()}>
              {shown.map((g) => <Cell key={g.key} fill={g.color} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length
              ? <TooltipBox title={String(payload[0].name)} rows={[{ color: (payload[0].payload as { color: string }).color, label: 'Enquiries', value: `${nf.format(Number(payload[0].value))} (${Math.round((Number(payload[0].value) / total) * 100)}%)` }]} />
              : null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-2xl font-semibold tabular-nums text-ink">{nf.format(total)}</p>
            <p className="text-xs text-muted">enquiries</p>
          </div>
        </div>
      </div>
      <ul className="grid gap-1.5 text-sm">
        {groups.map((g) => (
          <li key={g.key} className={cn('flex items-center justify-between gap-3 rounded-field px-2 py-1', !g.count && 'opacity-55')}>
            <span className="inline-flex min-w-0 items-center gap-2 text-ink-soft"><span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} aria-hidden />{g.label}</span>
            <span className="tabular-nums"><span className="font-semibold text-ink">{nf.format(g.count)}</span> <span className="text-muted">· {total ? Math.round((g.count / total) * 100) : 0}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── 3. Home vs Commercial (comparison) ────────────────────────────────────────

export function TypeComparison({ data }: { data: DashboardAnalytics['types'] }) {
  const total = data.home + data.commercial + data.unspecified
  if (!total) return <ChartEmpty height={180} />
  const rows = [
    { key: 'home', label: 'Home / Residential', value: data.home, color: VIZ.blue },
    { key: 'commercial', label: 'Commercial', value: data.commercial, color: VIZ.orange },
    { key: 'unspecified', label: 'Not specified', value: data.unspecified, color: VIZ.neutral },
  ]
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="grid gap-5">
      {/* Part-to-whole bar */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-snow-200" role="img" aria-label={rows.map((r) => `${r.label}: ${r.value}`).join(', ')}>
        {rows.filter((r) => r.value).map((r) => (
          <span key={r.key} title={`${r.label}: ${r.value}`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(r.value / total) * 100}%`, background: r.color }} />
        ))}
      </div>
      <ul className="grid gap-4">
        {rows.map((r) => (
          <li key={r.key} title={`${r.label}: ${r.value} (${Math.round((r.value / total) * 100)}%)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-ink-soft"><span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />{r.label}</span>
              <span className="tabular-nums"><span className="font-display text-lg font-semibold text-ink">{nf.format(r.value)}</span> <span className="text-muted">{Math.round((r.value / total) * 100)}%</span></span>
            </div>
            <div className="h-2 rounded-full bg-snow-200">
              <div className="dash-grow h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── 4. Solar capacity distribution (bars) ─────────────────────────────────────

export function CapacityBars({ data, notGiven }: { data: DashboardAnalytics['capacity']; notGiven: number }) {
  const rows = data.filter((d) => d.count > 0)
  if (!rows.length) return <ChartEmpty message={notGiven ? `No capacity was chosen in ${nf.format(notGiven)} enquir${notGiven === 1 ? 'y' : 'ies'} in this period.` : undefined} height={220} />
  const height = Math.max(160, rows.length * 34 + 16)
  return (
    <div>
      <div style={{ height }} className="w-full" role="img" aria-label={`Solar capacity requested: ${rows.map((r) => `${r.label} ${r.count}`).join(', ')}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={VIZ.grid} />
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis type="category" dataKey="label" width={86} {...axisProps} />
            <Tooltip cursor={{ fill: 'rgba(31,111,196,0.06)' }} content={({ active, payload }) => active && payload?.length
              ? <TooltipBox title={String(payload[0].payload.label)} rows={[{ color: VIZ.blue, label: 'Enquiries', value: nf.format(Number(payload[0].value)) }]} />
              : null} />
            <Bar dataKey="count" name="Enquiries" fill={VIZ.blue} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={!prefersReducedMotion()}
              label={{ position: 'right', fill: '#0f2f57', fontSize: 12, fontWeight: 600 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {notGiven > 0 && <p className="mt-2 text-xs text-muted">{nf.format(notGiven)} enquir{notGiven === 1 ? 'y' : 'ies'} without a capacity are not shown.</p>}
    </div>
  )
}

// ─── 5. Monthly lead comparison (grouped bars) ─────────────────────────────────

/** Months with data; the chart is shown only when at least two months have enquiries. */
export const monthsWithData = (m: DashboardAnalytics['monthly']) => m.filter((x) => x.total > 0).length

export function MonthlyBars({ data }: { data: DashboardAnalytics['monthly'] }) {
  // Start at the first month that has data, so empty months before the business used the system don't pad the chart.
  const first = data.findIndex((m) => m.total > 0)
  const rows = first < 0 ? [] : data.slice(first)
  if (monthsWithData(data) < 2) return <ChartEmpty message="Monthly comparison appears once there are enquiries in at least two months." height={220} />
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-ink-soft" aria-hidden>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: VIZ.blue }} />All enquiries</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: VIZ.aqua }} />Converted</span>
      </div>
      <div className="h-[240px] w-full" role="img" aria-label={`Enquiries per month: ${rows.map((r) => `${month(r.month, true)} ${r.total} (${r.converted} converted)`).join(', ')}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: -18 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={VIZ.grid} />
            <XAxis dataKey="month" tickFormatter={(m) => month(String(m))} {...axisProps} />
            <YAxis allowDecimals={false} width={44} {...axisProps} />
            <Tooltip cursor={{ fill: 'rgba(31,111,196,0.06)' }} content={({ active, payload }) => active && payload?.length
              ? <TooltipBox title={month(String(payload[0].payload.month), true)} rows={[
                  { color: VIZ.blue, label: 'All enquiries', value: nf.format(Number(payload[0].payload.total)) },
                  { color: VIZ.aqua, label: 'Converted', value: nf.format(Number(payload[0].payload.converted)) },
                ]} />
              : null} />
            <Bar dataKey="total" name="All enquiries" fill={VIZ.blue} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!prefersReducedMotion()} label={{ position: 'top', fill: '#0f2f57', fontSize: 11, fontWeight: 600 }} />
            <Bar dataKey="converted" name="Converted" fill={VIZ.aqua} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!prefersReducedMotion()} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Sparkline for the hero card ───────────────────────────────────────────────

export function Sparkline({ points }: { points: Array<{ total: number }> }) {
  if (points.length < 2 || !points.some((p) => p.total)) return null
  return (
    <div className="h-14 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="dash-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd25e" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ffd25e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="total" stroke="#ffd25e" strokeWidth={2} fill="url(#dash-spark)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
