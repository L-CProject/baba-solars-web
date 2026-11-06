import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useAnimationControls, useReducedMotion } from 'motion/react'
import * as motion from 'motion/react-m'
import { useSkipEntrance } from '@/lib/ssg'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger index: items in a grid fade in one after another. */
  index?: number
  as?: 'div' | 'li' | 'article'
}

const HIDDEN = { opacity: 0, y: 14 }
const SHOWN = { opacity: 1, y: 0 }
const VIEWPORT_MARGIN = '0px 0px -40px 0px'

/**
 * Lightweight fade-up when the element scrolls into view. GPU-friendly (opacity +
 * transform only), runs once, and is static for users who prefer reduced motion.
 * Over prerendered HTML, elements already on screen stay put (no flicker); elements
 * further down still animate when the visitor scrolls to them.
 */
export function Reveal({ children, className, index = 0, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()
  const overSsg = useSkipEntrance()
  const ref = useRef<HTMLElement>(null)
  const controls = useAnimationControls()
  const transition = { duration: 0.45, delay: Math.min(index, 5) * 0.06, ease: [0.22, 1, 0.36, 1] as const }
  const Cmp = as === 'li' ? motion.li : as === 'article' ? motion.article : motion.div

  useLayoutEffect(() => {
    const el = ref.current
    if (!overSsg || reduce || !el || typeof IntersectionObserver === 'undefined') return
    if (el.getBoundingClientRect().top < window.innerHeight) return
    controls.set(HIDDEN)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      void controls.start({ ...SHOWN, transition })
      io.disconnect()
    }, { rootMargin: VIEWPORT_MARGIN })
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (overSsg) {
    return <Cmp ref={ref as never} className={className} initial={false} animate={controls}>{children}</Cmp>
  }
  return (
    <Cmp
      className={className}
      initial={reduce ? false : HIDDEN}
      whileInView={SHOWN}
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      transition={transition}
    >
      {children}
    </Cmp>
  )
}
