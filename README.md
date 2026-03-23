# Japanese Car Market Platform — Technical Task Submission

A full-stack web application for scraping, storing, and browsing used car listings from a Japanese automotive marketplace ([carsensor.net](https://www.carsensor.net)). The system ingests Japanese-language listings, normalises and translates them into English, persists them in a relational database, and exposes them through a paginated, filterable REST API consumed by a Next.js frontend.

---

## Table of Contents

1. [Features](#1-features)
2. [Architecture](#2-architecture)
2. [Architecture](#2-architecture)
3. [Backend Design](#3-backend-design)
4. [Frontend Design](#4-frontend-design)
5. [Data Pipeline](#5-data-pipeline)
6. [Translation System](#6-translation-system)
7. [Authentication](#7-authentication)
8. [Design Decisions](#8-design-decisions)
9. [Known Issues & Improvements](#9-known-issues--improvements)

---

## 1. Features

- **End-to-end data pipeline**: Playwright scraper → HTML parser → normaliser → translator → PostgreSQL, running on a 1-hour schedule with retry logic
- **Crash-resilient scraping**: Redis checkpoint system allows mid-run resume without re-scraping from the beginning
- **Self-healing translation**: Unknown Japanese values are automatically translated via Google Translate and backfilled into existing records, with a persistent DB-backed dictionary that grows over time
- **Clean layered backend**: Route → Controller → Service → Repository separation with Pydantic schemas at the boundary
- **Typed API client**: All frontend↔backend communication is typed end-to-end with explicit camelCase mapping at the API boundary
- **Stateless JWT auth**: Secure admin-only access without server-side session storage
- **Paginated, filterable listing**: 12 filter dimensions, 4 sort fields, configurable page size

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│                    Next.js 14 (App Router)                   │
│         TypeScript · Tailwind CSS · shadcn/ui                │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / JSON
                    /api proxy
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    FastAPI Backend                            │
│                                                              │
│   ┌──────────┐   ┌──────────┐   ┌─────────────────────┐    │
│   │   Auth   │   │   Cars   │   │   Translations       │    │
│   │ /auth/*  │   │ /cars/*  │   │   (startup + job)   │    │
│   └──────────┘   └────┬─────┘   └─────────────────────┘    │
│                        │                                      │
│   ┌────────────────────▼──────────────────────────────┐     │
│   │                 PostgreSQL (SQLAlchemy)             │     │
│   │          cars table · translations table           │     │
│   └───────────────────────────────────────────────────┘     │
│                                                              │
│   ┌───────────────────────────────────────────────────┐     │
│   │              Scheduled Scrape Job                  │     │
│   │  Playwright → Parser → Normaliser → Repository     │     │
│   └───────────────────────────────────────────────────┘     │
│                                                              │
│   ┌───────────────────────────────────────────────────┐     │
│   │                    Redis                           │     │
│   │   scraper:latest_id · scraper:checkpoint           │     │
│   │   scraper:status                                   │     │
│   └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Design

### Project Structure

```
src/
├── main.py                  # FastAPI app, CORS, lifespan startup
├── core/
│   ├── db.py                # SQLAlchemy engine + session factory
│   ├── redis.py             # Async Redis client (singleton)
│   ├── auth.py              # JWT creation/verification
│   └── dependencies.py      # FastAPI dependency: require_admin
├── features/
│   ├── auth/                # Login / logout routes + controller
│   ├── cars/                # CRUD routes, service, repo, schema
│   │   └── scraper/         # Playwright scraper + data pipeline
│   └── translations/        # Translation storage + auto-translate
└── jobs/
    ├── cars_job.py          # Core scrape worker with retry logic
    ├── scheduler.py         # Infinite async loop (1 hr interval)
    └── state.py             # Redis state helpers
```

### Layer Responsibilities

```
Route → Controller → Service → Repository → DB
  │          │            │
  │     HTTP errors    business
  │     (404, 403)      logic
  │
Query params
validated by
FastAPI/Pydantic
```

Each feature follows the same vertical slice pattern: `routes.py` handles HTTP concerns only, `controller.py` raises HTTP exceptions, `service.py` handles business logic and serialisation, and `repository.py` owns all database queries.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | — | Returns JWT bearer token |
| `POST` | `/auth/logout` | Bearer | Stateless; clears client token |
| `GET` | `/cars` | Bearer | Paginated, filterable car list |
| `GET` | `/cars/{id}` | Bearer | Full detail for a single car |
| `GET` | `/health` | — | Liveness check |

### Filtering & Pagination

The `/cars` endpoint accepts the following query parameters:

**Filters:** `brand`, `body_type`, `transmission`, `min_price`, `max_price`, `min_year`, `max_year`, `min_mileage`, `max_mileage`, `is_new_like`, `non_smoker`, `damaged`

**Sorting:** `sort_by` (total_price | mileage | year | created_at), `sort_order` (asc | desc)

**Pagination:** `page` (default: 1), `page_size` (default: 20, max: 100)

`FILTER_FIELDS` in `schema.py` is the single source of truth for which fields are filterable. The route explicitly constructs the filter dict, so only filter parameters are ever passed to the controller — pagination and session context are kept separate.

---

## 4. Frontend Design

### Structure

```
app/
├── page.tsx           # Root — redirects to /cars or /login
├── layout.tsx         # AuthProvider wrapper
├── login/page.tsx     # Login form
└── cars/
    └── [id]/page.tsx  # Car detail view
lib/
├── backend-api.ts     # Typed API client (all fetch calls live here)
├── auth-context.tsx   # React context for auth state
└── types.ts           # Shared TypeScript interfaces
components/
├── car-list.tsx        # Main listing UI with filters
└── header.tsx          # Nav with logout
```

### API Client Design

All backend communication is centralised in `lib/backend-api.ts`. A generic `apiRequest<T>` function handles:

- Attaching `Authorization: Bearer <token>` headers
- Automatically redirecting to `/login` on 401 responses (when the request requires auth, to avoid redirecting on failed login attempts)
- Routing through the Next.js `/api` proxy to avoid CORS issues and Docker networking problems — falls back gracefully if `NEXT_PUBLIC_API_BASE_URL` points to a loopback address

snake_case-to-camelCase field mapping is handled at the API boundary in `getCars()` and `getCarById()`, keeping the rest of the application clean.

### Auth Flow

```
User submits login form
        │
        ▼
apiLogin() → POST /auth/login
        │
  token stored in
  localStorage
        │
        ▼
AuthContext.user set → component re-renders
        │
  All subsequent requests
  include Authorization header
        │
  On 401 → clearToken → redirect /login
```

---

## 5. Data Pipeline

Each scrape run flows through these stages:

```
Playwright (headless Chromium)
        │
        │  raw HTML pages
        ▼
Parser (BeautifulSoup)
        │
        │  raw dicts (Japanese strings)
        ▼
Normaliser
  ├── normalize_price()    万 → integer JPY
  ├── normalize_mileage()  万km → integer km
  ├── normalize_year()     era/Gregorian → int
  ├── normalize_specs()    spec table → typed fields
  ├── normalize_features() keyword scan → feature list
  └── normalize_condition() keyword scan → boolean flags
        │
        ▼
Translator (dictionary lookup)
  ├── brand (日産 → Nissan)
  ├── body_type (ハッチバック → hatchback)
  ├── transmission (CVT → cvt)
  └── colour (黒 → black)
        │
  Unknown values tracked
  → auto-translated via Google Translate
  → backfilled into existing rows
        │
        ▼
Repository (save_batch)
  session.merge() — upsert by car ID
        │
        ▼
PostgreSQL
```

### Checkpoint / Resume System

Redis holds three keys to make scraping robust across failures:

| Key | Purpose |
|-----|---------|
| `scraper:latest_id` | First car ID from the last successful run — used to stop when we've caught up |
| `scraper:checkpoint` | Last successfully saved car ID within a run — resume point after a crash |
| `scraper:status` | `running` / `idle` / `failed` |

On each run the worker checks for a checkpoint first. If found, it fast-forwards the stream to that car ID and continues from there. On completion, `latest_id` is updated to the newest car seen and the checkpoint is cleared. This means a crash mid-run loses at most one batch (20 cars) and restarts cleanly.

---

## 6. Translation System

Unknown Japanese values encountered during scraping are staged in a `translations` table with `translated = NULL`. On startup and after each scrape run, the system:

1. Calls `process_unknowns()` to fetch all untranslated rows
2. Translates each via `deep_translator` (Google Translate) with exponential back-off (1s, 2s, 3s)
3. Writes the translation back to the `translations` table
4. Calls `backfill_cars()` to apply the translation to any existing car rows that had the raw value stored

The in-memory dictionaries (`brand_map`, `color_map`, etc.) are hydrated from the database on startup, meaning translations approved in the DB take effect without a code deploy.

```
Scrape run encounters unknown value
          │
          ▼
track_unknown(type, value)  ← in-memory set
          │
    end of run
          │
          ▼
save_translations()  ← INSERT if not exists (won't overwrite approved)
          │
          ▼
get_untranslated()  ← rows with translated IS NULL
          │
          ▼
GoogleTranslator.translate() with retry + backoff
          │
     success?
    ┌──────┴──────┐
   yes            no
    │              │
update DB     log + retry
    │         next run
backfill_cars()
    │
load_translations_into_memory()
```

---

## 7. Authentication

The API uses stateless JWT bearer authentication. Credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) are environment variables. A successful `POST /auth/login` returns a signed JWT with a configurable expiry (default 60 minutes). All `/cars` routes require a valid token via the `require_admin` FastAPI dependency, which verifies the JWT and checks the `sub` claim matches `ADMIN_USERNAME`.

Logout is intentionally stateless — the backend returns 200 and the client discards the token. This is appropriate for a single-admin internal tool and avoids the complexity of a token blocklist.

---

## 8. Design Decisions

**Vertical slice architecture** — each feature (`auth`, `cars`, `translations`) owns its own routes, controller, service, repository, and schema. This makes features independently navigable and avoids cross-feature coupling.

**Synchronous SQLAlchemy for the API, async for the scraper** — the cars API routes use a synchronous session because the ORM queries are simple and blocking. The scraper uses `asyncio.to_thread()` to run DB writes off the event loop, keeping Playwright's async context clean.

**In-memory translation cache** — rather than querying the `translations` table on every normalisation call, dictionaries are loaded into module-level dicts at startup. This makes the hot path (normalising thousands of cars per scrape) allocation-free. The trade-off is that new translations require calling `load_translations_into_memory()` to take effect, which is done explicitly after each translation batch.

**`session.merge()` for upserts** — the scraper may revisit the same car IDs across runs. Using `merge()` rather than `add()` means re-scraping a listing updates it rather than raising a unique constraint violation.

**Next.js API proxy** — the frontend routes all backend calls through `/api` (a Next.js route handler acting as a reverse proxy). This avoids CORS preflight requests in development and works correctly in Docker where the backend is not reachable on `localhost` from the browser.

**Explicit filter dict construction** — query parameters passed to the `/cars` endpoint are explicitly assembled into a `filters` dict before being passed to the controller. This makes the contract between layers clear and avoids leaking FastAPI internals (`session`, `sort_by`, etc.) into the filter logic.

---

## 9. Known Issues & Improvements

**Structured logging** — replace all `print()` calls with Python's `logging` module (or `structlog`), with log levels and JSON output for production observability.

**Async SQLAlchemy** — the API routes currently use a synchronous session in a sync route handler. Migrating to `AsyncSession` would allow the web workers to handle concurrent requests without blocking threads, which matters under load.

**Background task for translations** — `process_unknowns()` is called synchronously at the end of each scrape run, potentially blocking the event loop for several seconds while making multiple HTTP calls to Google Translate. Moving this to a separate async task or a dedicated background worker would be cleaner.

**Rate limiting on the API** — there is currently no rate limiting on the `/cars` endpoints. Adding per-IP or per-token rate limiting (e.g. via `slowapi`) would protect against abusive clients.

**Token refresh / revocation** — the current JWT implementation has no refresh mechanism. A short-lived access token paired with a refresh token stored in an `HttpOnly` cookie would be more secure, and a Redis-backed blocklist would allow immediate revocation on logout.

**Scraper robustness** — the scraper currently breaks out of the page loop on any navigation error. A per-page retry with back-off would be more resilient against transient network failures, particularly given the random sleep between pages already in place.

**Environment validation at startup** — required environment variables (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`) are accessed with `os.environ[...]` which raises `KeyError` at runtime. Using `pydantic-settings` to validate the environment at startup would surface misconfigurations immediately and provide typed access throughout the codebase.

**Frontend error states** — the car list component does not appear to handle loading errors from the API (e.g. network failure, 500 responses). Adding an error boundary and a retry affordance would improve resilience.