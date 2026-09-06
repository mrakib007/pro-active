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

export type SlidingWindowLogRateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: Clock;
};

type WindowEntry = {
  timestampMs: number;
  cost: number;
};

type SlidingWindowState = {
  entries: WindowEntry[];
  totalCost: number;
};

export class SlidingWindowLogRateLimiter implements RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: Clock;
  private readonly states = new Map<string, SlidingWindowState>();

  constructor(options: SlidingWindowLogRateLimiterOptions) {
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

    if (state === undefined) {
      state = { entries: [], totalCost: 0 };
    } else {
      this.pruneExpiredEntries(state, now);

      if (state.entries.length === 0) {
        this.states.delete(key);
      }
    }

    const remaining = Math.max(this.limit - state.totalCost, 0);

    if (cost > remaining) {
      const retryAtMs = this.findRetryAt(state, cost, remaining, now);
      const resetAtMs = this.nextEntryExpiration(state, now);

      return {
        allowed: false,
        limit: this.limit,
        remaining,
        retryAfterMs: Math.max(0, retryAtMs - now),
        resetAtMs,
      };
    }

    state.entries.push({ cost, timestampMs: now });
    state.totalCost += cost;
    this.states.set(key, state);

    return {
      allowed: true,
      limit: this.limit,
      remaining: this.limit - state.totalCost,
      retryAfterMs: 0,
      resetAtMs: this.nextEntryExpiration(state, now),
    };
  }

  reset(key: string): void {
    assertKey(key);
    this.states.delete(key);
  }

  clear(): void {
    this.states.clear();
  }

  private pruneExpiredEntries(state: SlidingWindowState, now: number): void {
    const cutoffMs = now - this.windowMs;
    let firstActiveEntry = 0;
    let expiredCost = 0;

    while (
      firstActiveEntry < state.entries.length &&
      state.entries[firstActiveEntry].timestampMs <= cutoffMs
    ) {
      expiredCost += state.entries[firstActiveEntry].cost;
      firstActiveEntry += 1;
    }

    if (firstActiveEntry === 0) {
      return;
    }

    state.entries.splice(0, firstActiveEntry);
    state.totalCost -= expiredCost;
  }

  private findRetryAt(
    state: SlidingWindowState,
    cost: number,
    remaining: number,
    now: number,
  ): number {
    const costNeeded = cost - remaining;
    let costFreed = 0;

    for (const entry of state.entries) {
      costFreed += entry.cost;

      if (costFreed >= costNeeded) {
        return entry.timestampMs + this.windowMs;
      }
    }

    return now + this.windowMs;
  }

  private nextEntryExpiration(state: SlidingWindowState, now: number): number {
    return state.entries.length === 0
      ? now + this.windowMs
      : state.entries[0].timestampMs + this.windowMs;
  }
}
