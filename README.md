# Vestra

A full-stack paper-trading and investment dashboard for Oslo Børs stocks. Users get a NOK paper account, follow live (simulated) prices, place market and limit orders, and track how their portfolio performs.

> Inspired by Nordnet's investing experience. Vestra is an independent portfolio project, not affiliated with or endorsed by Nordnet.

**Live demo:** _coming soon_ · **Demo login:** _coming soon_

<!-- Screenshots go here once the UI exists -->

## MVP features

- **Accounts and login.** Register and log in. Each new user gets a paper account with 100,000 NOK. A seeded demo user lets visitors try the app without signing up.
- **Instruments.** Search about 30–50 Oslo Børs stocks and ETFs. Each instrument page shows price, daily change and a chart (1D / 1M / 1Y / Max).
- **Live prices.** Simulated price ticks are pushed to the browser over WebSockets.
- **Paper trading.**
  - Market and limit orders, buy and sell.
  - Order states: pending, filled, cancelled, rejected.
  - Open limit orders can be cancelled.
  - Orders are rejected when cash or shares are insufficient.
- **Portfolio dashboard.**
  - Total value, cash, today's change, realized and unrealized gain/loss.
  - Holdings table, allocation chart, portfolio value over time.
- **Transactions.** Order history and cash history.
- **Watchlist.** One per user, with live prices.

### Not in the MVP

- Multiple currencies and FX
- Market opening hours
- Dividends
- Time-weighted return
- Several accounts per user
- Price alerts
- Social features
- Mobile app

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, TypeScript, Vite, TanStack Query, React Router, Tailwind CSS |
| Charts | TradingView `lightweight-charts` (prices), Recharts (allocation) |
| API client | Generated from the backend's OpenAPI spec (`openapi-typescript`) |
| Backend | Java 25, Spring Boot 4, Gradle (Kotlin DSL) |
| Persistence | PostgreSQL 16, Spring Data JPA, Flyway |
| Auth | Spring Security, session cookies (Spring Session JDBC), CSRF protection |
| Real-time | Spring WebSocket + STOMP |
| Testing | JUnit 5, Testcontainers, MockMvc · Vitest, React Testing Library · Playwright |
| Infrastructure | Vercel (frontend), Render (backend, Docker), Neon (Postgres), GitHub Actions, Docker Compose locally |

## Running locally

You need JDK 25, Node 24+ and Docker (with the Compose plugin).

```bash
cd backend && ./gradlew bootRun     # API on :8080, starts Postgres via Docker Compose
cd frontend && npm install && npm run dev   # UI on :5173
```

## Documentation

- [Architecture](docs/architecture.md)
- [Architecture decision records](docs/adr/)
- [Roadmap](docs/roadmap.md)
