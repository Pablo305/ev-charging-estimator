import { describe, it, expect } from 'vitest';
import { deriveRunLengths } from '@/lib/map/measurements';

/**
 * Trunk-and-branch topology.
 *
 * BUG history: Prior implementation summed panel→charger distances as if
 * every charger needed a dedicated home-run trench. Combined with a PVC
 * unit price ~$20/ft, multi-charger jobs overstated conduit by ~3×.
 *
 * Correct behavior:
 *   - wireFt  SUMS distances (each drop has its own conductors, physically)
 *   - conduitFt = (trunk + 15ft × (n-1)) × 1.15  (shared conduit trench)
 *   - trunkFt   = max distance × 1.15           (used for distanceToPanel_ft)
 */
describe('deriveRunLengths (trunk-and-branch)', () => {
  it('handles empty input', () => {
    const r = deriveRunLengths([]);
    expect(r).toEqual({ wireFt: 0, conduitFt: 0, trunkFt: 0 });
  });

  it('single charger: conduit = wire = trunk × 1.15', () => {
    const r = deriveRunLengths([100]);
    expect(r.trunkFt).toBe(115);   // 100 × 1.15
    expect(r.conduitFt).toBe(115); // 100 × 1.15 (no branches)
    expect(r.wireFt).toBe(115);    // 100 × 1.15
  });

  it('10 chargers @ 100ft each: conduit is NOT 10× wire', () => {
    const distances = Array.from({ length: 10 }, () => 100);
    const r = deriveRunLengths(distances);

    // Wire: sum × 1.15 = 1000 × 1.15 = 1150 ft (per-drop conductors)
    expect(r.wireFt).toBe(1150);

    // Conduit: (100 + 15×9) × 1.15 = 235 × 1.15 = 270 ft (shared trench)
    expect(r.conduitFt).toBe(270);

    // Trunk: max × 1.15 = 115 ft
    expect(r.trunkFt).toBe(115);

    // The critical ratio: conduit should be ~25% of pre-fix value of 1150
    expect(r.conduitFt).toBeLessThan(r.wireFt / 3);
  });

  it('4 chargers @ 180ft (Best Western-style): conduit ~258ft, not 828ft', () => {
    const r = deriveRunLengths([180, 180, 180, 180]);
    // Pre-fix: sum(180×4) × 1.15 = 828 ft   ← the "triple" bug
    // Post-fix: (180 + 15×3) × 1.15 = 258.75 → 259 ft
    expect(r.conduitFt).toBe(259);
    expect(r.wireFt).toBe(828);
    expect(r.trunkFt).toBe(207);
  });

  it('monotonic in count at fixed per-drop distance', () => {
    const d = 100;
    const r5 = deriveRunLengths(Array(5).fill(d));
    const r10 = deriveRunLengths(Array(10).fill(d));

    // Conduit scales with branches, not full sum — so doubling count
    // should NOT double conduit.
    expect(r10.conduitFt).toBeGreaterThan(r5.conduitFt);
    expect(r10.conduitFt / r5.conduitFt).toBeLessThan(1.7);

    // Wire IS per-drop, so wire doubles.
    expect(r10.wireFt / r5.wireFt).toBeCloseTo(2, 1);
  });

  it('unequal distances: trunk = max, not sum', () => {
    const r = deriveRunLengths([50, 150, 100, 200]);
    // max = 200; branches = 15 × 3 = 45; conduit = (200+45) × 1.15 = 281.75 → 282
    expect(r.trunkFt).toBe(230);
    expect(r.conduitFt).toBe(282);
    // wire = (50+150+100+200) × 1.15 = 575
    expect(r.wireFt).toBe(575);
  });
});
