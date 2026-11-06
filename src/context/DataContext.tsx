import { useState, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createQueryClient, SiteSync } from '@/queries'

/**
 * Data provider: TanStack Query client + cross-tab sync.
 * Reads:  useCollection / usePublished / useSiteContent / useDb   (src/queries/site.ts)
 * Writes: useUpsertItem / useRemoveItem / useReorder / useUpdateContent … (src/queries/mutations.ts)
 */
export function DataProvider({ children, client: provided }: { children: ReactNode; client?: QueryClient }) {
  const [client] = useState(() => provided ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <SiteSync />
      {children}
    </QueryClientProvider>
  )
}

/** Backwards-compatible import path for the whole-database hook. */
export { useDb } from '@/queries/site'
