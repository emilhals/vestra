# Architecture

## Overview

Vestra is a **modular monolith** ([ADR 0001](adr/0001-modular-monolith.md)): a React single-page app talking to one Spring Boot application backed by PostgreSQL. The live price feed and limit-order matching run in memory on that single instance ([ADR 0005](adr/0005-single-instance-in-memory-state.md)).

```
 Browser (React SPA)
   │  REST /api/*  (session cookie + CSRF)  WebSocket /ws (STOMP)
   ▼                                         ▲
 ┌──────────────────── Spring Boot app ─────────────────────┐
 │ auth      account     instrument    watchlist            │
 │ trading ──► portfolio ◄── marketdata ──► PriceBroadcaster │
 │   ▲                         │  ▲                         │
 │   └── LimitOrderMatcher ◄───┘  │ PriceSimulator (ticks)  │
 │                                │ HistoryIngestJob (cron) │
 └───────────────┬────────────────┴─────────────────────────┘
                 ▼                              ▼
            PostgreSQL                  External market-data API
```

## Modules

Base package `no.vestra`. Each module has `api/` (controllers, DTOs), `domain/` (entities, services) and `infra/` (repositories, external clients). Modules talk to each other through public services or Spring application events, never by reaching into another module's repositories. Spring Modulith or ArchUnit tests enforce this.

| Module | Owns |
|---|---|
| `auth` | Security config, registration, login/logout, session setup |
| `account` | Accounts, cash ledger, cash balance |
| `instrument` | Instrument catalog and search |
| `marketdata` | History ingest, price history queries, price simulator, latest-price cache, WebSocket broadcasting |
| `trading` | Orders, idempotency, execution, limit-order matching |
| `portfolio` | Positions, valuation, gain/loss, daily snapshots |
| `watchlist` | Per-user watchlist |
| `common` | Error handling, money helpers, shared config |

## Market data flow

Vestra mixes real and simulated data ([ADR 0003](adr/0003-hybrid-market-data.md)):

1. **`HistoryIngestJob`** runs nightly. It fetches daily price bars for every instrument from the external provider and upserts them into `price_bar`. The provider is **never** called on a user request, so free-tier rate limits don't affect users.
2. **`PriceSimulator`** starts each instrument from its latest real close. Every 1–2 seconds it produces a new price with geometric Brownian motion (per-instrument drift and volatility). It writes the price to the in-memory **latest-price cache** and publishes a `PriceTickEvent`.
3. **`PriceBroadcaster`** listens for `PriceTickEvent` and sends the tick to STOMP topic `/topic/prices/{symbol}`.
4. **`LimitOrderMatcher`** listens for `PriceTickEvent` too. It checks that instrument's open limit orders and executes those whose limit has been reached.
5. The frontend subscribes to the topics of instruments currently on screen.

Chart data comes from `price_bar`. The 1D chart is built from today's simulated ticks, kept in memory.

## Trading

### Order lifecycle

```
           ┌──────────► FILLED
 PENDING ──┼──────────► CANCELLED   (user cancels an open limit order)
           └──────────► REJECTED    (insufficient cash/shares, invalid order)
```

- **Market orders** execute immediately at the latest cached price.
- **Limit orders** stay `PENDING` until a tick reaches the limit: a buy fills when price ≤ limit, a sell when price ≥ limit. They fill at the tick price.
- MVP orders fill completely or not at all (no partial fills).
- Sell orders can't exceed the shares held. Shares already reserved by open limit sells count as unavailable.
- Buy limit orders reserve cash when placed, so an account can't overcommit across open orders.

### Correctness rules

These are the core of the project ([ADR 0006](adr/0006-ledger-and-locking.md)):

- **Money** is `NUMERIC(19,4)` in Postgres and `BigDecimal` in Java. Never `double` or `float`. Quantities are whole shares (`BIGINT`).
- **Cash ledger.** Every cash movement is a row in `cash_ledger` (deposit, buy, sell, reservation, release). Rows are never updated or deleted. `accounts.cash_balance` is a cached sum updated in the same transaction.
- **One transaction per fill.**
  1. Lock the account row with `SELECT … FOR UPDATE`.
  2. Re-check cash or shares.
  3. Insert the `executions` row and the ledger entry.
  4. Update `positions`, then set the order to `FILLED`.

  Anything that fails rolls back the whole fill.
- **Idempotency.** `POST /api/orders` requires an `Idempotency-Key` header. The key and response are stored in `idempotency_keys`, unique per user, so a retried request returns the original result instead of creating a second order.
- **Concurrency test.** An integration test (Testcontainers) sends many orders at once against one account. It proves cash never goes negative and the ledger sum always matches the cached balance.

## Auth

[ADR 0002](adr/0002-session-auth-over-jwt.md):

- Spring Security with form/JSON login and server-side sessions stored in Postgres (Spring Session JDBC).
- Cookies are `HttpOnly`, `Secure` and `SameSite=Lax`.
- CSRF protection uses a cookie-to-header token that the SPA reads and sends back.
- The WebSocket handshake goes through the same security filter chain, so a STOMP connection belongs to the logged-in session.
- The frontend and API are served from the same origin, so CORS isn't needed in production.

## Data model

All IDs are `UUID` unless noted. All timestamps are `timestamptz`. Money columns are `NUMERIC(19,4)`. The only currency is NOK ([ADR 0004](adr/0004-single-currency-nok.md)).

| Table | Key columns | Constraints / notes |
|---|---|---|
| `users` | id, email, password_hash, display_name, created_at | `email` unique |
| `accounts` | id, user_id, cash_balance, reserved_cash, version, created_at | One account per user in the MVP (`user_id` unique) |
| `instruments` | id, symbol, name, isin, type (STOCK/ETF), sector, active | `symbol` unique |
| `price_bar` | instrument_id, date, open, high, low, close, volume | PK (`instrument_id`, `date`) |
| `orders` | id, account_id, instrument_id, side (BUY/SELL), type (MARKET/LIMIT), quantity, limit_price, status, reject_reason, created_at, updated_at | Index on (`instrument_id`, `status`) for matching |
| `executions` | id, order_id, price, quantity, executed_at | `order_id` unique (no partial fills) |
| `positions` | account_id, instrument_id, quantity, reserved_quantity, avg_cost, realized_pnl | PK (`account_id`, `instrument_id`) |
| `cash_ledger` | id (BIGSERIAL), account_id, type, amount (signed), order_id, created_at | Append-only. Index on (`account_id`, `created_at`) |
| `portfolio_snapshots` | account_id, date, cash, holdings_value, total_value | PK (`account_id`, `date`) |
| `watchlist_items` | user_id, instrument_id, added_at | PK (`user_id`, `instrument_id`) |
| `idempotency_keys` | user_id, key, request_hash, response_status, response_body, created_at | PK (`user_id`, `key`). Expires after 24 h |

Spring Session creates its own `spring_session` tables through its schema scripts, managed by Flyway.

## Portfolio valuation

- **Live value** = cash + Σ(position quantity × latest cached price).
- **Unrealized gain/loss** = Σ(quantity × (latest price − avg_cost)).
- **Realized gain/loss** accumulates in `positions.realized_pnl` on each sell, using the average cost method.
- **Today's change** compares live value with yesterday's snapshot.
- **History.** A daily job values each account at that day's close and writes a `portfolio_snapshots` row, which feeds the value-over-time chart.

## Deployment

- **Docker Compose** runs Postgres locally (plus the app, for prod-like runs).
- **GitHub Actions** builds and tests both apps on every push.
- In production, one app container on Fly.io or Railway serves both the API and the built SPA, with managed Postgres alongside.
- Spring Boot Actuator provides health checks.
- Logs are structured JSON.
