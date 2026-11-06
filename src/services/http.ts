import type { FieldErrors } from '@/types'
import { ApiError, AUTH_EXPIRED_EVENT, type ApiErrorCode } from './errors'

/**
 * HTTP client for the Baba Solars API (server/).
 *  • Same origin by default (Nginx serves the website and proxies /api); VITE_API_URL points elsewhere if needed.
 *  • Cookies carry the session (HttpOnly); writes send the CSRF token from the bs_csrf cookie.
 *  • Every failure becomes an ApiError with a user-friendly message, a code and field errors.
 */
export const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`
const TIMEOUT_MS = 30_000

let csrfToken = ''
export const setCsrfToken = (t: string) => { csrfToken = t }
function currentCsrf(): string {
  if (typeof document === 'undefined') return csrfToken
  const m = /(?:^|;\s*)bs_csrf=([^;]+)/.exec(document.cookie)
  return m ? decodeURIComponent(m[1]) : csrfToken
}

export type Query = Record<string, string | number | boolean | null | undefined>
export const qs = (q?: Query) => {
  if (!q) return ''
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Raw body (file upload) with its content type. */
  raw?: { data: Blob; type: string }
  query?: Query
  /** Don't fire the "session expired" event on 401 (sign-in checks). */
  quiet401?: boolean
  signal?: AbortSignal
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers['X-CSRF-Token'] = currentCsrf()
  let body: BodyInit | undefined
  if (opts.raw) { body = opts.raw.data; headers['Content-Type'] = opts.raw.type }
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers['Content-Type'] = 'application/json' }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => ctrl.abort(opts.signal!.reason), { once: true })
  let res: Response
  try {
    res = await fetch(API_BASE + path + qs(opts.query), { method, headers, body, credentials: 'include', signal: ctrl.signal })
  } catch (e) {
    const timeout = e instanceof DOMException && (e.name === 'TimeoutError' || ctrl.signal.reason?.name === 'TimeoutError')
    throw new ApiError(timeout ? 'The server took too long to answer. Please try again.' : 'Could not reach the server. Check your internet connection and try again.', { code: timeout ? 'timeout' : 'network' })
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { /* not JSON (proxy error page) */ }
  if (!res.ok) {
    const err = (data as { error?: { code?: ApiErrorCode; message?: string; fieldErrors?: FieldErrors } } | null)?.error
    const code: ApiErrorCode = err?.code ?? (res.status === 401 ? 'unauthorized' : res.status === 403 ? 'forbidden' : res.status === 404 ? 'not_found' : res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'internal' : 'bad_request')
    if (res.status === 401 && !opts.quiet401 && typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    throw new ApiError(err?.message ?? (res.status >= 500 ? 'The server had a problem. Please try again in a moment.' : `Request failed (${res.status}).`), {
      code, status: res.status, fieldErrors: err?.fieldErrors ?? {},
    })
  }
  return data as T
}

export const http = {
  get: <T>(path: string, query?: Query, o?: Omit<RequestOptions, 'query' | 'method'>) => request<T>(path, { ...o, query }),
  post: <T>(path: string, body?: unknown, o?: Omit<RequestOptions, 'body' | 'method'>) => request<T>(path, { ...o, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, o?: Omit<RequestOptions, 'body' | 'method'>) => request<T>(path, { ...o, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
