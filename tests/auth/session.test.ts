/**
 * Phase 2.5.1 — session helper contract.
 *
 * These guards prevent the hard-coded-fallback regression from returning
 * to any protected route. If someone adds `?? 'bulletev-session-v1'` or
 * `?? 'Admin'` anywhere, the equivalent test would pass with a forged
 * cookie — so the strongest guard is a real failing test on the helper.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MIN_SESSION_SECRET_LEN,
  isAuthenticated,
  resolveAdminEnv,
  resolveExpectedSession,
  safeStringEqual,
} from '@/lib/auth/session';

function mockRequest(cookieValue: string | null): Parameters<typeof isAuthenticated>[0] {
  return {
    cookies: {
      get: (name: string) =>
        name === 'bulletev-auth' && cookieValue !== null
          ? { value: cookieValue }
          : undefined,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('resolveExpectedSession', () => {
  beforeEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('returns null when SESSION_SECRET is unset', () => {
    expect(resolveExpectedSession()).toBeNull();
  });

  it('returns null when SESSION_SECRET is shorter than the minimum', () => {
    process.env.SESSION_SECRET = 'short';
    expect(resolveExpectedSession()).toBeNull();
  });

  it('returns the secret when at least MIN_SESSION_SECRET_LEN', () => {
    const secret = 'x'.repeat(MIN_SESSION_SECRET_LEN);
    process.env.SESSION_SECRET = secret;
    expect(resolveExpectedSession()).toBe(secret);
  });
});

describe('isAuthenticated', () => {
  beforeEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('rejects when SESSION_SECRET is unset regardless of cookie value', () => {
    expect(isAuthenticated(mockRequest('bulletev-session-v1'))).toBe(false);
    expect(isAuthenticated(mockRequest('anything'))).toBe(false);
    expect(isAuthenticated(mockRequest(null))).toBe(false);
  });

  it('accepts only a matching cookie when secret is set', () => {
    const secret = 'proper-length-secret-123';
    process.env.SESSION_SECRET = secret;
    expect(isAuthenticated(mockRequest(secret))).toBe(true);
    expect(isAuthenticated(mockRequest(secret + 'x'))).toBe(false);
    expect(isAuthenticated(mockRequest(null))).toBe(false);
  });
});

describe('resolveAdminEnv', () => {
  beforeEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.SESSION_SECRET;
  });

  it('returns null when any required env is missing', () => {
    expect(resolveAdminEnv()).toBeNull();
    process.env.ADMIN_USERNAME = 'u';
    expect(resolveAdminEnv()).toBeNull();
    process.env.ADMIN_PASSWORD = 'p';
    expect(resolveAdminEnv()).toBeNull();
  });

  it('returns null when SESSION_SECRET is too short', () => {
    process.env.ADMIN_USERNAME = 'u';
    process.env.ADMIN_PASSWORD = 'p';
    process.env.SESSION_SECRET = 'short';
    expect(resolveAdminEnv()).toBeNull();
  });

  it('returns the full tuple when all envs are valid', () => {
    process.env.ADMIN_USERNAME = 'real-user';
    process.env.ADMIN_PASSWORD = 'real-pass';
    const secret = 'x'.repeat(MIN_SESSION_SECRET_LEN);
    process.env.SESSION_SECRET = secret;
    const env = resolveAdminEnv();
    expect(env).toEqual({
      username: 'real-user',
      password: 'real-pass',
      sessionSecret: secret,
    });
  });
});

describe('safeStringEqual', () => {
  it('returns true on equal strings and false otherwise without throwing', () => {
    expect(safeStringEqual('abc', 'abc')).toBe(true);
    expect(safeStringEqual('abc', 'abd')).toBe(false);
    expect(safeStringEqual('', '')).toBe(true);
    expect(safeStringEqual('abc', 'abcd')).toBe(false); // length mismatch
    expect(safeStringEqual('abcd', 'abc')).toBe(false);
  });
});
