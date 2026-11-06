import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { Clock, Mail, Menu, Phone, X } from 'lucide-react';
import { NAV_LINKS } from '@/config/site';
import { useSiteContent } from '@/queries';
import { mailHref, telHref, whatsappHref } from '@/lib/format';
import { cn } from '@/lib/cn';
import { LinkButton, WhatsAppIcon } from '@/components/ui';
import { Logo } from './Logo';
import { HighlightTicker } from './HighlightTicker';
import { OfferNavButton, OfferRibbon, useLiveOffers } from '@/components/common/OfferRibbon';

export function Navbar() {
  const content = useSiteContent();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const liveOffers = useLiveOffers();
  const offerLive = liveOffers.length > 0;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  // Close on navigation (also covers browser back/forward).
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  // Escape closes; Tab stays inside the open menu; the menu closes if the window grows to desktop width.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('a,button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const mq = window.matchMedia('(min-width: 80rem)');
    const onWide = () => { if (mq.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    mq.addEventListener?.('change', onWide);
    return () => { document.removeEventListener('keydown', onKey); mq.removeEventListener?.('change', onWide); };
  }, [open, close]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* While an offer is live its marquee leads every page; otherwise the rotating highlights
          (drone cleaning · 6 months free cleaning · PM Surya Ghar). */}
      {offerLive ? <OfferRibbon /> : <HighlightTicker />}

      {/* Contact bar (tablet/desktop). On phones the bottom call/WhatsApp bar does this job. */}
      <div className="hidden border-t border-navy-800 bg-navy-900 text-sm text-snow-200 md:block">
        <div className="container-site flex min-h-9 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-1.5">
          <div className="flex items-center gap-5">
            <a
              href={telHref(content.phone)}
              className="inline-flex items-center gap-1.5 hover:text-sun-300"
            >
              <Phone className="size-3.5" aria-hidden />
              {content.phone}
            </a>
            <a
              href={mailHref(content.email)}
              className="inline-flex items-center gap-1.5 hover:text-sun-300"
            >
              <Mail className="size-3.5" aria-hidden />
              {content.email}
            </a>
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              <Clock className="size-3.5" aria-hidden />
              {content.hours}
            </span>
          </div>
          {content.whatsapp && (
            <a
              href={whatsappHref(content.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-sun-300"
            >
              <WhatsAppIcon className="size-3.5" />
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>
      <header
        className={cn(
          'sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300',
          scrolled
            ? 'border-b border-line bg-surface/95 shadow-soft backdrop-blur-md'
            : 'border-b border-line bg-surface',
        )}
      >
        <nav
          className="container-site flex h-[4.5rem] items-center justify-between gap-4"
          aria-label="Main"
        >
          <Logo name={content.businessName} />

          <ul className="hidden items-center gap-0.5 xl:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative whitespace-nowrap rounded-field px-2 py-2 text-[0.92rem] font-medium transition-colors',
                      isActive
                        ? 'text-ink after:absolute after:inset-x-2 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent'
                        : 'text-muted hover:text-ink',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2 xl:ml-0">
            <span className="contents xl:hidden 2xl:contents"><OfferNavButton /></span>
            <span className="hidden 2xl:contents">
              <LinkButton to="/contact" variant="accent" size="sm">
                Get a free quote
              </LinkButton>
            </span>
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="-mr-2 inline-flex size-11 touch-manipulation items-center justify-center rounded-field text-ink xl:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </nav>
      </header>

      {/* Mobile / tablet menu: full-height drawer above everything (incl. the floating contact bar). */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] xl:hidden">
            <motion.div
              className="absolute inset-0 bg-navy-900/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => close(true)}
              aria-hidden
            />
            <motion.div
              ref={panelRef}
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-lift"
            >
              <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-line px-4">
                <div onClick={() => close()}><Logo name={content.businessName} /></div>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="inline-flex size-11 items-center justify-center rounded-field text-ink"
                  aria-label="Close menu"
                >
                  <X className="size-6" />
                </button>
              </div>
              <nav aria-label="Mobile" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                <ul className="grid gap-0.5">
                  {offerLive && (
                    <li>
                      <NavLink to="/offers" onClick={() => close()} className="diwali-scope mb-1 flex min-h-12 items-center gap-2 rounded-field bg-[linear-gradient(100deg,var(--dw-plum),var(--dw-maroon))] px-3 text-base font-bold text-[var(--dw-gold)]">
                        <span aria-hidden>🎁</span> {liveOffers[0]?.badge || 'Offers'}
                      </NavLink>
                    </li>
                  )}
                  {NAV_LINKS.map((l) => (
                    <li key={l.to}>
                      <NavLink
                        to={l.to}
                        end={l.to === '/'}
                        onClick={() => close()}
                        className={({ isActive }) =>
                          cn(
                            'flex min-h-12 items-center rounded-field px-3 text-base font-medium transition-colors',
                            isActive ? 'bg-ice-100 text-ink' : 'text-ink-soft hover:bg-snow-100 active:bg-snow-200',
                          )
                        }
                      >
                        {l.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="grid shrink-0 gap-2 border-t border-line p-4 safe-bottom">
                <LinkButton to="/contact" onClick={() => close()}>Get a free quote</LinkButton>
                <LinkButton
                  href={telHref(content.phone)}
                  variant="secondary"
                  leftIcon={<Phone className="size-4" />}
                >
                  Call {content.phone}
                </LinkButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
