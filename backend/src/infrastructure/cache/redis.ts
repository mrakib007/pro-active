import { Redis } from "ioredis";
import { config } from "../../config.js";
import { logger } from "../../logger.js";

export const redis = new Redis(config.REDIS_URL, {
  connectTimeout: 1_000,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt: number) => (attempt <= 1 ? 50 : null),
});

redis.on("error", (error: Error) => {
  logger.warn({ err: error }, "Redis connection error");
});

export async function checkRedis(): Promise<void> {
  await redis.ping();
}

export function disconnectRedis(): void {
  if (redis.status !== "end") {
    redis.disconnect();
  }
}
