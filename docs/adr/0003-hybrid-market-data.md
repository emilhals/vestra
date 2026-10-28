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

#### Spike findings (2026-10-28, desk research only, not yet tested with API keys)

| Provider | Free plan, as reported | Fit for XOSL |
|---|---|---|
| Finnhub | Free plan is US-only. Historical candles reportedly moved to paid plans, even for US stocks. | Ruled out |
| Twelve Data | Lists XOSL as an end-of-day exchange. Free plan is about 800 calls/day, but several reports say non-US symbols need a paid plan. | Unlikely. Test one `.OL`/XOSL symbol to confirm. |
| EODHD | Free key: 20 calls/day, end-of-day data only, about 1 year of history. Free-plan coverage of `.OL` tickers isn't documented. | Best candidate. 40 tickers would take a 2-day backfill, and the nightly updates (1 call per ticker) wouldn't fit in 20 calls/day. |

**Still to do:**
1. Register free keys and request one Oslo ticker (for example `EQNR`) from Twelve Data and EODHD.
2. Decide between EODHD with a one-time backfill (about 1 year of history; nightly updates for only some tickers, or none) and the CSV fallback.
3. Write down the final list of instruments.

## Consequences
- Charts show real price history, and the app works under any rate limit.
- The live prices are made up. The UI should say so (for example a "simulated live prices" label).
- After restarts and each nightly ingest, the simulator restarts from the latest real close.
