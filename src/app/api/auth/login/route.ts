/**
 * POST /api/auth/login
 *
 * Admin/sales-rep login. Fails closed when any of `ADMIN_USERNAME`,
 * `ADMIN_PASSWORD`, or `SESSION_SECRET` is missing or too short —
 * returns 503 rather than authenticating against a hard-coded default.
 * (The previous `?? 'Admin'` / `?? 'Admin'` / `?? 'bulletev-session-v1'`
 * defaults were a critical bypass path in any misconfigured env.)
 *
 * Login still rate-limits per-IP to slow credential-stuffing.
 */

import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  resolveAdminEnv,
  safeStringEqual,
} from '@/lib/auth/session';

const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 60_000;

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function POST(request: Request) {
  const env = resolveAdminEnv();
  if (!env) {
    console.error(
      '[auth/login] Missing ADMIN_USERNAME / ADMIN_PASSWORD / SESSION_SECRET env (or session secret <16 chars); login disabled.',
    );
    return NextResponse.json(
      { success: false, error: 'Login unavailable — server misconfigured.' },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const now = Date.now();

  const record = loginAttempts.get(ip);
  if (record && record.count >= MAX_ATTEMPTS && now < record.blockedUntil) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Try again later.' },
      { status: 429 },
    );
  }

  try {
    const { username, password } = await request.json();

    if (
      typeof username === 'string' &&
      typeof password === 'string' &&
      safeStringEqual(username, env.username) &&
      safeStringEqual(password, env.password)
    ) {
      loginAttempts.delete(ip);
      const response = NextResponse.json({ success: true });
      response.cookies.set(AUTH_COOKIE_NAME, env.sessionSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    const prev = loginAttempts.get(ip) ?? { count: 0, blockedUntil: 0 };
    prev.count += 1;
    if (prev.count >= MAX_ATTEMPTS) {
      prev.blockedUntil = now + BLOCK_DURATION_MS;
    }
    loginAttempts.set(ip, prev);

    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
