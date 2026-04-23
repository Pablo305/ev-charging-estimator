/**
 * Session-cookie auth shared across protected API routes.
 *
 * Fail-closed contract:
 *   - `resolveExpectedSession()` returns null when `SESSION_SECRET` is
 *     unset or shorter than the minimum length. `isAuthenticated()`
 *     rejects every request in that state — no hard-coded fallback.
 *   - `requireAdminEnv()` asserts `ADMIN_USERNAME` + `ADMIN_PASSWORD` +
 *     `SESSION_SECRET` at login time; returns null if any are missing
 *     so the login route can return 503 rather than silently accepting
 *     a default credential pair.
 *   - Cookie compare is timing-safe.
 *
 * Phase 2.5.2 will replace the single shared cookie value with an
 * HMAC-signed session. Until then, every protected route uses this
 * helper so we purge the fallback once, not per-route.
 */

import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const MIN_SESSION_SECRET_LEN = 16;

export const AUTH_COOKIE_NAME = 'bulletev-auth';

export function resolveExpectedSession(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SESSION_SECRET_LEN) return null;
  return secret;
}

export interface AdminEnv {
  username: string;
  password: string;
  sessionSecret: string;
}

/**
 * Resolve the three env vars the login route needs. Returns null when
 * any are missing or the session secret is too short — login route
 * should map this to a 503, never fall through to defaults.
 */
export function resolveAdminEnv(): AdminEnv | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  if (
    !username ||
    !password ||
    !sessionSecret ||
    sessionSecret.length < MIN_SESSION_SECRET_LEN
  ) {
    return null;
  }
  return { username, password, sessionSecret };
}

export function isAuthenticated(req: NextRequest): boolean {
  const expected = resolveExpectedSession();
  if (!expected) return false;
  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  const provided = cookie?.value;
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Timing-safe string compare for pre-signed-session equality paths. */
export function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a constant-time op so we don't reveal the length diff.
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
