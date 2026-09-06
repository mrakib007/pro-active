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

export type TokenBucketRateLimiterOptions = {
  capacity: number;
  refillTokens: number;
  refillIntervalMs: number;
  now?: Clock;
};

type TokenBucketState = {
  tokens: number;
  lastRefillMs: number;
};

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly capacity: number;
  private readonly refillRatePerMs: number;
  private readonly now: Clock;
  private readonly states = new Map<string, TokenBucketState>();

  constructor(options: TokenBucketRateLimiterOptions) {
    assertPositiveInteger("capacity", options.capacity);
    assertPositiveFinite("refillTokens", options.refillTokens);
    assertPositiveFinite("refillIntervalMs", options.refillIntervalMs);

    this.capacity = options.capacity;
    this.refillRatePerMs = options.refillTokens / options.refillIntervalMs;
    this.now = options.now ?? systemClock;
  }

  consume(key: string, cost = 1): RateLimitDecision {
    assertKey(key);
    assertCost(cost, this.capacity);

    const now = readNow(this.now);
    let state = this.states.get(key);

    if (state === undefined) {
      state = { lastRefillMs: now, tokens: this.capacity };
      this.states.set(key, state);
    } else {
      this.refill(state, now);
    }

    if (state.tokens < cost) {
      const deficit = cost - state.tokens;

      return {
        allowed: false,
        limit: this.capacity,
        remaining: Math.floor(state.tokens),
        retryAfterMs: Math.max(1, Math.ceil(deficit / this.refillRatePerMs)),
        resetAtMs: this.fullRefillAt(state, now),
      };
    }

    state.tokens -= cost;

    return {
      allowed: true,
      limit: this.capacity,
      remaining: Math.floor(state.tokens),
      retryAfterMs: 0,
      resetAtMs: this.fullRefillAt(state, now),
    };
  }

  reset(key: string): void {
    assertKey(key);
    this.states.delete(key);
  }

  clear(): void {
    this.states.clear();
  }

  private refill(state: TokenBucketState, now: number): void {
    const elapsedMs = now - state.lastRefillMs;

    if (elapsedMs <= 0) {
      return;
    }

    state.tokens = Math.min(
      this.capacity,
      state.tokens + elapsedMs * this.refillRatePerMs,
    );
    state.lastRefillMs = now;
  }

  private fullRefillAt(state: TokenBucketState, now: number): number {
    const missingTokens = this.capacity - state.tokens;

    return now + Math.ceil(missingTokens / this.refillRatePerMs);
  }
}
