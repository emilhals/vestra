# 7. Hosting: Vercel (frontend), Render (backend), Neon (database)

**Status:** Accepted. Replaces the earlier plan of one Fly.io container serving both the API and the SPA.

## Context
Each part goes on a host suited to it, with a free tier: Vercel for static frontends, Render for Docker web services, and Neon for serverless Postgres. The catch is that the frontend and the API now live on different domains (`*.vercel.app` and `*.onrender.com`). Both domains are on the Public Suffix List, so a cookie set by one is never sent to the other.

## Decision
- **Frontend on Vercel.** Vercel builds `frontend/` (project root directory = `frontend`). `frontend/vercel.json` does two things:
  - Rewrites `/api/*` to the Render backend, so from the browser's point of view REST calls are **same-origin**. Session cookies and CSRF ([ADR 0002](0002-session-auth-over-jwt.md)) work unchanged, and no CORS is needed for REST.
  - Sends every other path to `index.html`, for client-side routing.
- **Backend on Render.** A Docker web service (`backend/Dockerfile`), defined in `render.yaml`. It's a single instance ([ADR 0005](0005-single-instance-in-memory-state.md)) in the Frankfurt region, next to Neon's `eu-central-1`.
  - `server.forward-headers-strategy=framework` makes Spring see the original HTTPS scheme and host behind the proxies.
- **Database on Neon.** Spring connects through the **direct (non-pooled) endpoint** with `sslmode=require`, and the Hikari pool is capped at 5. One instance doesn't need PgBouncer, and the direct endpoint avoids transaction-pooling caveats with Flyway, `SELECT … FOR UPDATE` and session settings. Credentials come from the `SPRING_DATASOURCE_*` secrets on Render.
- **Live prices go to Render directly.** There's no evidence that Vercel's external rewrites proxy WebSocket upgrades, so the browser connects straight to `wss://vestra-api.onrender.com/ws`. That connection carries no session cookie, so:
  - Price topics (`/topic/prices/*`) are **public**. They contain no user data.
  - Allowed origins are set with `VESTRA_ALLOWED_ORIGINS`, which holds the Vercel URL.
  - If user-specific push events are needed later (such as order-fill notices), the client first fetches a short-lived ticket through the `/api` proxy and passes it when connecting. Until then, the UI refetches orders and the portfolio after placing an order.

## Consequences
- **Render's free tier sleeps after 15 minutes without traffic,** and waking takes roughly 30–60 s.
  - The first visit after idle is slow. The frontend should show a "waking up the server" state instead of an error.
  - The in-memory simulator stops while asleep and restarts from the last close when it wakes. That's acceptable ([ADR 0005](0005-single-instance-in-memory-state.md)).
  - **Scheduled jobs don't run while the service sleeps.** `HistoryIngestJob` and the snapshot job must also **catch up on startup**, filling in any missed days idempotently, instead of relying only on a nightly cron.
  - Upgrading Render to a paid instance (about $7/month) removes the sleep. Nothing else in the design changes.
- **Neon's free compute suspends when idle.** The first query after that is slower, and Hikari replaces stale connections.
- Every REST call takes an extra hop through Vercel. That's acceptable at this scale.
- With a custom domain (for example `vestra.example` + `api.vestra.example`), the two sites would be same-site. The WebSocket could then use the session cookie too, and the rewrite would become optional.
- CI only builds the backend image. Vercel and Render deploy automatically from the GitHub repo.
