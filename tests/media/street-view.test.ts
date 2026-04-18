import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStreetViewStaticUrl,
  getSatelliteStaticUrl,
  defaultCaptureAngles,
  cardinalCaptureAngles,
  captureHash,
  resolveGoogleMapsKey,
  STREET_VIEW_SIZE,
  SATELLITE_SIZE,
  SATELLITE_ZOOM,
} from '@/lib/media/street-view';

describe('street-view url builders', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  });

  it('prefers server key over public key', () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'server-key';
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'public-key';
    expect(resolveGoogleMapsKey()).toBe('server-key');
  });

  it('falls back to public key when server key absent', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'public-key';
    expect(resolveGoogleMapsKey()).toBe('public-key');
  });

  it('returns null when no key configured', () => {
    expect(resolveGoogleMapsKey()).toBeNull();
  });

  it('builds a Street View Static URL with expected params', () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'k1';
    const url = getStreetViewStaticUrl({
      lat: 25.7617,
      lng: -80.1918,
      heading: 90,
      pitch: 0,
    });
    expect(url).toContain('https://maps.googleapis.com/maps/api/streetview?');
    expect(url).toContain(`size=${encodeURIComponent(STREET_VIEW_SIZE)}`);
    expect(url).toContain('location=25.7617%2C-80.1918');
    expect(url).toContain('heading=90');
    expect(url).toContain('pitch=0');
    expect(url).toContain('fov=90');
    expect(url).toContain('key=k1');
  });

  it('builds a Satellite Static URL with zoom + maptype=satellite', () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'k2';
    const url = getSatelliteStaticUrl({ lat: 30, lng: -90 });
    expect(url).toContain('https://maps.googleapis.com/maps/api/staticmap?');
    expect(url).toContain('center=30%2C-90');
    expect(url).toContain(`zoom=${SATELLITE_ZOOM}`);
    expect(url).toContain(`size=${encodeURIComponent(SATELLITE_SIZE)}`);
    expect(url).toContain('maptype=satellite');
    expect(url).toContain('key=k2');
  });
});

describe('capture angles', () => {
  it('defaultCaptureAngles returns 8 entries covering 0..315', () => {
    const angles = defaultCaptureAngles();
    expect(angles).toHaveLength(8);
    const headings = angles.map((a) => a.heading).sort((a, b) => a - b);
    expect(headings).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
    for (const a of angles) {
      expect(a.pitch).toBe(0);
    }
  });

  it('cardinalCaptureAngles returns 4 entries at N/E/S/W', () => {
    const angles = cardinalCaptureAngles();
    expect(angles).toHaveLength(4);
    const headings = angles.map((a) => a.heading).sort((a, b) => a - b);
    expect(headings).toEqual([0, 90, 180, 270]);
  });
});

describe('captureHash', () => {
  it('is deterministic for identical inputs', async () => {
    const h1 = await captureHash(25.7617, -80.1918, 90, 0);
    const h2 = await captureHash(25.7617, -80.1918, 90, 0);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('differs across headings', async () => {
    const h1 = await captureHash(25.7617, -80.1918, 0, 0);
    const h2 = await captureHash(25.7617, -80.1918, 90, 0);
    expect(h1).not.toBe(h2);
  });

  it('differs across pitches', async () => {
    const h1 = await captureHash(25.7617, -80.1918, 0, 0);
    const h2 = await captureHash(25.7617, -80.1918, 0, 90);
    expect(h1).not.toBe(h2);
  });

  it('differs across coordinates', async () => {
    const h1 = await captureHash(25.7617, -80.1918, 0, 0);
    const h2 = await captureHash(25.7618, -80.1918, 0, 0);
    expect(h1).not.toBe(h2);
  });
});
