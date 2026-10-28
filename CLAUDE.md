# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Vestra** is a full-stack paper-trading and investment dashboard for Oslo Børs stocks, inspired by Nordnet (not affiliated). It's a portfolio project showing frontend, backend, database and system design skills. Don't use Nordnet's name, logo or colors in the app itself.

Read these before making design decisions:
- `docs/architecture.md`: modules, data flow, data model, trading rules
- `docs/adr/`: decision records. Add a new ADR when changing one of these decisions.
- `docs/roadmap.md`: the week-by-week plan and the "done when" criteria

**Status:** week-1 skeleton. The backend serves `GET /api/status` and Actuator. The frontend has one page that calls it. The `instruments` table exists (Flyway V1), with no entity yet.

## Commands

Backend (Java 25 / Spring Boot 4.1; run from `backend/`):
- `./gradlew bootRun`: starts the app on :8080. Spring Boot's Docker Compose support starts Postgres from `../docker-compose.yml` automatically.
- `./gradlew build`: compile and run all tests. Tests use Testcontainers, so Docker must be running.
- `./gradlew test --tests 'no.vestra.common.api.StatusControllerTests'`: run one test class. Append `.methodName` for a single test.
- `./gradlew bootTestRun`: runs the app against a throwaway Testcontainers Postgres (`TestVestraApplication`).

Frontend (run from `frontend/`):
- `npm run dev`: Vite on :5173. It proxies `/api`, `/actuator` and `/ws` to :8080, so the backend must be running.
- `npm run lint` runs oxlint. `npm run typecheck`, `npm test` (Vitest) and `npm run build` are the other checks.
- `npx vitest run src/features/home/HomePage.test.tsx`: run one test file. Add `-t "name"` for a single test.

## Hosting ([ADR 0007](docs/adr/0007-hosting-vercel-render-neon.md))

- **Frontend on Vercel** (root directory `frontend/`). `frontend/vercel.json` rewrites `/api/*` to the Render backend, so REST calls are same-origin and session cookies work. All other paths go to `index.html`.
- **Backend on Render**, built from `backend/Dockerfile` (`docker build -t vestra-api backend`) and defined in `render.yaml`. It runs one instance on the free tier, which **sleeps when idle**. Scheduled jobs must therefore also catch up on startup.
- **Database on Neon**, through the direct (non-pooled) endpoint with `sslmode=require`. The URL and credentials come from the `SPRING_DATASOURCE_*` env vars.
- **WebSocket.** Vercel can't proxy WebSockets, so the browser connects to Render directly. That connection has no session, so price topics are public. `VESTRA_ALLOWED_ORIGINS` lists the allowed frontend origins.

CI (`.github/workflows/ci.yml`) runs the backend build, the frontend checks and the backend image build. Vercel and Render deploy automatically from GitHub.

## Planned layout

- `backend/`: Spring Boot 4, Java 25, base package `no.vestra`.
  - Domain modules: `auth`, `account`, `instrument`, `marketdata`, `trading`, `portfolio`, `watchlist`, `common`. Each has `api/`, `domain/` and `infra/` subpackages.
  - Flyway migrations live in `backend/src/main/resources/db/migration`.
- `frontend/`: React, TypeScript, Vite, TanStack Query, Tailwind.
  - `src/features/<feature>` holds each feature's components, hooks and API calls.
  - `src/components` holds shared UI.
  - `src/lib` holds the generated API client, the WebSocket client and formatters.
- `e2e/`: Playwright tests.
- `docs/`: architecture, ADRs, roadmap.

## Rules that must hold

- **Module boundaries:** modules talk only through public services or Spring events. Never use another module's repository. Boundary tests (Spring Modulith or ArchUnit) enforce this.
- **Money:**
  - `NUMERIC(19,4)` / `BigDecimal` everywhere. Never `double` or `float`.
  - NOK is the only currency. Money columns don't store a currency.
  - Quantities are whole shares.
- **Cash ledger:** `cash_ledger` is append-only. `accounts.cash_balance` and `reserved_cash` are cached values, updated in the same transaction as the ledger insert.
- **Fills:**
  - One transaction per fill. It locks the account row with `SELECT … FOR UPDATE`, re-checks cash or shares, then writes the execution, ledger, position and order status.
  - `executions.order_id` is unique (no partial fills in the MVP).
- **Idempotency:** `POST /api/orders` requires an `Idempotency-Key` header, stored per user in `idempotency_keys`.
- **Market data:**
  - The external provider is only called by the nightly `HistoryIngestJob`, never on a user request.
  - Live prices come from `PriceSimulator` and the in-memory cache, delivered over STOMP `/topic/prices/{symbol}`.
- **Single instance:** in-memory state assumes one app instance ([ADR 0005](docs/adr/0005-single-instance-in-memory-state.md)).
- **Auth:** session cookies (Spring Session JDBC) with CSRF. No JWTs in `localStorage`.
- **API types:** the frontend uses the client generated from the backend's OpenAPI spec. Don't hand-write DTO types.
- **Database schema:** change it only by adding a new Flyway migration. Never edit a migration that has already been applied.
