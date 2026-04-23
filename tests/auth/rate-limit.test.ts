import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/auth/rate-limit';

describe('createRateLimiter (sliding window)', () => {
  it('allows up to `max` requests within the window, blocks further', () => {
    const limiter = createRateLimiter({ key: 't', windowMs: 60_000, max: 3 });
    const now = 1_000_000;
    expect(limiter.check('ip-a', now).ok).toBe(true);
    expect(limiter.check('ip-a', now + 1).ok).toBe(true);
    expect(limiter.check('ip-a', now + 2).ok).toBe(true);
    const blocked = limiter.check('ip-a', now + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(0);
  });

  it('isolates different identifiers', () => {
    const limiter = createRateLimiter({ key: 't', windowMs: 60_000, max: 2 });
    const now = 1_000_000;
    expect(limiter.check('ip-a', now).ok).toBe(true);
    expect(limiter.check('ip-a', now + 1).ok).toBe(true);
    expect(limiter.check('ip-a', now + 2).ok).toBe(false);
    expect(limiter.check('ip-b', now + 2).ok).toBe(true);
    expect(limiter.check('ip-b', now + 3).ok).toBe(true);
  });

  it('expires old timestamps once they leave the window', () => {
    const limiter = createRateLimiter({ key: 't', windowMs: 1_000, max: 2 });
    expect(limiter.check('ip', 0).ok).toBe(true);
    expect(limiter.check('ip', 100).ok).toBe(true);
    expect(limiter.check('ip', 200).ok).toBe(false);
    // Past the window — old hits should age out.
    expect(limiter.check('ip', 1_500).ok).toBe(true);
  });
});
