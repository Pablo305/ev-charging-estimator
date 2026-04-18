import { describe, it, expect } from 'vitest';
import { generateEstimate } from '@/lib/estimate/engine';
import { emptyInput } from '@/lib/estimate/emptyInput';
import type { EstimateInput, EstimateLineItem } from '@/lib/estimate/types';

function inputWithMapDistance(
  chargerCount: number,
  conduitDistanceFt: number,
  overrides: Partial<EstimateInput> = {},
): EstimateInput {
  const base = emptyInput();
  return {
    ...base,
    ...overrides,
    project: { ...base.project, projectType: 'full_turnkey' },
    charger: {
      ...base.charger,
      brand: 'Tesla',
      model: 'Universal Wall Connector',
      count: chargerCount,
      portType: chargerCount === 1 ? 'single' : 'dual',
      mountType: 'wall',
      chargingLevel: 'l2',
      ampsPerCharger: 48,
      volts: 240,
    },
    electrical: {
      ...base.electrical,
      serviceType: 'existing_panel',
      availableAmps: 400,
    },
    mapWorkspace: {
      ...base.mapWorkspace,
      conduitDistance_ft: conduitDistanceFt,
      trenchingDistance_ft: conduitDistanceFt,
      pvcConduitDistance_ft: conduitDistanceFt,
      hasPanelPlaced: true,
      chargerCountFromMap: chargerCount,
    },
  };
}

function findConduitLines(lineItems: EstimateLineItem[]): EstimateLineItem[] {
  return lineItems.filter((li) => {
    const text = `${li.description ?? ''} ${li.ruleName ?? ''}`.toLowerCase();
    return (
      text.includes('conduit') ||
      text.includes('emt') ||
      text.includes('pvc')
    );
  });
}

function sumLineTotal(lines: EstimateLineItem[]): number {
  return lines.reduce(
    (acc, li) => acc + (li.extendedPrice ?? li.quantity * li.unitPrice),
    0,
  );
}

describe('regression: conduit is not triple-counted', () => {
  it('short run (distance < 60ft) emits conduit exactly once', () => {
    // 1 Tesla UWC, 50 ft from panel. Short-run branch.
    const input = inputWithMapDistance(1, 50);
    const output = generateEstimate(input);

    const conduitLines = findConduitLines(output.lineItems);

    // Expectation (post-fix): exactly ONE composite conduit-and-wire line.
    // Today (pre-fix): BOTH 'eleclbrmat-conduit-wire' AND 'eleclbrmat-pvc-conduit'
    // fire at lines 672-703 of rules.ts, double-counting the same physical run.
    expect(conduitLines.length).toBeLessThanOrEqual(1);
  });

  it('long run (distance > 60ft) emits conductors + one conduit, not parallel duplicates', () => {
    // 10 chargers, 100 ft panel-to-charger buffered distance = 1150 LF.
    const input = inputWithMapDistance(10, 1150);
    const output = generateEstimate(input);

    const conduitLines = findConduitLines(output.lineItems);

    // Wire (conductors) + conduit (pipe) is correct; wire lives INSIDE conduit.
    // So exactly 2 conduit-adjacent lines is acceptable (1 conductors + 1 PVC 3").
    // >2 means double-counting.
    expect(conduitLines.length).toBeLessThanOrEqual(2);

    // Every emitted conduit line must use the declared map distance, not a multiple of it.
    for (const li of conduitLines) {
      expect(li.quantity).toBeLessThanOrEqual(1150);
    }
  });

  it('monotonicity: doubling charger count does not triple conduit spend', () => {
    // Same per-charger distance, so buffered mapWorkspace.conduitDistance_ft
    // is linear in charger count. Conduit cost should roughly track count, not explode.
    const small = generateEstimate(inputWithMapDistance(5, 575));   //  5 × 100ft × 1.15
    const large = generateEstimate(inputWithMapDistance(10, 1150)); // 10 × 100ft × 1.15

    const smallConduit = sumLineTotal(findConduitLines(small.lineItems));
    const largeConduit = sumLineTotal(findConduitLines(large.lineItems));

    // Large should be ~2x small. If bug is present, the ratio often balloons
    // because cascading rules each multiply independently.
    if (smallConduit > 0) {
      const ratio = largeConduit / smallConduit;
      expect(ratio).toBeGreaterThan(1.5);
      expect(ratio).toBeLessThan(2.5);
    }
  });

  it('historical reference: Best Western-style 4 chargers @ 180ft stays under $105k', () => {
    // Reference: Best Western Plus Hotel & Suites — 4 Tesla, parking lot, ~180ft.
    // Actual proposal total ≈ $98,975. Allow ±10% engine tolerance here (stricter
    // fixture tests live in estimate-accuracy.test.ts).
    const input = inputWithMapDistance(4, 828, {
      project: { ...emptyInput().project, projectType: 'full_turnkey' },
      site: { ...emptyInput().site, siteType: 'commercial_parking_lot', state: 'TX' },
    });
    const output = generateEstimate(input);
    expect(output.summary.total).toBeLessThan(105000);
  });
});
