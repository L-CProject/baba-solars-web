import type { ProjectCategory } from '@/types'
import { color } from '@/theme/tokens'

/** Deterministic illustration used when a project has no photo. */
function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const skies = [
  [color.ice, color.snow],
  [color.iceDeep, color.snowDeep],
  [color.sunLight, color.snow],
]

export function ProjectArt({ seed, category, className }: { seed: string; category: ProjectCategory; className?: string }) {
  const h = hash(seed)
  const [top, bottom] = skies[h % skies.length]
  const sunX = 60 + (h % 220)
  const sunY = 40 + ((h >> 3) % 30)
  const gid = `sky-${seed}`
  const rows = category === 'industrial' ? 3 : category === 'commercial' ? 2 : 1
  const cols = category === 'residential' ? 4 : 7

  return (
    <svg viewBox="0 0 320 200" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${gid})`} />
      <circle cx={sunX} cy={sunY} r="18" fill={color.sun} opacity="0.9" />
      {category === 'industrial' ? (
        <path d="M30 200 V120 L90 100 V120 L150 100 V120 L210 100 V120 L290 100 V200Z" fill={color.steel} />
      ) : category === 'commercial' ? (
        <rect x="50" y="110" width="220" height="90" fill={color.steel} />
      ) : (
        <rect x="80" y="125" width="160" height="75" fill={color.steel} />
      )}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const w = category === 'residential' ? 30 : 26
          const startX = category === 'residential' ? 92 : 58
          const x = startX + c * (w + 3)
          const y = (category === 'industrial' ? 96 : category === 'commercial' ? 92 : 108) - r * 14
          return <polygon key={`${r}-${c}`} points={`${x},${y + 12} ${x + w},${y + 12} ${x + w + 4},${y} ${x + 4},${y}`} fill={color.navyDeep} />
        }),
      )}
      {category === 'maintenance' && (
        <g transform="translate(250 150)">
          <circle r="22" fill={color.surface} />
          <path d="M-8 6 L6 -8 M2 -12 a6 6 0 1 0 10 10" stroke={color.navy} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
