import { useId, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-m'
import { Plus } from 'lucide-react'
import type { Faq } from '@/types'
import { cn } from '@/lib/cn'

function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  const id = useId()
  return (
    <li className="border-b border-line last:border-b-0">
      <h3 className="font-sans">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 py-5 text-left text-[1.05rem] font-semibold text-ink"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-btn`}
          onClick={onToggle}
        >
          {faq.question}
          <Plus className={cn('size-5 shrink-0 text-steel-600 transition-transform duration-300', open && 'rotate-45')} aria-hidden />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-btn`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-5 leading-relaxed text-muted">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function FaqList({ faqs, defaultOpen }: { faqs: Faq[]; defaultOpen?: string }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null)
  return (
    <ul className="rounded-card border border-line bg-surface px-5 shadow-soft md:px-7">
      {faqs.map((f) => (
        <FaqItem key={f.id} faq={f} open={openId === f.id} onToggle={() => setOpenId((cur) => (cur === f.id ? null : f.id))} />
      ))}
    </ul>
  )
}
