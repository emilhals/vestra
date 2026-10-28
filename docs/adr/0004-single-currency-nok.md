# 4. Single currency: NOK

**Status:** Accepted

## Context
Supporting several currencies would require FX rates, converting at trade time and at valuation time, gain/loss split by currency, and more columns everywhere. None of this is needed to show the core skills.

## Decision
The MVP supports NOK only:
- Instruments are limited to Oslo Børs stocks and ETFs priced in NOK.
- Accounts hold NOK cash.
- Money columns don't store a currency.

## Consequences
- The data model and valuation logic stay simple.
- Instruments are limited to Oslo Børs. That also depends on data coverage ([ADR 0003](0003-hybrid-market-data.md)).
- Adding currencies later means adding a `currency` column to `instruments`, `accounts` and `cash_ledger`, plus an FX rate table. This is the first stretch goal after the MVP.
