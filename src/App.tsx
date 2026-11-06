import { Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import type { QueryClient } from '@tanstack/react-query'
import { LazyMotion, MotionConfig } from 'motion/react'
import { ToastProvider } from '@/context/ToastContext'
import { DataProvider } from '@/context/DataContext'
import { AuthProvider } from '@/context/AuthContext'
import { DataGate } from '@/components/layout/DataGate'
import { PageLoader } from '@/components/layout/PageLoader'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { AppRoutes } from '@/routes/AppRoutes'
import { markClientRendered } from '@/lib/ssg'

/** Runs after the whole first render is committed: from now on, entrance animations play normally. */
function FirstRenderDone() {
  useEffect(() => { markClientRendered() }, [])
  return null
}

const loadMotionFeatures = () => import('@/lib/motion-features').then((m) => m.default)

/** Everything except the router, shared by the browser app and the build-time prerender. */
export function AppProviders({ queryClient, children }: { queryClient?: QueryClient; children: ReactNode }) {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        {/* Motion's animation code (~25 KB) loads after first paint; `strict` forbids the heavy <motion.*> components. */}
        <LazyMotion features={loadMotionFeatures} strict>
          <ToastProvider>
            <DataProvider client={queryClient}>
              <AuthProvider>
                <DataGate>
                  <Suspense fallback={<PageLoader />}>{children}</Suspense>
                  <FirstRenderDone />
                </DataGate>
              </AuthProvider>
            </DataProvider>
          </ToastProvider>
        </LazyMotion>
      </MotionConfig>
    </ErrorBoundary>
  )
}

export default function App({ queryClient }: { queryClient?: QueryClient }) {
  return (
    <BrowserRouter>
      <AppProviders queryClient={queryClient}>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  )
}
