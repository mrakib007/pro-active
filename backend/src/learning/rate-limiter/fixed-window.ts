import {
  assertCost,
  assertKey,
  assertPositiveFinite,
  assertPositiveInteger,
  readNow,
  systemClock,
  type Clock,
  type RateLimitDecision,
  type RateLimiter,
} from "./types.js";

export type FixedWindowRateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: Clock;
};

type FixedWindowState = {
  windowStartMs: number;
  consumed: number;
};

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: Clock;
  private readonly states = new Map<string, FixedWindowState>();

  constructor(options: FixedWindowRateLimiterOptions) {
    assertPositiveInteger("limit", options.limit);
    assertPositiveFinite("windowMs", options.windowMs);

    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? systemClock;
  }

  consume(key: string, cost = 1): RateLimitDecision {
    assertKey(key);
    assertCost(cost, this.limit);

    const now = readNow(this.now);
    let state = this.states.get(key);
    const stateExpired =
      state !== undefined && now >= state.windowStartMs + this.windowMs;

    if (state === undefined || stateExpired) {
      state = { consumed: 0, windowStartMs: now };
      this.states.set(key, state);
    }

    const resetAtMs = state.windowStartMs + this.windowMs;
    const remaining = Math.max(this.limit - state.consumed, 0);

    if (cost > remaining) {
      return {
        allowed: false,
        limit: this.limit,
        remaining,
        retryAfterMs: Math.max(0, resetAtMs - now),
        resetAtMs,
      };
    }

    state.consumed += cost;

    return {
      allowed: true,
      limit: this.limit,
      remaining: this.limit - state.consumed,
      retryAfterMs: 0,
      resetAtMs,
    };
  }

  reset(key: string): void {
    assertKey(key);
    this.states.delete(key);
  }

  clear(): void {
    this.states.clear();
  }
}
