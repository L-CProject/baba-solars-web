import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as motion from 'motion/react-m';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { HeroSlide } from '@/types';
import { useSiteContent } from '@/queries';
import { whatsappHref } from '@/lib/format';
import { cn } from '@/lib/cn';
import { LinkButton, WhatsAppIcon } from '@/components/ui';
import { SmartImage } from './SmartImage';
import { SolarParticles } from './SolarParticles';

const INTERVAL = 6500;

/**
 * Full-width banner slider (the client's original hero format), improved:
 * autoplay with pause, swipe on touch, keyboard arrows, visible progress,
 * and readable text over any photo.
 */
/** `eager` = the banner is the first thing on the page (load its first photo with high priority). */
export function HeroSlider({ slides, eager = true }: { slides: HeroSlide[]; eager?: boolean }) {
  const content = useSiteContent();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused || hovering || reduce) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, paused, hovering, reduce, count, go]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;
  const slide = slides[Math.min(index, count - 1)];
  const running = count > 1 && !paused && !hovering && !reduce;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative isolate overflow-hidden bg-navy-900"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative h-[40rem] sm:h-[38rem] lg:h-[min(44rem,86vh)]">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ scale: reduce ? 1 : 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 7, ease: 'linear' }}
            >
              <SmartImage
                src={slide.imageUrl}
                alt=""
                priority={eager && index === 0}
                className="size-full"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Readability overlay: warm earth tone, strongest behind the text */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-navy-900/88 via-navy-900/55 to-navy-900/10"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-900/70 to-transparent"
          aria-hidden
        />
        {/* Soft solar motion: slow sun rays + rising energy particles */}
        <SolarParticles rays />

        <div className="container-site relative flex h-full items-center pb-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className="max-w-2xl text-snow-50"
              initial={{ opacity: 0, y: reduce ? 0 : 18 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.6,
                  delay: 0.25,
                  ease: [0.22, 1, 0.36, 1],
                },
              }}
              exit={{
                opacity: 0,
                y: reduce ? 0 : -10,
                transition: { duration: 0.25 },
              }}
            >
              {slide.kicker && (
                <p className="mb-4 inline-flex items-center gap-2 rounded-chip bg-sun-400 px-3.5 py-1 text-sm font-semibold text-navy-900">
                  {slide.kicker}
                </p>
              )}
              <h1 className="text-[2.3rem] leading-[1.08] text-snow-50 sm:text-5xl lg:text-[3.6rem]">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-snow-200">
                  {slide.subtitle}
                </p>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {slide.ctaLabel &&
                  (slide.ctaLink.startsWith('http') ? (
                    <LinkButton
                      href={slide.ctaLink}
                      external
                      variant="accent"
                      size="lg"
                    >
                      {slide.ctaLabel}
                    </LinkButton>
                  ) : (
                    <LinkButton
                      to={slide.ctaLink || '/contact'}
                      variant="accent"
                      size="lg"
                    >
                      {slide.ctaLabel}
                    </LinkButton>
                  ))}
                {content.whatsapp && (
                  <LinkButton
                    href={whatsappHref(content.whatsapp)}
                    external
                    variant="light"
                    size="lg"
                    leftIcon={<WhatsAppIcon className="size-5" />}
                  >
                    WhatsApp us
                  </LinkButton>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {count > 1 && (
          <div className="absolute inset-x-0 bottom-6">
            <div className="container-site flex items-center justify-between gap-4">
              <div
                className="flex items-center gap-0.5"
                role="tablist"
                aria-label="Choose slide"
              >
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show slide ${i + 1}: ${s.title}`}
                    onClick={() => go(i)}
                    className="group/dot grid h-8 min-w-8 place-items-center"
                  >
                    <span
                      className={cn(
                        'relative block h-1.5 overflow-hidden rounded-full transition-all duration-300',
                        i === index
                          ? 'w-12 bg-snow-50/30'
                          : 'w-6 bg-snow-50/40 group-hover/dot:bg-snow-50/70',
                      )}
                    >
                      {i === index && (
                        <motion.span
                          key={`${s.id}-${running}`}
                          className="absolute inset-0 origin-left bg-sun-400"
                          initial={{ scaleX: running ? 0 : 1 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: running ? INTERVAL / 1000 : 0,
                            ease: 'linear',
                          }}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="grid size-10 place-items-center rounded-full border border-snow-50/30 text-snow-50 hover:bg-snow-50/15"
                  aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                >
                  {paused ? (
                    <Play className="size-4" />
                  ) : (
                    <Pause className="size-4" />
                  )}
                </button>
                <button
                  onClick={() => go(index - 1)}
                  className="grid size-10 place-items-center rounded-full border border-snow-50/30 text-snow-50 hover:bg-snow-50/15"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={() => go(index + 1)}
                  className="grid size-10 place-items-center rounded-full border border-snow-50/30 text-snow-50 hover:bg-snow-50/15"
                  aria-label="Next slide"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
