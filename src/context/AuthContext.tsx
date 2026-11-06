import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AdminUser, Permission } from '@/types'
import { api } from '@/services/api'
import { AUTH_EXPIRED_EVENT } from '@/services/errors'
import { siteKeys } from '@/queries/keys'

type Status = 'idle' | 'checking' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: AdminUser | null
  permissions: Permission[]
  status: Status
  can: (p: Permission) => boolean
  /** Check the session once (no-op if already known). */
  ensureSession: () => void
  login: (email: string, password: string, portal?: 'admin' | 'owner') => Promise<void>
  logout: () => Promise<void>
  /** True right after the session expired (shown on the login page). */
  expired: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTH_CHANNEL = 'baba-solars-auth'
/** Tell the other tabs that the session changed. */
const announce = () => { try { const c = new BroadcastChannel(AUTH_CHANNEL); c.postMessage('changed'); c.close() } catch { /* ignore */ } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [expired, setExpired] = useState(false)
  const checking = useRef<Promise<void> | null>(null)

  const clear = useCallback(() => {
    setUser(null)
    setPermissions([])
    setStatus('anonymous')
    qc.removeQueries({ queryKey: ['admin'] })
    qc.removeQueries({ queryKey: siteKeys.collection('enquiries') })
    qc.removeQueries({ queryKey: siteKeys.collection('quotations') })
    qc.removeQueries({ queryKey: siteKeys.collection('proposals') })
    qc.removeQueries({ queryKey: ['leads'] })
    qc.removeQueries({ queryKey: ['owner'] })
  }, [qc])

  const ensureSession = useCallback(() => {
    if (status !== 'idle' || checking.current) return
    setStatus('checking')
    checking.current = api.me()
      .then((p) => {
        setUser(p.user)
        setPermissions(p.permissions)
        setStatus('authenticated')
      })
      .catch(() => { setStatus('anonymous') })
      .finally(() => { checking.current = null })
  }, [status])

  // Any 401 from an admin request means the session ended (expired, revoked, user disabled).
  useEffect(() => {
    const onExpired = () => {
      if (status !== 'authenticated') return
      setExpired(true)
      clear()
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [status, clear])

  // Signing in or out in another tab of this browser applies here too (the session cookie is shared).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(AUTH_CHANNEL)
    ch.onmessage = () => {
      api.me()
        .then((p) => { setUser(p.user); setPermissions(p.permissions); setStatus('authenticated') })
        .catch(() => { if (status === 'authenticated') clear() })
    }
    return () => ch.close()
  }, [status, clear])

  const login = useCallback(async (email: string, password: string, portal: 'admin' | 'owner' = 'admin') => {
    const p = await api.login(email, password, portal)
    announce()
    setUser(p.user)
    setPermissions(p.permissions)
    setStatus('authenticated')
    setExpired(false)
    // Staff see drafts too: re-read website data with the new session.
    void qc.invalidateQueries({ queryKey: siteKeys.all })
  }, [qc])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      announce()
      clear()
      void qc.invalidateQueries({ queryKey: siteKeys.all })
    }
  }, [clear, qc])

  const value = useMemo<AuthContextValue>(() => ({
    user, permissions, status, expired, ensureSession, login, logout,
    can: (p) => permissions.includes(p),
  }), [user, permissions, status, expired, ensureSession, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
