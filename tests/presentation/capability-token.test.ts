import { describe, it, expect, beforeEach } from 'vitest';
import {
  issueCapabilityToken,
  verifyCapabilityToken,
} from '@/lib/presentation/capability-token';

describe('capability-token', () => {
  beforeEach(() => {
    process.env.PRESENTATION_TOKEN_SECRET = 'unit-test-secret-abcdefghij';
  });

  it('issues and verifies a valid token round-trip', () => {
    const { token, expiresAt } = issueCapabilityToken('share-123');
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());

    const result = verifyCapabilityToken(token, 'share-123');
    expect(result.ok).toBe(true);
    expect(result.payload?.shareId).toBe('share-123');
  });

  it('rejects tokens signed with a different secret', () => {
    process.env.PRESENTATION_TOKEN_SECRET = 'secret-one-sixteen-chars';
    const { token } = issueCapabilityToken('share-abc');

    process.env.PRESENTATION_TOKEN_SECRET = 'secret-two-sixteen-chars';
    const result = verifyCapabilityToken(token, 'share-abc');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects tokens past expiry', () => {
    const { token } = issueCapabilityToken('share-xyz', { ttlMs: 1 });
    // Simulate "now" well past issuance.
    const result = verifyCapabilityToken(token, 'share-xyz', {
      now: Date.now() + 10_000,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects tokens whose shareId does not match expected', () => {
    const { token } = issueCapabilityToken('share-A');
    const result = verifyCapabilityToken(token, 'share-B');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('share_mismatch');
  });

  it('rejects malformed tokens without throwing', () => {
    expect(verifyCapabilityToken('not-a-token').ok).toBe(false);
    expect(verifyCapabilityToken('onlyone').ok).toBe(false);
    expect(verifyCapabilityToken('').ok).toBe(false);
  });

  it('throws at issue-time when secret is missing or too short', () => {
    delete process.env.PRESENTATION_TOKEN_SECRET;
    expect(() => issueCapabilityToken('share-1')).toThrow(/PRESENTATION_TOKEN_SECRET/);

    process.env.PRESENTATION_TOKEN_SECRET = 'short';
    expect(() => issueCapabilityToken('share-1')).toThrow(/PRESENTATION_TOKEN_SECRET/);
  });
});
