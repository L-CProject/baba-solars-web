import { MessageSquareText, Phone } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useSiteContent } from '@/queries';
import { telHref, whatsappHref } from '@/lib/format';
import { WhatsAppIcon } from '@/components/ui';

/** Moves to the enquiry form: smooth scroll on the contact page, otherwise opens /contact#enquiry. */
function useEnquiryClick() {
  const { pathname } = useLocation();
  return (e: React.MouseEvent) => {
    if (pathname.replace(/\/+$/, '') !== '/contact') return; // the router link navigates; PublicLayout scrolls to #enquiry
    const el = document.getElementById('enquiry');
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Put the cursor in the first field once the scroll has settled (keyboard and screen-reader friendly).
    window.setTimeout(() => document.getElementById('contact-name')?.focus({ preventScroll: true }), reduce ? 0 : 550);
    history.replaceState(null, '', '#enquiry');
  };
}

/** Persistent contact actions shared by every public route and viewport. */
export function FloatingContact() {
  const content = useSiteContent();
  const onEnquiry = useEnquiryClick();
  return (
    <aside
      aria-label="Quick contact"
      className="fixed inset-x-auto bottom-0 right-4 z-[60] flex flex-col items-end gap-3 safe-bottom sm:right-6"
    >
      <Link
        to="/contact#enquiry"
        onClick={onEnquiry}
        aria-label="Send an enquiry"
        className="enquiry-fab group relative inline-flex min-h-12 items-center gap-2 rounded-chip bg-sun-400 px-4 py-3 font-semibold text-navy-900 shadow-lift transition duration-200 hover:-translate-y-0.5 hover:bg-sun-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
      >
        <span aria-hidden className="enquiry-fab-ring pointer-events-none absolute inset-0 rounded-chip" />
        <MessageSquareText className="enquiry-fab-icon relative size-5" aria-hidden="true" />
        <span className="relative">Enquiry</span>
      </Link>
      <a
        href={telHref(content.phone)}
        aria-label={`Call Now: ${content.phone}`}
        className="inline-flex min-h-12 items-center gap-2 rounded-chip border border-line bg-surface px-4 py-3 font-semibold text-ink shadow-lift transition duration-200 hover:-translate-y-0.5 hover:border-steel-400 hover:bg-ice-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:ring-offset-2"
      >
        <Phone className="size-5" aria-hidden="true" />
        <span>Call Now</span>
      </a>
      {content.whatsapp ? (
        <a
          href={whatsappHref(content.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp Chat with Baba Solars"
          className="inline-flex min-h-12 items-center gap-2 rounded-chip bg-[#1f7a4d] px-4 py-3 font-semibold text-white shadow-lift transition duration-200 hover:-translate-y-0.5 hover:bg-[#17633d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2"
        >
          <WhatsAppIcon className="size-5" />
          <span>WhatsApp Chat</span>
        </a>
      ) : null}
    </aside>
  );
}
