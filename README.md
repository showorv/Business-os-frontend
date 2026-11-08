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
| 9.2 | Businesses and team: business settings, members, invitations | **Done** |
| 9.3 | Accounts, transactions, approvals, attachments | **Done** |
| 9.4 | Dashboards, reports, budgets, goals, exports, all-businesses view | **Done** |
| 9.5 | Ledger: chart of accounts, journals, closing months, reconciliation | **Done** |
| 9.6 | Bank statements: import, inbox, rules | **Done** |
| 9.7 | Tasks, reminders, recurring schedules, notifications, push | **Done** |
| 9.8 | AI assistant, document search, audit history | **Done** |

## Phase 11 plan: making it a SaaS product

Free: one business, no AI. Pro: several businesses, a bigger team, more storage and the AI assistant,
paid monthly or yearly. The platform admin can give Pro free to anyone and change prices and limits.
Payments go through a demo gateway for now; SSLCommerz and bKash plug in once the merchant accounts exist.

| Step | What it brings | Status |
| --- | --- | --- |
| 11.1 | Plans and limits: a 14-day Pro trial, limits checked by the server, the Plan page, upgrade prompts | **Done** |
| 11.2 | Paying through a demo gateway (success, fail, cancel), receipts, reminder emails, grace period | **Done** |
| 11.3 | Platform admin panel: accounts, changing plans, giving Pro free until a date, prices and limits, coupons, AI cap, suspending, revenue, announcements | **Done** |
| 11.4 | Customers and suppliers | **Done** |
| 11.5 | Invoices, bills, baki and aging, PDF and email, posting to the books | **Done** |
| 11.6 | VAT on lines and a monthly VAT summary (help with Mushak) | **Done** |
| 11.7 | Products and stock | Next |
| 11.8 | Public home and pricing pages, terms and privacy, data export, full-width assistant | |

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
cp .env.example .env
npm run dev
```

**Settings and secrets live only in `.env`.** It is listed in `.gitignore`, so git never commits it.
`.env.example` is the committed copy with the names but no values. Never write a password, key or token
into any other file: GitHub is scanned (GitGuardian), and anything committed stays in the history even
after it's deleted.

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
  features/             One folder per area: auth, businesses, finance, home, settings, team
  i18n/en, i18n/bn      The words, in English and Bangla, one file per area
  lib/                  Helpers: API calls, data loading (query.ts), the session, theme, money, dates, errors
  styles/               Colours and fonts
e2e/                    Browser tests: helpers.ts, one file per step, and fake-ai.mjs (a stand-in AI)
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

## Step 11.6: VAT on invoices and bills, and the month's VAT

### What you can do now

- **Business settings → VAT:** tick *VAT-registered (has a BIN)* and choose the rate new invoice
  lines start with (15% unless you change it).
- **On an invoice** of a registered business, each line has a **VAT** box (15%, 10%, 7.5%, 5% or
  0%). The line shows "+ VAT ৳300", and the total area shows Subtotal, VAT and Total. A business
  that isn't registered doesn't see the box, since it can't charge VAT.
- **On a bill** the VAT box is always there, because suppliers charge VAT either way. If the
  business is registered the VAT can be claimed back; if not, a note says it is added to the cost.
- **An invoice's page** shows each line's VAT, then Subtotal and VAT above the total. The PDF is
  titled *Tax invoice* when it has VAT.
- **VAT** in the sidebar: pick a month (arrows or the month box), and see VAT on sales, VAT on
  purchases you can claim, and the VAT to pay (or to carry forward); a table of each by rate with
  the value and the VAT; and every invoice and bill of the month with its number, the customer or
  supplier, their BIN, subtotal and VAT. *Print* gives a paper copy. A note says it is a help for
  the Mushak 9.1 return, not a filing, and leaves out money recorded only as transactions. A
  business that isn't registered sees a link to turn it on.
- English and Bangla, light and dark, laptop and phone.

### How it was checked

- Type check, lint, unit tests (78) and the build pass.
- A new browser test (`e2e/vat.spec.ts`, laptop and phone): the VAT page first says the business
  isn't registered; registering it in settings; an invoice of 2 × ৳1,000 starts at 15% and shows
  ৳2,000 + ৳300 = ৳2,300, and is issued with ৳2,300 due; a bill of ৳1,000 at 7.5% comes to ৳1,075;
  the VAT page shows ৳300 on sales, ৳75 on purchases, ৳225 to pay, the 15% row and both documents;
  the month before is empty.
- Full run: everything passes; the known flaky statements test failed once and passed on its own.
- Screenshots of the form, an invoice's page and the VAT page were reviewed on laptop and phone.

### Fixes along the way

- The month's name was shown twice on a phone, the second time wrapping onto two lines. It now
  shows only on wider screens.
- Two older browser tests pressed "the last Save button" or "the only box" on a page that now has
  more of them (the VAT settings card, the VAT box on bills). They now point at the right one.

## Step 11.5: Invoices, bills and dues (baki)

### What you can do now

- **Invoices**, **Bills** and **Dues (baki)** in the sidebar, for people who can see money.
- **New invoice:** pick a customer (or add one without leaving the form), the date and due date
  (with quick buttons: on receipt, 7, 15 or 30 days), an optional order number, and lines: what it
  is for, quantity (2.5 works), unit price and income category. Each line's total and the invoice
  total update as you type. *Save as draft* keeps it changeable; *Save and issue* gives it a number
  (INV-2026-000001) and records the sale in the books.
- **New bill:** the same for a supplier, with expense categories and their own bill number.
  *Save and record* puts what you owe in the books.
- **An invoice's page:** the items, total, paid and balance due, and every payment. *Record
  payment* (the amount starts at what is due, and more than that is refused), *Undo payment*,
  *PDF* (in the language you are using), *Email* (to the customer's address, with the PDF attached
  and an optional message), *Void* with a reason (only with no payments), and a link to its entry
  in the books. A draft has *Issue*, *Edit* and *Delete draft*.
- **The lists:** what customers owe you (or you owe suppliers) and how much of it is overdue at the
  top, then every invoice newest first, filtered by Draft, Unpaid, Part paid, Overdue, Paid or Void,
  and searchable by number, reference or name.
- **Dues (baki):** *Owed to you* and *You owe*, with the total, the overdue part and what is more
  than 60 days late; a bar by how late (darker greys for older debts, with every amount written
  out); and a table per customer or supplier with not due yet, 1–30, 31–60, 61–90 and over 90 days.
  A name opens their invoices.
- **A contact's page** now shows what they still owe you (or you owe them), how much is overdue,
  their latest invoices or bills, and *New invoice* / *New bill* with them already chosen. Its
  received and paid totals include invoice and bill payments.
- English and Bangla, light and dark, laptop and phone.

### How it was checked

- Type check, lint, unit tests (76) and the build pass.
- A new browser test (`e2e/invoices.spec.ts`, laptop and phone): an invoice refused without a
  customer; two lines adding up to ৳5,150; issued as INV-2026-000001; a part payment leaves ৳3,150
  due; the PDF downloads with its number as the name; the email reaches Mailpit with one
  attachment; an older invoice shows as overdue and on the Dues page; paying the rest marks it
  Paid; the customer's page shows ৳1,000 still owed and ৳5,150 received. A bill with its supplier
  added from the form is saved as a draft, changed (2.5 to 3), recorded as BILL-2026-000001 and
  paid; a second one is voided with a reason; *You owe* ends empty.
- Full run: 45 passed; the two known flaky tests (two-step sign-in, statements) failed once and
  passed on their own.
- Screenshots of the list, form, an invoice's page and the Dues page were reviewed.

### Fixes along the way

- The browser test first paid the wrong invoice: the list is newest first, so it now picks the
  invoice by its number.

## Step 11.4: Customers and suppliers

### What you can do now

- **Customers & suppliers** in the sidebar (for people who can see money). The list is sorted by
  name, with tabs for All, Customers and Suppliers, a search by name, phone or email, and archived
  ones on request. Each row shows what you received from them or paid them.
- **Add a contact:** customer, supplier or both, a name, and optionally a shop or company, phone,
  email, address, BIN/TIN and notes.
- **A contact's page:** how to reach them (the phone and email are tappable), received from them,
  paid to them, the difference and the last date, and every transaction with them. From there:
  *Record money* opens the transaction form as income (or expense, for a supplier) with them
  already chosen; *Edit*; *Archive* or *Restore*.
- **On the transaction form:** a *Customer* box for income and refunds, *Supplier* for expenses (a
  "both" contact shows in either). *New* adds one without leaving the form and picks it.
- **On a transaction's page:** the customer or supplier, linked to their page, with *Change* (or
  *Add*). This works after posting too, since it doesn't touch the books.
- Archived contacts disappear from lists and pickers but stay named on old transactions.
- English and Bangla, light and dark, laptop and phone.

Money a customer still owes you, or you owe a supplier (baki), shows from 11.5 (below).

### How it was checked

- Type check, lint, unit tests (76) and the build pass.
- A new browser test (`e2e/contacts.spec.ts`, laptop and phone): add a customer and a supplier; the
  tabs and the phone search narrow the list; record a sale from the customer's page (the form opens
  as income with them chosen); add a supplier from inside the expense form; tag a posted income
  afterwards; see ৳7,500 received over two transactions; archive the customer and check they leave
  the list and the form.
- Full run: 42 passed; the flaky statements test failed once and passed on its own, and the admin
  test passed.
- Screenshots of the list, the dialog, the form, a transaction and a contact page, on laptop and
  phone, light and dark, were reviewed.

### Fixes along the way

- A supplier added from inside the form was chosen before it appeared in the list, so the box showed
  "Nobody". The box now shows a new contact at once.
- Since 11.3, every page also asks for the announcement, so the browser tests' many sessions from one
  address went over the test backend's 300-requests-a-minute limit. That limit is now a backend
  setting, and the test backend allows 3000.
- On phones, the list now shows what was received or paid under each name.
- The search box moved to the shared components, for the admin pages and the contacts list.

## Step 11.3: Platform admin panel

### What you can do now

If you are a platform admin (see "Becoming the admin" below), **Platform admin** appears in the menu
under your initials. It opens `/admin`, with its own sidebar:

- **Overview:** monthly income, money received this month, accounts, people, a 12-month chart of money
  received, and accounts by plan state.
- **Accounts:** search by owner, email or business; filter by plan state or only suspended ones. Open
  an account to see its plan, usage meters, businesses, payments and what admins changed. There you can:
  - **Give free:** a plan until a date, or with no end date, with a private note (for example "Launch partner").
  - **Set a trial** until a date, or **Move to Free**.
  - **Suspend** with a reason. The owner and their team can't open the businesses until you lift it.
- **People:** everyone with an account, whether two-step sign-in is on, and their last sign-in.
- **Plans:** change prices (in taka), limits (empty means no limit), the AI assistant and its daily
  allowance, whether it shows on the pricing page, or add a plan. It warns how many accounts get the change.
- **Coupons:** make a code for a percentage or an amount off, for some plans or all, with a use limit
  and a last day. Turn one off or on.
- **Payments:** every payment, with a status filter and search.
- **Settings:** trial days and plan, grace days, sign-ups open or invitation-only, the AI assistant on
  or paused for everyone, and an announcement (note or warning, English and Bangla).
- **Admin history:** every change made from the panel.

For customers:

- **Have a coupon?** on Settings → Plan: type a code, press *Apply*, and the card shows the old price
  struck through and the new one. A wrong code says why ("That coupon has expired", "isn't for this plan").
- **The announcement** shows at the top of every page (and the sign-in pages) until closed. A new
  message shows again.
- **AI paused:** while the admin has paused the assistant, its page says so instead of the chat.

### Becoming the admin

Nobody is an admin by default. Turn on two-step sign-in in Settings → Security, then on the backend run
`npm run admin:grant -- your-email`. Without two-step sign-in the panel only asks you to turn it on.

### How it was checked

- Type check, lint, unit tests (74) and the production build pass.
- A new browser test (`e2e/admin.spec.ts`): a customer signs up; someone is made an admin, is asked to
  turn on two-step sign-in and does; finds the customer, gives Pro free for a month with a note,
  suspends the account (the customer sees "This account is suspended") and lifts it; makes a 25% coupon;
  the customer tries a wrong code, then the real one (৳599 becomes ৳449.25); the admin posts an
  announcement the customer sees, then turns it off; the history lists every change; and a non-admin
  is sent away from `/admin`.
- It runs as its own Playwright project, **platform-admin**, after the laptop and phone tests,
  because the announcement is seen by every account at once and its extra sign-ups hit the test
  backend's rate limit when run alongside the others.
- Full run: 40 passed; one phone test was signed out mid-run by the rate limit and passed when run
  again on its own, as did the admin test.
- Screenshots of every admin page on laptop and phone, light and dark, were reviewed.

### Fixes along the way

- The search box said it searched when you stopped typing but only did on Enter or leaving the box;
  it now waits 0.4 seconds after the last key.
- The account page showed "Trial Trial" (the state and where it came from); the source now shows only
  when the plan has ended. Admin pages say "Given free" rather than the customer's "Given to you".

## Step 11.2: Paying for a plan (demo gateway)

### What you can do now

- **Upgrade from Settings → Plan.** Pick Monthly or Yearly and press *Upgrade to Pro*. You go to the
  payment page, as you would with SSLCommerz or bKash.
- **The demo payment page** (`/pay/demo/…`) says clearly that no money moves. Choose bKash, Nagad or
  card, then *Pay*, *Make it fail* or *Cancel*, to see each outcome. It stands in for the real gateway
  until the merchant accounts are ready.
- **Back on the Plan page**, one line says what happened: "Payment received. Pro is paid until 21 Nov
  2027", "The payment didn't go through, and nothing was charged", or "You cancelled the payment".
- **Days are never lost.** Paying during the trial or before the plan ends adds the new period after
  the time already covered, and the card says so: "Your paid time starts after 21 Nov 2026".
- **Paid up:** the button becomes *Pay for another year* (or month). During the grace days it says
  *Renew*.
- **Payments** under the plans: every payment with its date, plan, amount and whether it was paid,
  failed or cancelled.
- **Receipts** (`/settings/plan/receipts/…`): receipt number, date, who was billed, how they paid, the
  period, and the total. *Print or save as PDF* prints just the receipt.
- **Notifications and emails** for a payment received (opens the receipt), a plan ending soon, and a
  plan that has ended.
- Everything in English and Bangla, light and dark, laptop and phone.

### How it was checked

- Typecheck, lint, unit tests and the build pass.
- New browser test in `e2e/billing.spec.ts` at laptop and phone sizes:
  - an ended trial, then a failed payment (still Free);
  - a paid year with Nagad (Active, *Pay for another year*, Paid and Failed in the history);
  - the receipt, with its number, method and email;
  - the notification.
- Full browser suite: 40 passed. The phone statements test is timing-sensitive under a full parallel
  run and passes on its own, as before.
- Screenshots reviewed: the payment page (light and dark, laptop and phone), the Plan page after
  paying, and the receipt.

### Known and open

- Real gateways (SSLCommerz, bKash) come once you have merchant accounts. Only the backend adapter and
  its callback route change; these screens stay the same.
- The backend switches the demo page off in production unless it's told otherwise, because it would
  give Pro away free.

## Step 11.1: Plans and limits

### What you can see now

- **Settings → Plan.** Your plan and how it stands ("Pro trial: 12 days left, until 19 Nov 2026"),
  with four meters: businesses, people, document storage and AI used today. A meter turns red when it's
  full. Below, the Free and Pro plans side by side, with a Monthly/Yearly switch and what a year saves.
  The upgrade button says paying online arrives in the next step (11.2).
- **A reminder above every page**, for the account's owner only: the trial ending within 7 days, a paid
  plan in its 7 days of grace, or (for two weeks) that the trial or plan has ended.
- **A read-only business.** If the plan now has room for fewer businesses than you have, the newer
  ones show a warning and every edit button is hidden. Archive one, or upgrade, and they work again.
- **Upgrade prompts** instead of errors: on the new-business page when the plan is full, and on the
  AI assistant on Free. The assistant in the menu carries a small "Pro" tag on Free.
- **Clear errors** if a limit is reached some other way: "Your plan has room for 3 people. Upgrade in
  Settings → Plan for a bigger team."
- Everything in English and Bangla, light and dark, laptop and phone.

### How it fits together

- The server decides everything; the app only shows it. `GET /billing/me` gives the plan and usage;
  each business carries `plan.locked` and `plan.aiEnabled`.
- `useAccess` now treats a locked business like a paused one, so every page's edit buttons follow it
  without changes page by page.
- New files in `src/features/billing/`: `api.ts` (queries), `parts.tsx` (price, storage, the upgrade
  prompt, the meter), `PlanPage.tsx`, `PlanBanner.tsx`.

### How it was checked

- Typecheck, lint, unit tests (including Bangla and English having the same keys) and the build pass.
- New browser test `e2e/billing.spec.ts`, at laptop and phone sizes: the trial and usage on the Plan
  page, the price switch, the "3 days left" reminder, the trial ending, the newer business read-only,
  no third business, no assistant, the way to the Plan page, and a free grant from the admin unlocking
  everything. To move a test account's plan it changes the **test** database only (`business_os_e2e`),
  through Docker, never Neon.
- The whole browser suite passes (the two-step-verification and phone statements tests are timing
  sensitive under a full parallel run and pass on their own, as before).
- Screenshots reviewed in light and dark, laptop and phone.

### Known and open

- The upgrade button was disabled until 11.2 brought payments (now done).
- Accounts that existed before plans were given Pro free with no end date by the backend migration.

## Step 9.8: AI assistant, document search, activity history

### What you can do now

**Documents** (menu: Documents, `/b/<business>/documents`)

- **Upload** one or many files at once: drag them onto the box or click to choose. PDF, PNG, JPG, WebP,
  CSV or XLSX, up to 25 MB each. Each file gets a kind (invoice, receipt, contract, policy, note,
  statement), guessed from its name and changeable before uploading. A file of the wrong type or too big
  is marked in red and the rest still go up.
- **Reading in the background.** After upload, the server reads each file's text. The list shows
  "Reading…" and checks again every 3 seconds on its own until it says "Searchable", "No text found" or
  "Couldn't read". Statements are kept but not read.
- **Search inside documents**, by words and by meaning, in English or Bangla. Results show the file, the
  page, the heading, the passage with the searched words in bold, and a bar for how closely it matches.
  Clicking a result opens the file. The search is kept in the address, so it can be shared.
- **Filter** by kind with the chips; **open, read again or delete** from each row's menu. A file attached
  to a transaction can't be deleted.

**AI assistant** (menu: AI assistant, `/b/<business>/assistant`)

- **Ask in plain English or Bangla**: "How much money do we have?", "What was our profit last month?".
  Four suggested questions start an empty chat. Enter sends, Shift+Enter starts a new line.
- **Every answer shows its sources** under it: which figures it used (balances, profit and loss, budgets
  and so on), for which period, and whether they're posted books or a plan. Answers from documents link
  to the file and page. If the server had to correct or hold back a figure, a note says so.
- **It can draft, never write.** Ask it to "remind me to…" or record an expense, and it shows a card with
  the task or transaction. Nothing is saved until you press **Add task** / **Add transaction**; "Not now"
  dismisses it. People who can post to the books can tick "Post it to the books now". Once added, the card
  links to the new task or transaction. Cards expire after a while.
- **Chats are kept.** The list on the left (a panel behind the button on phones) opens old chats.
- **This business or all businesses**: with more than one business, a switch chooses what it may look at.
- **Today's allowance**: a thin bar shows how much of the day's AI use is left.
- If the server has no AI key, the page says the assistant isn't switched on; the rest of the app works.

**Activity history** (menu: Activity history, `/b/<business>/audit`, owners and admins)

- A **day-by-day timeline** of who did what: "Rahim Uddin recorded a transaction", "Business OS finished
  reading a document". Actions done through the assistant are marked "via assistant".
- **Filter** by person and by what happened (grouped: money, books, planning, work, files, people, setup).
- **Show changes** opens what changed, field by field, with the old value struck through next to the new.
- Each entry links to the thing it changed (the transaction, task, budget, journal…) when it has a page.
- **Settings → Activity** shows your own sign-ins and changes across all businesses, so you can spot
  anything that wasn't you.

### Who can do what

| | Owner, Admin | Accountant | Manager | Viewer |
| --- | --- | --- | --- | --- |
| See and search documents | Yes | Yes | Yes | Yes |
| Upload, re-read, delete documents | Yes | Yes | Yes | No |
| Use the assistant | Yes | Yes | Yes | Yes |
| Confirm a drafted task | Yes | Yes | Yes | No |
| Confirm a drafted transaction | Yes | Yes | No | No |
| See the business's activity history | Yes | No | No | No |
| See your own activity | Everyone | | | |

The assistant only reads what the person asking may read: a manager without finance access gets no money
figures.

### Backend changes for this step

Only the API description, so the frontend's types match what the server already sends. No behaviour
change; all 736 backend tests pass.

- `src/app/docs/documents.docs.ts`: documents list who uploaded them and when.
- `src/app/docs/ai.docs.ts`: one chat's messages (with their sources), when a suggestion was made and
  decided, and the answer to "not now".
- `src/app/docs/audit.docs.ts`: the fields of each history entry, and that both history lists come a page
  at a time.

### New shared pieces

- `src/features/documents/`: hooks (upload, search, list that re-checks while reading), the page and the
  upload dialog.
- `src/features/assistant/`: hooks, the chat page, and `parts.tsx` (message text, source chips, the
  draft cards, the thinking dots).
- `src/features/audit/`: hooks, the timeline, the history page and Settings → Activity. Every action has
  words in `src/i18n/*/audit.json`; one not worded yet still shows in a readable form.
- `src/lib/query.ts`: keys for documents, history and the assistant. A paged list can now re-check on a
  timer, decided from the rows it has (used while documents are being read).
- Two small animations in `src/styles/index.css`: the thinking dots and a new message sliding in. Both
  are off for people who ask for less motion.
- `e2e/fake-ai.mjs`: a stand-in AI service that answers the same way every time, so the assistant can be
  tested without a real AI key or cost.

### How it was checked

- **Browser tests** (`e2e/assistant.spec.ts`), at laptop and phone size:
  1. Upload a lease PDF and a text file together: the text file is refused, the lease is guessed to be a
     contract and goes up. It turns "Searchable" by itself. Filtering by Receipt shows nothing.
     Searching "late payment fee" finds it on page 1 with the words in bold.
  2. The history shows the upload by name, filtering to another action shows nothing, and Settings →
     Activity shows the account being created.
  3. A suggested question gets an answer with an "Account balances" source. Asking for a reminder shows
     a draft task card; pressing Add task adds it, the card says Added, and its link opens the task.
     After a reload the chat is still there. The history shows the confirmed suggestion.
- **All browser tests:** 37 pass. Two older ones failed once in the full run (the two-step verification
  test, which waits for a fresh code, and statements on phone) and passed when run again.
- Lint, type-check, 70 small tests (including the English/Bangla key check) and the build pass.
- Looked at by eye at laptop and phone size, light and dark.

### Fixes along the way

- The source chip crashed on "as of today": the server sends the word "today", not a date. It now shows
  "as of today", a formatted date, or the text as sent. Periods like "2026-10-01 to 2026-10-31" are shown
  as dates in the reader's language.
- The test backend tried to reach a virus scanner that doesn't run on the Mac, so uploads never finished
  reading. The test backend now runs without one (see "Browser tests").
- On phones the draft card's heading wrapped; the business name is hidden there. The document list's
  details line and the search hint were shortened to fit.
- "Finished reading a document" and two integration actions had no words yet; added.

## Step 9.7: Tasks, reminders, recurring schedules, notifications, push

### What you can do now

**Tasks** (side menu → Tasks). Four tabs, and the open tab, the filter and the open task are kept in the
address, so a link can point straight at one task.

- **On top:** open tasks (to do, in progress, blocked), how many are finished, and two tiles that also
  filter: **Assigned to me** and **Overdue** (red when there are any).
- **Board:** four columns: To do, In progress, Blocked, Done.
  - Drag a card to another column, or use its **⋯** menu. Only moves the backend allows are offered
    (for example Blocked can't go straight to Done); while dragging, columns it can't go to fade out.
  - Each card shows its priority, when it's due ("in 3 days", red with a red edge when overdue) and who
    it's for. Overdue and urgent ones come first.
  - On phones the columns scroll sideways.
- **List:** every task in rows, filtered by status and priority, with **Load more**.
- **Calendar:** a month, starting on Saturday. Tasks show filled black by their due date; reminders show
  outlined. Phones show dots instead of titles. Click a day to see what's on it, and a task there to open it.
- **Reminders:** one-off or repeating (every day, week, month or year), for you or someone else, sent
  in the app, by email and/or push, at the time or up to a week before. Pause, resume or cancel your
  own. Tasks with a due date and recurring transactions make reminders of their own; those are marked
  and change with their task or schedule.
- **New task:** title, details, priority, who it's for and when it's due. It opens on the side once added.
- **A task's panel:** change any detail, move its status with one click, open its attachments, and talk
  about it in **comments** (Ctrl/⌘ + Enter sends).

**Recurring** (side menu → Recurring): rent, salaries, subscriptions.

- Totals on top: how many are running, and what goes out and comes in each month.
- **New schedule:** a transaction (expense, income or transfer) or a **salary** (always an expense to the
  Salaries category). Pick the account, category, amount, how often and the first date; the box under
  it says it in words ("On day 9 of every month, from 9 Nov 2026").
  - **Post it straight to the books** is only offered to people who can post; otherwise each one is a
    draft for someone to check.
  - **Remind me** a few days before each one.
- **A schedule's panel:** what it does, the next date, its history (each run links to its transaction,
  and a failed run says why). Change the name, amount, how often or the reminder; pause, resume or end it.
  When one is due, **Run now** records it without waiting for the timer.

**Notifications**

- **The bell** in the top bar shows how many are unread. It opens the latest ones; clicking one marks it
  read and goes to the right page (a task, a transaction waiting for approval, a budget, the statement
  inbox, and so on). Mark all as read, or open the settings, from there.
- **Live:** while the app is open, a new notification appears at once as a pop-up with an **Open**
  button, without reloading.
- **All notifications** (`/notifications`): grouped by day, with an All / Unread switch.
- **Settings → Notifications:** email on or off, push on or off, **quiet hours** (no email or push
  between two times, in your time zone), and **push to this browser**: turn it on, and the browser asks
  for permission. The list shows every device getting push, and any can be removed.

### Who can do what

| | Owner, Admin | Accountant | Manager | Viewer |
| --- | --- | --- | --- | --- |
| See tasks and reminders | Yes | Yes | Yes | Yes |
| Add and change tasks, comment, set reminders | Yes | Yes | Yes | No |
| See recurring schedules | Yes | Yes | Only if given "Can see finances" | Only if given "Can see finances" |
| Make and change schedules | Yes | Yes | No | No |
| Schedules that post themselves, Run now posting | Yes | Yes | No | No |

Everyone has their own notifications and settings.

### How live notifications and push work

- The live list uses the backend's event stream. It needs the sign-in token, which the browser's
  built-in stream reader can't send, so the app reads the stream itself. The stream ends when the
  15-minute token does, and the app opens a new one with the fresh token. If it fails, it tries again
  after 15 seconds.
- Push uses a small service worker, `public/sw.js`. It shows the message while the app is closed and
  opens the page it points to when clicked (only pages on this site).
- Push needs the backend's VAPID keys. Without them, the settings page says push isn't set up yet.
  On iPhone, push works only after adding the app to the Home Screen.

### Backend changes for this step

- **API description** (`src/app/docs/tasks.docs.ts`): tasks now list who made them and when, one task
  lists its attachments, and reminders, schedules and runs list when they were made. No behaviour change.
- **Links in emails and push** (`src/app/notifications/templates.ts`) went to pages the app doesn't have
  (`/tasks/…`, `/reminders`, `/statement-lines`). They now go to the business's own pages, for example
  `/b/{business}/tasks?task=…` and `/b/{business}/recurring?schedule=…`. Invitations and password resets
  are unchanged. A new test checks the links. All 736 backend tests pass.

### New shared pieces

- `src/features/tasks/`: hooks, board, list, calendar, reminders, the task panel and new-task dialog.
- `src/features/recurring/`: hooks, the page, the new-schedule dialog and the schedule panel.
- `src/features/notifications/`: hooks, the bell, the inbox, settings, the live stream
  (`useNotificationStream.ts`), push (`push.ts`) and `words.ts`, which turns each notification type and
  its values into words and a link. The words are in `src/i18n/*/notifications.json`.
- `src/lib/repeat.ts`: turns "every month" into a calendar rule and back.
- `src/lib/query.ts`: keys for tasks, schedules and notifications, and `useReload()`, which reloads a
  cached list when something arrives from outside (a live notification).

### How it was checked

- **Browser tests** (`e2e/tasks.spec.ts`), at laptop and phone size:
  1. The owner invites Karim as a manager. Karim has the dashboard open.
  2. The owner adds a task for Karim, due tomorrow. Karim sees the pop-up and "1" on the bell at once,
     opens it from the bell, starts the task and comments.
  3. The owner gets the comment live, finds it in the inbox and marks all read.
  4. The task is in In progress on the board, in the list, and on tomorrow in the calendar.
  5. The owner sets a yearly reminder and pauses it.
  6. A second test makes a monthly rent schedule that posts itself, starting today. It runs, the rent is
     in the books, the monthly total shows it, and it's paused, resumed and ended. Then email is turned
     off and quiet hours on, and they're still there after a reload.
- **All browser tests:** 34 pass. One older test (statements, phone) failed once in a full run under
  load and passed twice when run again.
- Lint, type-check, 64 small tests and the build pass.
- Looked at by eye at laptop and phone size, light and dark, with a business full of tasks, reminders,
  schedules and notifications.

### Fixes along the way

- Saving notification settings showed no "Saved" message on phones: saving redraws the form, which
  dropped the message. It's now shown the same way as on the profile page.
- On phones the bell left too little room for the business name in the top bar. The language button is
  now just its icon there, and the task tiles sit two to a row.

## Step 9.6: Bank statements: import, inbox, rules

### What you can do now

Side menu → **Bank statements**. It has three tabs, and the open one is kept in the address.

- **Import statement** (the button on top) brings in a bank's CSV or Excel (.xlsx) file, up to 10 MB,
  in two steps:
  1. **Choose the file:** pick the account, then drop the file in or click to choose one. If formats
     have been saved before, one can be picked so the columns fill themselves in.
  2. **Check the columns:** the app guesses which row holds the headings and which column is which, and
     shows what it found. You can change any of it:
     - the heading row (some banks put a few lines of details above the table),
     - the date column and how dates are written (formats that fit every row get a ✓),
     - amounts as **one column** (minus means money out, with an optional Dr/Cr column) or
       **in & out** as separate columns,
     - description, reference, from/to, fee and balance, all optional.

     Each change is checked against the file straight away. The right side shows how many rows can be
     read, how many can't (and why, row by row), how many **balance gaps** there are (a running balance
     that doesn't follow from the row before, which can mean missing rows), and the first lines as they
     will be saved. Below that is the file as it is, with the heading row and the chosen columns
     picked out.

     Tick **Save these columns as a format** to name it for next time, then **Import N lines**. Nothing
     is saved before this.
- **Imports:** every file brought in, newest first. While a file is being read, the list checks again
  every two seconds. A finished one shows how many lines are new, already there (the same file twice
  adds nothing), unreadable, or with balance gaps; the unreadable rows can be opened. **Review lines**
  opens the inbox for that file only. **Saved file formats** can be renamed or deleted here.
- **To review** (the inbox): every statement line, to be settled.
  - A bar on top shows how much is settled (matched or ignored), with four tiles that filter the list:
    **To review**, **Waiting to post** (a transaction was made but isn't posted yet), **Matched** and
    **Ignored**. A list can also be narrowed to one account.
  - Lines settle themselves where they can: by reference, by amount and date when there's exactly one
    fit, or by a rule. **Match again** runs that again, for example after recording more transactions.
    A line that couldn't settle itself says why (for example a locked month).
  - Click a line to open it in a side panel. The arrows (or ↑/↓, j/k) move through the list, and after
    settling one the panel moves on to the next. Ways to settle it:
    - **Match:** book entries on this account with the same amount within 10 days, closest first.
      Choose one and match.
    - **Categorize:** record it as income or expense in a category, or as a **transfer** to or from
      another account (a bank fee on the line is recorded separately as a bank charge).
    - **Split:** several categories adding up to the line, for example a purchase and its card fee. A
      bar shows what's allocated and what's left, and the empty box suggests the rest. It only goes
      through when the parts add up exactly.
    - Categorize and split can **post to the books now**, or leave drafts for someone else to post.
    - **Ignore** a line that isn't real money; it can be brought back.
  - A settled line links to its transactions and can be **unmatched**, which sends it back to review.
    Any transaction it made stays. A line that's part of a finished reconciliation can't be unmatched.
  - **Make a rule from this line** opens a new rule, already filled in from the line.
- **Rules:** "when money out contains *daraz* → Office Supplies", in the order they run (lower priority
  number first; the first that fits wins).
  - Each can have a top amount, and can **post itself** instead of making drafts.
  - A switch pauses a rule; the menu edits or deletes it. Lines a rule already handled stay as they are.

### Who can do what

| | Owner, Admin, Accountant | Manager, Viewer |
| --- | --- | --- |
| See statements, imports and rules | Yes | Only if given "Can see finances" |
| Import, settle lines, make rules and formats | Yes | No |
| Post to the books from a line, or a rule that posts itself | Yes | No |

The screens also handle a custom role that can change money but not post: it makes drafts, and the
line waits in **Waiting to post**.

### Backend changes for this step

- **API description** (`src/app/docs/integrations.docs.ts`): now describes the preview answer (columns,
  suggested mapping, date formats, the file's first rows and what would be imported) and one line's
  answer (its links and suggested matches). Before, these had no description, so the frontend couldn't
  be typed from it. Lines also list their import, and imports and formats their dates.
- No behaviour changed. All 735 backend tests pass.

### New shared pieces

- `src/features/statements/`: the data hooks, the inbox, the line panel, imports, rules and the import
  page. `parts.tsx` has the money-in/out icon, the status badge and an on/off switch.
- `queryKeys.statements` in `src/lib/query.ts`. Settling a line also reloads transactions, balances,
  reports and the ledger.
- `src/lib/api.ts`: a few lists (statements, tasks, notifications) send their rows as
  `{ items, nextCursor }` instead of rows plus `meta`. The page reader now accepts both.

### How it was checked

- **Browser test** (`e2e/statements.spec.ts`), at laptop and phone size:
  1. Record a 12,000 sale, then add a rule for "daraz".
  2. Import a CSV with two lines of bank details above the table: the heading row and the in & out
     columns are found on their own, all 4 rows read, and the columns are saved as a format.
  3. Wait for the import to finish: the deposit matched itself and the rule handled Daraz, leaving 2
     to review.
  4. Categorize the rent as Rent and post it; the panel moves on to the card purchase.
  5. Split the card purchase: a part too much is shown and blocks it, the right amounts go through.
  6. "All caught up". Unmatch the deposit, then match it again from the suggestion.
  7. The rule's draft is waiting to post, and 3 of 4 lines are settled.
- **All browser tests:** 29 pass (one phone-only test is skipped at laptop size). Three older tests
  failed during one full run because of the test backend's sign-up limit, then passed when run again.
- Lint, type-check, 58 small tests and the build pass.
- Looked at by eye with a 13-line sample statement at laptop and phone size, light and dark: each tab,
  the import page, and the panel for matching and splitting.

### Fixes along the way

- Split amounts first filled in the rest when the box was clicked, and typing then added to it
  ("1050.001000"). The empty box now only shows the rest as a hint.
- After settling a line, the panel could open the line just settled, before the list reloaded. It now
  skips it.
- On the import page, the amount layout buttons were cut off, "Money out" and "Money in" were marked
  optional though one is needed, a saved format's card spilled past the screen on phones, and the
  account box was blank while accounts were loading. All fixed.

## Step 9.5: Ledger: chart of accounts, journals, closing months, reconciliation

### What you can do now

Side menu → **Ledger**. It has four tabs, and the open one is kept in the address.

- **Chart of accounts:** every account in the books, grouped into assets, liabilities, equity, revenue
  and expenses, each with today's balance.
  - Five tiles on top show each kind's total. Click one to show only that kind.
  - Search by code or name. "Show hidden" also lists accounts that were hidden.
  - Click an account to open a side panel: its balance, a link to its journal entries, and its name,
    Bangla name, cash-flow group and parent account to change. An account can be hidden, except the
    built-in ones the app posts to.
  - **New account:** pick the kind, and a free code is suggested (for example the next round number
    after the last expense account).
- **Journals:** every entry in the books, newest first, with its total. Filter by kind, account and
  dates; the filters stay in the address. "Load more" fetches the next 30.
  - **One entry** shows its debits and credits side by side, the way a paper journal does, with a
    "Balanced" check. It also says where the entry came from (a transaction, a reconciliation, the
    year-end close) and links to it.
  - **Reverse** a hand-written entry: a new entry with every side swapped is posted, and the original
    stays, marked "Reversed by". Entries made by a transaction are reversed through the transaction.
- **New journal entry** (the button on top): a date, a description, adjusting or standard, and lines.
  Each line is an account with a debit or a credit; typing in one side clears the other. A bar at the
  bottom shows both totals and how much is still to balance, and "Post entry" only wakes up once they
  match. A new line starts with the amount that would balance the entry. Pressing twice posts once.
- **Months:** the financial year's twelve months, each **Open**, **Locked** (only owners and admins can
  still post) or **Closed** (final). A strip on top fills in as months are locked and closed, with a dot
  under this month.
  - From a month's menu: lock it, open it again (owners and admins), or close it for good. Earlier
    months must be closed first.
  - **Close the year** works once no month is open. It moves the year's profit or loss into Retained
    Earnings, closes every month, and opens the next year.
  - **Open next year** sets up the next year's months ahead of time.
  - Locking and closing ask for a two-step code first if two-step verification is on.
- **Reconcile:** check a bank or wallet account against its statement.
  - **Start reconciling:** choose the account, the statement date and the balance it shows (a minus
    sign is allowed for an overdrawn account).
  - The page shows the statement balance, what's ticked off so far, and **Still to find**, the gap.
    Ticking entries shows what the gap would become before you confirm. "Select all" ticks every one.
  - Ticked entries can be unticked while it's in progress.
  - **Finish** once the gap is zero. If something can't be found, an owner or admin can **finish and
    book the difference** to Reconciliation Adjustments (6900).
  - **Use statement matches** ticks off entries already matched to imported statement lines. That
    becomes useful in step 9.6.

### Who can do what

| | Owner, Admin | Accountant | Manager, Viewer |
| --- | --- | --- | --- |
| See the ledger | Yes | Yes | Only if given "Can see finances" |
| Add or change accounts, write journals, reconcile | Yes | Yes | No |
| Reverse a journal, lock and close months, close the year | Yes | Yes | No |
| Open a locked month again, post into a locked month | Yes | No | No |
| Book a reconciliation difference | Yes | No | No |

### Backend changes for this step

- **Journal list:** each entry now carries its total, its number of lines and, if it was reversed,
  the reversing entry. Before, the list had no amounts, so the page couldn't show any without asking for
  every entry separately.
- **Reconciliation:** one reconciliation's answer now includes:
  - the account's name,
  - the entries already ticked off, so they can be unticked,
  - for a finished one, the amount written off. Before, its live figures hid that.
- **API description** (`src/app/docs/accounting.docs.ts`): now describes these answers. The
  reconciliation and tick-off answers had no description before.
- **Tests:** the backend's ledger tests check the new fields. All 735 backend tests pass.

### New shared pieces

- `src/features/ledger/`: the data hooks, and in `parts.tsx` the account picker grouped by kind, the
  kind badge, the pill tabs and the code suggestion.
- `queryKeys.ledger` in `src/lib/query.ts`. Recording a transaction now also reloads the ledger, so new
  entries show at once.

### How it was checked

- **Browser test** (`e2e/ledger.spec.ts`), at laptop and phone size:
  1. Filter the chart of accounts by a tile and by search, and add an account.
  2. Write a journal that doesn't balance (Post stays off), fix it and post it.
  3. Reverse it, and check that the original can't be reversed again.
  4. Filter the journals by kind.
  5. Lock this month and open it again.
  6. Reconcile City Bank: tick everything off, untick one and see the gap come back, then finish.
- **All browser tests:** 27 pass, with the earlier ones (one phone-only test is skipped at laptop
  size). One older test failed once during a full run because the test backend allows only 10 sign-ups
  per 10 minutes, then passed when run again.
- Lint, type-check, 56 small tests and the build pass.
- Looked at by eye with sample data at laptop and phone size, light and dark: each tab, a journal, the
  new-entry form, an account's panel and a reconciliation.

### Fixes along the way

- On phones, the search box shrank to an icon, month names were cut off ("September 2…") and a
  journal's Credit column was pushed off-screen. All three now fit.
- The little button that clears the kind filter had the same name as the tile ("Assets"). It now says
  "Clear filters: Assets" to screen readers.

## Step 9.4: Dashboards, reports, budgets, goals, exports, all businesses

### What you can do now

- **Dashboard** (side menu → Dashboard, and the first page of every business):
  - A greeting, the business name, a **period picker** (this month, last 3 months, this financial year,
    last 12 months, or any run of months) and a "New transaction" button. The period is kept in the
    address, so a view can be bookmarked or shared.
  - The **net profit** on a dark card, with how it changed against the period before, the margin, and
    a bar showing how much of what came in was spent.
  - **Revenue** and **expenses**, each with a small trend line and the change against the period before.
  - **Revenue and expenses** month by month as lines. Hover, tap, or use the arrow keys to read each
    month. Click a name in the legend to hide or show that line.
  - **Profit by month** as columns. Losses are hatched, so they show without colour.
  - **Biggest expenses**, **Where your cash is** (one bar split by account), **Goals** with rings,
    **Needs attention** (waiting for approval, drafts, possible duplicates, budget lines getting close,
    money owed) and **Recent activity**.
  - Every chart has a Chart/Table switch, so the numbers can always be read as a table.
  - A business with nothing recorded yet shows a **Getting started** list instead: add accounts, record
    the first transaction, set an approval limit, invite the team. It ticks off as you go.
- **Reports** (side menu → Reports): profit and loss, balance sheet, cash flow and trial balance, as
  tabs. The first and third use a period; the balance sheet and trial balance use an "As of" date.
  - Each line has a thin bar showing its share, so the big lines stand out.
  - The balance sheet shows Assets against Liabilities + Equity as two bars and says "Balanced".
  - Cash flow is drawn as a waterfall from the opening cash to the closing cash.
  - **Export** makes a PDF, Excel or CSV file in the background. "Your exports" lists them, updates
    itself until each one is ready, and has a Download button. If you use two-step verification, the
    download may ask for a code first.
- **Budgets** (side menu → Budgets): a name, a run of months, and a limit for each expense category you
  want to watch, plus "warn at" a share (80% to start). Each budget shows how much is used. Its own page
  lists every category with a meter, a notch where the warning starts, and a label: On track, Getting
  close, Limit reached or Over budget. You can add a category, change a limit, archive or restore it.
- **Goals** (side menu → Goals): a target for revenue, net profit or cash over some months. A ring fills
  as the books move, with a trophy when it's reached. You can change a goal's name or target, or cancel
  it (it stays in the list, greyed out).
- **All businesses** (business switcher → All businesses, shown when you have two or more): every
  business you can see the money of, added up in one currency. The server converts other currencies
  with the saved rates and leaves out money moved between your own businesses, and the page says which
  rates it used. Click a business to open it.

### How the charts are designed

- Black, white and greys only, as agreed, with errors in red. Light and dark each have their own shades.
- Thin bars with rounded ends, 2px lines, light grid lines, one big number per view.
- Every chart can be hovered and read by keyboard, and has a table view for screen readers and printing.
- Amounts on axes are short: ৳4.6L, ৳1.2Cr (or K/M/B when the business uses western grouping). Full
  amounts appear in tooltips and tables.
- Charts draw themselves in when they appear. People who turn off motion on their device get no animation.
- They are drawn by hand in SVG, with no chart library, so the app stays smaller and every chart
  matches the rest of the design.

### Backend changes for this step

- The API description (`src/app/docs/analytics.docs.ts`) now lists what the server already sends: each
  budget line's category and alerts, the budget's basis, and the earlier period on the dashboard. Before,
  the generated types didn't know about them. No behaviour changed.

### New shared pieces

- `src/components/charts/`: `TrendChart` (lines), `ColumnChart`, `Waterfall`, and in `Figures.tsx`
  `Sparkline`, `Meter`, `ProgressRing`, `SplitBar` and `RankedBars`. Also the tooltip, legend and scale
  helpers they share.
- `src/features/analytics/`: the data hooks, the period picker and period rules, and `StatTile`,
  `ChartCard` (with the Chart/Table switch) and `Delta` (the change against the period before).
- `src/lib/months.ts` (month arithmetic and labels), `src/lib/numbers.ts` (percentages, change) and
  `formatCompact` in `src/lib/money.ts`.

### How it was checked

- **Browser tests** (`e2e/analytics.spec.ts`), at laptop and phone size:
  1. A new business shows Getting started. After an account and three transactions, the dashboard shows
     the right net profit; the period picker changes the address; a chart switches to a table. Each
     report tab opens, the balance sheet balances, and an Excel export is queued and listed. A budget with
     two limits shows "Getting close" and "On track". A goal is created, its target is changed until it's
     reached, and it's cancelled.
  2. With two businesses, All businesses adds them up and opens one when clicked.
- The accountant in the approval test now lands on the dashboard after joining, because the business
  already has money in it. The test checks for that. The phone menu test now looks for "Dashboard",
  which replaced "Overview" in the side menu.
- All 25 browser tests pass, with the earlier ones (one phone-only test is skipped at laptop size).
  Lint, type-check, 54 small tests and the build pass.
- Looked at by eye with five months of sample data at laptop and phone size, light and dark: dashboard,
  each report, budgets, a budget, goals, all businesses.

### Fixes along the way

- The change badge on the net profit card showed an empty white box when there was no earlier figure.
  It now only appears when there is one.
- Account shares under "Where your cash is", and line shares in the reports, went above 100% when an
  account was overdrawn. They are now shares of the money actually held (or of all lines together, in
  the reports).
- The revenue and expenses legend can now be clicked to hide one line and focus on the other.

### Known and open

- The app file is now 1,012 kB (301 kB compressed). Splitting it so each area loads only when opened is
  still planned.
- Charts follow the black-and-white rule. If you later want one accent colour (for example for
  revenue), it can be set in `src/styles/theme.css` (`--chart-1`) without touching the charts.

## Step 9.3: Accounts, transactions, approvals, attachments

### What you can do now

- **Accounts** (side menu → Accounts): every place money lives, such as cash, bank, bKash, Nagad or
  another wallet. Each one shows its balance, and the total sits on top. A new business starts with an
  empty "Cash" account. When you add an account you give it an opening balance and the date of that
  balance. The opening balance can't change later; record an adjustment instead. Bank and wallet numbers
  are stored safely, and only the last digits are shown. An account you no longer use can be hidden;
  its history stays. Clicking an account opens its transactions.
- **Categories**, on the same page: income and expense groups, in English and Bangla. You can add your
  own and hide ones you don't use.
- **Transactions** (side menu → Transactions): the list, newest first, with tabs for each status
  (Drafts, Waiting, Posted, Rejected, Voided) and filters for type, account and dates. The filters are
  kept in the address, so a filtered list can be bookmarked or shared. "Load more" fetches the next 30.
- **New transaction**: choose Income, Expense or Transfer. Refund and Adjustment are behind
  "Refund or adjustment". Amounts can be typed as `1250`, `1,250.50` or in Bangla digits. Then:
  - **Save and post** puts it in the books, and balances change at once.
  - **Save draft** keeps it aside without touching any balance. People who can't post only see this.
  - A transfer moves money between two of your accounts, with an optional bank or wallet fee.
  - Pressing the button twice, or retrying after a dropped connection, still records it once. Each form
    sends one key that the server remembers.
- **One transaction's page** shows its details, and the buttons depend on its status:
  - **Draft:** edit, post, or void. Voiding keeps it crossed out in the list but never posts it.
  - **Waiting for approval:** an owner or admin approves or rejects it.
  - **Posted:** reverse it, with an optional reason. This records the opposite entry, so both stay in
    the books.
  - **Possible duplicate:** a warning, with a link to the similar one and a "Not a duplicate" button.
- **Approvals** (Business settings → Approval limit): expenses above the limit wait for an owner or
  admin before they reach the books, and the form says so before you save. The person who recorded an
  expense can never approve it, even an owner; someone else must. Leave the box empty for no limit.
- **Receipts and files**: attach PDFs or photos (PNG, JPEG, WebP) up to 25 MB to any transaction that
  isn't voided. You can download or remove them. A wrong kind of file, or one that is too big, is
  refused before anything is sent.

### Who can do what

| | Owner, Admin | Accountant | Manager, Viewer |
| --- | --- | --- | --- |
| See accounts and transactions | Yes | Yes | Only if given "Can see finances" |
| Add accounts, record transactions, attach files | Yes | Yes | No |
| Post, reverse | Yes | Yes | No |
| Approve or reject large expenses | Yes, but not their own | No | No |

### How uploads work

The file doesn't pass through our server. The browser:

1. asks the server for a one-time upload address,
2. sends the file straight to storage (MinIO on your Mac, Cloudflare R2 in production),
3. tells the server it's there. The server then checks that the file really is what it claims to be.
4. Finally the file is attached to the transaction.

For production, R2 must allow uploads from the frontend's web address. Its CORS setting needs to allow
`PUT` from the Vercel domain, or uploads fail with "The file couldn't be uploaded".

### Backend changes for this step

- One transaction's answer now gives each attachment's file name, type and size, so the page can list
  them without asking for each file. Before, it only gave the file's id.
- The API description now lists `createdBy`, `createdAt` and `approvedAt` for transactions. The server
  already sent them, but the generated types didn't know.
- The backend's transaction tests check the new attachment details (34 pass).

### New shared pieces

- `src/lib/money.ts`: `parseMoney` turns what someone typed (commas, Bangla digits, a ৳ sign) into
  paisa, or refuses it. `minorToInput` does the reverse for editing.
- `src/lib/dates.ts`: `formatDate` for dates without a time, and `todayIn` for today in the business's
  time zone.
- `src/components/ui/money-input.tsx` (an amount box with the currency sign),
  `segmented.tsx` (the Income/Expense/Transfer switch) and `empty-state.tsx`.
- `useApiPages` in `src/lib/query.ts`: lists that load page by page ("Load more").

### How it was checked

- **Browser tests** (`e2e/finance.spec.ts`), at laptop and phone size:
  1. Add two accounts. Record income and post it. Save an expense as a draft, edit it and post it.
     Transfer between accounts with a fee. Reverse the income. Void a draft. After each step the total
     balance is checked to the paisa, and the Voided tab shows only the voided one.
  2. Set an approval limit. An accountant joins by invitation and records an expense above it: the form
     warns, it waits, and they see no Approve button. The owner finds it under Waiting and approves it,
     and the balance changes. The owner's own large expense also waits, and they can't approve it.
  3. Attach a receipt, see it after a reload, have a text file refused, remove the receipt.
- All 21 browser tests pass, with the earlier ones. Lint, type-check, 38 small tests and the build pass.
- Looked at by eye at laptop and phone size, light and dark: accounts, list, new transaction, detail.

### Fixes along the way

- The approval-limit card saved but showed no "Saved" message, because the card reloads after saving.
  It now shows the message either way.
- The "← Transactions" link on the new-transaction page went to the start page instead of the list.
- On phones, "Save and post" now sits on top and "Save draft" under it.

### Known and open

- The app file is now 902 kB (276 kB compressed). Splitting it so each area loads only when opened is still planned.
- Foreign-currency transactions are refused by the backend for now, so the form only offers the
  business's own currency.

## Step 9.2: Businesses and team

### What you can do now

- **Business settings** (side menu → Business settings), at `/b/<business>/settings`:
  - **Details:** name, legal name, tax ID (TIN/BIN), main currency and time zone. The financial year's
    first month is shown but locked: the backend builds the financial periods around it. The currency
    can change only until the books have entries; the backend says so if it's too late.
  - **Preferences:** the language for the business's emails and documents, currency as a symbol (৳) or
    code (BDT), lakh or thousands grouping, the first day of the week, and the prefix for transaction
    numbers. These are used from step 9.3 on.
  - **Status:** pause (inactive) or archive the business, and reactivate it. Both make it read-only for
    everyone, with a notice at the top of every screen. Archived businesses stay in the switcher, marked
    "Archived", so they can still be opened and reactivated.
- **Team** (side menu → Team), at `/b/<business>/team`:
  - Everyone sees who is in the business and their role.
  - **Invite someone:** email plus role (admin, accountant, manager or viewer). They get an email; the
    dialog also shows the link, to send another way. Owners are never invited: an owner makes an existing
    member an owner instead.
  - **Pending invitations:** who hasn't accepted yet and when the link runs out (7 days), with a cancel button.
  - **Change role:** from the ⋮ menu on a person. Managers and viewers can also be allowed to **see
    finances** (view only). A short note under the role says what it can do.
  - **Remove:** from the same menu, after an "are you sure?". Their past work stays in the history.
- **Accepting an invitation:** the email link opens `/invitations/accept`. Someone signed out is sent to
  sign in, or to create an account, and comes back to the link afterwards, even through the two-step code.
  Joining takes a button press, so an email app's link preview can't accept by accident. If they're
  signed in with a different email, they're told so and offered to sign out.

### Who can do what

The server decides; the screens only hide buttons someone couldn't use. The app reads the person's own
permissions for the business from the backend (`useAccess` in `src/features/businesses/api.ts`).

| | Owner | Admin | Accountant, manager, viewer |
| --- | --- | --- | --- |
| See business settings and team | Yes | Yes | Yes |
| Change settings, pause, archive | Yes | Yes | No |
| Invite, change roles, remove | Yes | Yes, except owners | No |
| Make someone an owner, change an owner | Yes | No | No |

A business always keeps at least one owner: the backend refuses to remove or demote the last one.
Nobody removes themselves from the team screen. Changing roles and removing people need a fresh
two-step code if the person has two-step verification on (the same code box as changing the password).

### New shared pieces

- `src/features/auth/useStepUpRetry.tsx`: runs an action, and if the server asks for a fresh code, shows
  the code box and runs it again. Used by change password, change role and remove.
- `src/components/ui/confirm-dialog.tsx`: the "are you sure?" box.
- `src/lib/permissions.ts`: the permission and role names, the same as the backend's.
- `src/features/businesses/options.ts`: currencies, time zones and month names, shared by set-up and settings.
- `withShape` in `src/lib/api.ts`: names the real answer for the two routes whose generated type is too
  loose (the member and invitation lists).

### How it was checked

- **Browser tests** (`e2e/team.spec.ts`), at laptop and phone size:
  1. An owner invites someone by email. That person opens the emailed link on their own device, has no
     account, signs up from the link, comes back to it and joins. As an accountant they see the team but
     no invite button. The owner sees the invitation used up, makes them a manager who can see finances,
     then removes them, and they lose the business at once.
  2. An invitation for one email can't be accepted by a different account.
  3. Business settings: change the name and tax ID (the switcher updates), change the week start (kept
     after a reload), pause (read-only notice, fields locked), reactivate.
- All 15 browser tests pass, with the 9.1 ones. Lint, type-check, 29 small tests and the build pass.
- Looked at by eye at laptop and phone size, light and dark: team list, invite dialog, settings.

### Changes and fixes along the way

- **Sign-in with a two-step code now returns you where you were.** Before, the code step forgot the
  address, so you landed on the business home. Now it behaves like sign-in without a code. The 9.1
  test for changing the password was updated to expect the Security page afterwards.
- **Names were squeezed on phones** in the team list, by the role badge beside them. On phones the
  badge now sits under the name.

### Known and open

- Switching modules on or off is in the backend's business settings, but not on this screen yet.
  (The approval limit arrived in step 9.3.)
- The app file grew to 833 kB (258 kB compressed). Splitting it so each area loads only when opened is
  still planned.

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
4. Here, in `.env`: set `API_TARGET=http://localhost:5002`, and make up two passwords for
   `E2E_PASSWORD` and `E2E_NEW_PASSWORD` (at least 10 characters each). Then `npm run dev`.
5. For the assistant test (step 9.8), start the stand-in AI with `node e2e/fake-ai.mjs` (port 5099), and
   give the test backend `AI_BASE_URL=http://localhost:5099/v1`, `AI_CHAT_MODEL=fake-e2e` and any made-up
   `AI_API_KEY` (the stand-in doesn't check it). Also set `CLAMAV_HOST=` (empty) for the test backend: no
   virus scanner runs on the Mac, so uploads are marked "not scanned" instead of waiting for one. And set
   `RATE_LIMIT_PER_MINUTE=3000`: every test comes from the same address, and the usual 300 a minute is
   too few once several run at the same time.
6. `npm run test:e2e`. It uses the Chrome already on your Mac. If a password is missing from `.env`, the
   tests stop and say which one.

Each run creates fresh accounts named `owner-…@e2e.test`, `karim-…@e2e.test` and so on. The backend
allows 10 sign-ups per 10 minutes from one address, and a run makes more than that, so before each test
the tests clear the sign-up counters in the **test** Redis database (db 2, in the `business_os_redis`
container). Your normal backend's counters are never touched. If your container or database number
differs, set `E2E_REDIS_CONTAINER` or `E2E_REDIS_DB` in `.env`.

### Deploying to Vercel

`vercel.json` sends every address to the app, so links like `/b/<business>` work when opened directly. It
also passes `/api/...` on to the backend. Before the first deploy, replace `YOUR-BACKEND-HOST` in
`vercel.json` with the backend's address. On the backend, set `CORS_ORIGINS` and `APP_URL` to the Vercel
address, so the sign-in cookie and the links in emails work.

Not checked yet: whether Vercel's pass-through keeps long-lived live updates open. Live notifications
(step 9.7) work locally; check them on the first real deploy. If Vercel cuts the stream, the app just
reconnects, so notifications still arrive, a little later.

### Known and open

- **`npm audit` reports 10 moderate warnings.** They are all the same issue in `minimatch`, used by the
  code-style checker (ESLint) while developing. None of it is in the app people download. The only fix
  npm offers is a forced downgrade of ESLint's TypeScript support, so it's left until ESLint updates.
- **The app is one 794 kB file (248 kB compressed).** Later steps will load each area's screens only when
  they're opened, which keeps the first load small as screens are added.
- **Losing your authenticator app** means you can't sign in. The backend has no recovery codes yet.
- The sidebar's step numbers (9.2, 9.3…) stay in English digits in Bangla. They are temporary and go away
  as each step lands.
