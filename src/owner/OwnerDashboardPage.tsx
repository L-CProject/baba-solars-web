import { Link } from 'react-router'
import { AlarmClock, ArrowRight, CheckCircle2, Inbox, PhoneCall, Sparkles, TrendingUp, Users } from 'lucide-react'
import type { EnquiryStatus } from '@/types'
import { useOwnerDashboard } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABEL, ACTIVITY_LABEL, SOURCE_LABEL, enquiryDisplayName } from '@/lib/enquiries'
import { formatDate, formatDateTime, formatMonth, relativeDay } from '@/lib/format'
import { Card, ErrorState, Spinner } from '@/components/ui'
import { AdminPageHeader, ToneBadge } from '@/admin/components/AdminUI'
import { enquiryTone } from '@/admin/constants'
import { errorMessage } from '@/admin/hooks/useCrud'

/** Owner dashboard: lead totals, pipeline, follow-ups due, team and recent activity (read-only, refreshes every minute). */
export default function OwnerDashboardPage() {
  useSeo({ title: 'Owner dashboard', path: '/owner', noIndex: true })
  const q = useOwnerDashboard()
  if (q.isPending) return <div className="grid place-items-center py-24"><Spinner label="Loading dashboard" /></div>
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
  const { stats, followUpsDue, latestEnquiries, recentActivity, team, today } = q.data
  const kpis = [
    { label: 'Total leads', value: stats.total, sub: `${stats.thisMonth} this month`, icon: Inbox, to: '/owner/leads' },
    { label: 'New', value: stats.new, sub: 'Not yet looked at', icon: Sparkles, to: '/owner/leads?status=new' },
    { label: 'Pending', value: stats.pending, sub: 'Not reached yet', icon: PhoneCall, to: '/owner/leads?status=pending' },
    { label: 'Contacted', value: stats.contacted, sub: `${stats.open} open in total`, icon: Users, to: '/owner/leads?status=contacted' },
    { label: 'Converted', value: stats.converted, sub: `${stats.conversionRate}% of closed leads`, icon: CheckCircle2, to: '/owner/leads?status=converted' },
    { label: 'Follow-ups due', value: stats.followUpsDue, sub: stats.followUpsOverdue ? `${stats.followUpsOverdue} overdue` : 'None overdue', icon: AlarmClock, to: '/owner/leads?followUp=due', alert: stats.followUpsOverdue > 0 },
  ]
  const maxStatus = Math.max(1, ...ENQUIRY_STATUSES.map((s) => stats.byStatus[s.value]))
  const maxTrend = Math.max(1, ...stats.trend.map((t) => t.total))
  return (
    <>
      <AdminPageHeader title="Lead dashboard" description={`Every enquiry and its status, updated live. Today: ${formatDate(today)}.`} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, sub, icon: Icon, to, alert }) => (
          <Link key={label} to={to} className="rounded-card border border-line bg-surface p-4 shadow-soft card-lift">
            <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted sm:text-sm">{label}</span><Icon className="size-4 text-steel-500" aria-hidden /></div>
            <p className="mt-2 font-display text-3xl tabular-nums text-ink">{value}</p>
            <p className={alert ? 'mt-1 text-xs font-semibold text-clay-700' : 'mt-1 text-xs text-muted'}>{sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-sans text-base font-semibold">Leads by status</h2>
          <ul className="mt-4 space-y-2">
            {ENQUIRY_STATUSES.map((s) => (
              <li key={s.value}>
                <Link to={`/owner/leads?status=${s.value}`} className="group grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm" title={`${s.label}: ${stats.byStatus[s.value]}`}>
                  <span className="truncate text-ink-soft group-hover:text-ink">{s.label}</span>
                  <span className="h-3 overflow-hidden rounded-r bg-snow-200"><span className="block h-full rounded-r bg-navy-600 transition-all group-hover:bg-navy-800" style={{ width: `${(stats.byStatus[s.value] / maxStatus) * 100}%` }} /></span>
                  <span className="text-right tabular-nums text-ink">{stats.byStatus[s.value]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-sans text-base font-semibold">New leads per month</h2>
          <p className="text-xs text-muted">Last 6 months · number converted shown below each bar</p>
          <div className="mt-4 flex items-end gap-3" role="img" aria-label={stats.trend.map((t) => `${formatMonth(t.month)}: ${t.total} leads, ${t.converted} converted`).join('; ')}>
            {stats.trend.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-1" title={`${formatMonth(t.month)}: ${t.total} leads, ${t.converted} converted`}>
                <span className="text-xs tabular-nums text-ink">{t.total}</span>
                <div className="flex h-32 w-full max-w-12 items-end border-b border-line"><div className="w-full rounded-t bg-navy-600" style={{ height: `${Math.max(t.total ? 4 : 0, (t.total / maxTrend) * 100)}%` }} /></div>
                <span className="text-xs text-muted">{formatMonth(t.month).split(' ')[0]}</span>
                <span className="text-[0.7rem] tabular-nums text-leaf-700">{t.converted} won</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ListCard title="Follow-ups due" to="/owner/leads?followUp=due" empty="No follow-ups due. 🎉">
          {followUpsDue.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <Link to={`/owner/leads?open=${e.id}`} className="min-w-0"><p className="truncate font-semibold text-ink hover:underline">{enquiryDisplayName(e)}</p><p className="truncate text-sm text-muted">{[e.phone || e.email, e.service].filter(Boolean).join(' · ')}</p></Link>
              <div className="shrink-0 text-right"><p className={e.followUpOn! < today ? 'text-sm font-semibold text-clay-700' : 'text-sm font-semibold text-sun-500'}>{relativeDay(e.followUpOn!, today)}</p><ToneBadge tone={enquiryTone[e.status as EnquiryStatus]}>{ENQUIRY_STATUS_LABEL[e.status]}</ToneBadge></div>
            </li>
          ))}
        </ListCard>
        <ListCard title="Latest enquiries" to="/owner/leads" empty="No enquiries yet.">
          {latestEnquiries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <Link to={`/owner/leads?open=${e.id}`} className="min-w-0"><p className="truncate font-semibold text-ink hover:underline">{enquiryDisplayName(e)}</p><p className="truncate text-sm text-muted">{[e.service, SOURCE_LABEL[e.source]].filter(Boolean).join(' · ')}</p></Link>
              <div className="shrink-0 text-right"><ToneBadge tone={enquiryTone[e.status]}>{ENQUIRY_STATUS_LABEL[e.status]}</ToneBadge><p className="mt-1 text-xs text-muted">{formatDate(e.createdAt)}</p></div>
            </li>
          ))}
        </ListCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card padded={false} className="overflow-hidden">
          <h2 className="px-5 pt-4 font-sans text-base font-semibold">Team</h2>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left text-muted"><th className="px-5 py-2 font-medium">Staff</th><th className="px-3 py-2 text-right font-medium">Open</th><th className="px-3 py-2 text-right font-medium">Follow-ups due</th><th className="px-3 py-2 text-right font-medium">Converted</th><th className="px-5 py-2 text-right font-medium">Total</th></tr></thead>
              <tbody className="divide-y divide-line">
                {team.map((t) => (
                  <tr key={t.userId ?? 'none'}><td className="px-5 py-2.5 font-medium text-ink">{t.name}</td><td className="px-3 py-2.5 text-right tabular-nums">{t.open}</td><td className={t.followUpsDue ? 'px-3 py-2.5 text-right font-semibold tabular-nums text-clay-700' : 'px-3 py-2.5 text-right tabular-nums'}>{t.followUpsDue}</td><td className="px-3 py-2.5 text-right tabular-nums">{t.converted}</td><td className="px-5 py-2.5 text-right tabular-nums">{t.total}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <ListCard title="Recent activity" empty="Nothing yet.">
          {recentActivity.map((a) => (
            <li key={a.id} className="px-5 py-3 text-sm">
              <p className="text-ink"><Link to={`/owner/leads?open=${a.enquiryId}`} className="font-semibold hover:underline">{a.enquiryName}</Link> · {ACTIVITY_LABEL[a.type]}{a.type === 'status' && a.toStatus ? `: ${ENQUIRY_STATUS_LABEL[a.toStatus]}` : ''}</p>
              {a.note && <p className="truncate text-ink-soft">{a.note}</p>}
              <p className="text-xs text-muted">{formatDateTime(a.createdAt)} · {a.actorName}</p>
            </li>
          ))}
        </ListCard>
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted"><TrendingUp className="size-3.5" aria-hidden />Conversion rate = converted ÷ (converted + not interested).</p>
    </>
  )
}

function ListCard({ title, to, empty, children }: { title: string; to?: string; empty: string; children: React.ReactNode[] }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="font-sans text-base font-semibold">{title}</h2>
        {to && <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-steel-600 hover:text-ink">View all <ArrowRight className="size-3.5" aria-hidden /></Link>}
      </div>
      <ul className="divide-y divide-line">{children.length ? children : <li className="px-5 py-6 text-sm text-muted">{empty}</li>}</ul>
    </Card>
  )
}
