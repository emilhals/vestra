# 3. Hybrid market data: real history, simulated live ticks

**Status:** Accepted. The provider is chosen in the week-1 spike.

## Context
A trading dashboard needs believable historical charts and prices that move live. Free market-data plans have tight rate limits, delayed or no streaming, and uncertain coverage of Oslo Børs. A fully simulated market looks fake. Using a real API for everything breaks under rate limits.

## Decision
- **History is real.** A nightly `HistoryIngestJob` fetches daily price bars from an external provider into `price_bar`. The provider is never called on a user request.
- **Live prices are simulated.** `PriceSimulator` starts each instrument from its latest real close and generates ticks every 1–2 s with geometric Brownian motion. Ticks go to an in-memory cache, then to a `PriceTickEvent`, which feeds the STOMP broadcast and limit-order matching.
- The provider sits behind a `MarketDataProvider` interface, so it can be swapped.

### Week-1 spike: choosing a provider
Check which free plan covers the chosen ~30–50 Oslo Børs tickers (XOSL / `.OL`) with daily history, for example Twelve Data, EODHD or Finnhub. Finnhub's free plan is mostly US stocks.

**Fallback:** if no free plan covers XOSL well enough, do a one-time CSV import of daily history (a `CsvHistoryProvider` behind the same interface). Live prices are simulated either way, so the user experience doesn't change.

## Consequences
- Charts show real price history, and the app works under any rate limit.
- The live prices are made up. The UI should say so (for example a "simulated live prices" label).
- After restarts and each nightly ingest, the simulator restarts from the latest real close.
