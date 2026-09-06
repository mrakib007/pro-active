# Rate Limiter From Scratch Implementation Plan

> **For agentic workers:** This plan is executed inline in the current task. The learning module is intentionally not connected to the production application.

**Goal:** Build a standalone TypeScript rate-limiter learning lab that implements fixed-window, sliding-window-log, and token-bucket algorithms without Redis or application integration.

**Architecture:** Each algorithm implements the same synchronous `RateLimiter` contract and stores state in its own in-memory `Map`. A clock function is injected into every limiter so time behavior is deterministic and understandable. The production Redis-backed login limiter is not modified or imported.

**Tech Stack:** Node.js 20+, TypeScript, native `Map`, Vitest for temporary development verification, Markdown documentation.

**Spec:** `backend/RATE-LIMITER-FROM-SCRATCH.md`

## Global Constraints

- Keep the learning code under `backend/src/learning/rate-limiter/`.
- Do not import the learning module from Express, authentication, Redis, or server files.
- Do not add runtime dependencies.
- Require positive finite configuration values and positive integer request costs.
- Use an injected clock rather than sleeping in code or tests.
- Remove temporary test files before handoff, per the user’s Git preference.

---

### Task 1: Define the shared contract and validation helpers

**Files:**
- Create: `backend/src/learning/rate-limiter/types.ts`
- Test temporarily: `backend/tests/learning-rate-limiter.test.ts`

**Interfaces:**
- Produce `Clock`, `RateLimitDecision`, `RateLimiter`, `readNow`, `assertKey`, `assertPositiveInteger`, `assertPositiveFinite`, and `assertCost`.
- `RateLimitDecision` contains `allowed`, `limit`, `remaining`, `retryAfterMs`, and `resetAtMs`.
- `RateLimiter.consume(key: string, cost?: number)` returns a decision without throwing for a normal allowed/blocked request.
- `RateLimiter.reset(key)` removes one key; `RateLimiter.clear()` removes all keys.

- [x] Write temporary failing tests for the shared decision shape, invalid keys, invalid numeric options, and clock validation.
- [x] Run the focused temporary test and confirm it fails because the module does not exist.
- [x] Implement the shared types and validation helpers.
- [x] Run the focused temporary test and confirm it passes.

### Task 2: Implement the fixed-window limiter

**Files:**
- Create: `backend/src/learning/rate-limiter/fixed-window.ts`
- Modify: `backend/tests/learning-rate-limiter.test.ts`

**Interfaces:**
- Produce `FixedWindowRateLimiter` with `{ limit, windowMs, now? }` options.
- State is `{ windowStartMs, consumed }` per key.
- A window expires when `now >= windowStartMs + windowMs`.

- [x] Add temporary failing tests for first requests, exhaustion, window reset, request costs, reset, and clear.
- [x] Run the focused test and verify the expected failures.
- [x] Implement the smallest fixed-window state machine using the shared helpers.
- [x] Run the focused test and verify it passes.

### Task 3: Implement the sliding-window-log limiter

**Files:**
- Create: `backend/src/learning/rate-limiter/sliding-window-log.ts`
- Modify: `backend/tests/learning-rate-limiter.test.ts`

**Interfaces:**
- Produce `SlidingWindowLogRateLimiter` with `{ limit, windowMs, now? }` options.
- Store timestamp/cost entries per key and prune entries where `timestampMs <= now - windowMs`.
- A blocked request reports the earliest entry expiration as `retryAfterMs`.

- [x] Add temporary failing tests for boundary expiration, accurate rolling behavior, weighted costs, and memory cleanup after a window expires.
- [x] Run the focused test and verify the expected failures.
- [x] Implement pruning, admission, decision metadata, reset, and clear.
- [x] Run the focused test and verify it passes.

### Task 4: Implement the token-bucket limiter

**Files:**
- Create: `backend/src/learning/rate-limiter/token-bucket.ts`
- Modify: `backend/tests/learning-rate-limiter.test.ts`

**Interfaces:**
- Produce `TokenBucketRateLimiter` with `{ capacity, refillTokens, refillIntervalMs, now? }` options.
- Store `{ tokens, lastRefillMs }` per key.
- Refill continuously at `refillTokens / refillIntervalMs`, capped at capacity.
- A blocked request reports the exact wait required for its cost in `retryAfterMs`.

- [x] Add temporary failing tests for initial capacity, burst exhaustion, fractional refill, blocked retry time, costs, reset, and clear.
- [x] Run the focused test and verify the expected failures.
- [x] Implement refill and admission math using the injected clock.
- [x] Run the focused test and verify it passes.

### Task 5: Export the learning module and write the guide

**Files:**
- Create: `backend/src/learning/rate-limiter/index.ts`
- Create: `backend/RATE-LIMITER-FROM-SCRATCH.md`

**Interfaces:**
- Export all three limiter classes, their option types, and the shared contract from `index.ts`.

- [x] Add exports and run the backend typecheck.
- [x] Write the guide with the common contract, algorithm timelines, complexity table, edge cases, examples, interview explanation, and comparison with the production Redis limiter.
- [x] Explain that `resetAtMs` means window reset for fixed/sliding algorithms and full-bucket refill time for token bucket; `retryAfterMs` is the retry signal.
- [x] Confirm no production source imports the learning module.

### Task 6: Final verification and cleanup

**Files:**
- Delete: `backend/tests/learning-rate-limiter.test.ts`

- [x] Run backend typecheck, build, lint, and format checks.
- [x] Run the frontend typecheck and build to ensure the unused learning module does not affect the application.
- [x] Delete the temporary test file.
- [x] Run `git diff --check` and confirm no test files are modified or untracked.
