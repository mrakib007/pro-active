import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "../../infrastructure/cache/redis.js";

export const LOGIN_RATE_LIMIT_POINTS = 5;
export const LOGIN_RATE_LIMIT_DURATION_SECONDS = 60;

export interface LoginAttempt {
  email: string;
  ip: string;
}

export interface LoginRateLimiterStore {
  consume(key: string): Promise<unknown>;
}

export interface LoginRateLimiter {
  consume(attempt: LoginAttempt): Promise<void>;
}

export class LoginRateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Login rate limit exceeded");
    this.name = "LoginRateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class LoginRateLimiterUnavailableError extends Error {
  constructor() {
    super("Login rate limiter unavailable");
    this.name = "LoginRateLimiterUnavailableError";
  }
}

const defaultLimiter = new RateLimiterRedis({
  duration: LOGIN_RATE_LIMIT_DURATION_SECONDS,
  keyPrefix: "pro-active:auth:login",
  points: LOGIN_RATE_LIMIT_POINTS,
  storeClient: redis,
});

export function loginRateLimitKey(ip: string, email: string): string {
  return `${ip}:${email}`;
}

export function createLoginRateLimiter({
  limiter = defaultLimiter,
}: {
  limiter?: LoginRateLimiterStore;
} = {}): LoginRateLimiter {
  return {
    async consume(attempt) {
      try {
        await limiter.consume(loginRateLimitKey(attempt.ip, attempt.email));
      } catch (error: unknown) {
        if (error instanceof RateLimiterRes) {
          throw new LoginRateLimitExceededError(
            Math.max(1, Math.ceil(error.msBeforeNext / 1000)),
          );
        }

        throw new LoginRateLimiterUnavailableError();
      }
    },
  };
}
