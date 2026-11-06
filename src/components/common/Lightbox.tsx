import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-m'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { SmartImage } from './SmartImage'

export interface LightboxItem { id: string; imageUrl: string; caption: string }

interface LightboxProps {
  items: LightboxItem[]
  index: number | null
  onChange: (i: number | null) => void
}

/** Full-screen photo viewer: arrows, swipe, Esc to close, focus returned on close. */
export function Lightbox({ items, index, onChange }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchX = useRef<number | null>(null)
  const open = index !== null && items.length > 0
  const n = items.length

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null)
      if (e.key === 'ArrowRight') onChange(((index ?? 0) + 1) % n)
      if (e.key === 'ArrowLeft') onChange(((index ?? 0) - 1 + n) % n)
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, index, n, onChange])

  const item = open ? items[index!] : null

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[85] flex flex-col bg-navy-900/95"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 45) onChange(((index ?? 0) + (dx < 0 ? 1 : -1) + n) % n)
            touchX.current = null
          }}
        >
          <div className="flex items-center justify-between p-4 text-snow-200">
            <span className="text-sm tabular-nums">{index! + 1} / {n}</span>
            <button ref={closeRef} onClick={() => onChange(null)} className="grid size-11 place-items-center rounded-full hover:bg-snow-50/10" aria-label="Close photo viewer">
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-20">
            <AnimatePresence mode="wait">
              <motion.figure
                key={item.id}
                className="flex max-h-full flex-col items-center"
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <SmartImage src={item.imageUrl} alt={item.caption} className="max-h-[75dvh] w-auto max-w-full rounded-card" />
                {item.caption && <figcaption className="mt-4 text-center text-snow-200">{item.caption}</figcaption>}
              </motion.figure>
            </AnimatePresence>
            {n > 1 && (
              <>
                <button onClick={() => onChange((index! - 1 + n) % n)} className="absolute left-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-snow-50/10 text-snow-50 hover:bg-snow-50/20 md:left-6" aria-label="Previous photo">
                  <ChevronLeft className="size-6" />
                </button>
                <button onClick={() => onChange((index! + 1) % n)} className="absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-snow-50/10 text-snow-50 hover:bg-snow-50/20 md:right-6" aria-label="Next photo">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          <div className="h-6 safe-bottom" />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
