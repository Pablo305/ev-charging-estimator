/**
 * Short-lived HMAC-signed capability token for presentation write actions.
 *
 * Phase 2 issues these at bootstrap time. Phase 4/5 write endpoints
 * (save layout, request render) will require them in the
 * `x-presentation-capability` header and call `verifyCapabilityToken`.
 *
 * Token format: `${payload_b64url}.${sig_b64url}`
 * Payload is JSON: { shareId, exp }  (exp is epoch ms)
 * Signature is HMAC-SHA256(payload_b64url, PRESENTATION_TOKEN_SECRET).
 *
 * The secret is required at issue time; if missing we throw so the
 * misconfiguration surfaces immediately in dev/staging.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface CapabilityTokenPayload {
  shareId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.PRESENTATION_TOKEN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'PRESENTATION_TOKEN_SECRET must be set (min 16 chars) to issue capability tokens',
    );
  }
  return secret;
}

function b64urlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64');
}

export function issueCapabilityToken(
  shareId: string,
  opts: { ttlMs?: number; now?: number } = {},
): { token: string; expiresAt: string } {
  const secret = getSecret();
  const now = opts.now ?? Date.now();
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const payload: CapabilityTokenPayload = { shareId, exp: now + ttl };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = b64urlEncode(sig);
  return {
    token: `${payloadB64}.${sigB64}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export interface VerifyResult {
  ok: boolean;
  reason?: 'malformed' | 'bad_signature' | 'expired' | 'share_mismatch';
  payload?: CapabilityTokenPayload;
}

/**
 * Verify a capability token. If `expectedShareId` is provided, the token's
 * shareId must also match — guards against replaying one share's token
 * against another share's write endpoint.
 */
export function verifyCapabilityToken(
  token: string,
  expectedShareId?: string,
  opts: { now?: number } = {},
): VerifyResult {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const [payloadB64, sigB64] = token.split('.', 2);
  if (!payloadB64 || !sigB64) {
    return { ok: false, reason: 'malformed' };
  }

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest();
  let providedSig: Buffer;
  try {
    providedSig = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (providedSig.length !== expectedSig.length) {
    return { ok: false, reason: 'bad_signature' };
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: CapabilityTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as CapabilityTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    typeof payload.shareId !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }

  const now = opts.now ?? Date.now();
  if (payload.exp <= now) {
    return { ok: false, reason: 'expired', payload };
  }
  if (expectedShareId && payload.shareId !== expectedShareId) {
    return { ok: false, reason: 'share_mismatch', payload };
  }
  return { ok: true, payload };
}
