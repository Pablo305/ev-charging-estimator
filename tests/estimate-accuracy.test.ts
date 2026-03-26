import { describe, it, expect } from 'vitest';
import { generateEstimate } from '@/lib/estimate/engine';
import { matchDescription } from '@/lib/estimate/description-normalizer';
import type { EstimateInput } from '@/lib/estimate/types';

import hamptonInn from './fixtures/proposal-hampton-inn.json';
import transpecosBanks from './fixtures/proposal-transpecos-banks.json';
import brookside from './fixtures/proposal-brookside.json';
import crazyCajun from './fixtures/proposal-crazy-cajun.json';

interface ProposalFixture {
  proposalName: string;
  sourceFile: string;
  totalFromProposal: number;
  estimateInput: Record<string, unknown>;
  expectedLineItems: Array<{
    category: string;
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface AccuracyReport {
  proposalName: string;
  matched: number;
  total: number;
  coveragePercent: number;
  missingItems: string[];
  qtyMismatches: Array<{ description: string; expected: number; got: number }>;
  priceMismatches: Array<{ description: string; expected: number; got: number }>;
  estimatedTotal: number;
  proposalTotal: number;
  totalDeltaPercent: number;
}

/**
 * Runs the accuracy comparison and returns a structured report.
 * Does NOT assert — callers decide which checks are hard vs soft.
 */
function measureAccuracy(fixture: ProposalFixture): AccuracyReport {
  const output = generateEstimate(fixture.estimateInput as unknown as EstimateInput);

  let matched = 0;
  const missingItems: string[] = [];
  const qtyMismatches: AccuracyReport['qtyMismatches'] = [];
  const priceMismatches: AccuracyReport['priceMismatches'] = [];

  const nonZeroExpected = fixture.expectedLineItems.filter(
    (li) => li.amount > 0 || li.unitPrice > 0,
  );

  for (const expected of nonZeroExpected) {
    const match = output.lineItems.find((li) =>
      matchDescription(li.description, expected.description),
    );

    if (match) {
      matched++;

      if (match.quantity !== expected.qty) {
        qtyMismatches.push({
          description: expected.description,
          expected: expected.qty,
          got: match.quantity,
        });
      }

      if (expected.unitPrice > 0) {
        const tolerance = expected.unitPrice * 0.05;
        if (Math.abs(match.unitPrice - expected.unitPrice) > tolerance) {
          priceMismatches.push({
            description: expected.description,
            expected: expected.unitPrice,
            got: match.unitPrice,
          });
        }
      }
    } else {
      missingItems.push(expected.description);
    }
  }

  const coveragePercent = nonZeroExpected.length > 0
    ? Math.round((matched / nonZeroExpected.length) * 100)
    : 0;

  const totalDelta = output.summary.subtotal > 0
    ? Math.round(((output.summary.subtotal - fixture.totalFromProposal) / fixture.totalFromProposal) * 100)
    : -100;

  return {
    proposalName: fixture.proposalName,
    matched,
    total: nonZeroExpected.length,
    coveragePercent,
    missingItems,
    qtyMismatches,
    priceMismatches,
    estimatedTotal: output.summary.subtotal,
    proposalTotal: fixture.totalFromProposal,
    totalDeltaPercent: totalDelta,
  };
}

function logReport(report: AccuracyReport): void {
  console.log(`\n=== ${report.proposalName} Accuracy Report ===`);
  console.log(`  Line item coverage: ${report.matched}/${report.total} (${report.coveragePercent}%)`);
  console.log(`  Estimated total: $${report.estimatedTotal} vs Proposal: $${report.proposalTotal} (${report.totalDeltaPercent > 0 ? '+' : ''}${report.totalDeltaPercent}%)`);

  if (report.missingItems.length > 0) {
    console.log(`  Missing items (${report.missingItems.length}):`);
    for (const item of report.missingItems) {
      console.log(`    - ${item}`);
    }
  }
  if (report.qtyMismatches.length > 0) {
    console.log(`  Qty mismatches (${report.qtyMismatches.length}):`);
    for (const m of report.qtyMismatches) {
      console.log(`    - ${m.description}: expected ${m.expected}, got ${m.got}`);
    }
  }
  if (report.priceMismatches.length > 0) {
    console.log(`  Price mismatches (${report.priceMismatches.length}):`);
    for (const m of report.priceMismatches) {
      console.log(`    - ${m.description}: expected $${m.expected}, got $${m.got}`);
    }
  }
}

// ============================================================
// Tests
// ============================================================

describe('Crazy Cajun — tabular SOW import', () => {
  it('totals match pasted proposal subtotal when markup/tax are zero', () => {
    const output = generateEstimate(crazyCajun.estimateInput as unknown as EstimateInput);
    expect(output.lineItems.length).toBeGreaterThanOrEqual(15);
    expect(output.lineItems.every((li) => li.pricingSource === 'sow_import')).toBe(true);
    expect(output.summary.subtotal).toBeCloseTo(130679.6, 0);
    expect(output.summary.total).toBeCloseTo(130679.6, 0);
  });
});

describe('Estimate Accuracy — Regression Suite', () => {
  // ----------------------------------------------------------
  // Hard tests: engine must produce valid output from fixtures
  // ----------------------------------------------------------
  describe('Engine produces valid output', () => {
    it.each([
      ['Hampton Inn', hamptonInn],
      ['Transpecos Banks', transpecosBanks],
      ['Brookside', brookside],
    ])('%s: generates non-empty line items', (_name, fixture) => {
      const output = generateEstimate(
        fixture.estimateInput as unknown as EstimateInput,
      );
      expect(output).toBeDefined();
      expect(output.lineItems.length).toBeGreaterThan(0);
      expect(output.summary.subtotal).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // Accuracy measurements: tracks coverage & deviations.
  // These use soft expectations so the suite stays green while
  // the engine is being calibrated. Flip to hard expects once
  // the engine reaches target accuracy.
  // ----------------------------------------------------------
  describe('Accuracy measurements (soft — logged, not hard-fail)', () => {
    it('Hampton Inn: measure line item coverage and total accuracy', () => {
      const report = measureAccuracy(hamptonInn as ProposalFixture);
      logReport(report);

      // Soft threshold: baseline coverage. Increase as engine improves.
      // Hampton Inn: 95% as of calibration round 2
      expect(report.coveragePercent).toBeGreaterThanOrEqual(70);
    });

    it('Transpecos Banks: measure line item coverage and total accuracy', () => {
      const report = measureAccuracy(transpecosBanks as ProposalFixture);
      logReport(report);

      expect(report.coveragePercent).toBeGreaterThanOrEqual(60);
    });

    it('Brookside: measure line item coverage and total accuracy', () => {
      const report = measureAccuracy(brookside as ProposalFixture);
      logReport(report);

      expect(report.coveragePercent).toBeGreaterThanOrEqual(60);
    });
  });

  // ----------------------------------------------------------
  // Strict accuracy tests: enabled with progressive thresholds.
  // Target: 0 missing, 0 qty/price mismatches, ±10% total.
  // Current calibration level: coverage ≥75%, total ±40%.
  // Tighten thresholds as engine improves.
  // ----------------------------------------------------------
  describe('Strict accuracy (regression guard)', () => {
    it('Hampton Inn: coverage ≥90% and total within ±25%', () => {
      const report = measureAccuracy(hamptonInn as ProposalFixture);
      logReport(report);
      expect(report.coveragePercent).toBeGreaterThanOrEqual(90);
      expect(report.priceMismatches.length).toBeLessThanOrEqual(2);
      expect(Math.abs(report.totalDeltaPercent)).toBeLessThanOrEqual(25);
    });

    it('Transpecos Banks: coverage ≥85% and total within ±10%', () => {
      const report = measureAccuracy(transpecosBanks as ProposalFixture);
      logReport(report);
      expect(report.coveragePercent).toBeGreaterThanOrEqual(85);
      expect(report.priceMismatches.length).toBeLessThanOrEqual(3);
      expect(Math.abs(report.totalDeltaPercent)).toBeLessThanOrEqual(10);
    });

    it('Brookside: coverage ≥85% and total within ±20%', () => {
      const report = measureAccuracy(brookside as ProposalFixture);
      logReport(report);
      expect(report.coveragePercent).toBeGreaterThanOrEqual(85);
      expect(report.priceMismatches.length).toBeLessThanOrEqual(3);
      expect(Math.abs(report.totalDeltaPercent)).toBeLessThanOrEqual(20);
    });
  });
});
