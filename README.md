# Business OS — Frontend

The web app for Business OS: the screens people use in a browser, on a laptop or a phone. It talks to the
backend in the `Business_os_backend` folder next to this one.

This file tracks the work step by step, in plain language: what was built, how it works, how to run and
test it, what was checked, and what is still open.

## Phase 9 plan

Phase 9 builds the frontend in eight steps. Each step is built, tested in a real browser at laptop and
phone sizes, tried by you, then committed.

| Step | What it brings | Status |
| --- | --- | --- |
| 9.1 | Foundation: sign up, sign in, two-step verification, password reset, the app frame, language, business switcher, profile and security | **Done** |
| 9.2 | Businesses and team: business settings, members, invitations | Next |
| 9.3 | Accounts, transactions, approvals, attachments | |
| 9.4 | Dashboards, reports, budgets, goals, exports, all-businesses view | |
| 9.5 | Ledger: chart of accounts, journals, closing months, reconciliation | |
| 9.6 | Bank statements: import, inbox, rules | |
| 9.7 | Tasks, reminders, recurring schedules, notifications, push | |
| 9.8 | AI assistant, document search, audit history | |

## Decisions made before starting

- **English first, Bangla alongside.** English is the default. A button switches to Bangla. Once you
  are signed in, the choice is saved to your account, so it follows you to other devices and to emails.
- **Laptop first, works on phones.** On a laptop the menu sits on the left. On a phone it opens from the
  ☰ button.
- **Logo and colours in one place.** See "Changing the logo and colours" below.
- **No domain yet.** The app goes on Vercel's own address for now. Vercel passes `/api` requests on to
  the backend (see "Deploying to Vercel"). That keeps the sign-in cookie working, because the browser
  sees the app and the API as the same site.

## The tools it's built with

| Tool | What it does here |
| --- | --- |
| React 19 + TypeScript | The screens, with types checked before anything runs |
| Vite 8 | Runs the app while developing, and builds it for production |
| Tailwind CSS 4 | Styling, using the colour names from `src/styles/theme.css` |
| Radix UI | Menus, dialogs and the phone drawer, which work with a keyboard and screen readers |
| TanStack Query | Loads data from the API and keeps it fresh |
| Redux Toolkit | Remembers who is signed in |
| React Router | The addresses, like `/login` and `/b/<business>` |
| react-hook-form + zod | Forms, and checking them before they're sent |
| i18next | English and Bangla text |
| openapi-fetch | Calls the API with types generated from the backend's own description |
| Vitest | Small tests of single pieces |
| Playwright | Browser tests that click through the app like a person |

## Running it on your Mac

You need the backend running first (see its README). Then:

```bash
npm install
npm run dev
```

Open http://localhost:5173. The frontend passes every `/api` request on to the backend at
`http://localhost:5001`. To use a different backend, set `API_TARGET`, for example
`API_TARGET=http://localhost:5002 npm run dev`.

**How the two talk to each other.** The browser only ever talks to the frontend's own address
(`localhost:5173`). When a screen asks for `/api/...`, the frontend's dev server (Vite) passes the
request on to whichever backend `API_TARGET` names, and passes the answer back. The browser never sees
the backend's address. That is why the strict sign-in cookie works. On Vercel, the same job is done by
the rewrite in `vercel.json`.

**Your backend or the test backend.** The frontend doesn't care which backend it talks to:

| | Your normal backend | The test backend |
| --- | --- | --- |
| Port | 5001 | 5002 |
| Database | Neon (your real data) | `business_os_e2e` in local Docker |
| Emails | Gmail, really sent | Mailpit, caught at http://localhost:8025 |
| Started by | You, with `npm run dev` in the backend | `API_TARGET=http://localhost:5002 npm run dev` here, after starting it (see "Browser tests") |

It's one and the same backend code. Only the settings differ. The browser tests create a dozen
throwaway accounts on each run, so they use the test backend. That keeps the junk out of your Neon data
and stops real emails going to fake addresses.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run build` | Checks types, then builds the production files into `dist/` |
| `npm run typecheck` | Checks types only |
| `npm run lint` | Checks code style and React rules |
| `npm test` | Runs the small tests (money formatting, translations, sign-in refresh, device names) |
| `npm run test:e2e` | Runs the browser tests (see "Browser tests") |
| `npm run api:types` | Regenerates `src/api/schema.d.ts` from a running backend's API description |

## Changing the logo and colours

The app is black and white, with greys in between, in a light and a dark version. The sun/moon button in
the top bar picks **Light**, **Dark** or **Same as device**. The choice is remembered in this browser. It
is applied before the page draws, so it never flashes white.

- **Name and logo:** `src/config/brand.ts` holds the name, and the logo's address. Replace
  `public/logo.svg` with your own file, or point `logo` at a new one. The browser tab icon is set in
  `index.html`.
- **Colours:** `src/styles/theme.css` holds every colour: the light set at the top, the dark set below
  it under `.dark`. `--brand` is the main colour everywhere: buttons, links, the selected menu item.
  Colours are written as OKLCH: lightness from 0 (black) to 1 (white), then colour strength (0 = grey),
  then hue. To bring in a colour later, raise the middle number, for example `oklch(0.45 0.12 250)` is a
  blue. Change `theme-color` in `index.html` too, which colours the phone's browser bar.
- **The one exception:** errors and "delete"-type buttons stay red so they can't be missed. Set their
  middle number to 0 in `theme.css` to make them grey as well.
- **Logo in dark mode:** the default logo is black, so it's flipped to white in dark mode. If you use a
  coloured logo, set `invertLogoInDark: false` in `src/config/brand.ts`.

## How it's organised

```
src/
  api/schema.d.ts       Types for every API route, generated from the backend
  app/                  The store, the address list (router), and sign-in guards
  components/ui/        Buttons, fields, cards, menus, dialogs: the building blocks
  components/layout/    The app frame: side menu, top bar, business switcher, user menu
  config/brand.ts       Name and logo
  features/             One folder per area: auth, businesses, home, settings
  i18n/en, i18n/bn      The words, in English and Bangla, one file per area
  lib/                  Helpers: API calls, data loading (query.ts), the session, theme, money, dates, errors
  styles/               Colours and fonts
e2e/                    Browser tests
```

Each feature folder keeps its screens next to an `api.ts` that holds its server calls.

### Loading and saving data

All talk with the server goes through three small helpers in `src/lib/query.ts`, so feature files never
set up TanStack Query themselves. A feature only says which API address to call:

```ts
// Load a list and keep it cached
export const useBusinesses = () => useApiQuery(queryKeys.businesses, () => api.GET("/api/v1/businesses"));

// Save something, then reload the list it changed
export const useCreateBusiness = () =>
  useApiMutation((body: NewBusiness) => api.POST("/api/v1/businesses", { body }), { invalidates: [queryKeys.businesses] });
```

| Helper | Use it for |
| --- | --- |
| `useApiQuery(key, call)` | Loading data. The key names the cached copy. |
| `useApiMutation(call, options)` | Any change that is exactly one API call. `invalidates` lists what to reload afterwards. |
| `useAction(work, options)` | A change that needs more than one call, or extra steps (signing in, signing out). |

The helpers turn server errors into an `ApiError` with a code, which `errorMessage()` turns into words in
the reader's language. The names of all cached lists live in `queryKeys`, in the same file.

## Step 9.1: Foundation

### What you can do now

1. **Create an account** at `/register`: name, email, and a password of at least 10 characters.
2. **Set up a business** straight after: name, type, currency (BDT by default), the month the financial
   year starts (July by default) and time zone (Asia/Dhaka by default).
3. **Sign in** at `/login`. If two-step verification is on, a second screen asks for the 6-digit code.
4. **Stay signed in.** Reloading the page, or opening a second tab, keeps you signed in.
5. **Forgot your password?** `/forgot-password` emails a link. The link opens `/reset-password`, where you
   choose a new password. That signs you out everywhere.
6. **Switch business** from the button at the top. "New business" adds another one. The app remembers the
   last business you opened.
7. **Switch language** with the English / বাংলা button at the top.
8. **Profile** (the round button at the top right, then Profile): your name, language, and whether numbers
   use English digits (1,25,000) or Bangla digits (১,২৫,০০০).
9. **Security** (the same menu, then Security):
   - Turn two-step verification on: confirm your password, scan the QR code with an authenticator app
     (such as Google Authenticator), and type the code it shows. Turning it off needs your password and a code.
   - Change your password. If two-step verification is on, it asks for a fresh code first. Afterwards you
     are signed out on every device and sign in again.
   - See the devices signed in to your account, and sign any of them out, or all of them at once.

The menu on the left lists every screen still to come, each marked with the step that brings it.

### How signing in stays safe

- After signing in, the backend gives the app a short **access token** that lasts 15 minutes. The app
  keeps it only in memory, never in the browser's storage, so a harmful script can't read it from there.
- The backend also sets a **refresh cookie**, which JavaScript can't read at all. A minute before the
  access token runs out, the app uses the cookie to get a new one. The request carries a second, readable
  cookie's value in a header (`X-CSRF-Token`), which proves it came from this app and not another site.
- Each refresh replaces the cookie. If two tabs refreshed with the same cookie at once, the backend would
  treat the second as stolen and sign you out everywhere. So the tabs take turns, using a browser lock,
  and share the new token with each other. This is in `src/lib/session.ts`.
- If a request comes back with "token expired", the app refreshes once and sends it again
  (`src/lib/api.ts`).
- Signing out in one tab signs out every tab.

### How it was checked

- **Small tests** (`npm test`): 27 tests covering money formatting with lakh grouping and Bangla digits,
  English and Bangla having the same text keys and placeholders, the refresh logic, the API wrapper and
  device names.
- **Browser tests** (`npm run test:e2e`), at laptop size (1366×800) and phone size (Pixel 7):
  - sign up, set up a business, reload, sign out, sign back in;
  - switch to Bangla, and see it kept after a reload;
  - turn on two-step verification, change the password with the code check, sign in with a wrong code
    and then the right one;
  - forgotten password, reading the real email from Mailpit;
  - the phone menu opening and closing.
  All 9 pass (the phone-menu test is skipped at laptop size).
- **By hand in the browser** at laptop and phone sizes: every screen above, in English and Bangla.

### Problems found while testing, and fixed

1. **Signing in without two-step verification went nowhere.** The backend always sends
   `mfaRequired`, as `false` when no code is needed. The app only checked that the field existed, so it
   always went to the code screen, which then sent you back. Now it checks the value. The browser tests
   found this one.
2. **The two-step dialog flipped to "Turn off"** the moment it was turned on, instead of closing. The
   dialog now fixes its purpose when it opens.
3. **The profile form kept the old language** after using the language button at the top. It now refreshes
   when your saved profile changes.
4. **"Password changed, sign in again" didn't show** on the sign-in page. It was being cleared too early.

### Browser tests

They need a separate test backend, so they never touch your real data:

1. Start Docker Desktop, then in the backend folder run `docker compose up -d` (Postgres, Redis, Mailpit).
2. Create the test database once: `docker exec business_os_postgres psql -U business_os -c "create database business_os_e2e"`.
3. Start the backend on port 5002 against that database, with Mailpit as the mail server
   (`SMTP_URL=smtp://localhost:1025`, `DATABASE_URL=.../business_os_e2e`, `REDIS_URL=redis://localhost:6379/2`,
   `PORT=5002`, `CORS_ORIGINS=http://localhost:5173`, `APP_URL=http://localhost:5173`). Run
   `npx prisma migrate deploy`, then `npm run dev` and `npm run worker`.
4. Here: `API_TARGET=http://localhost:5002 npm run dev`.
5. `npm run test:e2e`. It uses the Chrome already on your Mac.

Each run creates fresh accounts named `owner-…@e2e.test`. The backend allows 10 sign-ups per 10 minutes
from one address, and a run makes 9. Between runs, wait 10 minutes or clear the test limits:
`docker exec business_os_redis sh -c "redis-cli -n 2 --scan --pattern 'ratelimit:*' | xargs -r redis-cli -n 2 del"`.

### Deploying to Vercel

`vercel.json` sends every address to the app, so links like `/b/<business>` work when opened directly. It
also passes `/api/...` on to the backend. Before the first deploy, replace `YOUR-BACKEND-HOST` in
`vercel.json` with the backend's address. On the backend, set `CORS_ORIGINS` and `APP_URL` to the Vercel
address, so the sign-in cookie and the links in emails work.

Not checked yet: whether Vercel's pass-through keeps long-lived live updates open. These come in step 9.7,
and will be tested then.

### Known and open

- **`npm audit` reports 10 moderate warnings.** They are all the same issue in `minimatch`, used by the
  code-style checker (ESLint) while developing. None of it is in the app people download. The only fix
  npm offers is a forced downgrade of ESLint's TypeScript support, so it's left until ESLint updates.
- **The app is one 794 kB file (248 kB compressed).** Later steps will load each area's screens only when
  they're opened, which keeps the first load small as screens are added.
- **Losing your authenticator app** means you can't sign in. The backend has no recovery codes yet.
- The sidebar's step numbers (9.2, 9.3…) stay in English digits in Bangla. They are temporary and go away
  as each step lands.
