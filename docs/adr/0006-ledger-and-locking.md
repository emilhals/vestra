# 6. Append-only cash ledger and row locking for fills

**Status:** Accepted

## Context
A paper-trading app must never let cash go negative, sell shares it doesn't hold, or fill an order twice. This must hold under double-clicks, retries and fills from market orders and the limit matcher at the same time. Updating a single balance column offers no audit trail and is easy to get wrong.

## Decision
- **Exact money.** Money is `NUMERIC(19,4)` in Postgres and `BigDecimal` in Java. Floating point is never used for money.
- **Ledger.** Every cash movement is an append-only `cash_ledger` row with a signed amount: deposit, buy, sell, reserve or release. `accounts.cash_balance` and `accounts.reserved_cash` are cached values, updated in the same transaction as the ledger insert.
- **Locking.** Each fill runs in one transaction that locks the account row with `SELECT … FOR UPDATE`. Inside it the transaction:
  1. Re-checks available cash or shares.
  2. Inserts the execution and the ledger rows.
  3. Updates the position and the order status.
- **No double fills.** `executions.order_id` is unique, so an order can't be filled twice even if the locking logic has a bug.
- **Idempotency.** `POST /api/orders` requires an `Idempotency-Key`. Keys are stored per user with the request hash and the response. Repeating a request returns the stored response. Reusing a key with a different body returns `422`.

## Consequences
- Every balance can be audited and rebuilt from the ledger. A test checks that the ledger sum equals the cached balance.
- Locking at the account level serializes fills per account. That's fine at this scale, and accounts don't block each other.
- A Testcontainers concurrency test is mandatory for the trading module.
