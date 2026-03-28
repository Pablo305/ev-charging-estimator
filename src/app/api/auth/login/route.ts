import { NextResponse } from 'next/server';
import crypto from 'crypto';

const VALID_USERNAME = process.env.ADMIN_USERNAME ?? 'Admin';
const VALID_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin';
const SESSION_TOKEN = process.env.SESSION_SECRET ?? 'bulletev-session-v1';

const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 60_000;

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function POST(request: Request) {
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
      timingSafeEqual(username, VALID_USERNAME) &&
      timingSafeEqual(password, VALID_PASSWORD)
    ) {
      loginAttempts.delete(ip);
      const response = NextResponse.json({ success: true });
      response.cookies.set('bulletev-auth', SESSION_TOKEN, {
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
