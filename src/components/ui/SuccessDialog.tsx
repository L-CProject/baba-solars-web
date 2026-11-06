import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as motion from 'motion/react-m';
import { Check, X } from 'lucide-react';
import { Button } from './Button';

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}

/**
 * Small centred confirmation popup (e.g. "Thank You!" after a form is saved).
 * Accessible: role="alertdialog", focus moves to the Close button, Esc closes, Tab stays inside,
 * focus returns to where it was, page scroll is locked. Respects reduced-motion.
 */
export function SuccessDialog({ open, onClose, title, children, closeLabel = 'Close' }: SuccessDialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => closeRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-navy-900/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
            className="relative w-full max-w-sm overflow-hidden rounded-panel bg-surface text-center shadow-lift"
          >
            <div className="h-1.5 bg-gradient-to-r from-sun-400 via-sun-300 to-leaf-500" aria-hidden />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-4 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ice-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-sun-500"
              aria-label="Close dialog"
            >
              <X className="size-4.5" aria-hidden />
            </button>
            <div className="px-6 pb-6 pt-8 sm:px-8">
              <span className="relative mx-auto grid size-16 place-items-center">
                <span className="absolute inset-0 rounded-full bg-leaf-100" aria-hidden />
                {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-leaf-500/20 [animation-iteration-count:2]" aria-hidden />}
                <span className="relative grid size-11 place-items-center rounded-full bg-leaf-500 text-snow-50 shadow-soft">
                  <Check className="size-6" strokeWidth={3} aria-hidden />
                </span>
              </span>
              <h2 id={titleId} className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h2>
              <div id={descId} className="mt-2 text-ink-soft">{children}</div>
              <Button ref={closeRef} size="lg" className="mt-6 w-full" onClick={onClose}>{closeLabel}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
