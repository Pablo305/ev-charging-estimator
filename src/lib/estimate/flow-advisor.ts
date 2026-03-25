// ============================================================
// Flow Advisor — Adaptive "Next Best Action" Engine
// ============================================================

import type { EstimateInput } from './types';

export type TabName =
  | 'Project' | 'Customer' | 'Site' | 'Parking' | 'Charger'
  | 'Electrical' | 'Civil' | 'Permit/Design' | 'Network'
  | 'Accessories' | 'Responsibilities' | 'Controls';

export interface FlowAdvice {
  /** The tab the user should focus on next, or null if all required fields are filled */
  nextTab: TabName | null;
  /** Human-readable action description */
  nextAction: string;
  /** Tabs that are irrelevant for this project type */
  skipTabs: TabName[];
  /** Contextual tips based on current state */
  completionHints: string[];
}

function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === '' || val === 0;
}

export function getFlowAdvice(input: EstimateInput): FlowAdvice {
  const skipTabs: TabName[] = [];
  const completionHints: string[] = [];

  // Determine which tabs to skip based on project type
  const pt = input.project.projectType;
  if (pt === 'commission_only') {
    skipTabs.push('Civil', 'Electrical', 'Accessories', 'Parking', 'Network');
  } else if (pt === 'equipment_purchase') {
    skipTabs.push('Civil', 'Electrical', 'Accessories', 'Parking', 'Network', 'Permit/Design');
  } else if (pt === 'service_work') {
    skipTabs.push('Accessories', 'Network');
  }

  // Priority-ordered checks for next best action
  if (isEmpty(input.project.projectType)) {
    return { nextTab: 'Project', nextAction: 'Select a project type to get started', skipTabs, completionHints };
  }

  if (isEmpty(input.project.name)) {
    return { nextTab: 'Project', nextAction: 'Add a project name', skipTabs, completionHints };
  }

  if (isEmpty(input.site.address)) {
    completionHints.push('Tip: Use the Map Workspace for visual site planning');
    return { nextTab: 'Site', nextAction: 'Enter the site address', skipTabs, completionHints };
  }

  if (isEmpty(input.charger.count) || input.charger.count === 0) {
    return { nextTab: 'Charger', nextAction: 'Specify charger count and type', skipTabs, completionHints };
  }

  if (isEmpty(input.charger.brand)) {
    completionHints.push('Charger brand determines hardware pricing from the pricebook');
    return { nextTab: 'Charger', nextAction: 'Select a charger brand', skipTabs, completionHints };
  }

  if (isEmpty(input.charger.chargingLevel)) {
    return { nextTab: 'Charger', nextAction: 'Choose L2 or L3 DCFC charging level', skipTabs, completionHints };
  }

  if (isEmpty(input.customer.companyName)) {
    return { nextTab: 'Customer', nextAction: 'Add client company name', skipTabs, completionHints };
  }

  // L3 DCFC-specific hints
  if (input.charger.chargingLevel === 'l3_dcfc') {
    if (input.electrical.serviceType !== '480v_3phase') {
      completionHints.push('L3 DCFC chargers require 480V 3-phase electrical service');
    }
    if (input.electrical.transformerRequired == null) {
      completionHints.push('L3 installations typically require a transformer');
    }
  }

  // Map has data but electrical is empty
  if (input.mapWorkspace && !skipTabs.includes('Electrical')) {
    const hasMapDistances = (input.mapWorkspace.conduitDistance_ft ?? 0) > 0
      || (input.mapWorkspace.feederDistance_ft ?? 0) > 0;
    if (hasMapDistances && isEmpty(input.electrical.serviceType)) {
      return { nextTab: 'Electrical', nextAction: 'Confirm electrical service type (map data ready)', skipTabs, completionHints };
    }
  }

  // Electrical section incomplete for non-skipped projects
  if (!skipTabs.includes('Electrical') && isEmpty(input.electrical.serviceType)) {
    return { nextTab: 'Electrical', nextAction: 'Select electrical service type', skipTabs, completionHints };
  }

  // Parking environment for garage projects
  if (!skipTabs.includes('Parking') && input.parkingEnvironment.type === 'parking_garage') {
    if (input.parkingEnvironment.hasPTSlab == null) {
      completionHints.push('Post-tensioned slabs require slab scanning before core drilling');
      return { nextTab: 'Parking', nextAction: 'Confirm if parking structure has PT slab', skipTabs, completionHints };
    }
  }

  // Responsibilities
  if (isEmpty(input.makeReady.responsibility) && pt === 'full_turnkey') {
    return { nextTab: 'Responsibilities', nextAction: 'Confirm make-ready responsibility assignment', skipTabs, completionHints };
  }

  // Pricing controls
  if (input.estimateControls.markupPercent === 0) {
    completionHints.push('Markup is currently 0% — adjust in Controls if needed');
  }

  // All critical fields filled — ready for estimate
  completionHints.push('All required fields are filled. Generate your estimate!');
  return { nextTab: null, nextAction: 'Ready to generate estimate', skipTabs, completionHints };
}

/** Section-specific pro tips keyed by tab name */
export const SECTION_TIPS: Partial<Record<TabName, string>> = {
  'Project': 'Full Turnkey includes all make-ready, installation, and charger procurement. Commission Only is charger activation and testing.',
  'Charger': 'Most hotels install 8\u201316 L2 chargers. L3 DCFC is for highway stations and fleet depots.',
  'Electrical': 'If you don\'t know available amps, select "Unknown" \u2014 we\'ll flag for a site survey.',
  'Parking': 'Post-tensioned slabs require GPR slab scanning ($800\u2013$1,500) before any core drilling.',
  'Permit/Design': 'Stamped engineering plans are required in most jurisdictions for L3 DCFC installations.',
  'Network': 'Cellular routers are the most reliable option for remote charging stations.',
  'Accessories': 'Bollards protect chargers from vehicle damage \u2014 recommended for all surface lot installations.',
  'Civil': 'Trenching costs vary significantly by surface type: asphalt is cheapest, concrete requires saw-cutting.',
};
