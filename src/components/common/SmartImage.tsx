import { useLayoutEffect, useRef, useState } from 'react'
import { Sun } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SmartImageProps {
  src: string
  alt: string
  className?: string
  /** Load eagerly with high priority (above-the-fold banners). */
  priority?: boolean
  sizes?: string
}

const SRCSET_WIDTHS = [480, 768, 1080, 1440, 2000]

/** Responsive candidates for Unsplash URLs (they resize via the `w` parameter), so phones get small files. */
export function responsiveSrcSet(src: string): string | undefined {
  const m = /^https:\/\/images\.unsplash\.com\/.*[?&]w=(\d+)/.exec(src)
  if (!m) return undefined
  const max = Number(m[1])
  return [...SRCSET_WIDTHS.filter((w) => w < max), max]
    .map((w) => `${src.replace(/([?&]w=)\d+/, `$1${w}`)} ${w}w`)
    .join(', ')
}

/**
 * <img> with a shimmer while loading and a warm branded fallback if the URL
 * fails, so a broken or missing photo never leaves an empty hole in the layout.
 */
export function SmartImage({ src, alt, className, priority, sizes }: SmartImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error')
  const ref = useRef<HTMLImageElement>(null)
  // Already in the browser cache (e.g. it was loaded by the prerendered HTML): show it at once, no fade.
  useLayoutEffect(() => {
    const img = ref.current
    if (img?.complete && img.naturalWidth > 0) setState('loaded')
  }, [src])

  if (state === 'error') {
    return (
      <div role={alt ? 'img' : undefined} aria-label={alt || undefined} className={cn('grid place-items-center bg-gradient-to-br from-ice-200 via-ice-100 to-snow-200', className)}>
        <Sun className="size-10 text-sun-400" aria-hidden />
      </div>
    )
  }

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      srcSet={responsiveSrcSet(src)}
      sizes={sizes ?? (responsiveSrcSet(src) ? '100vw' : undefined)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
      onLoad={() => setState('loaded')}
      onError={() => setState('error')}
      className={cn('object-cover transition-opacity duration-500', state === 'loading' ? 'skeleton opacity-0' : 'opacity-100', className)}
    />
  )
}
