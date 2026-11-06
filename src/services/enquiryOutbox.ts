import { ApiError } from './errors'

/**
 * Website enquiries that could not reach the server (offline, server restarting) are kept in this
 * browser and sent again on the next page load or when the connection comes back. Re-sending is
 * safe: the server stores one enquiry per submissionId.
 */
export const OUTBOX_KEY = 'baba-solars:enquiry-outbox'
type Kind = 'enquiry' | 'quote'
interface Item { kind: Kind; submissionId: string; body: unknown; attempts: number; queuedAt: string }

const read = (): Item[] => {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') as Item[] } catch { return [] }
}
const write = (l: Item[]) => {
  try { if (l.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(l)); else localStorage.removeItem(OUTBOX_KEY) } catch { /* storage blocked */ }
}

/** Only connection / server problems are retried — never validation errors. */
export const isRetryable = (e: unknown) => e instanceof ApiError && ['network', 'timeout', 'internal', 'rate_limited', 'unknown'].includes(e.code)

export function addToOutbox(kind: Kind, body: { submissionId?: string }) {
  if (!body.submissionId || typeof window === 'undefined') return
  const list = read().filter((i) => i.submissionId !== body.submissionId)
  list.push({ kind, submissionId: body.submissionId, body, attempts: 1, queuedAt: new Date().toISOString() })
  write(list.slice(-50))
}

export const outboxSize = () => read().length

let flushing: Promise<number> | null = null
export function flushOutbox(send: (kind: Kind, body: unknown) => Promise<unknown>): Promise<number> {
  if (flushing) return flushing
  flushing = (async () => {
    let sent = 0
    for (const item of read()) {
      try {
        await send(item.kind, item.body)
        write(read().filter((i) => i.submissionId !== item.submissionId))
        sent++
      } catch (e) {
        if (!isRetryable(e)) write(read().filter((i) => i.submissionId !== item.submissionId)) // invalid: drop
        else break
      }
    }
    return sent
  })().finally(() => { flushing = null })
  return flushing
}
