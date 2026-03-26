// ============================================================
// Proposal Templates — 13 templates from real Excel workbooks
// ============================================================

import { EstimateInput } from './types';

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  complexity: 'simple' | 'standard' | 'complex';
  typicalPriceRange: [number, number];
  prefilledInput: Partial<EstimateInput>;
  skipTabs: string[];
  requiredFields: string[];
  suggestedMapTools: string[];
}

// ── Template Definitions ───────────────────────────────────────

export const PROPOSAL_TEMPLATES: readonly ProposalTemplate[] = [
  // 1. Full Turnkey Parking Lot
  {
    id: 'FULL_TURNKEY_PARKING_LOT',
    name: 'Full Turnkey — Parking Lot',
    description: 'Complete end-to-end installation in a surface parking lot. Includes civil, electrical, permitting, design, equipment, and commissioning.',
    icon: '\uD83C\uDFD7\uFE0F',
    complexity: 'complex',
    typicalPriceRange: [30000, 100000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: '6-10 weeks',
        isNewConstruction: false,
      },
      parkingEnvironment: {
        type: 'surface_lot',
        hasPTSlab: false,
        slabScanRequired: false,
        coringRequired: false,
        surfaceType: 'asphalt',
        trenchingRequired: true,
        boringRequired: false,
        trafficControlRequired: true,
        indoorOutdoor: 'outdoor',
        fireRatedPenetrations: false,
        accessRestrictions: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 1200 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: true },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'signage_bollards' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 10,
        markupPercent: 20,
      },
    },
    skipTabs: [],
    requiredFields: [
      'project.name', 'customer.companyName', 'site.address', 'charger.brand',
      'charger.model', 'charger.count', 'electrical.distanceToPanel_ft',
    ],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location'],
  },

  // 2. Full Turnkey Garage
  {
    id: 'FULL_TURNKEY_GARAGE',
    name: 'Full Turnkey — Parking Garage',
    description: 'Complete installation inside a parking structure. No trenching needed; includes slab scanning, coring, conduit routing, and fire-rated penetrations.',
    icon: '\uD83C\uDFE2',
    complexity: 'complex',
    typicalPriceRange: [25000, 80000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: '8-12 weeks',
        isNewConstruction: false,
      },
      parkingEnvironment: {
        type: 'parking_garage',
        hasPTSlab: null,
        slabScanRequired: true,
        coringRequired: true,
        surfaceType: 'concrete',
        trenchingRequired: false,
        boringRequired: false,
        trafficControlRequired: true,
        indoorOutdoor: 'indoor',
        fireRatedPenetrations: true,
        accessRestrictions: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 1500 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: true },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'signage_bollards' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 15,
        markupPercent: 25,
      },
    },
    skipTabs: ['trenching'],
    requiredFields: [
      'project.name', 'customer.companyName', 'site.address', 'charger.brand',
      'charger.model', 'charger.count', 'electrical.distanceToPanel_ft',
      'parkingEnvironment.hasPTSlab',
    ],
    suggestedMapTools: ['conduit_run', 'charger_placement', 'panel_location', 'coring_location'],
  },

  // 3. Install & Commission
  {
    id: 'INSTALL_COMMISSION',
    name: 'Install & Commission',
    description: 'Electrical labor and commissioning only. Client handles civil work and engineering. Chargers may be customer-supplied.',
    icon: '\uD83D\uDD27',
    complexity: 'standard',
    typicalPriceRange: [3000, 15000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'install_commission',
        timeline: '2-4 weeks',
        isNewConstruction: false,
      },
      permit: { responsibility: 'client', feeAllowance: null },
      designEngineering: { responsibility: 'client', stampedPlansRequired: false },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'client' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 5,
        markupPercent: 15,
      },
    },
    skipTabs: ['civil', 'design_engineering'],
    requiredFields: [
      'project.name', 'customer.companyName', 'site.address', 'charger.brand',
      'charger.count', 'electrical.distanceToPanel_ft',
    ],
    suggestedMapTools: ['conduit_run', 'charger_placement'],
  },

  // 4. Commissioning Only
  {
    id: 'COMMISSIONING_ONLY',
    name: 'Commissioning Only',
    description: 'Activate and configure pre-installed chargers. Software setup, network connection, and validation testing.',
    icon: '\u2705',
    complexity: 'simple',
    typicalPriceRange: [500, 3000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'commission_only',
        timeline: '1-2 days',
        isNewConstruction: false,
      },
      charger: {
        brand: '',
        model: '',
        count: 0,
        pedestalCount: 0,
        portType: null,
        mountType: null,
        isCustomerSupplied: true,
        chargingLevel: 'l2',
        ampsPerCharger: null,
        volts: null,
      },
      permit: { responsibility: 'client', feeAllowance: null },
      designEngineering: { responsibility: 'client', stampedPlansRequired: false },
      makeReady: { responsibility: 'client' },
      chargerInstall: { responsibility: 'client' },
      purchasingChargers: { responsibility: 'client' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 10,
      },
    },
    skipTabs: ['civil', 'design_engineering', 'electrical', 'accessories', 'network'],
    requiredFields: ['project.name', 'customer.companyName', 'charger.brand', 'charger.count'],
    suggestedMapTools: [],
  },

  // 5. Equipment Only
  {
    id: 'EQUIPMENT_ONLY',
    name: 'Equipment Only',
    description: 'Supply chargers, pedestals, and accessories. No installation labor included.',
    icon: '\uD83D\uDCE6',
    complexity: 'simple',
    typicalPriceRange: [2000, 20000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'equipment_purchase',
        timeline: '1-3 weeks (lead time)',
        isNewConstruction: false,
      },
      permit: { responsibility: 'client', feeAllowance: null },
      designEngineering: { responsibility: 'client', stampedPlansRequired: false },
      makeReady: { responsibility: 'client' },
      chargerInstall: { responsibility: 'client' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 15,
      },
    },
    skipTabs: ['civil', 'design_engineering', 'electrical', 'network', 'accessories'],
    requiredFields: ['project.name', 'customer.companyName', 'charger.brand', 'charger.model', 'charger.count'],
    suggestedMapTools: [],
  },

  // 6. Remove & Replace
  {
    id: 'REMOVE_REPLACE',
    name: 'Remove & Replace',
    description: 'Remove existing EV chargers and install new ones. Reuse existing infrastructure where possible.',
    icon: '\uD83D\uDD04',
    complexity: 'standard',
    typicalPriceRange: [3000, 10000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'remove_replace',
        timeline: '2-4 weeks',
        isNewConstruction: false,
      },
      permit: { responsibility: 'bullet', feeAllowance: 500 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: false },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'signage' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 5,
        markupPercent: 15,
      },
    },
    skipTabs: ['civil'],
    requiredFields: [
      'project.name', 'customer.companyName', 'site.address', 'charger.brand',
      'charger.count', 'removeReplace.existingChargerCount',
    ],
    suggestedMapTools: ['charger_placement'],
  },

  // 7. Tesla Supercharger
  {
    id: 'SUPERCHARGER',
    name: 'Tesla Supercharger',
    description: 'Full DC fast-charging station. Includes transformer, dedicated service, heavy civil work, and Tesla equipment package.',
    icon: '\u26A1',
    complexity: 'complex',
    typicalPriceRange: [200000, 700000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'supercharger',
        timeline: '12-20 weeks',
        isNewConstruction: false,
      },
      charger: {
        brand: 'Tesla',
        model: 'Supercharger',
        count: 4,
        pedestalCount: 0,
        portType: 'single',
        mountType: 'pedestal',
        isCustomerSupplied: false,
        chargingLevel: 'l3_dcfc',
        ampsPerCharger: null,
        volts: 480,
      },
      electrical: {
        serviceType: '480v_3phase',
        availableCapacityKnown: false,
        availableAmps: null,
        breakerSpaceAvailable: null,
        panelUpgradeRequired: null,
        transformerRequired: true,
        switchgearRequired: false,
        distanceToPanel_ft: null,
        utilityCoordinationRequired: true,
        meterRoomRequired: null,
        junctionBoxCount: null,
        disconnectRequired: null, electricalRoomDescription: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 5000 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: true },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'signage_bollards' },
      estimateControls: {
        pricingTier: 'bulk_discount',
        taxRate: 8.25,
        contingencyPercent: 10,
        markupPercent: 15,
      },
    },
    skipTabs: [],
    requiredFields: [
      'project.name', 'customer.companyName', 'site.address', 'charger.count',
      'electrical.distanceToPanel_ft', 'civil.installationLocationDescription',
    ],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location', 'transformer_location'],
  },

  // 8. Residential
  {
    id: 'RESIDENTIAL',
    name: 'Residential',
    description: 'Simple home charger installation. Typically 1-2 wall connectors with short conduit runs.',
    icon: '\uD83C\uDFE0',
    complexity: 'simple',
    typicalPriceRange: [2000, 8000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: '1-2 weeks',
        isNewConstruction: false,
      },
      charger: {
        brand: 'Tesla',
        model: 'Universal Wall Connector',
        count: 1,
        pedestalCount: 0,
        portType: 'single',
        mountType: 'wall',
        isCustomerSupplied: false,
        chargingLevel: 'l2',
        ampsPerCharger: 48,
        volts: 240,
      },
      parkingEnvironment: {
        type: 'surface_lot',
        hasPTSlab: false,
        slabScanRequired: false,
        coringRequired: false,
        surfaceType: 'concrete',
        trenchingRequired: false,
        boringRequired: false,
        trafficControlRequired: false,
        indoorOutdoor: 'outdoor',
        fireRatedPenetrations: false,
        accessRestrictions: '',
      },
      electrical: {
        serviceType: '240v',
        availableCapacityKnown: false,
        availableAmps: null,
        breakerSpaceAvailable: null,
        panelUpgradeRequired: null,
        transformerRequired: false,
        switchgearRequired: false,
        distanceToPanel_ft: 30,
        utilityCoordinationRequired: false,
        meterRoomRequired: null,
        junctionBoxCount: null,
        disconnectRequired: null, electricalRoomDescription: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 300 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: false },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 15,
      },
    },
    skipTabs: ['civil', 'network', 'accessories'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'electrical.distanceToPanel_ft'],
    suggestedMapTools: ['conduit_run'],
  },

  // 9. Change Order
  {
    id: 'CHANGE_ORDER',
    name: 'Change Order',
    description: 'Modification to an existing approved proposal. Add or remove scope items, adjust quantities, or change specifications.',
    icon: '\uD83D\uDCDD',
    complexity: 'standard',
    typicalPriceRange: [0, 50000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: 'Per original + extension',
        isNewConstruction: false,
      },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 20,
      },
    },
    skipTabs: [],
    requiredFields: ['project.name', 'customer.companyName'],
    suggestedMapTools: [],
  },

  // 10. Invoice
  {
    id: 'INVOICE',
    name: 'Invoice',
    description: 'Billing document for completed work. References original proposal and approved change orders.',
    icon: '\uD83D\uDCB0',
    complexity: 'simple',
    typicalPriceRange: [0, 0],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: 'Complete',
        isNewConstruction: false,
      },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 0,
      },
    },
    skipTabs: ['civil', 'design_engineering', 'electrical', 'network', 'accessories', 'charger', 'map'],
    requiredFields: ['project.name', 'customer.companyName'],
    suggestedMapTools: [],
  },

  // 11. Service Call
  {
    id: 'SERVICE_CALL',
    name: 'Service Call',
    description: 'Diagnostic visit, troubleshooting, or minor repair. Flat-rate trip charge plus time & materials.',
    icon: '\uD83D\uDEE0\uFE0F',
    complexity: 'simple',
    typicalPriceRange: [500, 2000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'service_work',
        timeline: '1-3 days',
        isNewConstruction: false,
      },
      permit: { responsibility: 'client', feeAllowance: null },
      designEngineering: { responsibility: 'client', stampedPlansRequired: false },
      makeReady: { responsibility: 'client' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'client' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 20,
      },
    },
    skipTabs: ['civil', 'design_engineering', 'network', 'accessories', 'map'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address'],
    suggestedMapTools: [],
  },

  // 12. Custom
  {
    id: 'CUSTOM',
    name: 'Custom Proposal',
    description: 'Blank template with all tabs available. Use when no standard template fits the scope.',
    icon: '\u2699\uFE0F',
    complexity: 'standard',
    typicalPriceRange: [0, 0],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: '',
        isNewConstruction: null,
      },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 10,
        markupPercent: 20,
      },
    },
    skipTabs: [],
    requiredFields: ['project.name', 'customer.companyName'],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location'],
  },

  // 13. Multi-Charger Lot
  {
    id: 'MULTI_CHARGER_LOT',
    name: 'Multi-Charger Lot',
    description: 'Large surface lot deployment with 6+ chargers. Full scope including mobilization, phased installation, and ADA compliance.',
    icon: '\uD83D\uDD0C',
    complexity: 'complex',
    typicalPriceRange: [15000, 50000],
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: '8-14 weeks',
        isNewConstruction: false,
      },
      parkingEnvironment: {
        type: 'surface_lot',
        hasPTSlab: false,
        slabScanRequired: false,
        coringRequired: false,
        surfaceType: 'asphalt',
        trenchingRequired: true,
        boringRequired: false,
        trafficControlRequired: true,
        indoorOutdoor: 'outdoor',
        fireRatedPenetrations: false,
        accessRestrictions: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 2000 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: true },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'signage_bollards' },
      estimateControls: {
        pricingTier: 'bulk_discount',
        taxRate: 8.25,
        contingencyPercent: 10,
        markupPercent: 18,
      },
    },
    skipTabs: [],
    requiredFields: [
      'project.name', 'customer.companyName', 'site.address', 'charger.brand',
      'charger.model', 'charger.count', 'electrical.distanceToPanel_ft',
      'civil.installationLocationDescription',
    ],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location', 'ada_route'],
  },
];

// ── Lookup Helpers ─────────────────────────────────────────────

export function getTemplateById(id: string): ProposalTemplate | undefined {
  return PROPOSAL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByComplexity(complexity: 'simple' | 'standard' | 'complex'): ProposalTemplate[] {
  return PROPOSAL_TEMPLATES.filter((t) => t.complexity === complexity);
}

/**
 * Given a project type from EstimateInput, suggest the best-matching template.
 */
export function suggestTemplate(projectType: string, parkingType?: string | null): ProposalTemplate | undefined {
  switch (projectType) {
    case 'supercharger':
      return getTemplateById('SUPERCHARGER');
    case 'commission_only':
      return getTemplateById('COMMISSIONING_ONLY');
    case 'equipment_purchase':
      return getTemplateById('EQUIPMENT_ONLY');
    case 'install_commission':
      return getTemplateById('INSTALL_COMMISSION');
    case 'remove_replace':
      return getTemplateById('REMOVE_REPLACE');
    case 'service_work':
      return getTemplateById('SERVICE_CALL');
    case 'full_turnkey':
    case 'full_turnkey_connectivity':
      if (parkingType === 'parking_garage') return getTemplateById('FULL_TURNKEY_GARAGE');
      return getTemplateById('FULL_TURNKEY_PARKING_LOT');
    default:
      return getTemplateById('CUSTOM');
  }
}
