import { describe, it } from 'vitest';
import { generateEstimate } from '@/lib/estimate/engine';
import { emptyInput } from '@/lib/estimate/emptyInput';
import type { EstimateInput } from '@/lib/estimate/types';

function inputFor(chargerCount: number, conduitDistanceFt: number): EstimateInput {
  const base = emptyInput();
  return {
    ...base,
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

describe('DIAGNOSTIC — dump every ELEC line item', () => {
  it('short run scenario — 1 charger × 50 ft', () => {
    const output = generateEstimate(inputFor(1, 50));
    const elec = output.lineItems.filter(
      (li) => li.category === 'ELEC' || li.category === 'ELEC LBR MAT' || li.category === 'ELEC LBR',
    );
    console.log('\n=== SHORT RUN (1 charger, 50 ft) ELEC lines ===');
    for (const li of elec) {
      console.log(
        `[${li.category}] ${li.ruleName}  qty=${li.quantity} ${li.unit}  $${li.unitPrice}/u  ext=$${li.extendedPrice}`,
      );
    }
    console.log(`TOTAL: $${output.summary.total.toFixed(2)}`);
  });

  it('long run scenario — 10 chargers × 115 ft buffered = 1150 ft', () => {
    const output = generateEstimate(inputFor(10, 1150));
    const elec = output.lineItems.filter(
      (li) => li.category === 'ELEC' || li.category === 'ELEC LBR MAT' || li.category === 'ELEC LBR',
    );
    console.log('\n=== LONG RUN (10 chargers, 1150 ft) ELEC lines ===');
    for (const li of elec) {
      console.log(
        `[${li.category}] ${li.ruleName}  qty=${li.quantity} ${li.unit}  $${li.unitPrice}/u  ext=$${li.extendedPrice}`,
      );
    }
    console.log(`TOTAL: $${output.summary.total.toFixed(2)}`);
  });

  it('all categories dump — 4 chargers × 828 ft (Best Western-style)', () => {
    const output = generateEstimate(inputFor(4, 828));
    const grouped: Record<string, number> = {};
    for (const li of output.lineItems) {
      grouped[li.category] = (grouped[li.category] ?? 0) + li.extendedPrice;
    }
    console.log('\n=== BEST WESTERN-STYLE category totals ===');
    for (const [cat, sum] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat.padEnd(16)} $${sum.toFixed(2)}`);
    }
    console.log(`GRAND TOTAL: $${output.summary.total.toFixed(2)}`);
    console.log('--- conduit/pvc/emt line items ---');
    for (const li of output.lineItems) {
      const text = `${li.description} ${li.ruleName}`.toLowerCase();
      if (text.includes('conduit') || text.includes('emt') || text.includes('pvc')) {
        console.log(
          `  [${li.category}] ${li.ruleName}  qty=${li.quantity} ${li.unit}  ext=$${li.extendedPrice}`,
        );
      }
    }
  });
});
