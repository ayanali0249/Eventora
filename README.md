# Eventora — Full-Stack Event & Wedding Vendor Marketplace

[![CI Status](https://github.com/ayanali0249/Eventora/actions/workflows/ci.yml/badge.svg)](https://github.com/ayanali0249/Eventora/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/express-5.x-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-14%2B-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Eventora is a production-grade, full-stack marketplace connecting event planners and customers with verified wedding and event professionals (photographers, caterers, decorators, venues, DJs, makeup artists, and more). Built with React 19, Node.js/Express 5, and PostgreSQL, Eventora provides a complete booking lifecycle state machine, real-time presence-aware messaging, AI-powered budget planning, multi-vendor comparison, database-backed blackout calendars, and an audited role-protected administration panel.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
  - [Customer Features](#customer-features)
  - [Vendor Features](#vendor-features)
  - [Admin Dashboard Features](#admin-dashboard-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Project Directory Structure](#project-directory-structure)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation Instructions](#installation-instructions)
- [Environment Variable Setup](#environment-variable-setup)
- [Database Setup & Migrations](#database-setup--migrations)
- [Running the Application](#running-the-application)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Setup](#docker-setup)
- [Development Commands](#development-commands)
- [Demo Credentials](#demo-credentials)
- [API Documentation & Endpoints](#api-documentation--endpoints)
- [Testing Instructions](#testing-instructions)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Deployment Instructions](#deployment-instructions)
- [Future Improvements](#future-improvements)
- [License](#license)
- [Author](#author)

---

## Project Overview

Organizing weddings and major celebrations requires balancing budgets across multiple specialized categories while managing date availability and communication with diverse service providers. Eventora addresses this workflow by providing:

1. **Deterministic & AI Planning**: A dual planning engine that computes exact budget splits and matches qualified vendors deterministically, paired with Google Gemini for narrative insights.
2. **Booking Lifecycle State Machine**: Enforces valid status transitions (`pending` → `approved` → `confirmed` → `completed`, with explicit reschedule proposals, cancel reasons, and timeline audit logs).
3. **Availability & Race Condition Prevention**: Server-side double-booking checks combining confirmed client bookings with vendor-managed blackout dates.
4. **Real-Time Communication**: Socket.io-driven messaging and notification center with room presence awareness to suppress redundant alerts.
5. **Platform Governance**: An administrative dashboard with instant session termination for banned users and full audit logging.

---

## Key Features

### Customer Features

- **Advanced Search & Discovery**:
  - Filter vendors by Category, City, Search Keywords, Minimum Rating (3+, 4+, 4.5+), and Dynamic Price Range bounds.
  - Sort by Newest, Top Rated, Lowest Price, and Highest Price (numeric extraction from price ranges, not alphabetical).
  - Shareable and bookmarkable URL parameters (`useSearchParams`).
  - Server-side pagination with accurate total count and out-of-bounds guards.
- **Personalized Recommendations**:
  - "Recommended For You" homepage section based on customer interaction weights (bookings: 3, wishlists: 2, views: 1).
  - Progressive appearance: activates only after preference signals exist.
- **Multi-Vendor Comparison**:
  - Compare 2 to 4 vendors side-by-side using a persistent floating comparison tray.
  - Side-by-side breakdown of categories, cities, pricing, verified reviews, and experience.
- **AI Event Planner (`/planner`)**:
  - Split event budgets across 7 distinct event types (Wedding, Reception, Engagement, Birthday, Corporate, Sangeet, Anniversary).
  - Budget allocations rounded to clean ₹100 intervals, normalized across selected categories.
  - Real database vendor matching with price-fit classification (`comfortable`, `within`, `stretch`, `over`).
  - Automated planning insights and milestone-based book-by checklist.
  - Optional Gemini-powered summary with automatic fallback when AI services are unavailable.
  - Save, reload, refresh, and manage up to 30 custom event plans per customer.
- **Booking & Lifecycle Management**:
  - Interactive booking modal with date selection that respects vendor blackout dates.
  - Reschedule negotiation: propose alternative dates and accept or decline vendor counter-proposals.
  - Expandable booking audit timeline showing status change history and cancellation reasons.
- **Real-Time Chat & Notifications**:
  - Direct real-time messaging with vendors including image and document attachments via Cloudinary.
  - Notification dropdown with unread badges, mark-as-read controls, and live Socket.io alerts.
  - Presence-aware notifications (automatically marked read when active in the chat room).
- **Wishlist & Browsing History**:
  - Save favorite vendors for quick access.
  - View recently browsed vendors, recent chats, and past bookings in `/history`.

### Vendor Features

- **Business Profile Management**:
  - Manage business details, service category, operating city, description, and price range.
  - Upload portfolio cover images and multi-photo gallery portfolios via Cloudinary.
- **Real-Time Vendor Dashboard (`/vendor-dashboard`)**:
  - Real database-backed KPI metrics: Total Bookings, Status Counts, Average Rating, and Review Count.
  - Genuine Profile Views counter (excludes self-visits).
  - Customer Inquiry Response Rate percentage.
  - Estimated Revenue calculation based on completed events and price range midpoints.
  - Weighted Profile Completion indicator with direct action links to missing profile fields.
- **Availability & Blackout Calendar**:
  - Visual month-grid calendar displaying confirmed client bookings in locked status.
  - One-click date blocking and unblocking for days off or outside engagements.
- **Booking Request Processing**:
  - Accept or reject incoming booking requests.
  - Propose date reschedules with optional notes.
  - Mark completed events and cancel with mandatory documented reasons.

### Admin Dashboard Features

- **Role-Protected Administrative Panel (`/admin`)**:
  - Gated by `requireRole('admin')` server-side and client-side route guards.
- **Platform KPIs & Overview**:
  - Live metric tallies for total users, customers, vendor accounts, vendor business profiles, and active bookings.
  - 7-day and 30-day user registration trends.
- **User Moderation**:
  - Searchable, filterable, and paginated table of platform accounts.
  - Account suspension with mandatory reason input.
  - **Instant mid-session revocation**: `authMiddleware` verifies account status on every request and Socket.io handshake, terminating suspended sessions immediately.
  - Permanent account deletion with database cascade.
  - Safeguard preventing admins from banning or deleting their own or peer admin accounts.
- **Vendor Moderation**:
  - Feature vendors to pin them to the top of public search results.
  - Business profile deactivation: hides listings from browse, recommendations, planner, and AI search while preserving existing customer bookings.
- **Booking Dispute Management**:
  - Global overview of all platform bookings.
  - Administrative force-cancellation with required documentation, notifying both parties and writing to audit trails.
- **Platform Reviews Overview**:
  - Searchable, rating-filtered log of customer reviews.
- **Append-Only Audit Log (`admin_audit_log`)**:
  - Cryptographically attributable log of all moderation actions recording admin ID, action type, target ID, and timestamp.

---

## Technology Stack

### Frontend
- **Framework**: React 19 (SPA)
- **Build Tool**: Vite 8 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) with custom typography (`Fraunces` & `Manrope`) and jewel-toned palette
- **Routing**: React Router v7 (`react-router-dom`)
- **State & Context**: React Context API (`AuthContext`, `NotificationContext`, `WishlistContext`, `CompareContext`)
- **Icons**: Lucide React
- **Notifications & UI**: React Hot Toast
- **HTTP Client**: Axios with centralized error and auth interceptors
- **Real-Time Client**: Socket.io Client

### Backend
- **Runtime**: Node.js (v18+ / v20+ / v22+ LTS)
- **Framework**: Express 5.x
- **Database Driver**: `pg` (Node Postgres Connection Pool)
- **Real-Time Server**: Socket.io (with room multiplexing and JWT handshake authentication)
- **Security & Hardening**:
  - Helmet (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
  - Express Rate Limit (Tiered rate limiters for API, Auth, and AI endpoints)
  - CORS with explicit origin allowlisting
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & password hashing (`bcryptjs`)
- **File Uploads**: Multer with memory storage streaming directly to Cloudinary via `streamifier`
- **API Documentation**: OpenAPI 3.0 specification with interactive Swagger UI (`swagger-ui-express`)
- **AI Integration**: Google Gemini API (`gemini-3.6-flash` via native fetch)

### Database & Infrastructure
- **Database**: PostgreSQL 14+ (idempotent schema with automated migrations)
- **Containerization**: Multi-stage Dockerfiles (unprivileged `node` user and alpine `nginx`)
- **Orchestration**: Docker Compose with health checks and dependency gating
- **CI/CD**: GitHub Actions (lint ratchet, schema idempotency, unit tests, and smoke test suite)

---

## Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Client (React 19/Vite) │
                          └─────────────┬────────────┘
                                        │
                         HTTP / REST    │   Socket.io (WebSockets)
                        (Axios / JWT)   │  (Presence, Chat, Alerts)
                                        ▼
                          ┌──────────────────────────┐
                          │  Express 5 API Gateway   │
                          │  - Helmet & CORS         │
                          │  - Rate Limiters         │
                          │  - Auth & Role Guards    │
                          └──────┬────────────┬──────┘
                                 │            │
            ┌────────────────────┘            └────────────────────┐
            ▼                                                      ▼
┌──────────────────────────────┐                         ┌───────────────────┐
│     PostgreSQL Database      │                         │ External Services │
│ - Users, Vendors, Bookings   │                         │ - Cloudinary CDN  │
│ - Booking Status History     │                         │ - Google Gemini   │
│ - Notifications, Messages    │                         └───────────────────┘
│ - Blocked Dates, Event Plans │
│ - Admin Audit Log            │
└──────────────────────────────┘
```

---

## Project Directory Structure

```
Eventora/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow (tests, lint, docker)
├── client/                    # Frontend React 19 Application
│   ├── public/                # Static assets (favicon, SVG icons)
│   ├── scripts/
│   │   └── lint-ratchet.cjs   # ESLint ratchet script preventing new lint debt
│   ├── src/
│   │   ├── assets/            # Component-level static assets
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/         # Admin confirmation dialogs and detail modals
│   │   │   ├── AIChatbot.jsx  # Floating AI assistant chatbot
│   │   │   ├── AvailabilityCalendar.jsx # Interactive/read-only booking calendar
│   │   │   ├── BookingCard.jsx# Booking card with status badges and timeline
│   │   │   ├── BookingModal.jsx
│   │   │   ├── BookingTimeline.jsx
│   │   │   ├── CompareTray.jsx# Floating multi-vendor comparison drawer
│   │   │   ├── Navbar.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── Pagination.jsx # Reusable URL-synced pagination component
│   │   │   └── VendorCard.jsx
│   │   ├── constants/         # Category definitions and static metadata
│   │   ├── context/           # Context providers (Auth, Notifications, Compare, Wishlist)
│   │   ├── pages/             # Route pages (Home, Vendors, Admin, Dashboard, Planner, etc.)
│   │   ├── routes/            # Route authorization guards (ProtectedRoute, RoleRoute)
│   │   ├── services/          # Axios API client and data service helpers
│   │   ├── config.js          # Client runtime configuration and API origins
│   │   ├── index.css          # Tailwind CSS v4 configuration and custom typography
│   │   ├── App.jsx            # Application route tree
│   │   └── main.jsx           # App entry point and context hierarchy
│   ├── .dockerignore
│   ├── .env.example           # Client environment variable template
│   ├── .gitignore
│   ├── Dockerfile             # Multi-stage production client build with Nginx
│   ├── eslint.config.js       # ESLint flat configuration
│   ├── lint-baseline.json     # Baseline linting debt definition
│   ├── nginx.conf             # Production Nginx reverse proxy configuration
│   ├── package.json
│   └── vite.config.js
├── server/                    # Backend Node.js / Express Application
│   ├── config/
│   │   ├── cloudinary.js      # Cloudinary CDN initialization
│   │   └── db.js              # PostgreSQL connection pool with fallback handling
│   ├── controllers/           # Route business logic handlers
│   │   ├── adminController.js # Admin operations and audit log creation
│   │   ├── aiChatController.js# Grounded AI assistant controller
│   │   ├── authController.js  # Registration, login, profile, and password update
│   │   ├── availabilityController.js # Date blackout controls
│   │   ├── bookingController.js      # Booking state machine and reschedule logic
│   │   ├── chatController.js  # Message history and conversation retrieval
│   │   ├── historyController.js
│   │   ├── notificationController.js
│   │   ├── plannerController.js      # AI Planner generation and persistence
│   │   ├── reviewController.js
│   │   ├── uploadController.js
│   │   ├── vendorController.js       # Filter, search, and KPI calculations
│   │   └── wishlistController.js
│   ├── db/
│   │   ├── migrate.js         # Automated startup schema migration runner
│   │   ├── schema.sql         # Idempotent database schema definition
│   │   └── seed.sql           # Demo seed data (vendors, customers, reviews)
│   ├── docs/
│   │   └── openapi.js         # OpenAPI 3.0 specification covering all 69 endpoints
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT validation with live ban check
│   │   ├── optionalAuth.js    # Soft authentication for guest-compatible routes
│   │   ├── roleMiddleware.js  # Role-based endpoint authorization
│   │   └── uploadMiddleware.js# Multer memory storage configuration
│   ├── routes/
│   │   ├── v1.js              # Canonical v1 API route aggregator
│   │   ├── adminRoutes.js
│   │   ├── aiChatRoutes.js
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── plannerRoutes.js
│   │   └── vendorRoutes.js
│   ├── scripts/
│   │   ├── check-openapi.js   # Verifies 100% parity between routes and OpenAPI spec
│   │   └── smoke-test.js      # 26 end-to-end integration checks against running server
│   ├── test/
│   │   └── plannerEngine.test.js # Unit tests for budget allocation and vendor ranking
│   ├── utils/
│   │   ├── availability.js    # Double-booking and date conflict verification
│   │   ├── gemini.js          # Google Gemini generative text wrapper
│   │   ├── notify.js          # Server-side notification creator & Socket.io emitter
│   │   ├── plannerEngine.js   # Deterministic budget split & ranking engine
│   │   ├── plannerRules.js    # Event type rules and category allocations
│   │   └── priceParser.js     # Robust numeric regex extractor for Indian rupee prices
│   ├── .dockerignore
│   ├── .env.example           # Server environment variable template
│   ├── .gitignore
│   ├── Dockerfile             # Multi-stage production server container
│   ├── index.js               # Express server entry point, middleware, and Socket.io setup
│   └── package.json
├── .env.example               # Root Docker Compose environment variable template
├── .gitignore                 # Root Git exclusion rules
├── docker-compose.yml         # Multi-container stack (Postgres, Server, Client)
├── docker-compose.seed.yml    # Compose overlay for loading seed demo data
├── LICENSE                    # MIT License
├── README.md                  # Project documentation
└── SETUP.md                   # Detailed local engineering and progress guide
```

---

## Screenshots

> *Screenshots can be captured when running the project locally or viewing the interactive live preview:*

| Marketplace & Filters | Vendor Dashboard & KPIs |
| :---: | :---: |
| *Browse vendors with category, city, rating, and dynamic price filters* | *Track bookings, profile views, response rates, and completion status* |

| AI Event Planner (`/planner`) | Real-Time Chat & Booking Timeline |
| :---: | :---: |
| *Deterministic budget splits, vendor fit classification, and checklists* | *Socket.io chat with image attachments, read receipts, and status audit logs* |

---

## Prerequisites

Ensure you have the following installed locally:

- **Node.js**: v18.0.0 or higher (v20+ / v22+ LTS recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher (running locally on port 5432)
- **Docker & Docker Compose** *(Optional, for containerized execution)*

---

## Installation Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ayanali0249/Eventora.git
   cd Eventora
   ```

2. **Install Server Dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies**:
   ```bash
   cd ../client
   npm install
   ```

---

## Environment Variable Setup

### 1. Server Environment Configuration
Create a `.env` file in the `server/` directory by copying the example:

```bash
cp server/.env.example server/.env
```

Configure the following variables in `server/.env`:

```env
# Server Port & CORS
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/eventora

# JWT Authentication (generate with: openssl rand -hex 32)
JWT_SECRET=your_long_random_jwt_secret_key

# Optional: Reverse Proxy & Migration flags
# TRUST_PROXY=1
# SKIP_AUTO_MIGRATE=1

# Optional: Cloudinary Credentials (for portfolio & chat uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Optional: Google Gemini API (for AI Planner narrative & AI Assistant)
GEMINI_API_KEY=your_gemini_api_key
```

> **Note**: Cloudinary and Gemini API keys are optional for local development. If omitted, the application will degrade gracefully (AI Planner will use local deterministic checklists and default fallback responses).

### 2. Client Environment Configuration
Create a `.env` file in the `client/` directory by copying the example:

```bash
cp client/.env.example client/.env
```

```env
# Browser-visible API URL (defaults to http://localhost:5000)
VITE_API_URL=http://localhost:5000
```

---

## Database Setup & Migrations

### 1. Create the Database
In your local PostgreSQL instance:

```bash
psql -U postgres -c "CREATE DATABASE eventora;"
```

### 2. Apply Schema Migrations
The database schema is **automated and idempotent**: every time the backend boots, it applies `server/db/schema.sql` via an advisory lock to ensure all tables, columns, constraints, and indexes exist.

To apply the schema manually:

```bash
psql -U postgres -d eventora -f server/db/schema.sql
```

### 3. Load Optional Demo Seed Data
To populate the application with 15 realistic vendors across 10 categories, 4 customer accounts, bookings across various statuses, and verified reviews:

```bash
# Using the Node.js runner (includes production safety checks):
cd server
npm run seed

# Or manually using psql:
psql -U postgres -d eventora -f server/db/seed.sql
```

> [!NOTE]
> Demo seed data is strictly for development and testing. The seed runner (`server/db/seed.js`) automatically refuses to run in production (`NODE_ENV=production`) unless explicitly overridden with `ALLOW_DEMO_SEED=true`.

---

## Running the Application

### Backend Setup

Navigate to the `server/` directory and start the server:

```bash
cd server
npm run dev    # Starts with nodemon live reload
# or
npm start      # Starts with standard node
```

The backend server runs on **http://localhost:5000**.
- Health Check: `http://localhost:5000/api/v1/health`
- Swagger UI Documentation: `http://localhost:5000/api/v1/docs`

### Frontend Setup

In a new terminal window, navigate to the `client/` directory and start the Vite dev server:

```bash
cd client
npm run dev
```

The frontend client runs on **http://localhost:5173**.

---

### Docker Setup

You can run the entire stack (PostgreSQL database, Node.js API, and Nginx SPA client) with a single Docker Compose command:

1. Configure root `.env`:
   ```bash
   cp .env.example .env
   # Edit .env and supply secure values for POSTGRES_PASSWORD and JWT_SECRET
   ```

2. Start the containers:
   ```bash
   # Empty database:
   docker compose up --build

   # With demo seed data automatically loaded:
   docker compose -f docker-compose.yml -f docker-compose.seed.yml up --build
   ```

3. Access the application:
   - Client: `http://localhost:5173`
   - API & Swagger Docs: `http://localhost:5000/api/v1/docs`

---

## Development Commands

### Server Commands (`cd server`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server with live reload (`nodemon`) |
| `npm start` | Start server in production mode |
| `npm test` | Run planner unit test suite using Node native test runner |
| `npm run seed` | Load development demo seed data with production safety checks |
| `npm run check:openapi` | Verify 100% route-to-spec parity between routes and OpenAPI documentation |
| `npm run smoke` | Run 26 end-to-end integration checks against running server (`SMOKE_URL=http://localhost:5000`) |

### Client Commands (`cd client`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Launch Vite development server with HMR |
| `npm run build` | Build optimized production bundle to `client/dist` |
| `npm run lint` | Run ESLint checks across client source files |
| `npm run lint:ci` | Run ESLint with ratchet verification against `lint-baseline.json` |
| `npm run preview` | Locally preview the built production bundle |

---

## Demo Credentials (Development Only)

> [!WARNING]
> **DEVELOPMENT & DEMO USE ONLY**: The credentials below are provided exclusively for local testing.
> In a production environment (`NODE_ENV=production`), logging in with `admin@example.com` and `password123` is **automatically disabled and refused**.
> In production, administrator accounts must be provisioned directly in PostgreSQL with a strong, randomly generated password hash.

All seeded demo accounts in `server/db/seed.sql` use the password: `password123`.

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Customer** | `priya@example.com` | `password123` | Active customer with confirmed and completed bookings |
| **Customer** | `rahul@example.com` | `password123` | Customer with pending booking requests |
| **Customer** | `ananya@example.com` | `password123` | Customer with completed engagement booking |
| **Customer** | `vikram@example.com` | `password123` | Customer with approved reception booking |
| **Vendor** | `vendor1@example.com` | `password123` | Royal Wedding Studio (Photography, Jaipur) |
| **Vendor** | `vendor3@example.com` | `password123` | Royal Feast Caterers (Catering, Delhi) |
| **Vendor** | `vendor9@example.com` | `password123` | The Grand Pavilion (Venue, Bangalore) |
| **Admin** | `admin@example.com` | `password123` | Development Demo Admin (disabled in production) |

---

## API Documentation & Endpoints

Eventora provides an interactive Swagger UI documentation at **http://localhost:5000/api/v1/docs** and the raw OpenAPI 3.0 specification at `http://localhost:5000/api/v1/openapi.json`.

All endpoints are versioned under `/api/v1/*` with backward-compatible deprecation headers served on legacy `/api/*` routes.

### Primary API Route Groups

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/health` | Public | Service liveness health check |
| **POST** | `/api/v1/auth/register` | Public | Register customer or vendor account |
| **POST** | `/api/v1/auth/login` | Public | Authenticate user and receive JWT token |
| **GET** | `/api/v1/auth/me` | Authenticated | Retrieve current user profile and role |
| **GET** | `/api/v1/vendors` | Public | Paginated vendor search with multi-parameter filtering |
| **GET** | `/api/v1/vendors/:id` | Public | Retrieve vendor profile, gallery, and ratings |
| **GET** | `/api/v1/vendors/filters` | Public | Dynamic filter metadata (min/max price bounds, cities) |
| **GET** | `/api/v1/vendors/recommended` | Customer | Personalized vendor recommendations based on behavior |
| **GET** | `/api/v1/vendors/compare` | Public | Side-by-side details for 2-4 vendor IDs |
| **GET** | `/api/v1/vendors/:id/availability` | Public | Confirmed and blocked dates for vendor |
| **POST** | `/api/v1/vendors/availability/block` | Vendor | Block off manual blackout dates |
| **POST** | `/api/v1/bookings` | Customer | Submit new booking request (with double-booking check) |
| **GET** | `/api/v1/bookings/customer` | Customer | List customer bookings with history |
| **GET** | `/api/v1/bookings/vendor` | Vendor | List vendor incoming bookings |
| **PUT** | `/api/v1/bookings/:id/status` | Vendor | Accept, reject, or complete booking |
| **PUT** | `/api/v1/bookings/:id/customer-status` | Customer | Confirm approved booking or cancel |
| **POST** | `/api/v1/bookings/:id/reschedule` | Both | Propose new booking date |
| **POST** | `/api/v1/bookings/:id/reschedule/respond` | Both | Accept or decline proposed reschedule date |
| **POST** | `/api/v1/planner/generate` | Customer | Generate budget breakdown and matched vendor plan |
| **POST** | `/api/v1/planner/save` | Customer | Save custom generated plan |
| **GET** | `/api/v1/notifications` | Authenticated | List persistent notifications with unread count |
| **GET** | `/api/v1/chat/messages/:roomId` | Authenticated | Retrieve conversation chat history |
| **GET** | `/api/v1/admin/stats` | Admin | Platform-wide KPIs and registration trends |
| **PUT** | `/api/v1/admin/users/:id/ban` | Admin | Suspend user account with required reason |
| **PUT** | `/api/v1/admin/vendors/:id/feature` | Admin | Feature or unfeature vendor |
| **PUT** | `/api/v1/admin/vendors/:id/status` | Admin | Activate or deactivate vendor business listing |
| **GET** | `/api/v1/admin/audit-log` | Admin | Retrieve immutable administrative audit log |

---

## Testing Instructions

Eventora includes unit testing, documentation schema validation, and end-to-end smoke verification:

### 1. Unit Tests (Planner Engine & Ranking Rules)
Test the deterministic budget allocation engine, price range regex parser, price fit classification, and recommendation ranking:

```bash
cd server
npm test
```

*Expected output: 13 passing unit tests (`node:test`).*

### 2. OpenAPI Parity Verification
Verify that every registered Express router matches the OpenAPI documentation:

```bash
cd server
npm run check:openapi
```

*Expected output: `69 registered routes, 69 documented operations. OpenAPI spec matches the registered routes.`*

### 3. Client Linting & Baseline Ratchet
Execute client linting using the ratchet script:

```bash
cd client
npm run lint:ci
```

*Expected output: `Lint problems: 24 (baseline 24). No new lint problems.`*

### 4. Client Production Build
Validate that the client builds cleanly without compilation errors:

```bash
cd client
npm run build
```

---

## Troubleshooting

- **Database Connection Failure (`ECONNREFUSED`)**:
  - Verify PostgreSQL is running locally (`pg_isready` or check Windows Services).
  - Verify `DATABASE_URL` in `server/.env` contains the correct username, password, host, and port.
- **Port Conflict (Port 5000 or 5173 already in use)**:
  - If port 5000 is occupied, set `PORT=5001` in `server/.env` and update `VITE_API_URL=http://localhost:5001` in `client/.env`.
- **CORS Errors**:
  - Ensure `CLIENT_URL` in `server/.env` exactly matches the URL of your frontend (e.g. `http://localhost:5173` without trailing slash).
- **Rate Limit Triggered (HTTP 429)**:
  - The login and registration endpoints allow up to 20 requests per 15 minutes per IP to protect against brute force attacks. Wait 15 minutes or adjust `authLimiter` in `server/index.js` for testing.
- **Missing Cloudinary or Gemini Keys**:
  - If image uploads fail or AI Planner displays fallback checklists, verify that `CLOUDINARY_*` and `GEMINI_API_KEY` are defined in `server/.env`. The application remains functional without these optional services.

---

## Security Considerations

Security is engineered into every tier of Eventora:

1. **HTTP Headers & Content Security**:
   - `helmet` is configured on all API responses, setting strict `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and removing `X-Powered-By`.
2. **Tiered Rate Limiting**:
   - Global API ceiling: 500 requests / 15 min per IP.
   - Authentication ceiling: 20 requests / 15 min per IP on `/login` and `/register` to prevent credential stuffing.
   - AI endpoints: 30 requests / 15 min per IP on `/ai-chat` and 15 requests / 15 min on `/planner/generate` to prevent resource exhaustion.
3. **Strict Authorization & Mid-Session Revocation**:
   - Role boundaries (`admin`, `vendor`, `customer`) are enforced by `roleMiddleware` on protected endpoints.
   - `authMiddleware` checks `is_banned` directly in PostgreSQL on **every single request**, immediately terminating active sessions of suspended users without waiting for token expiration.
   - Socket.io connection handshakes independently check suspension status, disconnecting banned users from live channels.
4. **Parameterized SQL Queries**:
   - All database queries use parameterized placeholders (`$1`, `$2`), preventing SQL injection.
5. **No Secrets in Client or Version Control**:
   - Frontend bundles expose only public runtime URLs (`VITE_API_URL`). Server secrets (`JWT_SECRET`, database credentials, API keys) stay on the server.
   - Comprehensive `.gitignore` rules prevent committing `.env` files, certificates, and private configurations.
6. **Production Credential Enforcement**:
   - `server/config/db.js` strictly requires `DATABASE_URL` or `POSTGRES_PASSWORD`/`PGPASSWORD` when `NODE_ENV=production`. If missing, startup fails immediately without printing connection strings.
   - `server/index.js` validates that `JWT_SECRET` is defined with a minimum length of 16 characters in production environments.
7. **Demo Account & Seed Data Lockdown**:
   - Default demo admin login (`admin@example.com` / `password123`) is strictly rejected in production environments (`NODE_ENV=production`).
   - `server/db/seed.js` and `server/db/seed.sql` enforce guards preventing accidental seed data execution against production databases.

---

## Secret Rotation & Security Remediation

If credentials or keys were previously handled in development or shared environments, follow these manual rotation steps:

### 1. Cloudinary API Credentials Rotation
1. Log in to the [Cloudinary Console](https://console.cloudinary.com/).
2. Navigate to **Settings (Gear Icon) -> Access Keys**.
3. Under the active API key pair, click **Generate New Key**.
4. Update `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in your secure production `.env` or deployment secrets manager.
5. In the Cloudinary Console, disable or delete the older compromised access key once the new key is active.

### 2. Google Gemini API Key Rotation
1. Go to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
2. Locate the existing API key and click **Delete** (or click **Create API key** to create a replacement).
3. Copy the newly generated key.
4. Update `GEMINI_API_KEY` in your secure deployment environment or server `.env`.

### 3. JWT Signing Secret Rotation
1. Generate a cryptographically strong 256-bit random string:
   ```bash
   openssl rand -hex 32
   ```
2. Update `JWT_SECRET` in your `.env` or secret manager.
3. *Note*: Rotating `JWT_SECRET` immediately invalidates active sessions, requiring existing users to re-authenticate.

---

## Deployment Instructions

### Docker Production Deployment
1. Set production environment variables in `.env`:
   ```env
   POSTGRES_PASSWORD=<strong_random_db_password>
   JWT_SECRET=<strong_random_jwt_secret>
   CLIENT_URL=https://your-domain.com
   PUBLIC_API_URL=https://api.your-domain.com
   TRUST_PROXY=1
   ```
2. Build and launch containers:
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

### Reverse Proxy & HTTPS
- When hosting behind Cloudflare, AWS ALB, or Nginx, set `TRUST_PROXY=1` in the server environment so that rate limiters and IP logs reflect actual client IP addresses from `X-Forwarded-For`.
- Configure TLS/SSL certificates (e.g. via Let's Encrypt / Certbot) on your external reverse proxy.

---

## Future Improvements

- **Payment Gateway Integration**: Integration with Razorpay / Stripe for advance deposits and escrow milestone releases.
- **Automated Email & SMS Notifications**: Integration with SendGrid or Twilio for booking confirmations and schedule reminders.
- **Vendor Contract Signing**: Digital agreement generation and signing before booking confirmation.
- **Calendar Synchronization**: Export booking milestones directly to Google Calendar and iCal feeds.

---

## License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

---

## Author

**Ayan Ali**

- **GitHub**: [github.com/ayanali0249](https://github.com/ayanali0249)
- **LinkedIn**: [linkedin.com/in/ayanali0249](https://www.linkedin.com/in/ayanali0249)
- **Portfolio**: [ayan-ali-0249.netlify.app](https://ayan-ali-0249.netlify.app)
