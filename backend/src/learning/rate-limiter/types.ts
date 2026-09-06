export type Clock = () => number;

export const systemClock: Clock = () => Date.now();

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAtMs: number;
};

export interface RateLimiter {
  consume(key: string, cost?: number): RateLimitDecision;
  reset(key: string): void;
  clear(): void;
}

export function readNow(clock: Clock): number {
  const now = clock();

  if (!Number.isFinite(now)) {
    throw new TypeError("Clock must return a finite number");
  }

  return now;
}

export function assertKey(key: string): void {
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new TypeError("Rate-limit key is required");
  }
}

export function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

export function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

export function assertCost(cost: number, limit: number): void {
  if (!Number.isSafeInteger(cost) || cost <= 0 || cost > limit) {
    throw new RangeError(
      "cost must be a positive integer no greater than the limit",
    );
  }
}
