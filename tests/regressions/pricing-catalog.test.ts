/**
 * Regression guard for the extracted pricing catalog.
 * Guarantees the JSON produced by scripts/extract-pricing-catalog.ts keeps the
 * invariants the estimator engine relies on.
 */
import { describe, expect, it } from 'vitest';

import catalog from '../../src/lib/estimate/data/pricingCatalog.json';
import formulas from '../../src/lib/estimate/data/jobTypeFormulas.json';

interface CatalogEntry {
  productId: string;
  description: string;
  unitPrice: number;
  category: string;
  unit?: string;
  sourceTemplate: string;
  variant?: string;
}

interface JobTypeFormula {
  templateSource: string;
  lineItems: Array<{
    row: number;
    productId: string;
    qtyFrom: string;
    defectInTemplate: boolean;
    raw: Record<string, unknown>;
  }>;
}

const EXPECTED_TEMPLATE_IDS = [
  'resi-ev',
  'install-commission',
  'commissioning-only',
  'equipment-only',
  'remove-replace',
  'service-ticket',
  'garage-full-turnkey',
  'parking-lot-full-turnkey',
  'supercharger',
];

describe('pricingCatalog.json', () => {
  const entries = catalog as CatalogEntry[];

  it('has entries', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('every entry has required fields with valid values', () => {
    for (const entry of entries) {
      expect(entry.productId, `productId missing on ${JSON.stringify(entry)}`).toBeTruthy();
      expect(entry.description, `description missing on ${entry.productId}`).toBeTruthy();
      expect(entry.category, `category missing on ${entry.productId}`).toBeTruthy();
      expect(entry.unitPrice, `unitPrice invalid on ${entry.productId}`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate productIds unless variants are set', () => {
    const seen = new Map<string, CatalogEntry>();
    for (const entry of entries) {
      const prior = seen.get(entry.productId);
      if (prior) {
        // Both sides must carry a variant discriminator if they share an id.
        expect(
          Boolean(prior.variant) && Boolean(entry.variant),
          `duplicate productId "${entry.productId}" without variant split`,
        ).toBe(true);
      }
      seen.set(entry.productId, entry);
    }
  });
});

describe('jobTypeFormulas.json', () => {
  const byTemplate = formulas as Record<string, JobTypeFormula>;

  it('contains all 9 template ids', () => {
    for (const id of EXPECTED_TEMPLATE_IDS) {
      expect(byTemplate[id], `missing template ${id}`).toBeDefined();
      expect(byTemplate[id].templateSource).toBeTruthy();
      expect(Array.isArray(byTemplate[id].lineItems)).toBe(true);
    }
  });
});
