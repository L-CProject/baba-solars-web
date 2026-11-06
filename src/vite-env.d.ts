/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin when it is NOT served from the same domain under /api (default: same origin). */
  readonly VITE_API_URL?: string
  /** Public website URL used for canonical links and SEO, e.g. https://babasolars.in */
  readonly VITE_SITE_URL?: string
  /** Google Apps Script Web App URL that saves enquiries to Google Sheets and emails the admin */
  readonly VITE_APPS_SCRIPT_URL?: string
  /** Shared token checked by the Apps Script (Script Property API_TOKEN). Public in the bundle. */
  readonly VITE_APPS_SCRIPT_TOKEN?: string
  /** Optional: WhatsApp number for enquiries, with country code (default 919203900410) */
  /** "client" (default): the browser sends the Sheet row + email. "server": a backend does it. */
  readonly VITE_ENQUIRY_DELIVERY?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
