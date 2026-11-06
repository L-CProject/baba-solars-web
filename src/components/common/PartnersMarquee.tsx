/** Brand strip that scrolls gently (the client's partner-logo row). Pauses on hover; static with reduced motion. */
export function PartnersMarquee({ names }: { names: string[] }) {
  if (!names.length) return null
  const loop = [...names, ...names]
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <ul className="flex w-max animate-[marquee_32s_linear_infinite] gap-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center">
        {loop.map((n, i) => (
          <li
            key={`${n}-${i}`}
            aria-hidden={i >= names.length || undefined}
            className="grid h-20 min-w-44 place-items-center rounded-card border border-line bg-surface px-8 font-display text-xl text-navy-600 shadow-soft"
          >
            {n}
          </li>
        ))}
      </ul>
    </div>
  )
}
