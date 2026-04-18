import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureProjectMedia, type SitePhoto } from '@/lib/media/capture-service';

type RowLookup = Map<string, SitePhoto>;

interface MockSupabase {
  client: {
    storage: { from: (bucket: string) => unknown };
    from: (table: string) => unknown;
  };
  uploaded: Array<{ path: string; bytes: number }>;
  inserted: SitePhoto[];
  rows: RowLookup;
}

function makeMockSupabase(): MockSupabase {
  const uploaded: Array<{ path: string; bytes: number }> = [];
  const inserted: SitePhoto[] = [];
  const rows: RowLookup = new Map();

  const storage = {
    from(_bucket: string) {
      return {
        upload: async (path: string, body: ArrayBuffer) => {
          uploaded.push({ path, bytes: body.byteLength });
          return { data: { path }, error: null };
        },
      };
    },
  };

  const from = (_table: string) => ({
    select(_cols: string) {
      return {
        eq(col1: string, val1: string) {
          return {
            eq(col2: string, val2: string) {
              return {
                maybeSingle: async () => {
                  const key = `${val1}|${val2}`;
                  const row = rows.get(key);
                  return { data: row ?? null, error: null };
                },
              };
            },
          };
        },
      };
    },
    insert(row: SitePhoto) {
      return {
        select(_cols: string) {
          return {
            single: async () => {
              const key = `${row.project_id}|${row.capture_hash}`;
              const saved: SitePhoto = {
                ...row,
                id: `photo-${inserted.length + 1}`,
                created_at: new Date().toISOString(),
              };
              inserted.push(saved);
              rows.set(key, saved);
              return { data: saved, error: null };
            },
          };
        },
      };
    },
  });

  return {
    client: { storage, from },
    uploaded,
    inserted,
    rows,
  };
}

describe('captureProjectMedia', () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'test-key';
  });

  it('captures 8 center + 1 satellite + 4 per charger, dedupes via captureHash', async () => {
    const mock = makeMockSupabase();

    const fetchImpl = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status: 200 }),
    );

    const result = await captureProjectMedia(
      {
        projectId: 'proj-1',
        centerLat: 25.7617,
        centerLng: -80.1918,
        chargers: [
          { id: 'c1', lat: 25.7618, lng: -80.1918 },
          { id: 'c2', lat: 25.7619, lng: -80.1918 },
        ],
      },
      mock.client,
      { fetchImpl },
    );

    expect(result.errors).toEqual([]);
    expect(result.centerPhotos).toHaveLength(8);
    expect(result.satellite).not.toBeNull();
    expect(result.chargerPhotos['c1']).toHaveLength(4);
    expect(result.chargerPhotos['c2']).toHaveLength(4);

    // 8 center + 1 sat + 2 * 4 chargers = 17 total rows
    expect(mock.inserted).toHaveLength(17);
    expect(mock.uploaded).toHaveLength(17);

    // Second call with identical inputs should be a full no-op (dedup via hash).
    const before = mock.inserted.length;
    const beforeUploads = mock.uploaded.length;

    const result2 = await captureProjectMedia(
      {
        projectId: 'proj-1',
        centerLat: 25.7617,
        centerLng: -80.1918,
        chargers: [
          { id: 'c1', lat: 25.7618, lng: -80.1918 },
          { id: 'c2', lat: 25.7619, lng: -80.1918 },
        ],
      },
      mock.client,
      { fetchImpl },
    );

    expect(mock.inserted).toHaveLength(before); // no new inserts
    expect(mock.uploaded).toHaveLength(beforeUploads); // no new uploads
    expect(result2.centerPhotos).toHaveLength(8);
    expect(result2.satellite).not.toBeNull();
  });

  it('collects per-capture fetch errors without aborting', async () => {
    const mock = makeMockSupabase();

    // First call fails, rest succeed.
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response('nope', { status: 500 });
      }
      return new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 });
    });

    const result = await captureProjectMedia(
      {
        projectId: 'proj-2',
        centerLat: 10,
        centerLng: 20,
        chargers: [],
      },
      mock.client,
      { fetchImpl },
    );

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.centerPhotos.length).toBe(7); // 1 failed
    expect(result.satellite).not.toBeNull();
  });
});
