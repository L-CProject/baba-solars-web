import { useRef, useSyncExternalStore } from 'react'

/**
 * Prerender (static HTML) helpers.
 * index.html of a prerendered page has <html class="ssg">: CSS then shows elements that
 * Motion would start hidden (opacity 0), so the static HTML is fully visible before JS.
 * The class is removed once React has taken over.
 */
const html = typeof document !== 'undefined' ? document.documentElement : null

/** True until the first client render (over prerendered HTML) has committed. */
let firstRenderOverSsg = !!html?.classList.contains('ssg')

const subscribe = () => () => {}

/**
 * Should a component skip its entrance animation because it is being rendered over prerendered
 * HTML? Uses the server snapshot during hydration (also for Suspense content hydrated later),
 * so server and client markup always match. The answer is fixed when the component mounts.
 */
export function useSkipEntrance(): boolean {
  const now = useSyncExternalStore(subscribe, () => firstRenderOverSsg, () => true)
  return useRef(now).current
}

/** Call once the first client render has COMMITTED (from an effect), never earlier. */
export function markClientRendered() {
  firstRenderOverSsg = false
  html?.classList.remove('ssg')
}
