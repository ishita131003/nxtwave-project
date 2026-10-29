# NxtWave Growth Hub · Prototype

**Prototype · not affiliated with NxtWave.** A local-only demo built for a simulated NxtWave Growth Intern challenge. Every
registration, name, college and code in it is fictional. There is no backend: all data lives in your browser.

Campaign being measured: **"Build Your First AI Project in 60 Minutes"**, a free, online, beginner-friendly workshop. Goal: 500
unique valid registrations in 7 days on a ₹2,000 budget. The measurement model (funnel maths, the definition of a valid
registration, attribution and the day-3 decision rule) is in [docs/measurement.md](docs/measurement.md).

## Run it

Requires Node.js 20 or newer (tested on 22) and npm.

macOS / Linux:

```bash
npm ci
npm run dev
```

Windows (PowerShell or Command Prompt): the same commands work.

```powershell
npm ci
npm run dev
```

Open http://localhost:5173. No `.env` file is needed.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build static files into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run lint` | ESLint |
| `npm test` | Vitest: golden metrics fixture, service/auth/referral tests, the end-to-end referral flow, axe checks |

## Demo credentials

Seeded on first load and verified like any other account (PBKDF2 hashes, never plaintext).

| Portal | URL | Email | Password |
| --- | --- | --- | --- |
| Student | `/login` | `student.demo@example.com` | `StudentDemo@123` |
| Admin | `/admin/login` | `admin.demo@example.com` | `AdminDemo@123` |

Each login page has a **Use demo credentials** button. It only fills the fields; you still press Log in. Admin credentials only
work on `/admin/login`, student credentials only on `/login`.

**Two-minute tour:** open `/` → log in as the student → copy the referral link from the dashboard (or tear a strip) → log out →
open that link → register a new student → log in as admin → the dashboard's valid registrations, "Today", "Referred" and the daily
line have all moved. **Reset Demo Data** (footer, or Admin → Demo Settings) restores the seed after a confirmation.

## Optional environment variables

Copy `.env.example` to `.env` if you need it.

| Variable | Purpose |
| --- | --- |
| `VITE_WHATSAPP_COMMUNITY_URL` | WhatsApp community invite (`https://chat.whatsapp.com/…`). An admin can also set it in Campaign Settings, which takes precedence. When neither is set, students see a disabled "Community link coming soon" button. |

## Deploy as a static site

`npm run build` produces `dist/`, a plain static site.

- **Vercel:** import the repo; framework preset "Vite". `vercel.json` rewrites all routes to `index.html`.
- **Netlify:** build command `npm run build`, publish directory `dist`. `public/_redirects` handles client-side routes.

Each visitor's browser gets its own independent copy of the demo data.

## How it is built

- React + Vite + TypeScript, Tailwind CSS, React Router, Recharts (admin only, lazy-loaded), Lucide icons, Zod.
- `src/api/dataSource.ts`: the single `DataSource` interface the UI talks to. `src/api/localStore.ts` implements it over
  `localStorage` with a versioned key (`nxg:v1`), a migration step, and `storage`-event sync between tabs. Components never
  touch `localStorage`.
- The service layer authorizes every call: it looks up the session token, checks expiry (8 hours) and the user's **stored** role.
  Students calling admin methods, reading other students' records or sending a `role` field get an error. Route guards are UX only.
- `src/lib/metrics.ts`: pure functions that compute every KPI and chart from raw rows. No stored counters.
- `src/lib/schema.ts`: shared Zod schemas for stored entities, forms and service inputs.

## Verification

- `tests/fixtures/expected.json`: hand-computed KPIs for the seed. `tests/metrics.golden.test.ts` asserts that the metrics module
  matches exactly and that both source bar sets sum to the total.
- `tests/service.test.ts`: password hashing, demo login only on its own portal, session expiry, role checks (a student calling admin
  methods throws), duplicate-email rejection, referral resolution (valid / invalid / self via Gmail alias), the 5-per-day suggestion
  cap, and the full referral flow (student copies link → logs out → link opened → new student registers → referrer sees them →
  admin KPIs and chart increment → Reset Demo Data restores the golden numbers).
- `tests/lib.test.ts`: email normalization, alias and disposable-domain flags, CSV formula-injection escaping.
- `tests/a11y.test.tsx`: axe-core on 14 key public, student and admin pages, asserting zero serious or critical violations, plus
  the UI blocking a student from `/admin/*`. jsdom cannot compute colours, so the colour-contrast rule was run separately with axe in
  a real browser.

## Known limitations

- **Data is per-browser.** Registrations made on one device or browser are invisible everywhere else; there is no shared
  database and no cross-device reporting.
- **Browser storage is readable and editable in devtools.** Anyone with access to the browser can change records, including
  roles. The PBKDF2 hashing and service-layer checks are good practice, not real security.
- **No backend authorization.** All checks run in the same browser that holds the data.
- **No real email.** Nothing is ever sent. "Forgot password" resets after confirming the registered email and college, which a real
  system must never do.
- **Link-open counts are unverified.** They are distinct anonymous sessions; anyone can open a link repeatedly or from several
  devices, and WhatsApp's in-app browser may create new sessions.
- Cross-tab writes are atomic within a tab but not locked across tabs.
- Clipboard copy can be blocked inside some in-app browsers; the page says so and the Share button still works there.
