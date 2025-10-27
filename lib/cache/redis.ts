import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client using REST URL and token
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return (value as T | null) ?? null;
  } catch (err) {
    console.warn("Redis get error for key", key, err);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value as unknown as T, { ex: ttlSeconds });
  } catch (err) {
    console.warn("Redis set error for key", key, err);
  }
}
