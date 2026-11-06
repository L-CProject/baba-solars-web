/**
 * WEBSITE ENQUIRY DELIVERY
 * ─────────────────────────────────────────────────────────────────────────
 * A website enquiry is saved by the backend API (POST /api/public/enquiries → PostgreSQL).
 * Only a confirmed save counts as success — the form then shows its Thank You popup.
 * Nothing opens WhatsApp or redirects the visitor.
 *
 * Optional extras after a successful save (only when VITE_APPS_SCRIPT_URL is set):
 *   • Google Sheet row (Apps Script, action "sheet")
 *   • Admin email      (Apps Script, action "email" — admin address kept in Script Properties)
 * They run in the background with their own try/catch and never change the result the visitor sees.
 * A failed Sheet/email call is put in a retry queue (localStorage) and sent again on the next
 * page load or when the browser comes back online — an enquiry is never dropped silently.
 * Each enquiry carries a submissionId (UUID); the admin store and the Apps Script ignore repeats,
 * so retries and double clicks never create duplicate rows or emails.
 *
 * FIREBASE-READY: step 1 is injected (`saveAdmin`), so moving to Firestore means only changing
 * api.submitEnquiry / api.submitQuotation (use the submissionId as the document id → idempotent).
 * Set VITE_ENQUIRY_DELIVERY=server once a Cloud Function sends the Sheet row and email on document
 * create: steps 2–3 are then skipped here and the forms need no change. EnquiryPayload is the
 * shape both the Apps Script and such a function receive.
 */
import type { EnquiryType } from '@/types'
import { INTEGRATIONS, appsScriptConfigured } from '@/config/integrations'

export type IntegrationAction = 'sheet' | 'email'
export type StepStatus = 'sent' | 'queued' | 'skipped'

/** What is sent to the (optional) Apps Script. Empty strings = not provided. */
export interface EnquiryPayload {
  submissionId: string
  /** ISO timestamp */
  createdAt: string
  /** Same moment, formatted for India, e.g. "04 Nov 2026, 10:30 am" */
  dateTime: string
  name: string
  mobile: string
  email: string
  /** "Home" | "Commercial" | "" */
  enquiryType: string
  /** Number as text, e.g. "5" ("" = not given) */
  requiredKw: string
  message: string
  city: string
  service: string
  source: string
  page: string
}

export interface QueueItem {
  key: string
  action: IntegrationAction
  data: EnquiryPayload
  attempts: number
  queuedAt: string
  lastAttemptAt?: string
  lastError?: string
}

export interface SubmissionResult {
  submissionId: string
  /** The enquiry the backend saved (id, timestamps). */
  enquiry: unknown
}

// ─── Small helpers ──────────────────────────────────────────────────────────

/** RFC 4122 v4 UUID (crypto.randomUUID where available). */
export function newSubmissionId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const IST = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
})
export const formatSubmissionTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : IST.format(d)
}

export const ENQUIRY_TYPE_TEXT: Record<EnquiryType, string> = { home: 'Home', commercial: 'Commercial' }

/** Build the payload from the form values (trimmed; missing values become ""). */
export function buildPayload(v: {
  submissionId: string; createdAt: string; name: string; phone?: string; email?: string; enquiryType?: EnquiryType | null
  capacityKw?: number | null; message?: string; city?: string; service?: string; source?: string; page?: string
}): EnquiryPayload {
  const t = (x: unknown) => String(x ?? '').trim()
  return {
    submissionId: v.submissionId,
    createdAt: v.createdAt,
    dateTime: formatSubmissionTime(v.createdAt),
    name: t(v.name),
    mobile: t(v.phone).replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''),
    email: t(v.email),
    enquiryType: v.enquiryType ? ENQUIRY_TYPE_TEXT[v.enquiryType] : '',
    requiredKw: v.capacityKw != null && Number.isFinite(v.capacityKw) && v.capacityKw > 0 ? String(v.capacityKw) : '',
    message: t(v.message),
    city: t(v.city),
    service: t(v.service),
    source: t(v.source),
    page: t(v.page),
  }
}

// ─── Apps Script call ───────────────────────────────────────────────────────

export class IntegrationError extends Error {}

interface PostOptions { url?: string; token?: string; fetchImpl?: typeof fetch; timeoutMs?: number }

/**
 * POST one action to the Apps Script Web App. Sent as text/plain so the browser makes a "simple"
 * request (no CORS preflight, which Apps Script cannot answer). Resolves only on {"ok": true}.
 */
export async function postToAppsScript(action: IntegrationAction, data: EnquiryPayload, opts: PostOptions = {}) {
  const url = opts.url ?? INTEGRATIONS.appsScriptUrl
  const doFetch = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs ?? INTEGRATIONS.timeoutMs) : null
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: opts.token ?? INTEGRATIONS.appsScriptToken, data }),
      redirect: 'follow',
      signal: ctrl?.signal,
    })
    if (!res.ok) throw new IntegrationError(`Apps Script returned HTTP ${res.status}`)
    let body: { ok?: boolean; error?: string; result?: string }
    try {
      body = await res.json()
    } catch {
      throw new IntegrationError('Apps Script did not return JSON (check the Web App URL and "Anyone" access).')
    }
    if (!body?.ok) throw new IntegrationError(body?.error || 'Apps Script rejected the request')
    return body
  } catch (e) {
    if (e instanceof IntegrationError) throw e
    throw new IntegrationError(e instanceof Error ? (e.name === 'AbortError' ? 'Request timed out' : e.message) : String(e))
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ─── Retry queue (localStorage) ─────────────────────────────────────────────

export const QUEUE_KEY = 'baba-solars:enquiry-retry-queue'
const MAX_QUEUE = 300
let memoryQueue: QueueItem[] = [] // used only when localStorage is blocked

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function readQueue(): QueueItem[] {
  const s = storage()
  if (!s) return memoryQueue
  try {
    const list = JSON.parse(s.getItem(QUEUE_KEY) || '[]')
    return Array.isArray(list) ? list.filter((x) => x && typeof x.key === 'string' && x.data) : []
  } catch {
    return []
  }
}

function writeQueue(list: QueueItem[]) {
  const trimmed = list.slice(-MAX_QUEUE)
  const s = storage()
  if (!s) { memoryQueue = trimmed; return }
  try {
    if (trimmed.length) s.setItem(QUEUE_KEY, JSON.stringify(trimmed))
    else s.removeItem(QUEUE_KEY)
  } catch {
    memoryQueue = trimmed
  }
}

/** Add (or refresh) a pending delivery. One entry per submission + action, so no duplicates. */
export function enqueue(action: IntegrationAction, data: EnquiryPayload, error?: string) {
  const key = `${action}:${data.submissionId}`
  const list = readQueue()
  const i = list.findIndex((x) => x.key === key)
  const now = new Date().toISOString()
  if (i >= 0) list[i] = { ...list[i], attempts: list[i].attempts + 1, lastAttemptAt: now, lastError: error }
  else list.push({ key, action, data, attempts: 1, queuedAt: now, lastAttemptAt: now, lastError: error })
  writeQueue(list)
}

let flushing: Promise<{ sent: number; pending: number }> | null = null

/**
 * Send everything in the retry queue. Safe to call often (page load, "online" event): runs once at
 * a time, and the Apps Script ignores items it already has.
 */
export function flushQueue(opts: PostOptions = {}): Promise<{ sent: number; pending: number }> {
  if (flushing) return flushing
  flushing = (async () => {
    let sent = 0
    if (!(opts.url ?? INTEGRATIONS.appsScriptUrl)) return { sent, pending: readQueue().length }
    for (const item of readQueue()) {
      try {
        await postToAppsScript(item.action, item.data, opts)
        writeQueue(readQueue().filter((x) => x.key !== item.key))
        sent++
      } catch (e) {
        enqueue(item.action, item.data, e instanceof Error ? e.message : String(e))
        // Offline: stop early, the "online" event will try again.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) break
      }
    }
    return { sent, pending: readQueue().length }
  })().finally(() => { flushing = null })
  return flushing
}

let started = false
/** Call once on app start: retries pending deliveries shortly after load and whenever the browser comes online. */
export function startRetryQueue() {
  if (started || typeof window === 'undefined') return
  started = true
  const run = () => { if (readQueue().length && appsScriptConfigured()) void flushQueue() }
  window.addEventListener('online', run)
  window.setTimeout(run, 2500)
}

// ─── The submission flow ────────────────────────────────────────────────────

async function deliver(action: IntegrationAction, data: EnquiryPayload, opts: PostOptions): Promise<StepStatus> {
  if (!opts.url && INTEGRATIONS.delivery === 'server') return 'skipped' // the backend delivers it
  if (!(opts.url ?? INTEGRATIONS.appsScriptUrl)) return 'skipped'
  try {
    await postToAppsScript(action, data, opts)
    return 'sent'
  } catch (e) {
    enqueue(action, data, e instanceof Error ? e.message : String(e))
    if (import.meta.env.DEV) console.warn(`[enquiry] ${action} failed — queued for retry`, e)
    return 'queued'
  }
}

/**
 * Save the enquiry through the backend API. Resolves ONLY after the server confirmed the save;
 * any failure (validation, network, server, rate limit) is thrown so the form can show the real
 * error — there is never a success message for an enquiry that was not stored.
 * The optional Google Sheet / email copies are started afterwards and not awaited.
 */
export async function submitWebsiteEnquiry(
  payload: EnquiryPayload,
  saveToBackend: () => Promise<unknown>,
  opts: PostOptions = {},
): Promise<SubmissionResult> {
  const enquiry = await saveToBackend()
  void deliver('sheet', payload, opts)
  void deliver('email', payload, opts)
  return { submissionId: payload.submissionId, enquiry }
}
