# Changes in this release (frontend)

## Contact / enquiry form
- `src/components/common/ContactForm.tsx` — rebuilt: only mobile OR email required; Home / Residential vs Commercial radio cards; capacity chips (1, 2, 3, 5, 6, 8, 10, 15, 20, 25, 30 kW, Other / Custom with optional kW, Not sure yet); submits straight to the API; "Thank You!" popup only after the server saved it; form reset; loading, error and double-submit protection.
- `src/components/ui/SuccessDialog.tsx` (new), `src/components/ui/index.ts` — accessible success popup with Close.
- `src/lib/contactForm.ts` — new form rules (mobile OR email; capacity options/payload).
- `src/lib/enquiries.ts`, `src/types/index.ts`, `src/types/api.ts` — shared rules/types (same as backend `shared/`): `validateContactMethod`, capacity options/labels, `capacityChoice`, display-name helper, dashboard analytics types.
- `src/services/enquiryIntegrations.ts`, `src/config/integrations.ts`, `src/vite-env.d.ts`, `.env.example` — WhatsApp redirect/new-tab code removed; backend save is the only success condition.
- `src/components/common/SolarCalculator.tsx` — calculator quote request no longer opens WhatsApp either.
- `src/services/httpApi.ts` — sends `capacityChoice`; new `dashboardAnalytics()`.
- `src/pages/public/ContactPage.tsx` — Home/Commercial is pre-selected only when the link asks for it.

## Admin image upload
- `src/admin/components/ImageUploadField.tsx` — upload box with immediate object-URL preview, uploading overlay, "Uploaded" only after server confirmation, "Not uploaded" + Retry on failure, Replace/Remove, drag & drop, existing image on edit, link input kept, object URLs revoked.
- `src/lib/images.ts` — JPG/JPEG/PNG/WebP only, 10 MB source limit, clear messages.
- `src/admin/pages/GalleryAdminPage.tsx` — duplicate preview removed.

## Admin / owner login separation
- `src/admin/components/LoginScreen.tsx` (new), `src/admin/pages/LoginPage.tsx`, `src/owner/OwnerLoginPage.tsx` (new), `src/routes/AppRoutes.tsx` — separate pages; admin login has no owner text or links.
- `src/admin/components/RequireAuth.tsx` — owner portal for owner accounts only; admin panel for staff only.
- `src/admin/components/AdminLayout.tsx` — "Owner view" link removed.

## Dashboard
- `src/admin/pages/DashboardPage.tsx` — redesigned: filters (All time, Today, 7 / 30 days, This month, Custom), hero total card with sparkline, live cards with trends only when history exists, charts, Recent 10 leads, sales pipeline and website sections kept.
- `src/admin/components/dashboard/DashboardCharts.tsx` (new) — area, doughnut, comparison, capacity bars, monthly bars (validated colour palette, tooltips, empty/loading states).
- `src/queries/leads.ts` — `useDashboardAnalytics`.
- `src/styles/index.css` — subtle entrance animations (off with reduced motion).
- `package.json` — `recharts` (+ `react-is` peer) added; `package-lock.json` added.

## Lists
- `src/admin/pages/EnquiriesPage.tsx`, `src/admin/components/LeadDetail.tsx`, `src/owner/OwnerLeadsPage.tsx`, `src/owner/OwnerDashboardPage.tsx`, `src/excel/index.ts` — "Name not given" for nameless leads, capacity choice shown/exported, grouped status filters.

## Tests & docs
- `e2e/run.mjs` (new), `README.md` (new), `CHANGES.md` (new).
