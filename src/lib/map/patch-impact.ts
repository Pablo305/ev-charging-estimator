// ============================================================
// Patch Impact Summaries — Human-readable cost impact estimates
// ============================================================

/**
 * Returns a brief human-readable cost impact string for a given patch,
 * or null if no meaningful impact can be estimated.
 */
export function getImpactSummary(fieldPath: string, proposedValue: unknown): string | null {
  if (proposedValue == null) return null;

  // Transformer: major cost item
  if (fieldPath === 'electrical.transformerRequired' && proposedValue === true) {
    return 'Adds ~$15,000\u2013$40,000 for transformer procurement & installation';
  }

  // Switchgear
  if (fieldPath === 'electrical.switchgearRequired' && proposedValue === true) {
    return 'Adds ~$8,000\u2013$25,000 for switchgear equipment & installation';
  }

  // Panel upgrade
  if (fieldPath === 'electrical.panelUpgradeRequired' && proposedValue === true) {
    return 'Adds ~$3,000\u2013$8,000 for panel upgrade';
  }

  // Meter room
  if (fieldPath === 'electrical.meterRoomRequired' && proposedValue === true) {
    return 'Adds utility metering infrastructure costs';
  }

  // Conduit distance
  if (fieldPath === 'mapWorkspace.conduitDistance_ft' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 18); // ~$18/LF typical
    return `Adds ~$${est.toLocaleString()} in conduit materials & labor (${proposedValue}ft)`;
  }

  // Feeder distance
  if (fieldPath === 'mapWorkspace.feederDistance_ft' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 22); // ~$22/LF typical
    return `Adds ~$${est.toLocaleString()} in feeder cable & labor (${proposedValue}ft)`;
  }

  // Trenching distance
  if (fieldPath === 'mapWorkspace.trenchingDistance_ft' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 25); // ~$25/LF typical
    return `Adds ~$${est.toLocaleString()} in trenching labor (${proposedValue}ft)`;
  }

  // Boring distance
  if (fieldPath === 'mapWorkspace.boringDistance_ft' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 45); // ~$45/LF typical
    return `Adds ~$${est.toLocaleString()} in directional boring (${proposedValue}ft)`;
  }

  // Concrete cutting
  if (fieldPath === 'mapWorkspace.concreteCuttingDistance_ft' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 35); // ~$35/LF typical
    return `Adds ~$${est.toLocaleString()} in concrete cutting (${proposedValue}ft)`;
  }

  // Charger count
  if ((fieldPath === 'charger.count' || fieldPath === 'mapWorkspace.chargerCountFromMap') && typeof proposedValue === 'number') {
    return `${proposedValue} charger(s) \u2014 hardware cost depends on brand/model selection`;
  }

  // Bollards
  if (fieldPath === 'accessories.bollardQty' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 250);
    return `Adds ~$${est.toLocaleString()} for ${proposedValue} bollard(s)`;
  }

  // Junction boxes
  if (fieldPath === 'electrical.junctionBoxCount' && typeof proposedValue === 'number') {
    const est = Math.round(proposedValue * 350);
    return `Adds ~$${est.toLocaleString()} for ${proposedValue} junction box(es)`;
  }

  // Distance to panel (general electrical)
  if (fieldPath === 'electrical.distanceToPanel_ft' && typeof proposedValue === 'number') {
    return `${proposedValue}ft panel distance \u2014 affects conduit & wiring costs`;
  }

  // Coring required
  if (fieldPath === 'parkingEnvironment.coringRequired' && proposedValue === true) {
    return 'Adds ~$500\u2013$2,000 for concrete coring';
  }

  // Slab scan
  if (fieldPath === 'parkingEnvironment.slabScanRequired' && proposedValue === true) {
    return 'Adds ~$800\u2013$1,500 for GPR slab scan';
  }

  // Service type upgrade
  if (fieldPath === 'electrical.serviceType' && proposedValue === '480v_3phase') {
    return 'L3 DCFC requires 480V 3-phase service \u2014 may need utility upgrade';
  }

  // Stamped plans
  if (fieldPath === 'designEngineering.stampedPlansRequired' && proposedValue === true) {
    return 'Adds ~$2,500\u2013$5,000 for PE-stamped engineering plans';
  }

  return null;
}
