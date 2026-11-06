import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Open modals, innermost last — only the top one reacts to Esc / Tab. */
const stack: symbol[] = [];

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

/** Accessible dialog: focus moves in, Esc closes, Tab is trapped, body scroll locked. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const me = Symbol('modal');
    stack.push(me);
    lastFocused.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const active = document.activeElement;
      if (
        active &&
        panelRef.current?.contains(active) &&
        active !== panelRef.current
      )
        return;
      const first = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-close])',
      );
      (first ?? panelRef.current)?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(me), 1);
      document.body.style.overflow = prevOverflow;
      lastFocused.current?.focus?.();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.16 } }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-panel bg-surface shadow-lift sm:rounded-panel',
              sizes[size],
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
              <div>
                <h2 id={titleId} className="text-xl">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                data-close
                onClick={onClose}
                className="-mr-2 rounded-field p-2 text-muted hover:bg-ice-100 hover:text-ink"
                aria-label="Close dialog"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="overflow-y-auto overscroll-contain px-6 py-5">
              {children}
            </div>
            {footer && (
              <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4 safe-bottom sm:pb-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
