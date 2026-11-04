# Eventora — Setup Guide

Eventora is a wedding & event marketplace: customers discover and book
vendors (photographers, caterers, decorators, etc.), chat with them in
real time, and leave reviews after a booking is confirmed/completed.
Vendors manage their business profile and incoming booking requests
through a full booking lifecycle (request → accept → confirm → complete,
with cancel/reschedule at every stage).

This guide gets the project running locally from a clean checkout.

## Production-grade upgrade — progress log

This project is being upgraded feature-by-feature against a larger
"production-grade SaaS" spec. Each turn ships exactly one complete,
tested feature as its own zip. Progress so far:

- [x] **Professional Vendor Dashboard KPIs + Profile Completion %**
      (this delivery) — real booking-status counts, average rating,
      profile views, response rate, estimated revenue, and a weighted
      profile-completion percentage with deep-links to fix what's
      missing. See `server/controllers/vendorController.js`
      (`getVendorDashboardStats`) and `GET /api/vendors/dashboard-stats`.
- [x] **Booking lifecycle state machine** — the full pipeline
      (`pending` → `approved` → `confirmed` → `completed`, with `rejected`
      / `cancelled` as terminal side-branches), enforced server-side as an
      explicit transition map per role (a vendor can accept/reject/
      complete/cancel; a customer can confirm/cancel; neither can skip a
      step or touch a finalized booking). Either side can **propose a
      reschedule**; only the *other* side can accept (applies the new
      date) or decline. Every transition is written to a new
      `booking_status_history` audit table and shown as a real timeline
      on each booking card. Cancelling requires a reason, stored and
      displayed to both sides. See `server/controllers/bookingController.js`
      and the new `/bookings/:id/customer-status`, `/bookings/:id/reschedule`,
      `/bookings/:id/reschedule/respond`, `/bookings/:id/history` routes.
- [x] **DB-persisted Notification Center with live Socket.io push** — a
      real `notifications` table (not an in-memory/mock list) backs a bell
      icon in the navbar with an unread badge, a scrollable dropdown, and
      mark-as-read / mark-all-as-read / remove actions, all backed by
      `GET/PUT/DELETE /api/notifications`. A notification is created
      server-side (`server/utils/notify.js`) and pushed live over Socket.io
      to that one user's private room the moment any of these happen: a
      customer requests a booking; a vendor approves/rejects/completes/
      cancels a booking; a customer confirms/cancels a booking; either side
      proposes, accepts, or declines a reschedule; a customer leaves a
      review; or either side sends a chat message. Chat notifications are
      **presence-aware** — if the recipient already has that exact
      conversation open, the notification is still recorded (for history)
      but created already-read, so it doesn't pop a toast or bump the badge
      for a message they're already looking at. Ownership is enforced on
      every notification endpoint (a user can only read/modify their own).
      See `server/utils/notify.js`, `server/controllers/notificationController.js`,
      `server/routes/notificationRoutes.js`, and
      `client/src/context/NotificationContext.jsx` /
      `client/src/components/NotificationBell.jsx`.
- [x] **Role-protected Admin Panel** (`/admin`) — a real third role
      (`role = 'admin'` — public registration still only ever creates
      `customer`/`vendor`) gated by `requireRole("admin")` on every
      `/api/admin/*` route, with a single-page dashboard (tabs: Dashboard,
      Users, Vendors, Bookings):
        - **Dashboard**: live platform KPIs — total/customer/vendor/admin
          counts, suspended accounts, total bookings (+ breakdown by
          status), total reviews + average rating, estimated platform
          revenue, and 7/30-day signup trends.
        - **Users**: searchable, paginated, filterable (role/status) table.
          **Suspend** (with a required reason) blocks the account from
          logging back in *and* immediately invalidates any session they
          already have — `authMiddleware` re-checks `is_banned` on every
          request, not just at login, so a ban takes effect mid-session,
          not just on the next login. **Reinstate** and **permanently
          delete** (cascades to their bookings/reviews/vendor
          profile/messages via existing `ON DELETE CASCADE` foreign keys)
          are also real. An admin can't suspend/delete themselves or any
          other admin account.
        - **Vendors**: searchable, paginated table with owner, rating,
          booking count and profile views. **Feature** a vendor and they
          sort first on the public `/vendors` page, ahead of any other
          sort. **Delete** removes just the vendor profile (cascades to
          their bookings/reviews), leaving the underlying user account
          intact. Suspending a vendor's owner account also immediately
          hides their listing from public browse and their detail page
          (404s), not just a cosmetic flag.
        - **Bookings**: platform-wide, paginated, filterable by status.
          Admin can **force-cancel** any non-terminal booking (dispute
          resolution, policy violations) with a required reason — notifies
          both the customer and vendor through the existing real-time
          notification system and is written to the same
          `booking_status_history` audit trail as a normal cancellation
          (shown as "by Eventora" on the booking timeline).
      See `server/controllers/adminController.js`, `server/routes/adminRoutes.js`,
      the `is_banned`/`ban_reason`/`banned_at` columns on `users` and
      `is_featured` on `vendors` in `server/db/schema.sql`, and
      `client/src/pages/AdminPage.jsx`. A demo admin account is seeded:
      see "Demo data" below.
- [x] **Advanced paginated vendor search/filter/sort** — the public
      `/vendors` browse page is now backed by real server-side pagination
      instead of fetching everything at once: accurate `total`/`total_pages`
      even when a requested page number overshoots the real result set
      (computed with a separate `COUNT(*)` query, not a `COUNT(*) OVER()`
      window function, which silently returns `0` once `OFFSET` skips past
      every row). New filters: a **minimum rating** filter (4.5+/4+/3+
      stars, enforced with `HAVING` on the aggregated review average) and a
      **price range** filter (`priceMin`/`priceMax`), both combinable with
      the existing category/city/search filters and still correctly
      respecting featured-first ordering and banned-vendor exclusion. Price
      values are parsed out of the free-text `price_range` column with a
      numeric regex extraction (`PRICE_START_EXPR`) instead of a
      lexicographic string sort, fixing a bug where e.g. "₹50,000 -
      ₹1,50,000" would sort as text instead of by actual value; there's
      also a new **Highest Price** sort option alongside the existing
      Newest/Top Rated/Lowest Price. `GET /api/vendors/filters` now also
      returns the real min/max price bounds across all vendors, shown as
      live placeholders in the price inputs. The filter bar is URL-synced
      (`useSearchParams`) including the current page, so any filtered/
      paginated view is a shareable/bookmarkable/back-button-safe link.
      Changing a filter correctly resets to page 1 with a single fetch (no
      stale-page double-fetch). A new shared `client/src/components/
      Pagination.jsx` component (page indicator + Prev/Next, scrolls to
      top on page change) is now used by both this page and the Admin
      Panel's three paginated tables. See `server/controllers/
      vendorController.js` (`getAllVendors`, `getVendorFilters`) and
      `client/src/pages/VendorPage.jsx`.
- [x] **"Recommended for You" vendor section** — a personalized pick list on
      the homepage, right after the hero, visible only to logged-in
      customers. It's a content-based recommender built entirely from
      signals already in the database, with no extra ML pipeline: vendors
      this customer has **booked** (weight 3), **wishlisted** (weight 2) and
      **recently viewed** (weight 1) are rolled up into a per-category and
      per-city preference score (category weighted higher than city), and
      every other vendor is ranked by how well it matches those categories/
      cities — a single SQL query, no application-side scoring loop.
      Vendors the customer already knows about (already booked or already
      wishlisted) are excluded, since the point is to surface vendors
      they haven't found yet. A brand-new customer with no signals yet
      scores `0` for everything, so the same query's tiebreakers (featured
      first, then highest rated, then newest) naturally produce a sensible
      "popular vendors" fallback with no separate cold-start code path —
      but rather than show that fallback as if it were personalized (a
      near-duplicate of the "Popular Vendors" section further down the
      page), the backend reports a `personalized: true/false` flag and the
      section only renders on the homepage when it's `true`, so it appears
      progressively as a customer actually starts using the platform. See
      `server/controllers/vendorController.js` (`getRecommendedVendors`),
      `GET /api/vendors/recommended`, and `client/src/pages/HomePage.jsx`.
- [x] **Multi-vendor comparison** — pick 2-4 vendors from any vendor card
      (the browse page, Popular Vendors, Recommended For You, wishlist) with
      a new "Scale" icon toggle next to the wishlist heart, and a floating
      tray follows you around the site with thumbnails of your picks, a
      per-vendor remove (×), a count against the 4-vendor cap, and a
      **Compare Now** button once at least 2 are selected. It's a pure
      client-side, account-free selection - open to guests too, since
      comparing vendors is a browsing aid, not an account action - so
      nothing is written to the database until you actually open the
      comparison. `/compare?ids=1,2,3` fetches real, side-by-side details
      for exactly those ids from `GET /api/vendors/compare` (capped at 2-4,
      de-duped, garbage ids silently dropped) and renders a proper
      comparison table - category, city, rating + review count, price
      range, description, and how long they've been on Eventora - with the
      vendor's photo, a wishlist toggle, and a per-column remove right in
      the header row. The same banned-vendor exclusion used everywhere else
      applies here too: if a vendor in the URL is no longer visible (banned,
      deleted), the table shows the rest with a small notice rather than
      failing the whole comparison, and removing vendors down to just one
      sends you back to `/vendors`. See `server/controllers/
      vendorController.js` (`compareVendors`), `client/src/context/
      CompareContext.jsx`, `client/src/components/CompareTray.jsx`, and
      `client/src/pages/ComparePage.jsx`.
- [x] Vendor availability calendar (no double-booking) — a real month-grid
      calendar backed by the database, shown in three places. A date counts
      as "taken" for a vendor only once it's a true commitment: either a
      **CONFIRMED** booking, or a date the vendor manually **blocked**
      themselves (`vendor_blocked_dates`, a new table). Pending/approved
      requests from other customers deliberately do **not** block a date -
      they're not locked in yet, so the vendor stays free to choose between
      several interested customers before confirming one. Three insertion
      points enforce this server-side (never just in the UI): creating a
      booking request (409 if the date's already taken), the customer's
      confirm action (re-checked against the vendor's other bookings right
      at the lock-in moment, which is what actually closes the race where
      two customers were both approved for the same date - only the first
      to confirm wins), and accepting a reschedule onto a vendor's new
      proposed date. `GET /api/vendors/:id/availability` is public (no
      login) and returns confirmed-booking dates plus blocked dates for
      today onward - deliberately leaving out pending/approved bookings, so
      browsing a vendor's page never leaks another customer's in-progress
      negotiation. On the vendor side, `POST/DELETE
      /api/vendors/availability/block[/:date]` let a vendor block or
      unblock their own days off, always resolved from their JWT, never a
      request body. See `server/utils/availability.js`
      (`isDateTakenForVendor`, shared by all three check points),
      `server/controllers/availabilityController.js`, and the reusable
      `client/src/components/AvailabilityCalendar.jsx` used read-only on a
      vendor's page, interactively in the booking modal's date picker, and
      as a click-to-toggle manager on the vendor's own dashboard (where
      confirmed-booking dates are shown locked and non-clickable, visually
      distinct from the vendor's own togglable blocked dates).
- [x] Security hardening (Helmet, rate limiting, CORS review) —
      `server/index.js` now runs [Helmet](https://helmetjs.github.io) on
      every response (sane security headers: CSP, `X-Content-Type-Options`,
      `X-Frame-Options`, HSTS, `X-Powered-By` removed, etc. — this is a
      pure JSON API so the defaults have nothing to break), and CORS is
      now an explicit allow-list rather than the wide-open default: only
      `CLIENT_URL` may call the API, only with the methods/headers the app
      actually sends, and without credentials (the app authenticates with
      a JWT in an `Authorization` header, never a cookie, so there's no
      session cookie to protect). Three rate limiters, all via
      `express-rate-limit`: a generous global ceiling on `/api` (500
      requests / 15 min / IP) as a backstop against scripted abuse, a much
      stricter one on `/api/auth/register` and `/api/auth/login` (20 / 15
      min / IP) against brute-force and credential-stuffing, and another
      on `/api/ai-chat` (30 / 15 min / IP) since that endpoint calls a
      billed external API (Gemini) with no auth requirement - without a
      limiter there, a single visitor or script could run up real cost.
      Every limiter returns a clean `429 {success:false, message:...}`
      instead of the library's default plain-text response, consistent
      with the rest of the API. See `server/index.js`,
      `server/routes/authRoutes.js`, and `server/routes/aiChatRoutes.js`.
- [x] API versioning + consistent response envelope — every feature
      router is now registered once in `server/routes/v1.js` and served at
      **`/api/v1/...`**, the canonical versioned API (the frontend's axios
      base URL now points there, and every response carries an
      `X-API-Version: v1` header). The old unversioned `/api/...` paths
      still work as a deprecated alias of the same router - same handlers,
      no duplicated logic - and answer with `Deprecation: true` plus a
      `Link: </api/v1/...>; rel="successor-version"` header, so existing
      clients and bookmarks keep working while pointing at the new path. A
      future breaking change becomes `routes/v2.js` mounted at `/api/v2`,
      leaving v1 untouched. New public `GET /api/v1/health` liveness check
      (no DB access) for load balancers/Docker/CI. For the envelope, an
      audit of all 200+ controller responses found 54 server-error
      handlers that returned `{error: error.message}` (some without a
      `success` flag at all) - inconsistent with the `{success, message,
      ...}` shape used everywhere else, and leaking raw internal error
      text (SQL/driver messages) to clients. All now return
      `{success: false, message: "Something went wrong. Please try
      again."}` (details stay in the server log). Domain data keys
      (`vendors`, `booking`, `stats`, ...) were deliberately left as-is -
      renaming them all into a generic `data` field would break every
      frontend consumer for no functional gain. See `server/routes/v1.js`,
      `server/index.js`, and `client/src/services/api.js`.
- [x] Swagger/OpenAPI docs — interactive API documentation at
      **http://localhost:5000/api/v1/docs** (Swagger UI) with the raw
      OpenAPI 3.0 spec at `/api/v1/openapi.json`. It covers all 58
      operations: request bodies, query/path parameters, which routes need
      a token and which role, and the real status codes each can return
      (including the 409 double-booking conflicts and 429 rate limits). To
      try the protected endpoints, run `POST /auth/login` right in the UI,
      click **Authorize**, and paste the token. The spec is hand-written
      against the actual controllers (the status codes were cross-checked
      against the code, not guessed), and `npm run check:openapi` (in
      `server/`) fails if a route is ever added or removed without
      updating the docs, so they can't silently drift. Swagger UI needs
      inline scripts, so the strict Helmet CSP is relaxed for the docs
      page only; every API response keeps the full policy. See
      `server/docs/openapi.js`, `server/scripts/check-openapi.js` and
      `server/index.js`.
- [x] Docker/CI readiness — the whole stack now runs with one command,
      and every push is checked automatically. **Docker:** `server/
      Dockerfile` (multi-stage, production deps only, runs as the
      unprivileged `node` user, health check against `/api/v1/health`) and
      `client/Dockerfile` (builds the bundle, serves it from unprivileged
      nginx with SPA deep-link fallback, long-cache for fingerprinted
      assets, security headers). `docker-compose.yml` wires up Postgres
      (auto-initialised from the idempotent `schema.sql`, health-gated so
      the API only starts once the DB is ready), the API and the client;
      `docker-compose.seed.yml` optionally loads the demo data. Required
      secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`) have no default, so
      compose refuses to start rather than run with something guessable;
      `.env.example` documents everything. The client's API/Socket.io URL
      is now configurable (`VITE_API_URL`, `client/src/config.js`) with the
      same default as before, so `npm run dev` is unchanged. The server
      also shuts down gracefully on SIGTERM (what `docker stop` sends) and
      has an opt-in `TRUST_PROXY` setting so rate limits see real client
      IPs behind a load balancer. **CI:** `.github/workflows/ci.yml` runs on
      every push/PR - syntax check, API-docs-vs-routes check, unit tests, schema applied
      twice (proving it's idempotent) + seed on a real Postgres, boots the
      API and runs `npm run smoke` (26 end-to-end checks: auth,
      role boundaries, error envelope, headers, versioning), then client
      lint + build, then builds both Docker images. Client lint uses a
      **ratchet** (`npm run lint:ci`): the existing backlog of 24 React-hooks
      lint findings is recorded in `client/lint-baseline.json` and CI fails
      only if a change makes it *worse*, so the check is useful from day one
      without hiding the backlog; lower the baseline with
      `npm run lint:ci -- --update` as you fix them. See `docker-compose.yml`,
      `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf`,
      `.github/workflows/ci.yml`, `server/scripts/smoke-test.js`.
- [x] Real AI Event Planner (budget breakdown + real vendor recommendations)
      — customers get a new **Planner** page (`/planner`). They give an
      event type, total budget, guest count, city, optional date,
      optional category selection and notes; the backend then:
      (1) **splits the budget** across the chosen categories with
      per-event-type rules in `server/utils/plannerRules.js` (7 event
      types; shares re-normalised over what was picked, rounded to ₹100,
      always summing to exactly the budget); (2) **ranks the real vendors
      in the database** for each category - price fit against that
      category's allocation (vendors' free-text `price_range` is parsed;
      a missing price is never treated as free), rating, review count,
      featured - restricted to the customer's city (other cities are used,
      clearly flagged, only if the city has none); (3) with an event date,
      **leaves out vendors who are booked or blocked that day** (same two
      rules as the double-booking check: confirmed bookings + manual
      blocks; pending bookings don't count); (4) computes **insights**
      (e.g. ₹/guest for catering, categories whose cheapest vendor is
      above the allocation, short notice) and a **date-aware checklist**
      with book-by dates; (5) asks **Gemini** for a short narrative
      grounded only in those numbers and vendors. Gemini is optional and
      failure-proof: with no key, a timeout (`GEMINI_TIMEOUT_MS`, default
      12 s), an HTTP error or a bad reply the plan is still returned in
      full with `ai_source: "fallback"` and the checklist. The key stays
      server-side only. Plans can be **saved** (max 30 per account),
      reopened, refreshed with the latest data, and deleted; saving
      rebuilds the plan from the database server-side rather than
      trusting client-supplied results, and every read/delete is scoped to
      the JWT's user (someone else's plan is a 404). Customer-only
      (vendors get 403); generation has its own rate limit (15 / 15 min,
      `PLANNER_RATE_LIMIT_MAX`). New table `event_plans` (applied by the
      idempotent `schema.sql`). Verified: 14 unit tests (`npm test` in
      `server/`, also run in CI) for allocation sums, fit, ranking,
      insights and checklist; live API tests for validation, roles,
      ownership, date exclusion with real confirmed/blocked rows, the plan
      cap and the rate limit; a real-browser run of the whole flow
      (build → save → reload → open → refresh → delete, plus mobile
      width); the Gemini path was exercised against a local mock server
      (success, HTTP 500, empty, non-JSON and timeout all behave) - it
      could not be run against the real Gemini API from the build sandbox,
      so give it a try with your own key. See `server/utils/plannerEngine.js`,
      `server/controllers/plannerController.js`,
      `server/routes/plannerRoutes.js`, `client/src/pages/PlannerPage.jsx`.

- [x] Admin Panel completion (follow-up to the original Admin Panel) —
      audited against a full admin-panel spec and the remaining gaps
      closed. **New:** a *Reviews* tab (read-only overview with search,
      rating filter and sorting) and an *Activity log* tab backed by a new
      append-only `admin_audit_log` table (ban/unban/delete user,
      feature/unfeature/activate/deactivate/delete vendor, force-cancel
      booking - acting admin always taken from the JWT). **Vendor
      listing moderation:** admins can *deactivate* a business listing
      (`vendors.is_active`, plus reason/timestamp) separately from banning
      its owner. An inactive listing disappears from browse, details
      (404), recommendations, comparison, the planner, the AI assistant,
      wishlist and history, and can't receive new booking requests (400);
      its existing bookings are left alone and the owner is notified.
      **Detail views:** account details (profile, vendor business, booking
      tallies, recent bookings - never the password hash) and booking
      details (both parties, cancellation info, status history).
      **Lists:** user sorting, vendor category/city/status filters and
      sorting, booking search (customer, vendor, event type or id) and
      sorting, guest counts; the dashboard now shows vendor *accounts* vs
      vendor *business profiles*, deactivated/featured counts, recently
      registered users and recent booking activity. The invented "Est.
      Platform Revenue" tile was removed (there is no payment data to
      back it; the API field is kept for compatibility). **Safer
      actions:** every destructive action uses an accessible
      confirmation dialog (required reason where the server requires one)
      instead of `window.prompt`. **Hardening:** strict id validation
      (400), whitelisted sort keys, search terms matched literally (no
      `%`/`_` wildcards), reason length caps, and **Socket.io now refuses
      suspended users** - banning also disconnects their live sockets
      (previously only REST requests were blocked). Admin accounts can't
      be banned or deleted from the panel at all, so the last admin can't
      be removed. Public registration still only allows customer/vendor.
      Migration: the idempotent `server/db/schema.sql` adds
      `vendors.is_active/deactivated_reason/deactivated_at` and
      `admin_audit_log` (apply with `psql -f server/db/schema.sql`; back up
      first as with any schema change). Verified with live API tests
      (401/403 for every new endpoint, ban enforced on REST + sockets,
      unban restores access, listing hidden everywhere, bad ids/sorts/
      search), a real-browser run of every tab and dialog, 26 smoke
      checks, lint ratchet and build. See `server/controllers/adminController.js`,
      `client/src/pages/AdminPage.jsx`, `client/src/components/admin/`.

All items on the backlog are now done.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ running locally

## 1. Database setup

Create the database (name/user/password must match `server/.env`, which
already ships with working values):

```bash
psql -U postgres -c "CREATE DATABASE eventora;"
```

Apply the schema (this project didn't ship with one — it's new):

```bash
psql -U postgres -d eventora -f server/db/schema.sql
```

**Optional but recommended for a demo:** seed realistic data (15
vendors across different cities/categories, several customers, bookings
in different states, and reviews). This is completely optional and
never runs automatically — nothing bad happens if you skip it.

```bash
psql -U postgres -d eventora -f server/db/seed.sql
```

This seeds 15 vendors, 4 customers, bookings and reviews — all using the
password `password123`. See the full account list under "Demo data" below.


> **Upgrading an existing database is automatic.** Every time the server
> starts it applies `server/db/schema.sql` (idempotent: only adds what's
> missing, never drops or rewrites data) *before* it accepts requests, so
> a database created by an older version of Eventora is brought up to date
> by itself - no manual `psql` step needed after you replace the project
> files. If it can't (e.g. the database user may not alter tables) it
> prints `DATABASE SCHEMA UPDATE FAILED` with the manual command; set
> `SKIP_AUTO_MIGRATE=1` to turn it off. Without this, code that expects
> newer columns (such as `vendors.is_active`) fails with "column does not
> exist" and pages show no data.

## 2. Backend

```bash
cd server
npm install
node index.js
```

The `.env` file already has working values for `DATABASE_URL`,
`JWT_SECRET`, Cloudinary, and the Gemini API key — nothing to configure.
The server runs on **http://localhost:5000**.

## 3. Frontend

```bash
cd client
npm install
npm run dev
```

The client runs on **http://localhost:5173** (Vite's default) and is
already pointed at the backend above.

## Running with Docker (optional)

Everything above works without Docker; this is the one-command alternative
(requires Docker with the Compose plugin):

```bash
cp .env.example .env        # then set POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build                       # empty database
# or, on the first start only, with the demo data:
docker compose -f docker-compose.yml -f docker-compose.seed.yml up --build
```

Open **http://localhost:5173** (app) and **http://localhost:5000/api/v1/docs**
(API docs). The database lives in the `pgdata` volume and the init scripts
only run when it's empty - `docker compose down -v` wipes it for a fresh
start. Cloudinary/Gemini keys in `.env` are optional; without them photo
uploads and the AI chatbot report an error but the rest of the app works.
Your existing `server/.env` is untouched and still used when you run the app
without Docker.

> **Verification note:** the Dockerfiles, compose files and workflow were
> checked with hadolint, `docker compose config` and actionlint, and every
> step they perform (production install, schema + seed on a fresh Postgres,
> boot, smoke test, SIGTERM shutdown, client build, the nginx config against
> the real build) was run natively. The container images themselves were
> authored in an environment with no access to Docker registries, so
> `docker compose up --build` has not been run end to end - if it surfaces
> anything on your machine, that's the first place to look.

To check a running server end to end (also what CI does):
`cd server && SMOKE_URL=http://localhost:5000 npm run smoke`.

## What to try

- **Register** a new account as either a customer or a vendor.
- As a **vendor**: your dashboard will prompt you to "Set up your vendor
  profile" — add a business name, category, city, and upload a cover
  photo / gallery images.
- As a **customer**: browse `/vendors`, filter by category/city/search
  term, open **More Filters** for a minimum-rating and price-range filter,
  sort (Newest / Top Rated / Lowest Price / Highest Price), and page
  through results — all of it reflected in the URL so you can share or
  bookmark a specific filtered view. Open a vendor's page and book them.
- A vendor's page now shows a real **Availability** calendar — dates
  they're already confirmed-booked or have blocked off themselves show up
  unavailable, with no login needed to see it. Booking opens the same
  calendar as an interactive date picker (an already-taken date can't be
  selected); try requesting an available date, then from a **second
  account**, try requesting that same date once the first customer's
  booking has been **confirmed** — it's correctly refused with a clear
  message, same as trying to confirm two different customers onto the same
  date after both were approved (only the first to confirm wins). As a
  **vendor**, your dashboard now has a **Manage Availability** calendar:
  confirmed-booking dates show locked in a darker red (cancel the booking
  itself if plans change), and clicking any other future date blocks it
  off — reasons you're unavailable that aren't a booking — click it again
  to open it back up.
- After you've **booked, wishlisted, or viewed a few vendors** as a
  customer, go back to the homepage — a **"Recommended For You"** section
  appears right after the hero with picks matched to the categories/cities
  you've shown interest in (try it with `priya@example.com`, who already
  has several bookings, to see it populated immediately). It stays hidden
  for guests, vendor accounts, and brand-new customers with no activity
  yet.
- Click the **scale icon** on any vendor card (next to the wishlist heart)
  to add it to a **comparison tray** — no login required. Pick 2-4 and hit
  **Compare Now** in the floating bar for a real side-by-side table of
  category, city, rating, price range and more.
- **Save vendors** to your wishlist (heart icon on any vendor card or the
  vendor's own page), and view them all under `/wishlist`.
- Check `/history` for vendors you've recently viewed, recently messaged,
  and your recent bookings.
- The vendor can then **accept/reject** the booking from their dashboard.
  Once accepted, the **customer confirms it** from their own dashboard —
  that's what actually locks it in (an accepted-but-unconfirmed booking
  can still be cancelled by either side with no commitment). Either side
  can **propose a new date**; the other side gets an Accept/Decline
  prompt right on the booking card. Either side can **cancel** (with a
  required reason, shown to the other side) at any point before the
  event is marked done. Every booking has a **Timeline** you can expand
  to see the full history of what happened and when.
- Once approved, either side can **message** the other in real time from
  the new `/chat` page — a full conversation list with read receipts,
  typing indicators, and online status, not just a single chat window.
- Once a booking is confirmed or completed, the customer can **leave a
  review**.
- The **vendor dashboard** (`/vendor-dashboard`) now shows real,
  database-backed KPIs: booking counts by status, average rating,
  review count, a real **Profile Views** counter (increments whenever
  someone other than the vendor opens their public page — a vendor
  viewing their own listing is excluded), a **Response Rate** (% of
  received bookings actually acted on), an **Estimated Revenue** figure
  (completed bookings × the vendor's own listed price-range midpoint,
  clearly labeled as an estimate), and a **Profile Completion %** with
  specific missing items — clicking one jumps straight into Edit
  Profile.
- Click the **bell icon** in the navbar (both roles) to see your real
  notification history — booking requests/approvals/confirmations/
  cancellations, reschedule proposals and responses, new reviews, and new
  chat messages. New ones arrive **live** (no refresh needed) with a toast
  and a badge-count bump, for as long as you're logged in anywhere in the
  app — not just while a specific page is open.
- Log in as **admin@example.com** and open the **Admin Panel** link in the
  navbar: real platform KPIs, and real actions on real users/vendors/
  bookings — suspend an account and watch it immediately lose access (try
  logging in as them, or hitting any page with their existing session),
  feature a vendor and see it jump to the top of `/vendors`, or
  force-cancel someone's booking and watch both sides get notified.
- The API is now hardened against abuse: try typing the wrong password on
  `/login` **more than 20 times in 15 minutes** and you'll get a clean
  "Too many attempts" message instead of the server letting a script
  hammer away forever. `curl -I http://localhost:5000/api/vendors` shows
  the new security headers (Helmet) on every response, and a request from
  any origin other than the app itself is rejected by CORS.

- The API is versioned: open **http://localhost:5000/api/v1/health** for
  the liveness check, and compare `curl -I http://localhost:5000/api/v1/vendors`
  with `curl -I http://localhost:5000/api/vendors` - the second one (the
  deprecated unversioned alias) adds a `Deprecation` header pointing at the
  first.

- Open **http://localhost:5000/api/v1/docs**, expand `POST /auth/login`,
  hit **Try it out → Execute** (the example credentials are pre-filled),
  copy the `token` into **Authorize**, and then call any protected
  endpoint - e.g. `GET /bookings/customer` - straight from the browser.

- Log in as **priya@example.com** (password `password123`) and open
  **Planner** in the navbar. Try *Wedding*, ₹10,00,000, 300 guests, city
  *Jaipur*: you'll see the budget split, real vendors for each category
  (with how well their price fits and why), warnings such as "no Venue
  vendors in Jaipur yet", and a checklist with book-by dates. Pick a date
  a vendor has blocked on their dashboard (Manage Availability) and rebuild
  the plan - that vendor disappears. Press **Save this plan**, reload, and
  reopen it from "Your saved plans". Without a `GEMINI_API_KEY` you get the
  checklist instead of the AI summary.

- Log in as **admin@example.com** (the seeded admin account; password
  `password123` in the demo data - change it before any public deploy) and
  open **/admin**. Suspend a customer from *Users* (a reason is required),
  then try their old session in another browser: it's refused straight
  away. Deactivate a vendor from *Vendors* and check it vanishes from
  `/vendors`; the *Activity log* tab records every action.

## Demo data

Fifteen vendors are seeded across 10 categories (Photography, Catering,
Decoration, Venue, Entertainment, Wedding Planning, Makeup & Beauty,
Mehendi Artist, Invitations & Stationery, Transportation) and 5 cities
(Jaipur, Udaipur, Delhi, Mumbai, Bangalore). All seeded accounts use the
password `password123`. A few to try:

| Role     | Email                  | Notes                                |
|----------|------------------------|---------------------------------------|
| Customer | priya@example.com      | Has a completed + approved booking   |
| Customer | rahul@example.com      | Has pending bookings                 |
| Customer | ananya@example.com     | Has a completed engagement booking   |
| Customer | vikram@example.com     | Has an approved reception booking    |
| Vendor   | vendor1@example.com    | Royal Wedding Studio (Photography)   |
| Vendor   | vendor3@example.com    | Royal Feast Caterers (Catering)      |
| Vendor   | vendor9@example.com    | The Grand Pavilion (Venue)           |
| Vendor   | vendor10@example.com   | Glow Up Makeovers (Makeup & Beauty)  |
| Admin    | admin@example.com      | Full access to the Admin Panel (`/admin`) |

## Notes

- Image uploads (vendor portfolio/gallery, profile pictures, chat
  attachments) go through the backend's existing Cloudinary credentials
  in `.env` — no additional setup needed, as long as that Cloudinary
  account is reachable from wherever you run this.
- If you ever want a completely clean database, just re-run
  `schema.sql` (all statements are `IF NOT EXISTS`, so it's safe to
  re-run) and optionally `seed.sql` again.
