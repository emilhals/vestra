# 5. Single instance with in-memory price state

**Status:** Accepted

## Context
The price simulator, latest-price cache, today's ticks and limit-order matching are all driven by in-process events. Running them in memory on one instance is simple and fast. Vestra's expected load fits easily on one small instance.

## Decision
Run exactly one app instance. The latest-price cache and today's ticks live in memory. `PriceSimulator`, `PriceBroadcaster` and `LimitOrderMatcher` all run in that instance.

## Consequences
- No Redis or message broker needed. The data flow is easy to follow and test.
- On restart, today's ticks are lost and prices restart from the last close. That's acceptable for a demo.
- **What breaks with more than one instance:**
  - Each instance would run its own simulator, so users on different instances see different prices.
  - STOMP subscribers on one instance wouldn't get ticks generated on another.
  - Each instance's matcher would try to fill the same limit orders. Row locking prevents a double fill, but the work would be wasted and conflicts would occur.
- **How to scale out later:**
  - **Ticks:** make one instance the price leader (a Postgres advisory lock). It publishes ticks through Redis pub/sub or Postgres `LISTEN/NOTIFY`, and every instance relays them to its own STOMP clients. Alternatively, use an external STOMP broker relay (such as RabbitMQ).
  - **Matching:** run it only on the leader, or have workers claim orders with `SELECT … FOR UPDATE SKIP LOCKED`.
  - **Cache:** move the latest-price cache to Redis.
