import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingContact } from './FloatingContact';
import { PageLoader } from './PageLoader';
import { SiteMeta } from './SiteMeta';

/**
 * Scroll to top on page change, or smooth-scroll to #section when the URL has a hash.
 * Pages are lazy-loaded, so it retries for up to ~3 s until the section exists.
 */
function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 40) timer = window.setTimeout(attempt, 75);
    };
    timer = window.setTimeout(attempt, 60);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key]);
  return null;
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[100] rounded-field bg-primary px-4 py-2 text-snow-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <SiteMeta />
      <Navbar />
      <main id="main" className="flex-1 pb-48">
        {/* Full-height fallback keeps the footer below the fold while a page chunk loads (no layout shift). */}
        <Suspense
          fallback={
            <div className="min-h-dvh">
              <PageLoader />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <FloatingContact />
    </div>
  );
}
