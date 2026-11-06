import { color } from '@/theme/tokens'

/**
 * "How roof solar works" — replaces the client's raster infographic with a
 * crisp, accessible SVG that scales on every screen.
 */
const steps = [
  { title: 'Solar panels', text: 'Turn sunlight into DC power' },
  { title: 'Inverter', text: 'Converts DC to AC for your home' },
  { title: 'Your home', text: 'Runs lights, fans, ACs first' },
  { title: 'Net meter', text: 'Exports extra units to the grid' },
]

export function SolarInfographic() {
  return (
    <figure className="w-full">
      <svg viewBox="0 0 680 175" className="w-full" role="img" aria-labelledby="info-title info-desc">
        <title id="info-title">How roof solar works</title>
        <desc id="info-desc">Sunlight hits the solar panels, the inverter converts the power, your home uses it first, and the net meter sends surplus to the grid for credit.</desc>
        <circle cx="70" cy="28" r="16" fill={color.sun} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1={70 + Math.cos((a * Math.PI) / 180) * 22} y1={28 + Math.sin((a * Math.PI) / 180) * 22} x2={70 + Math.cos((a * Math.PI) / 180) * 28} y2={28 + Math.sin((a * Math.PI) / 180) * 28} stroke={color.sun} strokeWidth="3" strokeLinecap="round" />
        ))}
        <path d="M110 120 H210 M290 120 H390 M470 120 H570" stroke={color.steel} strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
        {[210, 390, 570].map((x) => <path key={x} d={`M${x - 8} 113 L${x + 2} 120 L${x - 8} 127`} fill="none" stroke={color.steel} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
        {/* panels */}
        <g transform="translate(30 92)">
          <polygon points="0,52 80,52 92,8 12,8" fill={color.navyDeep} />
          <path d="M6 30 H86 M46 52 L52 8" stroke={color.steel} strokeWidth="1.5" />
        </g>
        {/* inverter */}
        <g transform="translate(220 82)">
          <rect width="60" height="76" rx="8" fill={color.surface} stroke={color.navy} strokeWidth="3" />
          <rect x="12" y="14" width="36" height="16" rx="3" fill={color.leaf} opacity="0.8" />
          <circle cx="30" cy="52" r="7" fill={color.sun} />
        </g>
        {/* house */}
        <g transform="translate(395 76)">
          <path d="M0 40 L35 8 L70 40 V88 H0 Z" fill={color.ice} stroke={color.navy} strokeWidth="3" strokeLinejoin="round" />
          <rect x="26" y="56" width="18" height="32" fill={color.navy} />
        </g>
        {/* meter */}
        <g transform="translate(580 84)">
          <rect width="60" height="72" rx="30" fill={color.surface} stroke={color.navy} strokeWidth="3" />
          <path d="M16 40 A16 16 0 0 1 44 40" fill="none" stroke={color.leaf} strokeWidth="4" strokeLinecap="round" />
          <line x1="30" y1="40" x2="40" y2="30" stroke={color.navy} strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
      <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="text-center">
            <span className="mx-auto grid size-7 place-items-center rounded-full bg-navy-700 text-sm font-bold text-snow-50">{i + 1}</span>
            <p className="mt-2 font-semibold text-ink">{s.title}</p>
            <p className="text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </figure>
  )
}
