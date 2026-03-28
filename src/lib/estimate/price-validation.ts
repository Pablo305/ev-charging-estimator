import pricebookV2 from '@/lib/estimate/data/pricebook-v2.json';
import { toCanonical } from '@/lib/estimate/description-normalizer';
import type { EstimateLineItem, PriceValidationIssue } from '@/lib/estimate/types';

type V2Item = (typeof pricebookV2.items)[number];

interface ObservedRange {
  min: number;
  max: number;
  median: number;
}

function buildObservedIndex(): Map<string, ObservedRange> {
  const map = new Map<string, ObservedRange>();
  for (const row of pricebookV2.items as V2Item[]) {
    const obs = row.observedPrices;
    if (!obs || typeof obs.min !== 'number') continue;
    const key = toCanonical(row.description);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { min: obs.min, max: obs.max, median: obs.median });
    } else {
      map.set(key, {
        min: Math.min(prev.min, obs.min),
        max: Math.max(prev.max, obs.max),
        median: obs.median,
      });
    }
  }
  return map;
}

const observedIndex = buildObservedIndex();

const EPS = 0.01;

/**
 * Compare line items to observed proposal ranges; optionally snap unit prices to median when outside range (D2).
 */
export function validateAndCalibratePrices(
  items: EstimateLineItem[],
  options?: { applyMedianWhenOutOfRange?: boolean },
): { items: EstimateLineItem[]; issues: PriceValidationIssue[] } {
  const apply = options?.applyMedianWhenOutOfRange === true;
  const next: EstimateLineItem[] = [];
  const issues: PriceValidationIssue[] = [];

  for (const li of items) {
    if (li.pricingSource === 'sow_import') {
      next.push(li);
      continue;
    }

    const key = toCanonical(li.description);
    const range = observedIndex.get(key);

    if (!range || li.quantity <= 0) {
      next.push(li);
      continue;
    }

    let status: PriceValidationIssue['status'] = 'in_range';
    if (li.unitPrice < range.min - EPS) status = 'below_observed';
    else if (li.unitPrice > range.max + EPS) status = 'above_observed';

    let unitPrice = li.unitPrice;
    let adjusted = false;

    const originalStatus = status;
    if (apply && status !== 'in_range') {
      unitPrice = Math.round(range.median * 100) / 100;
      adjusted = true;
    }

    const updated: EstimateLineItem =
      adjusted
        ? {
            ...li,
            unitPrice,
            extendedPrice: Math.round(li.quantity * unitPrice * 100) / 100,
            pricingSource: 'calculated',
          }
        : li;

    next.push(updated);

    if (originalStatus !== 'in_range' || adjusted) {
      issues.push({
        lineItemId: li.id,
        description: li.description,
        unitPrice: li.unitPrice,
        observedMin: range.min,
        observedMax: range.max,
        observedMedian: range.median,
        status: originalStatus,
        adjustedToMedian: adjusted,
      });
    }
  }

  return { items: next, issues };
}
