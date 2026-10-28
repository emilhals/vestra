# 1. Modular monolith

**Status:** Accepted

## Context
Vestra has a handful of domains (auth, accounts, instruments, market data, trading, portfolio, watchlist) and will run as one small deployment. It's built by one person in about 8 weeks. Microservices would add network calls, distributed transactions and more to deploy and monitor, without any scaling need behind them.

## Decision
Build one Spring Boot application, split into domain modules under `no.vestra.*`. Modules talk to each other through public services or Spring application events, and never reach into another module's repositories. Spring Modulith or ArchUnit tests enforce the boundaries.

## Consequences
- A fill can update account, ledger and positions in one ACID transaction.
- Deployment, local development and debugging stay simple.
- Clear module boundaries mean a module (for example `marketdata`) could be split out later if needed.
- Discipline is needed: the boundary tests must run in CI, or the modules will slowly leak into each other.
