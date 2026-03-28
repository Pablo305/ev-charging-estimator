// ============================================================
// Map Workspace Supplementary Rules
// Only fire when input.mapWorkspace exists.
// ============================================================

import {
  EstimateInput,
  EstimateLineItem,
  ManualReviewTrigger,
} from './types';
import { findPricebookItem, resolvePrice } from './catalog';

interface RuleResult {
  items: EstimateLineItem[];
  reviews: ManualReviewTrigger[];
}

function createMapCounters() {
  let lineCounter = 0;
  let reviewCounter = 0;
  return {
    nextLineId(): string {
      lineCounter += 1;
      return `MAP-LI-${String(lineCounter).padStart(3, '0')}`;
    },
    nextReviewId(): string {
      reviewCounter += 1;
      return `MAP-MR-${String(reviewCounter).padStart(3, '0')}`;
    },
  };
}

export function mapWorkspaceRules(input: EstimateInput): RuleResult {
  const counters = createMapCounters();

  if (!input.mapWorkspace) {
    return { items: [], reviews: [] };
  }

  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const mw = input.mapWorkspace;

  // ── Distance mismatch warnings ──
  // If form distance differs significantly from map distance, flag it
  if (
    mw.conduitDistance_ft !== null &&
    input.electrical.distanceToPanel_ft !== null
  ) {
    const formDist = input.electrical.distanceToPanel_ft;
    const mapDist = mw.conduitDistance_ft;
    const diff = Math.abs(formDist - mapDist);
    if (diff > 20) {
      reviews.push({
        id: counters.nextReviewId(),
        field: 'electrical.distanceToPanel_ft',
        condition: 'Map vs form distance mismatch',
        severity: diff > 50 ? 'critical' : 'warning',
        message: `Map conduit distance (${mapDist}ft) differs from form value (${formDist}ft) by ${diff}ft. Map measurement is being used for pricing.`,
      });
    }
  }

  // ── Charger count mismatch ──
  if (
    mw.chargerCountFromMap !== null &&
    input.charger.count > 0 &&
    mw.chargerCountFromMap !== input.charger.count
  ) {
    reviews.push({
      id: counters.nextReviewId(),
      field: 'charger.count',
      condition: 'Map vs form charger count mismatch',
      severity: 'warning',
      message: `${mw.chargerCountFromMap} charger(s) placed on map but form specifies ${input.charger.count}. Verify the correct count.`,
    });
  }

  // ── Feeder run line items (only when no conduit already priced by electricalRules) ──
  const conduitAlreadyPriced =
    mw.conduitDistance_ft != null ||
    input.electrical.distanceToPanel_ft != null ||
    (input.electrical.pvcConduit4in_ft != null && input.electrical.pvcConduit4in_ft > 0) ||
    (input.electrical.pvcConduit3in_ft != null && input.electrical.pvcConduit3in_ft > 0);

  if (mw.feederDistance_ft !== null && mw.feederDistance_ft > 0 && !conduitAlreadyPriced) {
    const feederItem = findPricebookItem('eleclbrmat-conduit-wire');
    if (feederItem) {
      const resolved = resolvePrice(feederItem, true);
      const unitPrice = resolved.price ?? 0;
      const ext = Math.round(mw.feederDistance_ft * unitPrice * 100) / 100;
      items.push({
        id: counters.nextLineId(),
        category: 'ELEC LBR MAT',
        description: `Feeder cable run (from map measurement)`,
        quantity: mw.feederDistance_ft,
        unit: 'LF',
        unitPrice,
        extendedPrice: ext,
        pricingSource: resolved.price !== null ? 'catalog' : 'tbd',
        ruleName: 'Map feeder run',
        ruleReason: `${mw.feederDistance_ft} LF feeder run measured on map workspace`,
        sourceInputs: ['mapWorkspace.feederDistance_ft'],
        manualReviewRequired: true,
        manualReviewReason: 'Feeder runs may require different wire gauge — verify sizing',
        confidence: 'medium',
      });
    }
  }

  // ── Bore cap warning ──
  if (mw.boringDistance_ft !== null && mw.boringDistance_ft >= 50) {
    reviews.push({
      id: counters.nextReviewId(),
      field: 'mapWorkspace.boringDistance_ft',
      condition: 'Boring distance at cap',
      severity: 'warning',
      message: `Boring distance is at the 50ft cap (${mw.boringDistance_ft}ft drawn). Consider splitting into bore + trench segments for longer runs.`,
    });
  }

  // ── Concrete cut cap warning ──
  if (mw.concreteCuttingDistance_ft !== null && mw.concreteCuttingDistance_ft >= 100) {
    reviews.push({
      id: counters.nextReviewId(),
      field: 'mapWorkspace.concreteCuttingDistance_ft',
      condition: 'Concrete cutting distance at cap',
      severity: 'warning',
      message: `Concrete cutting distance is at the 100ft cap (${mw.concreteCuttingDistance_ft}ft drawn). Verify scope with site team.`,
    });
  }

  return { items, reviews };
}
