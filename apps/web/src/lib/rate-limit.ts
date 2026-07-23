import { createHash } from "node:crypto";
import Redis from "ioredis";

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

type MemoryBucket = { count: number; expiresAt: number };

declare global {
  var novaGymRateLimitRedis: Redis | undefined;
  var novaGymRateLimitRedisConnecting: Promise<Redis> | undefined;
  var novaGymRateLimitMemory: Map<string, MemoryBucket> | undefined;
}

const memory = globalThis.novaGymRateLimitMemory ?? new Map<string, MemoryBucket>();
globalThis.novaGymRateLimitMemory = memory;

function anonymousKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

async function redisClient() {
  if (globalThis.novaGymRateLimitRedis?.status === "ready")
    return globalThis.novaGymRateLimitRedis;
  if (globalThis.novaGymRateLimitRedisConnecting)
    return globalThis.novaGymRateLimitRedisConnecting;

  globalThis.novaGymRateLimitRedisConnecting = (async () => {
    const client =
      globalThis.novaGymRateLimitRedis ??
      new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
        lazyConnect: true,
        connectTimeout: 800,
        commandTimeout: 800,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
    globalThis.novaGymRateLimitRedis = client;
    if (client.status === "wait" || client.status === "end")
      await client.connect();
    return client;
  })();

  try {
    return await globalThis.novaGymRateLimitRedisConnecting;
  } finally {
    globalThis.novaGymRateLimitRedisConnecting = undefined;
  }
}

function memoryLimit(key: string, windowSeconds: number) {
  const now = Date.now();
  const current = memory.get(key);
  const bucket =
    !current || current.expiresAt <= now
      ? { count: 0, expiresAt: now + windowSeconds * 1000 }
      : current;
  bucket.count += 1;
  memory.set(key, bucket);

  if (memory.size > 10_000) {
    for (const [candidate, value] of memory) {
      if (value.expiresAt <= now) memory.delete(candidate);
    }
  }

  return {
    count: bucket.count,
    retryAfter: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)),
  };
}

export async function rateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const key = `nova:limit:${scope}:${anonymousKey(identifier)}`;
  let count: number;
  let retryAfter = windowSeconds;

  try {
    const redis = await redisClient();
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    const ttl = await redis.ttl(key);
    if (ttl > 0) retryAfter = ttl;
  } catch {
    const fallback = memoryLimit(key, windowSeconds);
    count = fallback.count;
    retryAfter = fallback.retryAfter;
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfter,
  };
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value =
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return value.slice(0, 64);
}

export function tooManyRequests(result: RateLimitResult) {
  return Response.json(
    {
      success: false,
      data: null,
      message: "Demasiadas solicitudes",
      errors: [
        {
          code: "RATE_LIMITED",
          field: null,
          message: "Espera un momento antes de intentarlo nuevamente.",
        },
      ],
      meta: { retryAfter: result.retryAfter },
    },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(result.retryAfter),
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": String(result.remaining),
      },
    },
  );
}
