import { cn } from '@/lib/cn'

/**
 * Soft "energy" particles and slow sun rays for hero / dark sections.
 * Decorative only (aria-hidden), hidden automatically with prefers-reduced-motion.
 * Place inside a `relative overflow-hidden` parent.
 */
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 3 + (i % 4),
  dur: 10 + ((i * 7) % 9),
  delay: -((i * 13) % 17),
  drift: ((i % 5) - 2) * 14,
}))

export function SolarParticles({ tone = 'dark', rays = false, className }: { tone?: 'dark' | 'light'; rays?: boolean; className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {rays && (
        <svg className="solar-rays absolute -right-40 -top-40 size-[34rem] opacity-[0.12]" viewBox="0 0 200 200">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M100 100 L96 0 L104 0 Z" fill="var(--color-sun-300)" transform={`rotate(${i * 30} 100 100)`} />
          ))}
        </svg>
      )}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={cn('solar-particle', tone === 'dark' ? (i % 3 ? 'bg-sun-300/70' : 'bg-ice-200/60') : (i % 3 ? 'bg-sun-400/50' : 'bg-steel-400/35'))}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            ['--dur' as string]: `${p.dur}s`,
            ['--delay' as string]: `${p.delay}s`,
            ['--drift' as string]: `${p.drift}px`,
            boxShadow: tone === 'dark' ? '0 0 8px rgb(255 210 94 / 0.6)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
