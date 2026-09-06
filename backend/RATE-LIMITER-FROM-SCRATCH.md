# Rate Limiter From Scratch

This is a learning-only implementation. The application does not import or
use these classes. Production login protection remains in
`src/modules/auth/login-rate-limiter.ts`, backed by Redis.

The goal here is to understand the algorithm before depending on a shared
store or a library.

## What a rate limiter does

A rate limiter answers one question:

> Should this key be allowed to spend one more unit of work right now?

The key can represent anything that should have its own budget:

- `ip:203.0.113.10`
- `user:user-123`
- `login:203.0.113.10:person@example.com`
- `api-key:abc123`

Every decision returns the same shape:

```ts
{
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAtMs: number;
}
```

`retryAfterMs` is the important value when a request is blocked. It tells the
caller how long to wait. `resetAtMs` describes the next reset point for the
algorithm; for a token bucket, it means the time when the bucket becomes full.

## The shared design

All three implementations use this interface:

```ts
interface RateLimiter {
  consume(key: string, cost?: number): RateLimitDecision;
  reset(key: string): void;
  clear(): void;
}
```

`cost` is normally `1`. A cost lets one expensive operation spend several
units at once. The learning implementation requires the cost to be a positive
integer no greater than the configured limit or capacity.

The clock is injected instead of calling `Date.now()` directly inside tests.
That makes time controllable:

```ts
let now = 0;

const limiter = new TokenBucketRateLimiter({
  capacity: 5,
  refillTokens: 1,
  refillIntervalMs: 1_000,
  now: () => now,
});
```

## The three algorithms

| Algorithm          | State per key               | Strength                                | Main weakness                             |
| ------------------ | --------------------------- | --------------------------------------- | ----------------------------------------- |
| Fixed window       | Counter and window start    | Smallest and easiest to understand      | Boundary bursts                           |
| Sliding-window log | Timestamp/cost entries      | Accurate rolling limit                  | Memory grows with recent traffic          |
| Token bucket       | Tokens and last refill time | Efficient and handles controlled bursts | Requires refill math and fractional state |

### 1. Fixed window

`FixedWindowRateLimiter` gives every key a budget for a calendar-like window
that starts when the key first appears.

For a limit of 3 requests per 1,000 ms:

```text
time:       0     100   200              999   1000
requests:   allow allow allow             deny  new window
budget:     2       1     0                0      2
```

The state is only:

```text
key -> { windowStartMs, consumed }
```

When the current time reaches `windowStartMs + windowMs`, the old state is
discarded and a new window begins.

Why the boundary problem exists:

```text
window A:  [995, 1000)  -> 3 requests
window B:  [1000, 2000) -> 3 requests
```

Six requests can arrive in a few milliseconds while still satisfying both
windows. Fixed windows are acceptable for simple quotas, but that burst can be
surprising for abuse protection.

Complexity:

- Time: O(1) per decision
- Memory: O(number of active keys)

### 2. Sliding-window log

`SlidingWindowLogRateLimiter` keeps the recent accepted entries for each key.
An entry stores a timestamp and a cost:

```text
key -> [
  { timestampMs: 100, cost: 1 },
  { timestampMs: 300, cost: 2 }
]
```

For a 1,000 ms window at time 1,000, the active interval is:

```text
(0, 1000]
```

Entries at timestamp `0` expire exactly at `1000`; entries at timestamp `1`
remain. The implementation prunes expired entries before making a decision.

If a request is blocked, it calculates how many old cost units must expire and
returns the exact time when enough capacity will be available. It does not
assume that the first old entry is always enough.

Complexity:

- Time: O(number of expired entries) for pruning, plus the entries inspected
  to calculate a retry point
- Memory: O(recent entries per key)

This is the most faithful implementation of “N requests during any rolling
window,” but a busy key can create a large recent-history list.

### 3. Token bucket

`TokenBucketRateLimiter` models a bucket that holds tokens. A request spends
tokens; time continuously adds them back up to the capacity.

Example: capacity 3, refill 1 token per second.

```text
start:       [3 tokens]  -> request cost 2 -> [1 token]
after 500ms: [1.5 tokens]
request 1:   allowed     -> [0.5 tokens]
next request: blocked     -> wait 500ms
```

The state is constant-sized:

```text
key -> { tokens, lastRefillMs }
```

The refill calculation is:

```text
refillRate = refillTokens / refillIntervalMs
elapsed = now - lastRefillMs
tokens = min(capacity, tokens + elapsed * refillRate)
```

When there are not enough tokens:

```text
retryAfterMs = ceil((cost - tokens) / refillRate)
```

Complexity:

- Time: O(1) per decision
- Memory: O(number of active keys)

Token bucket is usually the best general-purpose choice when an API should
allow a small burst but still enforce a long-term rate. It is not automatically
the best choice for every policy; an exact rolling-window rule may be clearer
with a sliding log.

## Important edge cases

### Boundary timestamps

The sliding log treats its active interval as `(now - windowMs, now]`. An
entry exactly at the left boundary has expired. This avoids keeping a request
for more than the configured duration.

### Request costs

All implementations reject a cost of zero, a fractional cost, or a cost above
the configured limit/capacity. Rejecting an impossible request is clearer than
returning a retry time that could never succeed.

### Empty keys

An empty key is rejected. Callers are responsible for choosing and normalizing
their key. For example, an email-based key should be lowercased before it is
passed to the limiter.

### Clock behavior

The algorithms assume the injected clock moves forward. The token bucket does
not remove tokens if the clock moves backward; it waits until the clock catches
up. Real distributed systems should use a consistent time source when
multiple machines make decisions.

### Cleanup

This learning module uses lazy cleanup:

- Fixed windows are replaced when accessed after expiry.
- Sliding logs prune old entries when a key is accessed.
- Token buckets keep only two numbers per active key.

There is no background cleanup job. A production in-memory limiter might add
one, while Redis normally handles expiry with TTL.

## How this differs from the production Redis limiter

The learning implementations are process-local. If two backend processes each
have a `Map`, they each see only their own traffic. Restarting a process also
loses its counters.

The production login limiter uses Redis as the shared counter store. Redis lets
multiple backend instances coordinate and uses an atomic Lua-backed operation
to increment a counter and apply its expiration. The algorithm and the storage
problem are separate ideas:

```text
algorithm:  how the budget behaves
storage:    where all instances keep the budget
```

This project deliberately keeps the learning code disconnected so you can
study the algorithm without changing login behavior.

## Interview explanation

An answer you can give is:

> “I would first clarify whether the requirement is a fixed quota, an exact
> rolling window, or a burst-tolerant rate. I can implement a fixed window or
> token bucket in memory using a map. For multiple backend instances, I would
> move the shared state to Redis and use atomic increment/expiration or a Lua
> script so concurrent requests cannot race.”

Then mention the tradeoff:

- Fixed window is simplest but has boundary bursts.
- Sliding-window log is accurate but uses memory proportional to recent
  requests.
- Token bucket is O(1) state and allows controlled bursts.

## Source map

```text
src/learning/rate-limiter/types.ts
  Shared decision, interface, clock, and validation helpers

src/learning/rate-limiter/fixed-window.ts
  Counter plus window-start implementation

src/learning/rate-limiter/sliding-window-log.ts
  Timestamp/cost history with lazy pruning

src/learning/rate-limiter/token-bucket.ts
  Continuous refill and exact retry math

src/learning/rate-limiter/index.ts
  Learning-only public exports
```
