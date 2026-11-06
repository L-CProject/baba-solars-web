import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { DashboardRangeKey } from '@/types/api'
import type { Enquiry, EnquiryDetail, EnquiryStatus, Role, StaffUser } from '@/types'
import { api, type ContactActivityInput } from '@/services/api'
import { siteKeys } from './keys'
import { broadcastChange } from './SiteSync'

/** Lead management, owner portal and team hooks (all backed by the API, nothing kept in the browser). */
export const leadKeys = {
  all: ['admin', 'leads'] as const,
  detail: (id: string) => ['admin', 'leads', 'detail', id] as const,
  stats: () => ['admin', 'leads', 'stats'] as const,
  assignable: () => ['admin', 'leads', 'assignable'] as const,
  owner: () => ['admin', 'owner', 'dashboard'] as const,
  dashboard: () => ['admin', 'dashboard'] as const,
  users: () => ['admin', 'users'] as const,
}

/** After any lead change: refresh tables, counts, dashboards and the legacy enquiry list. */
export function refreshLeads(qc: QueryClient) {
  broadcastChange('admin')
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['admin', 'list', 'enquiries'] }),
    qc.invalidateQueries({ queryKey: leadKeys.stats() }),
    qc.invalidateQueries({ queryKey: leadKeys.owner() }),
    qc.invalidateQueries({ queryKey: leadKeys.dashboard() }),
    qc.invalidateQueries({ queryKey: siteKeys.collection('enquiries') }),
  ])
}

/** One lead with history. `initial` (the table row) shows the details at once while the history loads. */
export const useEnquiryDetail = (id: string | null, initial?: Enquiry) =>
  useQuery({
    queryKey: leadKeys.detail(id ?? ''), queryFn: () => api.getEnquiry(id!), enabled: !!id,
    placeholderData: initial && initial.id === id ? { enquiry: initial, activities: [], followUps: [] } : undefined,
  })
export const useEnquiryStats = (enabled = true) => useQuery({ queryKey: leadKeys.stats(), queryFn: api.enquiryStats, enabled, staleTime: 15_000 })
export const useAssignableUsers = (enabled = true) => useQuery({ queryKey: leadKeys.assignable(), queryFn: api.assignableUsers, enabled, staleTime: 5 * 60_000 })
export const useOwnerDashboard = () => useQuery({ queryKey: leadKeys.owner(), queryFn: api.ownerDashboard, refetchInterval: 60_000 })
export const useAdminDashboard = () => useQuery({ queryKey: leadKeys.dashboard(), queryFn: api.adminDashboard })
/** Dashboard analytics for a filter; the previous result stays on screen while a new filter loads. */
export const useDashboardAnalytics = (q: { range: DashboardRangeKey; from?: string; to?: string }, enabled = true) => useQuery({
  queryKey: [...leadKeys.dashboard(), 'analytics', q.range, q.from ?? '', q.to ?? ''],
  queryFn: ({ signal }) => api.dashboardAnalytics(q, signal),
  enabled,
  placeholderData: keepPreviousData,
  staleTime: 30_000,
  refetchInterval: 120_000,
})

function useDetailMutation<V>(fn: (v: V) => Promise<EnquiryDetail>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => { qc.setQueryData(leadKeys.detail(detail.enquiry.id), detail) },
    onSettled: () => refreshLeads(qc),
  })
}

export function useLeadActions() {
  const qc = useQueryClient()
  return {
    setStatus: useDetailMutation(({ id, status, note, followUpOn }: { id: string; status: EnquiryStatus; note?: string; followUpOn?: string | null }) => api.setEnquiryStatus(id, status, note, followUpOn)),
    assign: useDetailMutation(({ id, userId, note }: { id: string; userId: string | null; note?: string }) => api.assignEnquiry(id, userId, note)),
    logActivity: useDetailMutation(({ id, activity }: { id: string; activity: ContactActivityInput }) => api.logEnquiryActivity(id, activity)),
    scheduleFollowUp: useDetailMutation(({ id, dueOn, note, assignedTo }: { id: string; dueOn: string; note?: string; assignedTo?: string | null }) => api.scheduleFollowUp(id, { dueOn, note, assignedTo })),
    completeFollowUp: useDetailMutation(({ id, followUpId, status, note }: { id: string; followUpId: string; status: 'done' | 'cancelled'; note?: string }) => api.completeFollowUp(id, followUpId, status, note)),
    remove: useMutation({
      mutationFn: (id: string) => api.removeItem('enquiries', id),
      onSuccess: (_d, id) => qc.removeQueries({ queryKey: leadKeys.detail(id) }),
      onSettled: () => refreshLeads(qc),
    }),
  }
}

export const useUsers = (enabled = true) => useQuery({ queryKey: leadKeys.users(), queryFn: api.listUsers, enabled })
export function useUserMutations() {
  const qc = useQueryClient()
  const done = () => Promise.all([qc.invalidateQueries({ queryKey: leadKeys.users() }), qc.invalidateQueries({ queryKey: leadKeys.assignable() })])
  return {
    create: useMutation({ mutationFn: (u: { name: string; email: string; role: Role; password: string; isActive?: boolean }) => api.createUser(u), onSettled: done }),
    update: useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<StaffUser, 'name' | 'email' | 'role' | 'isActive'>> }) => api.updateUser(id, patch), onSettled: done }),
    resetPassword: useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => api.resetUserPassword(id, password) }),
  }
}
