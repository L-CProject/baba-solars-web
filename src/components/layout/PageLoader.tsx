import { LogoMark } from './Logo'

export function PageLoader({ label = 'Loading page' }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="size-11 animate-pulse" />
        <span className="text-sm text-muted">{label}…</span>
      </div>
    </div>
  )
}
