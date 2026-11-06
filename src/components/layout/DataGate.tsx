import type { ReactNode } from 'react'
import { useSiteBootstrap } from '@/queries'
import { ErrorState } from '@/components/ui'
import { PageLoader } from './PageLoader'

/** Renders children once all site data is in the query cache; handles loading and error states. */
export function DataGate({ children }: { children: ReactNode }) {
  const { isPending, error, refetch } = useSiteBootstrap()
  if (error) {
    return (
      <div className="container-site grid min-h-dvh place-items-center">
        <ErrorState title="The site could not load" message={error.message || 'Check your connection and try again.'} onRetry={refetch} />
      </div>
    )
  }
  if (isPending) return <div className="min-h-dvh"><PageLoader label="Loading Baba Solars" /></div>
  return <>{children}</>
}
