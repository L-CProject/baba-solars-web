import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/services/api'

const NO_RETRY = new Set(['validation', 'conflict', 'unauthorized', 'forbidden', 'not_found', 'bad_request', 'rate_limited'])

/**
 * One QueryClient for the whole app.
 * - staleTime 30 s: data is reused across pages; a focused tab refetches after that, so
 *   visitors see admin changes without a full reload. Other tabs of the same browser are
 *   refreshed immediately by <SiteSync /> after a save.
 * - Errors that a retry cannot fix are never retried.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        retry: (count, error) => !(error instanceof ApiError && NO_RETRY.has(error.code)) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}
