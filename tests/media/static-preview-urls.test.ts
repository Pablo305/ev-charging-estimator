/**
 * Regression guard: `buildStreetViewStaticUrl` must never embed the
 * server key in a URL. The URL ends up in DOM / Client Component props
 * (see /e/[id]/page.tsx) and the server key is not safe to ship to the
 * browser. Public browser key only.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSatelliteStaticUrl,
  buildStreetViewStaticUrl,
  resolveDisplayPreviewUrls,
} from '@/lib/map/static-preview-urls';

describe('buildStreetViewStaticUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
  });

  it('returns null when only the server key is set (does NOT fall back)', () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'server-only-secret';
    const url = buildStreetViewStaticUrl(25.76, -80.19);
    expect(url).toBeNull();
  });

  it('never includes the server key in the URL even when both keys are set', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'public-key-123';
    process.env.GOOGLE_MAPS_SERVER_KEY = 'server-only-secret';
    const url = buildStreetViewStaticUrl(25.76, -80.19);
    expect(url).not.toBeNull();
    expect(url).toContain('key=public-key-123');
    expect(url).not.toContain('server-only-secret');
  });

  it('uses the docs-compliant 640x640 size cap', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'public-key-123';
    const url = buildStreetViewStaticUrl(25.76, -80.19) ?? '';
    expect(url).toContain('size=640x640');
  });
});

describe('buildSatelliteStaticUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  it('returns null when no public token is set', () => {
    const url = buildSatelliteStaticUrl(-80.19, 25.76);
    expect(url).toBeNull();
  });

  it('embeds the public Mapbox token', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test-token';
    const url = buildSatelliteStaticUrl(-80.19, 25.76) ?? '';
    expect(url).toContain('access_token=pk.test-token');
  });
});

describe('resolveDisplayPreviewUrls', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  it('never leaks the server key via the resolved URLs', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'public-key-123';
    process.env.GOOGLE_MAPS_SERVER_KEY = 'server-only-secret';
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test-token';

    const resolved = resolveDisplayPreviewUrls({
      siteCoordinates: [-80.19, 25.76],
    });

    const both = `${resolved.satelliteStaticUrl ?? ''}${resolved.streetViewStaticUrl ?? ''}`;
    expect(both).not.toContain('server-only-secret');
    expect(resolved.streetViewStaticUrl).toContain('key=public-key-123');
  });

  it('returns only legacy URL fields when coords are absent', () => {
    const resolved = resolveDisplayPreviewUrls({
      satelliteStaticUrl: 'https://legacy/sat.png',
      streetViewStaticUrl: 'https://legacy/sv.png',
    });
    expect(resolved.satelliteStaticUrl).toBe('https://legacy/sat.png');
    expect(resolved.streetViewStaticUrl).toBe('https://legacy/sv.png');
  });
});
