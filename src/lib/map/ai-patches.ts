// ============================================================
// AI Patch Generation: SiteIntelligence → EstimatePatch[]
// ============================================================

import type { EstimateInput } from '@/lib/estimate/types';
import type { EstimatePatch, PatchBatch } from './types';
import type { SiteIntelligence } from '@/lib/ai/site-assessment-types';
import { deepGet } from './sync';

// Only these field paths may be written by AI analysis
const ALLOWED_AI_FIELD_PATHS = new Set([
  'parkingEnvironment.type',
  'parkingEnvironment.surfaceType',
  'parkingEnvironment.trafficControlRequired',
  'parkingEnvironment.hasPTSlab',
  'site.siteType',
  'charger.mountType',
  'charger.count',
  'charger.chargingLevel',
  'charger.brand',
]);

/**
 * Convert SiteIntelligence merged inferences into EstimatePatch[].
 *
 * Follows the same pattern as generatePatches() in sync.ts:
 * - For each merged inference, compare to current EstimateInput
 * - Only generate patch if value differs AND fieldPath is allowlisted
 * - Set source: 'ai_analysis', include AI reasoning
 */
export function generateAIPatches(
  intelligence: SiteIntelligence,
  currentInput: EstimateInput,
): PatchBatch {
  const patches: EstimatePatch[] = [];
  let patchCounter = 0;

  for (const inference of intelligence.mergedInferences) {
    // Only allow known field paths — reject anything unexpected
    if (!ALLOWED_AI_FIELD_PATHS.has(inference.fieldPath)) continue;

    const currentValue = deepGet(currentInput, inference.fieldPath);

    // Skip if values are already the same
    if (inference.value === currentValue) continue;
    if (inference.value === null && currentValue === undefined) continue;

    patchCounter += 1;

    const sourceIcon = inference.source === 'satellite' ? 'Satellite'
      : inference.source === 'streetview' ? 'Street View'
      : 'Satellite + Street View';

    const patch: EstimatePatch = {
      id: `ai-patch-${String(patchCounter).padStart(4, '0')}`,
      fieldPath: inference.fieldPath,
      previousValue: currentValue ?? null,
      proposedValue: inference.value,
      source: 'ai_analysis',
      reason: `AI ${sourceIcon} (${Math.round(inference.confidence * 100)}%): ${inference.reasoning}`,
      status: 'pending',
    };

    patches.push(patch);
  }

  return {
    batchId: `ai-batch-${Date.now()}`,
    trigger: 'ai_site_assessment',
    patches,
    createdAt: new Date().toISOString(),
  };
}
