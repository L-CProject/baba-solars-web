import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-m'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'error' | 'info'
interface Toast { id: number; title: string; description?: string; tone: Tone }
interface ToastContextValue { toast: (t: Omit<Toast, 'id' | 'tone'> & { tone?: Tone }) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyles: Record<Tone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: 'text-leaf-700' },
  error: { icon: CircleAlert, className: 'text-clay-700' },
  info: { icon: Info, className: 'text-navy-700' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback<ToastContextValue['toast']>((t) => {
    const id = ++counter.current
    setToasts((prev) => [...prev.slice(-3), { id, tone: 'success', ...t }])
    window.setTimeout(() => dismiss(id), 4200)
  }, [dismiss])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 p-3 sm:bottom-0 sm:top-auto sm:items-start sm:p-5"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, className } = toneStyles[t.tone]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-lift"
              >
                <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="rounded-md p-1 text-muted hover:text-ink" aria-label="Dismiss notification">
                  <X className="size-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.toast
}
