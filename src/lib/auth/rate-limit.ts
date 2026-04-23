/**
 * In-memory sliding-window rate limiter.
 *
 * Scope: per-process. Fine for single-instance dev + small deployments;
 * multi-instance Vercel deployments need a shared store (Upstash/Redis)
 * before this can truly gate abuse. That's follow-up work — this first
 * pass closes the "zero controls at all" hole on public routes.
 *
 * Usage:
 *   const limiter = createRateLimiter({ key: 'monday', windowMs: 60_000, max: 60 });
 *   const allowed = limiter.check(clientIp);
 *   if (!allowed.ok) return 429 with allowed.retryAfterSec;
 */

export interface RateLimitConfig {
  /** Short name used in log/debug strings. */
  key: string;
  /** Sliding window length in ms. */
  windowMs: number;
  /** Max requests allowed within the window. */
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  check: (identifier: string, now?: number) => RateLimitResult;
  /** Test-only: reset internal state. */
  reset: () => void;
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  // Map<identifier, timestamps[]>. Timestamps are kept sorted ascending.
  const hits = new Map<string, number[]>();

  return {
    check(identifier: string, now = Date.now()): RateLimitResult {
      const cutoff = now - config.windowMs;
      const prev = hits.get(identifier) ?? [];
      // Drop expired.
      let start = 0;
      while (start < prev.length && prev[start] < cutoff) start += 1;
      const active = start === 0 ? prev.slice() : prev.slice(start);
      if (active.length >= config.max) {
        const oldest = active[0];
        const retryMs = Math.max(0, oldest + config.windowMs - now);
        // Don't record this attempt so repeated blocked hits don't starve the window.
        hits.set(identifier, active);
        return { ok: false, remaining: 0, retryAfterSec: Math.ceil(retryMs / 1000) };
      }
      active.push(now);
      hits.set(identifier, active);
      return {
        ok: true,
        remaining: config.max - active.length,
        retryAfterSec: 0,
      };
    },
    reset() {
      hits.clear();
    },
  };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
