import { useState, type FormEvent } from 'react'
import { KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import type { Role, StaffUser } from '@/types'
import { useUserMutations, useUsers } from '@/queries'
import { useSeo } from '@/hooks/useSeo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/services/api'
import { ROLES } from '@/lib/rbac'
import { formatDateTime } from '@/lib/format'
import { Button, EmptyState, ErrorState, Input, Modal, Select, Toggle } from '@/components/ui'
import { AdminPageHeader, DataTable, IconAction, ToneBadge } from '../components/AdminUI'
import { errorMessage } from '../hooks/useCrud'

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<Role, string>

/** Admin → Team: staff and owner accounts, roles and access. Accounts are deactivated, never deleted (history keeps names). */
export default function TeamPage() {
  useSeo({ title: 'Team & access', path: '/admin/team', noIndex: true })
  const users = useUsers()
  const { user: me } = useAuth()
  const m = useUserMutations()
  const toast = useToast()
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null)
  const [pw, setPw] = useState<StaffUser | null>(null)
  const toggle = async (u: StaffUser) => {
    try { await m.update.mutateAsync({ id: u.id, patch: { isActive: !u.isActive } }); toast({ title: u.isActive ? `${u.name} deactivated` : `${u.name} activated` }) }
    catch (e) { toast({ tone: 'error', title: 'Not changed', description: errorMessage(e) }) }
  }
  return (
    <>
      <AdminPageHeader title="Team & access" description="Who can sign in and what they can do. Owners use the separate owner portal (/owner) to monitor leads."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Add person</Button>} />
      <ul className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r) => <li key={r.value} className="rounded-card border border-line bg-surface p-4 text-sm"><p className="font-semibold text-ink">{r.label}</p><p className="mt-1 text-muted">{r.description}</p></li>)}
      </ul>
      {users.error ? <ErrorState message={errorMessage(users.error)} onRetry={() => void users.refetch()} /> : (
        <DataTable caption="Team" rows={users.data ?? []}
          empty={users.isPending ? <p className="p-8 text-center text-muted">Loading…</p> : <EmptyState title="No accounts" />}
          columns={[
            { header: 'Name', cell: (u) => <div><p className="font-semibold text-ink">{u.name}{u.id === me?.id ? ' (you)' : ''}</p><p className="text-muted">{u.email}</p></div> },
            { header: 'Role', cell: (u) => <ToneBadge tone={u.role === 'admin' ? 'info' : u.role === 'owner' ? 'warning' : 'neutral'}>{ROLE_LABEL[u.role]}</ToneBadge> },
            { header: 'Status', cell: (u) => <ToneBadge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? 'Active' : 'Deactivated'}</ToneBadge> },
            { header: 'Last sign-in', cell: (u) => <span className="whitespace-nowrap text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</span> },
            { header: 'Actions', className: 'text-right', cell: (u) => (
              <div className="flex justify-end gap-1.5">
                <IconAction label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Pencil className="size-4" /></IconAction>
                <IconAction label={`Set a new password for ${u.name}`} onClick={() => setPw(u)}><KeyRound className="size-4" /></IconAction>
                {u.id !== me?.id && <IconAction label={u.isActive ? `Deactivate ${u.name}` : `Activate ${u.name}`} danger={u.isActive} onClick={() => void toggle(u)}>{u.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}</IconAction>}
              </div>
            ) },
          ]} />
      )}
      {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {pw && <PasswordForm user={pw} onClose={() => setPw(null)} />}
    </>
  )
}

function UserForm({ user, onClose }: { user: StaffUser | null; onClose: () => void }) {
  const m = useUserMutations()
  const toast = useToast()
  const [f, setF] = useState({ name: user?.name ?? '', email: user?.email ?? '', role: (user?.role ?? 'sales') as Role, password: '', isActive: user?.isActive ?? true })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const busy = m.create.isPending || m.update.isPending
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (user) await m.update.mutateAsync({ id: user.id, patch: { name: f.name, email: f.email, role: f.role, isActive: f.isActive } })
      else await m.create.mutateAsync(f)
      toast({ title: user ? 'Saved' : `${f.name} added`, description: user ? undefined : 'Share the password privately; they can change it after signing in.' })
      onClose()
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
      toast({ tone: 'error', title: 'Not saved', description: errorMessage(err) })
    }
  }
  return (
    <Modal open onClose={() => !busy && onClose()} title={user ? `Edit ${user.name}` : 'Add a person'}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" form="user-form" loading={busy}>Save</Button></>}>
      <form id="user-form" onSubmit={submit} noValidate className="grid gap-4">
        <Input label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <Input label="Email (sign-in)" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
        <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} options={ROLES.map((r) => ({ value: r.value, label: r.label }))} hint={ROLES.find((r) => r.value === f.role)?.description} />
        {!user && <Input label="Password" type="password" autoComplete="new-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} hint="At least 10 characters with letters and a number." />}
        {user && <Toggle label="Can sign in" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />}
      </form>
    </Modal>
  )
}

function PasswordForm({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const m = useUserMutations()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try { await m.resetPassword.mutateAsync({ id: user.id, password: pw }); toast({ title: 'Password changed', description: `${user.name} was signed out everywhere.` }); onClose() }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.password ?? err.message) : errorMessage(err)) }
  }
  return (
    <Modal open onClose={onClose} title={`New password for ${user.name}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="pw-form" loading={m.resetPassword.isPending}>Set password</Button></>}>
      <form id="pw-form" onSubmit={submit} className="grid gap-4">
        <Input label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setError('') }} error={error} hint="At least 10 characters with letters and a number." />
      </form>
    </Modal>
  )
}
