/**
 * JS access to design tokens. Values point at CSS variables defined in
 * src/styles/index.css, so there is one source of truth: change the CSS
 * variable and SVG illustrations, charts and inline styles follow.
 */
export const color = {
  canvas: 'var(--color-canvas)',
  surface: 'var(--color-surface)',
  ink: 'var(--color-ink)',
  muted: 'var(--color-muted)',
  line: 'var(--color-line)',
  primary: 'var(--color-primary)',
  accent: 'var(--color-accent)',
  sun: 'var(--color-sun-400)',
  sunDeep: 'var(--color-sun-500)',
  sunLight: 'var(--color-sun-300)',
  ice: 'var(--color-ice-200)',
  iceDeep: 'var(--color-ice-300)',
  steel: 'var(--color-steel-500)',
  navy: 'var(--color-navy-700)',
  navyDeep: 'var(--color-navy-800)',
  snow: 'var(--color-snow-100)',
  snowDeep: 'var(--color-snow-200)',
  leaf: 'var(--color-leaf-500)',
} as const

export const motionTokens = {
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
} as const
