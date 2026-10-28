# 2. Session cookies over JWT

**Status:** Accepted

## Context
The browser reaches the API on the same origin as the SPA: Vercel rewrites `/api/*` to the backend ([ADR 0007](0007-hosting-vercel-render-neon.md)). The usual alternative is a JWT stored in `localStorage`. That exposes the token to any XSS, and logging out or revoking a token needs extra machinery.

## Decision
Use Spring Security with server-side sessions stored in Postgres (Spring Session JDBC):
- Session cookies are `HttpOnly`, `Secure` and `SameSite=Lax`.
- CSRF protection uses a cookie-to-header token.
- REST calls are authenticated with the session. The WebSocket goes straight to the backend without the cookie, so it only carries public price data ([ADR 0007](0007-hosting-vercel-render-neon.md)).

## Consequences
- JavaScript can never read the session token, and logout or revocation is immediate.
- Sessions live in Postgres, so they survive restarts and would work with more instances.
- The frontend must send the CSRF header on every request that changes data.
- If a separate-origin client (such as a mobile app) appears later, it would need token-based auth alongside sessions.
