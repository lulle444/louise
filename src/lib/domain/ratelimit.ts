/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for a single server instance and for Demo Mode. For multi-region
 * production deployments swap this for a shared store (e.g. Upstash / Postgres)
 * behind the same interface.
 */
export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; remaining: number; resetAt: number };
  reset(key?: string): void;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    check(key, now = Date.now()) {
      const windowStart = now - windowMs;
      const list = (hits.get(key) ?? []).filter((t) => t > windowStart);
      const allowed = list.length < limit;
      if (allowed) list.push(now);
      hits.set(key, list);
      const oldest = list[0] ?? now;
      return { allowed, remaining: Math.max(0, limit - list.length), resetAt: oldest + windowMs };
    },
    reset(key) {
      if (key === undefined) hits.clear();
      else hits.delete(key);
    },
  };
}

const globalLimiters = globalThis as unknown as { __shiptraceLimiters?: Map<string, RateLimiter> };

/** Process-wide limiter registry so server actions share state across requests. */
export function getRateLimiter(name: string, limit: number, windowMs: number): RateLimiter {
  if (!globalLimiters.__shiptraceLimiters) globalLimiters.__shiptraceLimiters = new Map();
  let limiter = globalLimiters.__shiptraceLimiters.get(name);
  if (!limiter) {
    limiter = createRateLimiter(limit, windowMs);
    globalLimiters.__shiptraceLimiters.set(name, limiter);
  }
  return limiter;
}
