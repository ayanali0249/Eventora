-- ============================================================================
-- Eventora — Database Schema
-- ============================================================================
-- This file did not exist in the original project; it has been written by
-- reverse-engineering every column referenced across the controllers so the
-- app has a real, working database to run against. It uses the exact same
-- database name/user (see server/.env) that the project already ships with.
--
-- HOW TO RUN:
--   psql -U postgres -d eventora -f server/db/schema.sql
-- (or import it with any Postgres GUI client pointed at the "eventora" db)
--
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.
-- ============================================================================

-- USERS: both customers and vendors share this table, distinguished by role.
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password        VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL DEFAULT 'customer'
                        CHECK (role IN ('customer', 'vendor', 'admin')),
    profile_image   TEXT,
    -- Admin moderation: a banned user cannot log in (authController) or stay
    -- authenticated on an existing session (authMiddleware re-checks this on
    -- every request), and a banned vendor's listing disappears from public
    -- browse/detail pages. Never settable through public registration - only
    -- an admin account (role = 'admin', which the public register endpoint
    -- also refuses to create) can set this via the admin panel.
    is_banned       BOOLEAN       NOT NULL DEFAULT FALSE,
    ban_reason      TEXT,
    banned_at       TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Safe to re-run against an existing database that predates the admin role
-- and the ban columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'vendor', 'admin'));

-- VENDORS: one business profile per vendor user.
CREATE TABLE IF NOT EXISTS vendors (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER       NOT NULL UNIQUE
                          REFERENCES users(id) ON DELETE CASCADE,
    business_name     VARCHAR(200)  NOT NULL,
    category          VARCHAR(100)  NOT NULL,
    city              VARCHAR(100)  NOT NULL,
    description       TEXT,
    price_range       VARCHAR(100),
    portfolio_image   TEXT,
    gallery_images    TEXT[]        NOT NULL DEFAULT '{}',
    profile_views     INTEGER       NOT NULL DEFAULT 0,
    -- Admin-only spotlight flag: featured vendors sort first on the public
    -- vendor browse page. Set via the admin panel only.
    is_featured       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Safe to re-run against an existing database that predates profile_views.
-- Powers the real "Profile Views" KPI on the vendor dashboard: incremented
-- server-side every time someone other than the vendor themselves opens
-- their public vendor-details page (see vendorController.getVendorById).
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS profile_views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin moderation of a business LISTING (separate from banning the owner's
-- account): an inactive vendor is hidden from every public surface (browse,
-- details, recommendations, comparison, planner, AI assistant) and cannot
-- receive new booking requests. Their existing bookings are left untouched.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;

-- BOOKINGS: a customer's request to hire a vendor for an event.
--
-- Lifecycle (full state machine, enforced in bookingController.js):
--   pending -> approved -> confirmed -> completed
--      |          |            |
--      v          v            v
--   rejected   cancelled    cancelled
--
--   - pending    : REQUESTED, awaiting vendor review
--   - approved   : vendor ACCEPTED it, awaiting the customer's confirmation
--   - confirmed  : CUSTOMER CONFIRMED - locked in ("Upcoming" is just this
--                  status with event_date in the future, computed on read,
--                  not a separate stored value)
--   - completed  : the event happened, vendor marked it done
--   - rejected   : vendor declined at the review stage (terminal)
--   - cancelled  : either side cancelled before the event happened (terminal)
CREATE TABLE IF NOT EXISTS bookings (
    id               SERIAL PRIMARY KEY,
    customer_id      INTEGER       NOT NULL
                         REFERENCES users(id) ON DELETE CASCADE,
    vendor_id        INTEGER       NOT NULL
                         REFERENCES vendors(id) ON DELETE CASCADE,
    event_date       DATE          NOT NULL,
    event_type       VARCHAR(100)  NOT NULL,
    guest_count      INTEGER,
    message          TEXT,
    booking_status   VARCHAR(20)   NOT NULL DEFAULT 'pending'
                         CHECK (booking_status IN ('pending', 'approved', 'confirmed', 'completed', 'rejected', 'cancelled')),

    -- Reschedule proposal currently awaiting a response (either side can
    -- propose; cleared once accepted or declined).
    reschedule_proposed_date   DATE,
    reschedule_proposed_by     VARCHAR(10) CHECK (reschedule_proposed_by IN ('customer', 'vendor')),
    reschedule_message         TEXT,

    -- Who cancelled and why, kept on the row itself for quick display
    -- without joining the history table. 'admin' covers a platform admin
    -- force-cancelling via the admin panel (dispute resolution, etc.).
    cancelled_by        VARCHAR(10) CHECK (cancelled_by IN ('customer', 'vendor', 'admin')),
    cancellation_reason  TEXT,
    cancelled_at         TIMESTAMP,

    confirmed_at     TIMESTAMP,
    completed_at     TIMESTAMP,

    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Safe to re-run against an existing database created before this lifecycle
-- upgrade: widen the status CHECK constraint and add the new columns
-- without touching any existing booking rows.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_proposed_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_proposed_by VARCHAR(10);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_message TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(10);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check
    CHECK (booking_status IN ('pending', 'approved', 'confirmed', 'completed', 'rejected', 'cancelled'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_reschedule_proposed_by_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_reschedule_proposed_by_check
    CHECK (reschedule_proposed_by IS NULL OR reschedule_proposed_by IN ('customer', 'vendor'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_cancelled_by_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_cancelled_by_check
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'vendor', 'admin'));

-- BOOKING_STATUS_HISTORY: an audit trail of every transition, so both sides
-- can see a real timeline ("Requested Oct 1 -> Approved Oct 2 -> Confirmed
-- Oct 3...") instead of just the current status.
CREATE TABLE IF NOT EXISTS booking_status_history (
    id               SERIAL PRIMARY KEY,
    booking_id       INTEGER      NOT NULL
                         REFERENCES bookings(id) ON DELETE CASCADE,
    status           VARCHAR(20)  NOT NULL,
    changed_by_role  VARCHAR(10)  NOT NULL
                         CHECK (changed_by_role IN ('customer', 'vendor', 'system')),
    note             TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- REVIEWS: one review per (customer, vendor) pair, enforced at the DB level
-- as a safety net in addition to the application-level check.
CREATE TABLE IF NOT EXISTS reviews (
    id             SERIAL PRIMARY KEY,
    customer_id    INTEGER      NOT NULL
                       REFERENCES users(id) ON DELETE CASCADE,
    vendor_id      INTEGER      NOT NULL
                       REFERENCES vendors(id) ON DELETE CASCADE,
    rating         INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review         TEXT,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, vendor_id)
);

-- MESSAGES: chat history for the Socket.io powered vendor <-> customer chat.
CREATE TABLE IF NOT EXISTS messages (
    id            SERIAL PRIMARY KEY,
    room_id       VARCHAR(150)  NOT NULL,
    sender_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    sender_name   VARCHAR(150),
    message       TEXT,
    file_url      TEXT,
    seen          BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Safe to re-run against an existing database that predates sender_id.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- WISHLISTS: a customer's saved/favorited vendors.
CREATE TABLE IF NOT EXISTS wishlists (
    id            SERIAL PRIMARY KEY,
    customer_id   INTEGER      NOT NULL
                      REFERENCES users(id) ON DELETE CASCADE,
    vendor_id     INTEGER      NOT NULL
                      REFERENCES vendors(id) ON DELETE CASCADE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, vendor_id)
);

-- VENDOR_VIEWS: one row per (customer, vendor) pair, timestamp updated on
-- every view. Powers the "Recently Viewed" history tab. Deliberately not
-- an append-only log - upserting keeps the table small and ordering by
-- viewed_at DESC gives deduplicated "recently viewed" for free.
CREATE TABLE IF NOT EXISTS vendor_views (
    id            SERIAL PRIMARY KEY,
    customer_id   INTEGER      NOT NULL
                      REFERENCES users(id) ON DELETE CASCADE,
    vendor_id     INTEGER      NOT NULL
                      REFERENCES vendors(id) ON DELETE CASCADE,
    viewed_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, vendor_id)
);

-- NOTIFICATIONS: a real, DB-persisted notification center (replaces the
-- old in-memory-only NotificationContext, which reset on every refresh and
-- only ever fired while the chat page happened to be mounted). A row is
-- created server-side for every meaningful event involving this user
-- (new booking request, status changes, reschedule proposals/responses,
-- new chat messages, new reviews) and pushed live over Socket.io to that
-- user's personal `user-{id}` room (see server/utils/notify.js).
CREATE TABLE IF NOT EXISTS notifications (
    id                   SERIAL PRIMARY KEY,
    user_id              INTEGER      NOT NULL
                             REFERENCES users(id) ON DELETE CASCADE,
    type                 VARCHAR(30)  NOT NULL,
    title                VARCHAR(200) NOT NULL,
    message              TEXT,
    link                 TEXT,
    related_booking_id   INTEGER
                             REFERENCES bookings(id) ON DELETE CASCADE,
    is_read              BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- VENDOR_BLOCKED_DATES: a vendor's own manual blackout dates (days off,
-- already booked elsewhere, etc.) - separate from `bookings`, which only
-- ever holds dates a CUSTOMER requested through Eventora. Together with a
-- vendor's CONFIRMED bookings, this is what the availability calendar and
-- the double-booking check in bookingController.js treat as "unavailable".
-- Only the owning vendor can add/remove their own rows (enforced in
-- availabilityController.js via req.user.id -> their vendor profile, never
-- trusted from the request body).
CREATE TABLE IF NOT EXISTS vendor_blocked_dates (
    id              SERIAL PRIMARY KEY,
    vendor_id       INTEGER      NOT NULL
                        REFERENCES vendors(id) ON DELETE CASCADE,
    blocked_date    DATE         NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (vendor_id, blocked_date)
);

-- ---------------------------------------------------------------------------
-- Indexes for the query patterns actually used by the controllers.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vendors_user_id       ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_category       ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_city           ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id   ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_id     ON bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id      ON reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id       ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_customer_id  ON wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_views_customer  ON vendor_views(customer_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking ON booking_status_history(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_vendor_blocked_dates_vendor ON vendor_blocked_dates(vendor_id, blocked_date);

-- ---------------------------------------------------------------------------
-- EVENT_PLANS: plans a customer saved from the AI Event Planner. `inputs` is
-- what they asked for, `result` the generated breakdown + vendor picks (a
-- snapshot - vendor prices/availability can change later). Always scoped to
-- user_id taken from the JWT, never from the request.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_plans (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL
                    REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(160) NOT NULL,
    inputs      JSONB        NOT NULL,
    result      JSONB        NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_plans_user_created ON event_plans(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- ADMIN_AUDIT_LOG: append-only record of sensitive actions taken from the
-- admin panel (ban/unban, delete, feature, suspend listing, force-cancel).
-- admin_id comes from the verified JWT. If the admin account is ever
-- removed, the history stays (admin_id becomes NULL).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id            SERIAL PRIMARY KEY,
    admin_id      INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(50)  NOT NULL,
    target_type   VARCHAR(30)  NOT NULL,
    target_id     INTEGER,
    details       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
