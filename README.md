# Baba Solars — Website + Admin panel + Owner portal (frontend)

React 19 + TypeScript + Vite 8 + Tailwind CSS 4, TanStack Query, React Router 8, recharts (admin dashboard only). Talks to the Baba Solars API (`babasolars-backend`). Node.js **24.x** (see `engines`).

```
src/
  pages/public/        website pages (prerendered at build time with build:ssg)
  components/common/   ContactForm (enquiry form), SolarCalculator, …
  components/ui/       Button, Field, Modal, SuccessDialog, …
  admin/               admin panel: pages, components (ImageUploadField, LoginScreen, dashboard charts), hooks
  owner/               owner portal (separate login: OwnerLoginPage)
  services/            http client (cookies + CSRF), httpApi (every endpoint), enquiry submission flow
  queries/             TanStack Query hooks
  lib/                 shared business rules (same files as the backend's shared/lib)
e2e/run.mjs            browser end-to-end checks (Playwright)
```

## Install & run locally

```bash
npm ci
cp .env.example .env.local        # optional — defaults work for local development
npm run dev                       # http://localhost:5173 — proxies /api and /uploads to http://127.0.0.1:4000
```

Start the API first (`npm run dev` in the backend). Admin panel: `/admin/login`. Owner portal: `/owner/login` (separate page and session).

## Environment variables

All `VITE_*` values are compiled into public JavaScript — never put secrets here.

| Variable | Purpose |
|---|---|
| `VITE_SITE_URL` | Public URL for canonical links / SEO |
| `VITE_API_URL` | API origin. **Leave empty** when Nginx serves the site and proxies `/api` on the same domain (recommended). Set e.g. `https://api.babasolars.in` only for a separate API host (and add the site to the API's `CORS_ORIGINS`). |
| `PRERENDER_API_URL` | Build only (`build:ssg`): API used to prerender pages with live data |
| `API_PROXY_TARGET` | Dev/preview only: where `/api` is proxied (default `http://127.0.0.1:4000`) |
| `VITE_APPS_SCRIPT_URL`, `VITE_APPS_SCRIPT_TOKEN`, `VITE_ENQUIRY_DELIVERY` | Optional Google Sheet + email copy of enquiries (sent only after the API saved the enquiry) |

## Production build

```bash
npm run typecheck
npm run build                                          # dist/ (SPA)
PRERENDER_API_URL=http://127.0.0.1:4000 npm run build:ssg   # recommended: prerendered public pages + SPA shell
```

Deploy `dist/` to the web root (e.g. `/var/www/babasolars/web`). Nginx: serve files, fall back to `spa.html` for unknown routes, proxy `/api/` and serve `/uploads/` as described in the backend README. `public/_headers` / `_redirects` cover Netlify / Cloudflare Pages.

## Tests

```bash
# with the API running and a build served:
npm run build && npx vite preview --port 4173 &
E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_OWNER_EMAIL=… E2E_OWNER_PASSWORD=… node e2e/run.mjs
```

54 checks in Chromium against the real API and database (needs Playwright: `npm i -D playwright && npx playwright install chromium`). They submit a few real test enquiries and upload one test photo (deleted afterwards). Use a staging/dev database, and raise `RATE_LIMIT_LOGIN` / `RATE_LIMIT_ENQUIRIES` on that API while testing. Covers: contact form (mobile only, email only, both, both empty, invalid mobile/email, all optional fields empty, Home/Commercial, capacity incl. custom and not-sure, success popup and reset, API and network failure, duplicate-click prevention, no WhatsApp/new tab/redirect), admin/owner sign-in separation, logout and expired session, image upload (instant preview, replace, remove, invalid type, oversized, failed upload + retry, object-URL revocation, existing image after refresh), dashboard (numbers equal the API, recent 10 leads, charts, date filters, empty state, API error) on phone/tablet/laptop/desktop, and horizontal-overflow checks on public pages at 360/768/1440 px.

No ESLint config ships with the project; TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) is the static check.

## What the main flows do

- **Enquiry form** (`/contact`): only a valid mobile number **or** email is required. Home / Residential vs Commercial radio cards, optional capacity chips (1–30 kW, Other / Custom with an optional kW box, Not sure yet). Submits to `POST /api/public/enquiries`; the "Thank You!" popup appears only after the server confirms the save. No WhatsApp window, no redirect. Errors from the API are shown as they are, details stay filled in.
- **Image upload box** (admin): the chosen image appears immediately (object URL), uploads with a spinner, and is marked "Uploaded" only after the server answers; failures keep the preview marked "Not uploaded" with Retry/Remove and do not change the field.
- **Dashboard**: live cards, charts, recent 10 leads and filters from `GET /api/admin/dashboard/analytics`; trends appear only when older data exists.
