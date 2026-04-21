// ============================================================
// Proposal Templates — 13 templates matching Bullet EV Excel workbooks
// ============================================================

import { EstimateInput } from './types';

export interface ProposalTemplate {
  id: string;
  /** Template number matching the Excel file numbering (1–13) */
  templateNumber: number;
  name: string;
  description: string;
  icon: string;
  complexity: 'simple' | 'standard' | 'complex';
  typicalPriceRange: [number, number];
  paymentTerms: string;
  prefilledInput: Partial<EstimateInput>;
  /** Line item categories available in this template's PRODUCT & DESCRIPTION INPUT sheet */
  availableCategories: string[];
  /** Default line items pre-filled in the proposal output sheet */
  defaultLineItems: Array<{
    product: string;
    description: string;
    unitPrice: number | null;
    qty: number | null;
  }>;
  /** Exclusion text variant used by this template */
  exclusionVariant: 'full_turnkey' | 'install_commission' | 'remove_replace' | 'residential' | 'change_order' | 'service' | 'none';
  skipTabs: string[];
  requiredFields: string[];
  suggestedMapTools: string[];
}

// ── Exclusion Text Constants ──────────────────────────────────

export const EXCLUSION_TEXT = {
  full_turnkey: `This proposal does not include transformer procurement or utility upgrades, main panel upgrades or modifications to main service feeds or fusing, ADA compliance measures as required by the AHJ or owner, off-site staging or laydown areas, after-hours work outside of scheduled shutdown coordination, or traffic control beyond blocking designated parking spaces. Design, engineering, and permitting services are excluded, including site evaluations, load studies, engineered or stamped plan sets, as-built drawings, permit coordination beyond two in-person visits, utility coordination beyond two in-person visits, permit fees, and private utility mark-outs. All civil work is excluded, including trenching, boring, core drilling, concrete or asphalt removal and restoration, curb or foundation work, transformer or vault pads, pedestal concrete bases, conduit encasement, striping, signage, wheel stops, bollards, and ground preparation. Electrical infrastructure beyond the listed scope is excluded, including conduit, conductors, sub-panels, and networking or connectivity equipment. Site logistics and safety items such as equipment rentals, fencing, trench plates, rock or masonry removal, and irrigation repair are also excluded unless specifically noted otherwise.`,

  install_commission: `The following items are not included in this proposal unless specifically noted otherwise. Excluded scope includes utility owned equipment and upgrades such as transformers and related utility upgrades, main panel upgrades, main feeds, fuses, and any required ADA compliance measures as determined by the Authority Having Jurisdiction or the site owner. This proposal excludes all design, engineering, and permitting services, including site walks, load studies, engineered or stamped plan sets, as built drawings, permit fees, and extended utility or permitting coordination beyond two in person visits. All civil scope is excluded, including trenching, boring, core drilling, concrete or asphalt removal and restoration, curb or foundation work, transformer pad preparation, concrete bases for pedestals, conduit encasement, striping, signage, stenciling, wheel stops, and bollard installation. Electrical infrastructure beyond the charger and pedestal installation scope is excluded, including conduit and conductor installation, sub panels, balance of system materials, and mounting hardware not expressly listed. Networking and connectivity equipment, including Wi Fi, extenders, and network setup, are excluded and must be provided by the owner. Site logistics and safety items such as equipment rental, construction fencing, traffic control beyond blocking designated parking spaces, rock or masonry removal, irrigation repair, off site staging, and after hours work are also excluded.`,

  remove_replace: `This proposal does not include transformer procurement or utility upgrades, main panel upgrades or modifications to main service feeds or fusing, ADA compliance measures as required by the AHJ or owner, off-site staging or laydown areas, after-hours work outside of scheduled shutdown coordination, or traffic control beyond blocking designated parking spaces. Design, engineering, and permitting services are excluded, including site evaluations, load studies, engineered or stamped plan sets, as-built drawings, permit coordination beyond two in-person visits, utility coordination beyond two in-person visits, permit fees, and private utility mark-outs. All civil work is excluded, including trenching, boring, core drilling, concrete or asphalt removal and restoration, curb or foundation work, transformer or vault pads, pedestal concrete bases, conduit encasement, striping, signage, wheel stops, bollards, and ground preparation. Electrical infrastructure beyond the listed scope is excluded, including conduit, conductors, sub-panels, and networking or connectivity equipment. Site logistics and safety items such as equipment rentals, fencing, trench plates, rock or masonry removal, and irrigation repair are also excluded unless specifically noted otherwise.`,

  residential: `Exclusions: EV charger (customer supplied); wall or ceiling patching and paint; concrete, stucco, or masonry repair; panel or service upgrades; trenching or restoration; concealed wiring or wall fishing; conduit or wire runs beyond 15 feet from the main garage panel; and any additional requirements or fees required by the AHJ or utility. Any excluded or additional scope requires a change order.`,

  change_order: '',
  service: '',
  none: '',
} as const;

export const WIFI_NOTE = `Tesla chargers require a reliable Wi-Fi connection to operate and enable full functionality. If Wi-Fi is not available at the installation site, Bullet Energy Solutions can provide a separate proposal for the installation of the necessary networking infrastructure to support charger connectivity.`;

export const RESI_NOTE = `Includes installation of a dedicated circuit breaker in the main garage electrical panel and installation of the EV charger within 15 feet of the panel. Additional distance or scope beyond 15 feet will require a change order.`;

export const SERVICE_NOTE = `This agreement covers one standard EV charger service visit and includes one truck roll and up to one hour of onsite diagnostics and troubleshooting. Additional time beyond the first hour will be billed at $125 per hour. Any repairs, hardware replacements, additional labor, materials, or follow up visits will be quoted separately and must be approved in writing before any additional work is performed.`;

// ── Template Definitions ───────────────────────────────────────

export const PROPOSAL_TEMPLATES: readonly ProposalTemplate[] = [
  // 1. Base Template (generic proposal)
  {
    id: 'TEMPLATE',
    templateNumber: 1,
    name: 'Standard Proposal',
    description: 'Generic proposal template. Flexible for any project type \u2014 fill in line items from the full product catalog.',
    icon: '\uD83D\uDCCB',
    complexity: 'standard',
    typicalPriceRange: [5000, 50000],
    paymentTerms: 'Progress Draws',
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'full_turnkey',
        timeline: '',
        isNewConstruction: false,
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [],
    exclusionVariant: 'full_turnkey',
    skipTabs: [],
    requiredFields: ['project.name', 'customer.companyName', 'site.address'],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location'],
  },

  // 2. Service Call
  {
    id: 'SERVICE_CALL',
    templateNumber: 2,
    name: 'Service Call',
    description: 'Standard EV charger service visit. Includes truck roll + 1 hour diagnostics. Additional time billed hourly.',
    icon: '\uD83D\uDCDE',
    complexity: 'simple',
    typicalPriceRange: [450, 2000],
    paymentTerms: 'Upon Completion',
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'service_call',
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
        markupPercent: 0,
      },
    },
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'ELEC LBR', 'ELEC MAT', 'EQUIPMENT', 'NETWORK', 'PERMIT', 'SAFETY', 'SITE WORK', 'WARRANTY', 'OTHER'],
    defaultLineItems: [
      { product: 'SERVICE', description: 'Truck Roll Fee \u2014 Includes first hour of onsite service', unitPrice: 450, qty: 1 },
      { product: 'SERVICE', description: 'Hourly Rate \u2014 Each additional hour', unitPrice: 125, qty: null },
    ],
    exclusionVariant: 'service',
    skipTabs: ['civil', 'design_engineering', 'network', 'accessories', 'map'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address'],
    suggestedMapTools: [],
  },

  // 3. Change Order
  {
    id: 'CHANGE_ORDER',
    templateNumber: 3,
    name: 'Change Order',
    description: 'Modification to an existing approved proposal. Tracks original contract value, prior change orders, and new contract value.',
    icon: '\uD83D\uDCDD',
    complexity: 'standard',
    typicalPriceRange: [0, 50000],
    paymentTerms: '',
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'change_order',
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [],
    exclusionVariant: 'change_order',
    skipTabs: [],
    requiredFields: ['project.name', 'customer.companyName'],
    suggestedMapTools: [],
  },

  // 4. Supercharger / DCFC
  {
    id: 'SUPERCHARGER',
    templateNumber: 4,
    name: 'Supercharger / DCFC',
    description: 'Full DC fast-charging station. Includes transformer pad, dedicated service, heavy civil, design/engineering, and equipment installation.',
    icon: '\u26A1',
    complexity: 'complex',
    typicalPriceRange: [200000, 700000],
    paymentTerms: 'Progress Draws',
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
        // Tesla ships Supercharger equipment directly to site owners;
        // Bullet EV only performs installation + commissioning. Hardware
        // and pedestals are excluded from the estimate by default.
        isCustomerSupplied: true,
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
        // Transformer need is site-specific; only add the line when the
        // utility requires one. Leave null so the rule skips unless the
        // user explicitly flips it.
        transformerRequired: null,
        switchgearRequired: false,
        distanceToPanel_ft: null,
        utilityCoordinationRequired: true,
        meterRoomRequired: null,
        junctionBoxCount: null,
        disconnectRequired: null,
        electricalRoomDescription: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 5000 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: true },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'client' },
      signageBollards: { responsibility: 'signage_bollards' },
      estimateControls: {
        pricingTier: 'bulk_discount',
        taxRate: 8.25,
        contingencyPercent: 10,
        markupPercent: 15,
      },
    },
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [
      { product: 'DESIGN/ENGINEERING', description: 'Site Visit', unitPrice: 1200, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Base Design/Eng \u2014 site plan, riser, 1-line, CD50-CD100, Load Study, Field Sketch, As Builts', unitPrice: null, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Permit Coordination and Filing \u2014 Up to 2 visits in person', unitPrice: 1000, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Utility Coordination \u2014 Up to 2 visits in person', unitPrice: 1000, qty: 1 },
      { product: 'TRENCHING', description: 'Utility Mark-out', unitPrice: 600, qty: 1 },
      { product: 'TRENCHING', description: 'Trenching (No Conduit) \u2014 Up to 36" W, max 4\' D', unitPrice: 44, qty: null },
      { product: 'CIVIL', description: 'Concrete Removal', unitPrice: 725, qty: null },
      { product: 'CIVIL', description: 'Concrete Restoration', unitPrice: 600, qty: null },
      { product: 'EQUIPMENT PADS', description: 'Ground Prep for Utility Provided Transformer Pad', unitPrice: 1800, qty: 1 },
      { product: 'EQUIPMENT PADS', description: 'Cast in Place Foundations for Posts', unitPrice: 820, qty: null },
      { product: 'EQUIPMENT PADS', description: 'Equipment Pad \u2014 Cabinets / Switchgear', unitPrice: 660, qty: null },
      { product: 'EQUIPMENT PADS', description: 'Equipment Pad \u2014 Transformer (6 Piers, Sonnen Tubes, Steel)', unitPrice: 7800, qty: 1 },
      { product: 'EQUIPMENT', description: 'Install Striping \u2014 Per stall', unitPrice: 220, qty: null },
      { product: 'EQUIPMENT', description: 'Install Signage and Stencils', unitPrice: 400, qty: null },
      { product: 'EQUIPMENT', description: 'Install Provided Bolt-Down Bollard', unitPrice: 550, qty: null },
      { product: 'ELECTRICAL', description: 'Furnish & Install 1" Conduit (PVC Schedule 40)', unitPrice: 15, qty: null },
    ],
    exclusionVariant: 'none',
    skipTabs: [],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'charger.count', 'electrical.distanceToPanel_ft'],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location', 'transformer_location'],
  },

  // 5. Invoice
  {
    id: 'INVOICE',
    templateNumber: 5,
    name: 'Invoice',
    description: 'Billing document for completed work. References original proposal and approved change orders.',
    icon: '\uD83D\uDCB0',
    complexity: 'simple',
    typicalPriceRange: [0, 0],
    paymentTerms: 'At Install',
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'invoice',
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
    availableCategories: [],
    defaultLineItems: [],
    exclusionVariant: 'none',
    skipTabs: ['civil', 'design_engineering', 'electrical', 'network', 'accessories', 'charger', 'map'],
    requiredFields: ['project.name', 'customer.companyName'],
    suggestedMapTools: [],
  },

  // 6. Residential
  {
    id: 'RESIDENTIAL',
    templateNumber: 6,
    name: 'Residential EV Install',
    description: 'Home charger installation. Typically 1 wall connector with short conduit run, dedicated breaker, and permitting documentation.',
    icon: '\uD83C\uDFE0',
    complexity: 'simple',
    typicalPriceRange: [1305, 8000],
    paymentTerms: '100% At Install',
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'residential',
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
        isCustomerSupplied: true,
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
        distanceToPanel_ft: 15,
        utilityCoordinationRequired: false,
        meterRoomRequired: null,
        junctionBoxCount: null,
        disconnectRequired: null,
        electricalRoomDescription: '',
      },
      permit: { responsibility: 'bullet', feeAllowance: 300 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: false },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'client' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 0,
        markupPercent: 15,
      },
    },
    availableCategories: ['CHARGER', 'PEDESTAL', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [
      { product: 'ELECTRICAL', description: 'Level 2 EV Charger Installation (Customer Supplied Charger)', unitPrice: 995, qty: 1 },
      { product: 'EQUIPMENT', description: 'Misc. Wall Mounting Hardware & BOS', unitPrice: 10, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Permitting Documentation and Submittal (Includes One Line Diagram)', unitPrice: 300, qty: 1 },
    ],
    exclusionVariant: 'residential',
    skipTabs: ['civil', 'network', 'accessories'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'electrical.distanceToPanel_ft'],
    suggestedMapTools: ['conduit_run'],
  },

  // 7. Install & Commission
  {
    id: 'INSTALL_COMMISSION',
    templateNumber: 7,
    name: 'Install & Commission',
    description: 'Charger and pedestal installation with commissioning. Electrical labor included. Client handles civil work, design, and permitting.',
    icon: '\uD83D\uDD27',
    complexity: 'standard',
    typicalPriceRange: [3000, 15000],
    paymentTerms: 'At Install',
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
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'none' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 8.25,
        contingencyPercent: 5,
        markupPercent: 15,
      },
    },
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [
      { product: 'CHARGER', description: 'Tesla Universal Wall Connector (Gen 3) \u2013 Model 1734412\u201102', unitPrice: 710, qty: null },
      { product: 'PEDESTAL', description: 'Tesla Wall Connector Pedestal', unitPrice: 515, qty: null },
      { product: 'EQUIPMENT', description: 'Misc. Mounting Hardware & BOS (Materials Only)', unitPrice: 165, qty: null },
    ],
    exclusionVariant: 'install_commission',
    skipTabs: ['civil', 'design_engineering'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'charger.brand', 'charger.count', 'electrical.distanceToPanel_ft'],
    suggestedMapTools: ['conduit_run', 'charger_placement'],
  },

  // 8. Commissioning Only
  {
    id: 'COMMISSIONING_ONLY',
    templateNumber: 8,
    name: 'Commissioning Only',
    description: 'Activate and configure pre-installed chargers. Software setup, network connection, and validation testing.',
    icon: '\u2705',
    complexity: 'simple',
    typicalPriceRange: [500, 3000],
    paymentTerms: 'At Commissioning',
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [],
    exclusionVariant: 'none',
    skipTabs: ['civil', 'design_engineering', 'electrical', 'accessories', 'network'],
    requiredFields: ['project.name', 'customer.companyName', 'charger.brand', 'charger.count'],
    suggestedMapTools: [],
  },

  // 9. Equipment Only Purchase
  {
    id: 'EQUIPMENT_ONLY',
    templateNumber: 9,
    name: 'Equipment Only',
    description: 'Supply chargers, pedestals, software, and accessories. No installation labor included.',
    icon: '\uD83D\uDCE6',
    complexity: 'simple',
    typicalPriceRange: [2000, 20000],
    paymentTerms: 'Upon Order',
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [],
    exclusionVariant: 'install_commission',
    skipTabs: ['civil', 'design_engineering', 'electrical', 'network', 'accessories'],
    requiredFields: ['project.name', 'customer.companyName', 'charger.brand', 'charger.model', 'charger.count'],
    suggestedMapTools: [],
  },

  // 10. Remove & Replace
  {
    id: 'REMOVE_REPLACE',
    templateNumber: 10,
    name: 'Remove & Replace',
    description: 'Remove existing EV chargers and install new ones. Reuse existing infrastructure where possible.',
    icon: '\uD83D\uDD04',
    complexity: 'standard',
    typicalPriceRange: [3000, 15000],
    paymentTerms: 'At Install',
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [],
    exclusionVariant: 'remove_replace',
    skipTabs: ['civil'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'charger.brand', 'charger.count'],
    suggestedMapTools: ['charger_placement'],
  },

  // 11. Service Ticket
  {
    id: 'SERVICE_TICKET',
    templateNumber: 11,
    name: 'Service Ticket',
    description: 'Internal service ticket for field work tracking. Detailed labor, materials, and site work breakdown.',
    icon: '\uD83D\uDEE0\uFE0F',
    complexity: 'simple',
    typicalPriceRange: [200, 5000],
    paymentTerms: 'Upon Completion',
    prefilledInput: {
      project: {
        name: '',
        salesRep: '',
        projectType: 'service_ticket',
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
        markupPercent: 0,
      },
    },
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'ELEC LBR', 'ELEC MAT', 'EQUIPMENT', 'NETWORK', 'PERMIT', 'SAFETY', 'SITE WORK', 'WARRANTY', 'OTHER'],
    defaultLineItems: [],
    exclusionVariant: 'service',
    skipTabs: ['civil', 'design_engineering', 'network', 'accessories', 'map'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address'],
    suggestedMapTools: [],
  },

  // 12. Full Turnkey — Parking Garage
  {
    id: 'FULL_TURNKEY_GARAGE',
    templateNumber: 12,
    name: 'Full Turnkey \u2014 Parking Garage',
    description: 'Complete installation inside a parking structure. No trenching; includes slab scanning, coring, conduit routing, and fire-rated penetrations.',
    icon: '\uD83C\uDFE2',
    complexity: 'complex',
    typicalPriceRange: [25000, 80000],
    paymentTerms: 'Progress Draws',
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [
      { product: 'DESIGN/ENGINEERING', description: 'Site Visit', unitPrice: 1000, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Base Design/Eng \u2014 site plan, riser, 1-line, CD50-CD100', unitPrice: 4250, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Load Study/Load Calcs', unitPrice: 1050, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Permit Coordination and Filing \u2014 Up to 2 visits in person', unitPrice: 950, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Utility Coordination \u2014 Up to 2 visits in person', unitPrice: 950, qty: 1 },
      { product: 'CIVIL', description: 'Scan/X-ray \u2014 Wall/Floor', unitPrice: 600, qty: null },
      { product: 'CIVIL', description: 'Core Drilling 1"-6" concrete/CMU', unitPrice: 550, qty: null },
      { product: 'EQUIPMENT', description: 'Install Striping \u2014 Per stall', unitPrice: 220, qty: null },
      { product: 'EQUIPMENT', description: 'Install Signage and Stencils', unitPrice: 400, qty: null },
      { product: 'EQUIPMENT', description: 'Install Provided Bolt-Down Bollard', unitPrice: 550, qty: null },
    ],
    exclusionVariant: 'full_turnkey',
    skipTabs: ['trenching'],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'charger.brand', 'charger.model', 'charger.count', 'electrical.distanceToPanel_ft', 'parkingEnvironment.hasPTSlab'],
    suggestedMapTools: ['conduit_run', 'charger_placement', 'panel_location'],
  },

  // 13. Full Turnkey — Parking Lot
  {
    id: 'FULL_TURNKEY_PARKING_LOT',
    templateNumber: 13,
    name: 'Full Turnkey \u2014 Parking Lot',
    description: 'Complete end-to-end installation in a surface parking lot. Includes civil, electrical, trenching, permitting, design, equipment, and commissioning.',
    icon: '\uD83C\uDFD7\uFE0F',
    complexity: 'complex',
    typicalPriceRange: [30000, 100000],
    paymentTerms: 'Progress Draws',
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
    availableCategories: ['CHARGER', 'PEDESTAL', 'SOFTWARE', 'DESIGN/ENGINEERING', 'TRENCHING', 'CIVIL', 'EQUIPMENT PADS', 'EQUIPMENT', 'ELECTRICAL', 'OTHER'],
    defaultLineItems: [
      { product: 'DESIGN/ENGINEERING', description: 'Site Visit', unitPrice: 1000, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Base Design/Eng \u2014 site plan, riser, 1-line, CD50-CD100', unitPrice: 4250, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Load Study/Load Calcs', unitPrice: 1050, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Property Line Stake/Garage Field Sketch', unitPrice: 1500, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'As Built', unitPrice: 900, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Permit Coordination and Filing \u2014 Up to 2 visits in person', unitPrice: 950, qty: 1 },
      { product: 'DESIGN/ENGINEERING', description: 'Utility Coordination \u2014 Up to 2 visits in person', unitPrice: 950, qty: 1 },
      { product: 'TRENCHING', description: 'Utility Mark-out', unitPrice: 2000, qty: 1 },
      { product: 'TRENCHING', description: 'Trenching (No Conduit) \u2014 Up to 36" W, max 4\' D', unitPrice: 45, qty: null },
      { product: 'CIVIL', description: 'Concrete Removal', unitPrice: 725, qty: null },
      { product: 'CIVIL', description: 'Concrete Restoration', unitPrice: 600, qty: null },
      { product: 'CIVIL', description: 'Asphalt Removal', unitPrice: 8.5, qty: null },
      { product: 'CIVIL', description: 'Asphalt Restoration', unitPrice: 33, qty: null },
      { product: 'EQUIPMENT PADS', description: 'Concrete Pads for Pedestals', unitPrice: 600, qty: null },
      { product: 'EQUIPMENT', description: 'Install Striping \u2014 Per stall', unitPrice: 220, qty: null },
      { product: 'EQUIPMENT', description: 'Install Signage and Stencils', unitPrice: 400, qty: null },
      { product: 'EQUIPMENT', description: 'Install Provided Bolt-Down Bollard', unitPrice: 550, qty: null },
      { product: 'EQUIPMENT', description: 'Furnish and Install Rubber Wheelstops', unitPrice: 165, qty: null },
    ],
    exclusionVariant: 'full_turnkey',
    skipTabs: [],
    requiredFields: ['project.name', 'customer.companyName', 'site.address', 'charger.brand', 'charger.model', 'charger.count', 'electrical.distanceToPanel_ft'],
    suggestedMapTools: ['conduit_run', 'trench_run', 'charger_placement', 'panel_location'],
  },
];

// ── Lookup Helpers ─────────────────────────────────────────────

export function getTemplateById(id: string): ProposalTemplate | undefined {
  return PROPOSAL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateByNumber(num: number): ProposalTemplate | undefined {
  return PROPOSAL_TEMPLATES.find((t) => t.templateNumber === num);
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
    case 'service_call':
      return getTemplateById('SERVICE_CALL');
    case 'service_ticket':
      return getTemplateById('SERVICE_TICKET');
    case 'change_order':
      return getTemplateById('CHANGE_ORDER');
    case 'invoice':
      return getTemplateById('INVOICE');
    case 'residential':
      return getTemplateById('RESIDENTIAL');
    case 'full_turnkey':
    case 'full_turnkey_connectivity':
      if (parkingType === 'parking_garage') return getTemplateById('FULL_TURNKEY_GARAGE');
      return getTemplateById('FULL_TURNKEY_PARKING_LOT');
    default:
      return getTemplateById('TEMPLATE');
  }
}

/**
 * Get the exclusion text for a template.
 */
export function getExclusionText(template: ProposalTemplate): string {
  return EXCLUSION_TEXT[template.exclusionVariant];
}
