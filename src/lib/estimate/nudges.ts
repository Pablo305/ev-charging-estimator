// ============================================================
// Cross-Section Nudge Engine — Detects mismatches & opportunities
// ============================================================

import type { EstimateInput } from './types';

export interface Nudge {
  readonly id: string;
  readonly targetTab: string;
  readonly message: string;
  readonly severity: 'info' | 'warning';
}

export function generateNudges(input: EstimateInput): Nudge[] {
  const nudges: Nudge[] = [];
  const mw = input.mapWorkspace;

  // Map charger count vs form charger count mismatch
  if (mw?.chargerCountFromMap && mw.chargerCountFromMap > 0) {
    if (input.charger.count !== mw.chargerCountFromMap) {
      nudges.push({
        id: 'charger-count-mismatch',
        targetTab: 'Charger',
        message: `Map shows ${mw.chargerCountFromMap} charger(s) but form has ${input.charger.count}. Update charger count to match.`,
        severity: 'warning',
      });
    }
  }

  // Map has transformer but form doesn't reflect it
  if (mw && mw.drawings?.equipment?.some((e) => e.equipmentType === 'transformer')) {
    if (input.electrical.transformerRequired !== true) {
      nudges.push({
        id: 'transformer-mismatch',
        targetTab: 'Electrical',
        message: 'A transformer is placed on the map. Confirm transformer requirement in Electrical section.',
        severity: 'info',
      });
    }
  }

  // Map has bollards but form has 0
  if (mw && mw.drawings?.equipment?.some((e) => e.equipmentType === 'bollard')) {
    const mapBollards = mw.drawings?.equipment?.filter((e) => e.equipmentType === 'bollard').length ?? 0;
    if (input.accessories.bollardQty === 0 && mapBollards > 0) {
      nudges.push({
        id: 'bollard-mismatch',
        targetTab: 'Accessories',
        message: `Map shows ${mapBollards} bollard(s) but form has 0. Update bollard quantity.`,
        severity: 'info',
      });
    }
  }

  // L3 chargers but not 480V service
  if (input.charger.chargingLevel === 'l3_dcfc' && input.electrical.serviceType && input.electrical.serviceType !== '480v_3phase' && input.electrical.serviceType !== 'unknown') {
    nudges.push({
      id: 'l3-service-mismatch',
      targetTab: 'Electrical',
      message: `L3 DCFC chargers require 480V 3-phase service, but "${input.electrical.serviceType}" is selected.`,
      severity: 'warning',
    });
  }

  // Charger count > 0 but no brand selected
  if (input.charger.count > 0 && !input.charger.brand) {
    nudges.push({
      id: 'charger-no-brand',
      targetTab: 'Charger',
      message: `${input.charger.count} charger(s) specified but no brand selected. Brand determines hardware pricing.`,
      severity: 'info',
    });
  }

  // Post-tensioned slab but coring not flagged
  if (input.parkingEnvironment.hasPTSlab === true && input.parkingEnvironment.coringRequired !== true) {
    nudges.push({
      id: 'pt-slab-coring',
      targetTab: 'Parking',
      message: 'Post-tensioned slab detected but coring is not flagged. PT slabs require slab scanning before coring.',
      severity: 'warning',
    });
  }

  // Electrical capacity exceeded
  if (input.charger.ampsPerCharger && input.charger.count > 0 && input.electrical.availableAmps) {
    const totalDemand = input.charger.ampsPerCharger * input.charger.count;
    if (totalDemand > input.electrical.availableAmps) {
      nudges.push({
        id: 'electrical-overcapacity',
        targetTab: 'Electrical',
        message: `Total charger demand (${totalDemand}A) exceeds available capacity (${input.electrical.availableAmps}A). Panel upgrade or load management required.`,
        severity: 'warning',
      });
    }
  }

  // Map has switchgear but form doesn't reflect it
  if (mw && mw.drawings?.equipment?.some((e) => e.equipmentType === 'switchgear')) {
    if (input.electrical.switchgearRequired !== true) {
      nudges.push({
        id: 'switchgear-mismatch',
        targetTab: 'Electrical',
        message: 'Switchgear is placed on the map but not flagged in the Electrical section.',
        severity: 'info',
      });
    }
  }

  return nudges;
}
