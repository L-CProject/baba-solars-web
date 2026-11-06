import { cn } from '@/lib/cn'

/**
 * Animated illustration: a drone hovering over a solar array, spraying water
 * while a light sweep shows the panels getting clean. Pure SVG + CSS, no
 * images to load. Animations stop automatically with prefers-reduced-motion.
 */
export function DroneArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" className={cn('h-auto w-full', className)} role="img" aria-labelledby="drone-art-title">
      <title id="drone-art-title">Drone cleaning roof solar panels</title>
      <defs>
        <linearGradient id="da-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-navy-700)" />
          <stop offset="1" stopColor="var(--color-navy-900)" />
        </linearGradient>
        <linearGradient id="da-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="da-panels">
          <polygon points="40,330 440,330 400,230 80,230" />
        </clipPath>
      </defs>

      <rect width="480" height="360" rx="24" fill="url(#da-sky)" />
      <circle cx="400" cy="70" r="34" fill="var(--color-sun-400)" opacity="0.9" />
      <circle cx="400" cy="70" r="52" fill="var(--color-sun-400)" opacity="0.12" />

      {/* Solar array */}
      <g clipPath="url(#da-panels)">
        <polygon points="40,330 440,330 400,230 80,230" fill="var(--color-steel-500)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`v${i}`} x1={40 + i * 100} y1="330" x2={80 + i * 80} y2="230" stroke="var(--color-navy-500)" strokeWidth="3" />
        ))}
        {[0, 1, 2].map((i) => (
          <line key={`h${i}`} x1={40 + i * 13.3} y1={330 - i * 33.3} x2={440 - i * 13.3} y2={330 - i * 33.3} stroke="var(--color-navy-500)" strokeWidth="3" />
        ))}
        {/* Dust that the sweep "cleans" */}
        <rect x="40" y="230" width="400" height="100" fill="#c9b48a" opacity="0.18" />
        <rect className="clean-sweep" x="0" y="225" width="160" height="110" fill="url(#da-sweep)" />
      </g>
      <polygon points="40,330 440,330 400,230 80,230" fill="none" stroke="var(--color-snow-300)" strokeWidth="4" strokeLinejoin="round" />

      {/* Drone */}
      <g className="drone-hover" style={{ transformOrigin: '240px 120px' }}>
        {/* Spray */}
        {[-24, -8, 8, 24].map((dx, i) => (
          <path
            key={dx}
            className="spray-drop"
            style={{ animationDelay: `${i * 0.18}s`, transformBox: 'fill-box' }}
            d={`M${240 + dx} 150 q2 6 0 10 q-2 -4 0 -10z`}
            fill="var(--color-ice-200)"
          />
        ))}
        {/* Arms */}
        <g stroke="var(--color-snow-300)" strokeWidth="6" strokeLinecap="round">
          <line x1="190" y1="104" x2="290" y2="136" />
          <line x1="290" y1="104" x2="190" y2="136" />
        </g>
        {/* Rotors */}
        {[[190, 100], [290, 100], [190, 140], [290, 140]].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="5" fill="var(--color-navy-900)" />
            <ellipse className="rotor-spin" cx={cx} cy={cy} rx="26" ry="4" fill="var(--color-snow-50)" opacity="0.75" />
          </g>
        ))}
        {/* Body */}
        <rect x="214" y="108" width="52" height="26" rx="10" fill="var(--color-snow-50)" />
        <rect x="222" y="114" width="36" height="8" rx="4" fill="var(--color-navy-700)" />
        <circle cx="240" cy="140" r="7" fill="var(--color-sun-400)" />
        <circle cx="240" cy="140" r="3" fill="var(--color-navy-900)" />
      </g>
    </svg>
  )
}
