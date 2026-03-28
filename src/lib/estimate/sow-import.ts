import type {
  EstimateCategory,
  EstimateLineItem,
  ManualReviewTrigger,
  SOWLineItem,
} from './types';

const VALID_CATEGORIES = new Set<EstimateCategory>([
  'CHARGER',
  'PEDESTAL',
  'CIVIL',
  'DES/ENG',
  'ELEC',
  'ELEC LBR',
  'ELEC LBR MAT',
  'ELEC MAT',
  'MATERIAL',
  'MISC',
  'NETWORK',
  'PERMIT',
  'SAFETY',
  'SITE WORK',
  'SOFTWARE',
  'SERVICE_FEE',
  'EXCLUSION',
]);

function coerceCategory(raw: string | undefined, description: string): EstimateCategory {
  if (raw && VALID_CATEGORIES.has(raw as EstimateCategory)) {
    return raw as EstimateCategory;
  }
  return inferCategoryFromSowDescription(description);
}

function createSowCounters() {
  let sowLineCounter = 0;
  return {
    nextSowLineId(): string {
      sowLineCounter += 1;
      return `SOW-LI-${String(sowLineCounter).padStart(3, '0')}`;
    },
  };
}

/** Map pasted line description to an estimate category for rollups */
export function inferCategoryFromSowDescription(description: string): EstimateCategory {
  const d = description.toLowerCase();
  if (/permit|utility coord|coordination/i.test(d) && !/conduit|wire/i.test(d)) return 'DES/ENG';
  if (/design|engineering|load calc|stamped|plan set/i.test(d)) return 'DES/ENG';
  if (/civil|trench|asphalt|concrete|bollard|encase|pad|ground prep|rock|masonry|fence|mobil/i.test(d))
    return 'CIVIL';
  if (/supercharger posts|v4 super|charger.*by others/i.test(d)) return 'CHARGER';
  if (/install.*commission|lbr install|pull conductor/i.test(d)) return 'ELEC LBR';
  if (/conduit|wire|mcm|pvc|sch 40|switchgear|meter pad|bos|submeter/i.test(d)) return 'ELEC LBR MAT';
  if (/transformer|xfrm/i.test(d)) return 'ELEC';
  if (/wifi|router|network|cat6|cellular/i.test(d)) return 'NETWORK';
  if (/signage|sign |wheel stop|striping/i.test(d)) return 'SITE WORK';
  if (/software|cloud|activation/i.test(d)) return 'SOFTWARE';
  if (/equipment rental|roll off|portocan|misc/i.test(d)) return 'MISC';
  if (/traffic|safety fence|trench plate/i.test(d)) return 'SAFETY';
  return 'MISC';
}

function shouldSkipSowLine(description: string): boolean {
  const d = description.trim().toLowerCase();
  if (!d) return true;
  return /^subtotal|^total\b|^sales tax|^thank you|^quotation/i.test(d);
}

/**
 * Build engine line items from tabular SOW rows. Uses printed extended amounts.
 */
export function buildLineItemsFromSowImport(rows: SOWLineItem[]): EstimateLineItem[] {
  const counters = createSowCounters();
  const items: EstimateLineItem[] = [];

  for (const row of rows) {
    if (shouldSkipSowLine(row.description)) continue;

    const category = coerceCategory(row.category, row.description);

    const ext =
      row.amount > 0
        ? Math.round(row.amount * 100) / 100
        : Math.round(row.quantity * row.unitPrice * 100) / 100;

    const manualReview = row.amount <= 0 && /tbd/i.test(row.description);

    items.push({
      id: counters.nextSowLineId(),
      category,
      description: row.description.trim(),
      quantity: row.quantity,
      unit: row.unit || 'EA',
      unitPrice: Math.round(row.unitPrice * 100) / 100,
      extendedPrice: ext,
      pricingSource: 'sow_import',
      ruleName: 'SOW line import',
      ruleReason: 'Imported from pasted proposal / tabular scope',
      sourceInputs: ['rawLineItems'],
      manualReviewRequired: manualReview,
      manualReviewReason: manualReview ? 'TBD or incomplete amount in source document' : undefined,
      confidence: manualReview ? 'low' : 'high',
    });
  }

  return items;
}

export function sowImportInfoReview(): ManualReviewTrigger {
  return {
    id: 'MR-SOW-IMPORT-001',
    field: 'rawLineItems',
    condition: 'Tabular SOW import',
    severity: 'warning',
    message:
      'Line items and amounts reflect the pasted proposal. Confirm against current pricebook, site walk, and exclusions before binding.',
  };
}
