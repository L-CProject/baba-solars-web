/**
 * Optional website enquiry copies (Google Sheets + admin email via Google Apps Script).
 * Enquiries are always saved by the backend API first; nothing here opens WhatsApp.
 * Values come from .env (see .env.example / SETUP.md) — nothing is hard-coded in the source.
 *
 * NOTE: every VITE_* value is compiled into the public JavaScript. The token only stops casual
 * misuse of the Apps Script URL; the admin email lives in the Apps Script "Script Properties",
 * never in this frontend.
 */
const env = import.meta.env

const clean = (v: string | undefined) => (v ?? '').trim()

export const INTEGRATIONS = {
  /** Deployed Apps Script Web App URL (…/exec). Empty = Sheets/email are skipped. */
  appsScriptUrl: clean(env.VITE_APPS_SCRIPT_URL),
  /** Shared token checked by the Apps Script (Script Property API_TOKEN). */
  appsScriptToken: clean(env.VITE_APPS_SCRIPT_TOKEN),
  /**
   * Who sends the Google Sheet row and admin email:
   *  'client' (default, today) — the browser calls the Apps Script after saving the enquiry.
   *  'server' — a backend does it when the enquiry document is created (e.g. a Firebase Cloud Function
   *             triggered on enquiries/{submissionId}); the browser then only saves.
   */
  delivery: (clean(env.VITE_ENQUIRY_DELIVERY) === 'server' ? 'server' : 'client') as 'client' | 'server',
  /** Network timeout for one Apps Script call. */
  timeoutMs: 15_000,
} as const

export const appsScriptConfigured = () => INTEGRATIONS.delivery === 'client' && /^https:\/\/\S+$/.test(INTEGRATIONS.appsScriptUrl)
