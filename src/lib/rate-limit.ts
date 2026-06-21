import { Redis } from "@upstash/redis";
import { Ratelimit as UpstashRatelimit } from "@upstash/ratelimit";

interface RateLimitConfig {
  intervalMs: number;
  max: number;
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash = !!(redisUrl && redisToken);

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({ url: redisUrl!, token: redisToken! });
  }
  return redis;
}

const ratelimiterCache = new Map<string, UpstashRatelimit>();

function getRatelimiter(config: RateLimitConfig): UpstashRatelimit {
  const key = `${config.max}/${config.intervalMs}`;
  let rl = ratelimiterCache.get(key);
  if (!rl) {
    rl = new UpstashRatelimit({
      redis: getRedis(),
      limiter: UpstashRatelimit.slidingWindow(config.max, `${config.intervalMs} ms`),
      analytics: true,
      prefix: "mercadito",
    });
    ratelimiterCache.set(key, rl);
  }
  return rl;
}

// In-memory fallback for local dev
interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) memoryStore.delete(key);
    }
  }, 60_000);
}

async function memoryRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.intervalMs });
    return { ok: true, remaining: config.max - 1, resetAt: now + config.intervalMs };
  }
  entry.count++;
  if (entry.count > config.max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { ok: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  if (!hasUpstash) {
    return memoryRateLimit(key, config);
  }

  const rl = getRatelimiter(config);
  const result = await rl.limit(key);

  return {
    ok: result.success,
    remaining: result.remaining,
    resetAt: Date.now() + config.intervalMs,
  };
}
