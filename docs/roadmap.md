# Roadmap (8 weeks)

Deploy in week 1 and keep `main` deployable, so every week ends with something live.

| Week | Theme | Done when |
|---|---|---|
| 1 | Foundations | Repo layout (`backend/`, `frontend/`, `e2e/`) is in place. Docker Compose runs Postgres. The Spring Boot and Vite skeletons build. Flyway runs a first migration. CI builds and tests both apps. A hello-world version is **deployed**. **Provider spike done**: XOSL coverage checked, provider (or CSV fallback) and instrument list chosen and recorded in ADR 0003. |
| 2 | Auth, accounts, instruments | Register, log in and log out work with sessions and CSRF. A new user gets an account with 100,000 NOK through a ledger deposit. Instruments are seeded. `HistoryIngestJob` fills `price_bar`. The search API and page work. Module boundary tests run in CI. |
| 3 | Instrument page and watchlist | The instrument page shows price, change and a candlestick/line chart (1M / 1Y / Max) from `price_bar`. Watchlist add, remove and list work. The OpenAPI-generated client is used across the frontend. |
| 4 | Market orders | `POST /api/orders` works with `Idempotency-Key`. Market buys and sells execute in one locked transaction, writing ledger entries and updating positions. Rejections work. The concurrency test passes. The UI has an order form, order history and cash history. |
| 5 | Live prices and limit orders | `PriceSimulator` produces ticks to the cache and `PriceTickEvent`. The STOMP broadcast is live on the instrument page and watchlist. The 1D chart is built from ticks. Limit orders reserve cash or shares, `LimitOrderMatcher` fills them, and users can cancel open orders. |
| 6 | Portfolio dashboard | The dashboard shows live value, cash, today's change, realized and unrealized gain/loss, a holdings table and an allocation chart. The daily snapshot job feeds the value-over-time chart. |
| 7 | Quality | Playwright covers registration, buying, the limit order lifecycle and the dashboard. Loading, error and empty states are in place. The layout works on phones. An accessibility pass is done. |
| 8 | Launch | Production hardening: Actuator health checks, structured logs, rate limiting on auth endpoints. A demo account is seeded. The README has screenshots, a live link, a demo login and the architecture diagram. Remaining time is buffer. |

## After the MVP (stretch goals)
- Multiple currencies (USD stocks, FX), see [ADR 0004](adr/0004-single-currency-nok.md)
- Market opening hours
- Dividends
- Time-weighted return
- Price alerts
- Running more than one instance, see [ADR 0005](adr/0005-single-instance-in-memory-state.md)
