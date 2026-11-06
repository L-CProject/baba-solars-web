import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { SiteContent } from '@/types'
import { siteKeys } from '@/queries/keys'
import { cn } from '@/lib/cn'

const DEFAULT_FULL = '/images/brand/logo-full.webp'
const DEFAULT_MARK = '/images/brand/logo-mark.webp'

/** Brand images from Admin → Settings → Logo & SEO (falls back to the built-in logo). Safe before data has loaded. */
function useBrand() {
  const qc = useQueryClient()
  return qc.getQueryData<SiteContent>(siteKeys.content())?.brand
}

/** If an uploaded logo cannot be loaded (deleted, wrong URL), show the built-in one instead of an empty space. */
const fallback = (src: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget
  if (!img.src.endsWith(src)) img.src = src
}

/** Icon only (sun + panel) — page loader, footer, admin sidebar, login page. */
export function LogoMark({ className }: { className?: string }) {
  const brand = useBrand()
  return <img src={brand?.logoMarkUrl || DEFAULT_MARK} alt="" aria-hidden width={192} height={192} decoding="async" onError={fallback(DEFAULT_MARK)} className={cn('object-contain', className)} />
}

export function Logo({ name = 'Baba Solars', light = false, className }: { name?: string; light?: boolean; className?: string }) {
  const brand = useBrand()
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label={`${name} home`}>
      {light ? (
        // Footer (dark background): icon + white name
        <>
          <LogoMark className="size-11 shrink-0" />
          <span className="font-display text-[1.3rem] font-bold leading-none tracking-tight text-snow-50">{name}</span>
        </>
      ) : (
        // Header (white background): full logo
        <img src={brand?.logoUrl || DEFAULT_FULL} alt={name} width={480} height={210} fetchPriority="high" onError={fallback(DEFAULT_FULL)} className="h-14 w-auto max-w-[11rem] object-contain sm:h-16 sm:max-w-[13rem]" />
      )}
    </Link>
  )
}
