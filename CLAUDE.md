# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Vestra** is a full-stack paper-trading and investment dashboard for Oslo Børs stocks, inspired by Nordnet (not affiliated). It's a portfolio project showing frontend, backend, database and system design skills. Don't use Nordnet's name, logo or colors in the app itself.

Read these before making design decisions:
- `docs/architecture.md`: modules, data flow, data model, trading rules
- `docs/adr/`: decision records. Add a new ADR when changing one of these decisions.
- `docs/roadmap.md`: the week-by-week plan and the "done when" criteria

**Status:** planning only. No application code exists yet.

## Commands

_To be filled in when the skeleton exists (roadmap week 1)._ Planned tools: Gradle (Kotlin DSL) for `backend/`, npm + Vite for `frontend/`, Playwright in `e2e/`, Docker Compose for Postgres.

## Planned layout

- `backend/`: Spring Boot 3, Java 21, base package `no.vestra`.
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
