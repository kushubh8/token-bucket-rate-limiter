# Token Bucket Rate Limiter

A small internal rate-limiting service built with Node.js and Express. It maintains an in-memory token bucket for each configured endpoint.

## Quick start

```bash
npm install
npm test
npm start
```

The service listens on port `3000` by default. Override it with `PORT`. Override the configuration file path with `RATE_LIMIT_CONFIG`.

## API contract

`POST /take/`

Request:

```json
{
  "endpoint": "GET /user/:id"
}
```

Accepted request (`200 OK`):

```json
{
  "remainingTokens": 4,
  "accepted": true
}
```

Rejected request (`200 OK`):

```json
{
  "remainingTokens": 0,
  "accepted": false
}
```

`remainingTokens` is the number of whole tokens remaining after the attempt. Fractional credit is retained internally but is not exposed as an immediately spendable request. Unknown route templates return `404`; malformed or missing endpoint input returns `400`.

## Configuration

`config.json` contains `rateLimitsPerEndpoint`. Each entry has:
- `endpoint`: exact static key supplied by the caller (for example `GET /user/:id`)
- `burst`: positive integer bucket capacity and initial token count
- `sustained`: finite non-negative number of tokens replenished per minute

Configuration is loaded and validated once during process startup. Invalid configuration fails fast rather than starting with partial or unsafe limits. Duplicate endpoint keys are rejected.

## Design decisions

### Token bucket and lazy refill

The bucket starts full. On each `take`, elapsed time is calculated and the bucket is refilled before consuming a token:

`tokens = min(burst, tokens + elapsedMilliseconds * sustained / 60000)`

This gives a 120 requests/minute rate one token every 500 ms. Fractional token balances are retained to avoid rounding drift. A request is accepted only when at least one full token is available.

There is no background timer. Lazy refill avoids per-route timers, timer lifecycle management, and unnecessary work when a route receives no traffic.

### Time source

The production composition root injects `performance.now()`, a monotonic clock. Wall-clock changes (NTP corrections, manual clock changes) therefore do not unexpectedly create or remove request credit. Tests inject a deterministic fake clock.

### Concurrency

In the specified single-process Node.js deployment, each `take()` operation is synchronous and contains no `await`. JavaScript executes that critical section to completion on the event loop, so two requests cannot interleave between reading and decrementing the in-memory token count.

This guarantee does **not** extend to Node cluster workers, multiple containers, or multiple service instances. If deployment topology changes, move bucket state and the consume operation into a shared atomic store (for example Redis with a Lua script, or a transactional database operation). A plain Redis GET followed by SET would not be safe under concurrency.

### Separation of concerns / SOLID

- `TokenBucket` owns algorithm state and calculations.
- `InMemoryBucketStore` owns bucket lookup and storage.
- `RateLimitService` coordinates configured endpoints and buckets.
- `ConfigLoader` owns file loading and validation.
- HTTP controller/routes own transport concerns.
- Dependencies (clock and bucket store) are injected, making core behavior deterministic and replaceable.

## Error behavior

| Situation | HTTP status | Behavior |
|---|---:|---|
| Valid configured endpoint, token available | 200 | `accepted: true` |
| Valid configured endpoint, empty bucket | 200 | `accepted: false` |
| Missing/invalid endpoint | 400 | Validation error |
| Unknown endpoint key | 404 | Configuration lookup error |
| Invalid JSON | 400 | JSON validation error |
| Unknown HTTP path | 404 | Route not found |

A rate-limit rejection is a successful evaluation of the policy, not an API failure, so it returns HTTP 200 with `accepted: false`. The caller's middleware decides whether to reject its original customer request (typically with HTTP 429).

## Tests

The Mocha/Chai suite covers:
- Initial capacity and consumption
- Empty bucket rejection
- Exact refill interval (120/minute = 500 ms/token)
- Capacity ceiling
- Zero refill
- Fractional refill preservation
- Independent route buckets
- Unknown endpoints and configuration validation
- HTTP request/response behavior

The HTTP integration tests use Node's built-in `http` module, so no additional test package such as Supertest is required.

## Known limitations and follow-ups

1. **Single instance only:** State is in memory and is lost on restart. Multi-instance deployment requires shared atomic storage.
2. **No dynamic configuration reload:** Changes take effect after restart. A future version could validate and atomically swap configuration, with an explicit policy for existing bucket state.
3. **No per-customer identity:** The exercise defines a bucket per route template, not per tenant, API key, or customer. Add a composite key only if product requirements change.
4. **No distributed coordination:** A Redis implementation must atomically refill, check, and decrement (e.g. one Lua script), not issue separate read/write commands.
5. **No authentication:** This is intentional per the internal-network assumption. Network policy and service-to-service controls should protect the endpoint in production.
6. **No metrics or tracing:** Add counters for allowed/denied requests, unknown endpoints, and bucket state diagnostics, while avoiding high-cardinality endpoint labels.
7. **Response contract:** `remainingTokens` is defined as whole tokens remaining after the attempt. Fractional refill credit is internal. The caller should use `accepted` as the authoritative decision.

## Suggested production extensions

- `BucketStore` interface backed by Redis and atomic Lua script.
- Structured logging, metrics, health/readiness endpoints.
- Graceful shutdown and configuration versioning.
- Optional `retryAfterMs` on rejection, calculated from the fractional balance and refill rate.
- Explicit policy for burst/sustained changes during live configuration reload.
