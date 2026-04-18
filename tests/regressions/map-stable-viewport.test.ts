import { describe, it, expect } from 'vitest';
import { shouldRecenterViewport } from '@/lib/map/viewport-stability';

/**
 * Regression: stable viewport on marker placement.
 *
 * BUG history: SiteMap.tsx watched `siteCoordinates` by reference and called
 * `map.flyTo(...)` on every change. But EstimateContext's `setDeep` runs
 * `JSON.parse(JSON.stringify(state))` on every `updateField(...)` call —
 * meaning unrelated updates (chargerCountFromMap, hasPanelPlaced, etc.
 * dispatched by InlineMapPrompt's auto-calc effect) produced a new
 * `siteCoordinates` array reference even though the lat/lng values were
 * identical. Placing a charger would yank the viewport back to the geocoded
 * center and re-zoom to 18, forcing users to re-zoom after every placement.
 *
 * Fix: compare by VALUE, not identity. `shouldRecenterViewport` encodes the
 * rule — only return true when the numeric coordinates actually differ from
 * the last centered position.
 */
describe('shouldRecenterViewport (map stable viewport regression)', () => {
  it('returns false when next is null (no address yet)', () => {
    expect(shouldRecenterViewport(null, null)).toBe(false);
    expect(shouldRecenterViewport([-80, 25], null)).toBe(false);
  });

  it('returns true on first geocode (previous was null)', () => {
    expect(shouldRecenterViewport(null, [-80.1918, 25.7617])).toBe(true);
  });

  it('returns true when lat/lng actually change (new address)', () => {
    const prev: [number, number] = [-80.1918, 25.7617]; // Miami
    const next: [number, number] = [-118.2437, 34.0522]; // Los Angeles
    expect(shouldRecenterViewport(prev, next)).toBe(true);
  });

  it('returns true when only longitude changes', () => {
    expect(shouldRecenterViewport([-80, 25], [-81, 25])).toBe(true);
  });

  it('returns true when only latitude changes', () => {
    expect(shouldRecenterViewport([-80, 25], [-80, 26])).toBe(true);
  });

  it('returns false when values match but array reference differs', () => {
    // Exactly the bug: setDeep's JSON.parse(JSON.stringify(...)) produces a
    // new array with identical numeric values on every unrelated updateField.
    const prev: [number, number] = [-80.1918, 25.7617];
    const clonedSameValues: [number, number] = [-80.1918, 25.7617];
    expect(prev).not.toBe(clonedSameValues); // sanity: different references
    expect(shouldRecenterViewport(prev, clonedSameValues)).toBe(false);
  });

  it('simulates the bug scenario: placing 5 chargers does NOT re-center', () => {
    // Start: user enters address, map centers on Miami.
    let lastCentered: [number, number] | null = null;
    const geocoded: [number, number] = [-80.1918, 25.7617];

    expect(shouldRecenterViewport(lastCentered, geocoded)).toBe(true);
    lastCentered = [geocoded[0], geocoded[1]];

    // User now places 5 chargers. Each dispatch goes through setDeep which
    // deep-clones the entire input tree — including siteCoordinates — so
    // InlineMapPrompt re-renders with a fresh `[number, number]` array that
    // has the same numeric values.
    for (let i = 0; i < 5; i++) {
      const freshClone: [number, number] = [
        JSON.parse(JSON.stringify(geocoded))[0],
        JSON.parse(JSON.stringify(geocoded))[1],
      ];
      expect(freshClone).not.toBe(lastCentered); // new reference every time
      expect(shouldRecenterViewport(lastCentered, freshClone)).toBe(false);
    }
  });

  it('allows re-center when the user enters a NEW address mid-session', () => {
    let lastCentered: [number, number] | null = null;

    // First address
    lastCentered = [-80.1918, 25.7617];
    expect(shouldRecenterViewport(null, lastCentered)).toBe(true);

    // User places some chargers (many no-op updates) — still the same point
    for (let i = 0; i < 3; i++) {
      expect(shouldRecenterViewport(lastCentered, [-80.1918, 25.7617])).toBe(false);
    }

    // User changes address to Los Angeles — should re-center
    const newAddress: [number, number] = [-118.2437, 34.0522];
    expect(shouldRecenterViewport(lastCentered, newAddress)).toBe(true);
  });
});
