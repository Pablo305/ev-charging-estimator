// ============================================================
// BulletEV Pricebook — sourced from "396 Property Management LLC.xlsx"
// PRODUCT & DESCRIPTION INPUT sheet
// ============================================================

import { EstimateCategory } from './types';

/**
 * Each pricebook item maps to a row in the PRODUCT & DESCRIPTION INPUT sheet.
 * `catalogPrice` is the value in column C of the pricebook.
 * `status` reflects whether the price is confirmed, TBD, or missing.
 * Items with null prices MUST trigger manual review.
 */
export interface PricebookItem {
  id: string;
  category: EstimateCategory;
  description: string;
  catalogPrice: number | null;
  unit: string;
  notes: string;
  status: 'priced' | 'tbd' | 'blank' | 'zero_passthrough';
}

// ── Complete Pricebook ─────────────────────────────────────────

export const PRICEBOOK: readonly PricebookItem[] = [
  // ── CHARGER ──────────────────────────────────────────────────
  {
    id: 'charger-tesla-uwc-gen3',
    category: 'CHARGER',
    description: 'Tesla Universal Wall Connector (Gen 3) - Model 1734412-02',
    catalogPrice: 750,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'charger-cp-cpf50-wall-single',
    category: 'CHARGER',
    description: 'ChargePoint CPF50 - Wall-mounted, single port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-cpf50-ped-single',
    category: 'CHARGER',
    description: 'ChargePoint CPF50 - Pedestal-mounted, single port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-cpf50-dual-cmk',
    category: 'CHARGER',
    description: 'ChargePoint CPF50 - Dual Pedestal with CMK',
    catalogPrice: 3130,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'charger-cp-ct4011-wall-single',
    category: 'CHARGER',
    description: 'ChargePoint CT4011 - Wall-mounted, single port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-ct4021-wall-dual',
    category: 'CHARGER',
    description: 'ChargePoint CT4021 - Wall-mounted, dual port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-ct4013-ped-single',
    category: 'CHARGER',
    description: 'ChargePoint CT4013 - Pedestal-mounted, single port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-ct4023-ped-dual',
    category: 'CHARGER',
    description: 'ChargePoint CT4023 - Pedestal-mounted, dual port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-ct6013-ped-single',
    category: 'CHARGER',
    description: 'ChargePoint CT6013 - Pedestal-mounted, single port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-cp-ct6023-ped-dual',
    category: 'CHARGER',
    description: 'ChargePoint CT6023 - Pedestal-mounted, dual port',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-blink-series6',
    category: 'CHARGER',
    description: 'Blink Series 6 Commercial L2 Charger',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-swtch-l2',
    category: 'CHARGER',
    description: 'SWTCH Smart L2 Charger',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'charger-evconnect-l2',
    category: 'CHARGER',
    description: 'EV Connect Networked L2 Chargers',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },

  // ── CIVIL ────────────────────────────────────────────────────
  {
    id: 'civil-boring-machinery',
    category: 'CIVIL',
    description: 'Boring Using Machinery (Under hard surface)',
    catalogPrice: null,
    unit: 'LF',
    notes: 'TBD in pricebook',
    status: 'tbd',
  },
  {
    id: 'civil-boring-hand',
    category: 'CIVIL',
    description: 'Boring by hand (Under hard surface)',
    catalogPrice: 40,
    unit: 'LF',
    notes: 'per foot',
    status: 'priced',
  },
  {
    id: 'civil-trenching',
    category: 'CIVIL',
    description: 'Trenching (assuming soft/normal soil conditions)',
    catalogPrice: 30,
    unit: 'LF',
    notes: 'per foot',
    status: 'priced',
  },
  {
    id: 'civil-concrete-cutting',
    category: 'CIVIL',
    description: 'Concrete Cutting & Trenching',
    catalogPrice: 45,
    unit: 'LF',
    notes: '',
    status: 'priced',
  },
  {
    id: 'civil-coring-slab-scan',
    category: 'CIVIL',
    description: 'Coring & Slab Scanning For Conduit Routing',
    catalogPrice: 312,
    unit: 'EA',
    notes: 'Frequently overridden to ~$950 on actual estimates',
    status: 'priced',
  },
  {
    id: 'civil-concrete-pad',
    category: 'CIVIL',
    description: 'Install 3000 Psi Concrete Pads',
    catalogPrice: 650,
    unit: 'EA',
    notes: 'per pedestal location; second visit; minimum order 2',
    status: 'priced',
  },
  {
    id: 'civil-remove-asphalt',
    category: 'CIVIL',
    description: 'Remove Asphalt Or Concrete For Trenching',
    catalogPrice: null,
    unit: 'LF',
    notes: 'TBD in pricebook',
    status: 'tbd',
  },

  // ── DES/ENG ──────────────────────────────────────────────────
  {
    id: 'deseng-asbuilt',
    category: 'DES/ENG',
    description: 'As-Built Drawings',
    catalogPrice: 500,
    unit: 'LS',
    notes: 'For when a permit is approved but then things change',
    status: 'priced',
  },
  {
    id: 'deseng-stamped-plans',
    category: 'DES/ENG',
    description: 'Engineered And Stamped Plan Set',
    catalogPrice: 3500,
    unit: 'LS',
    notes: 'Frequently overridden to $4,250 on actual estimates',
    status: 'priced',
  },
  {
    id: 'deseng-load-calc',
    category: 'DES/ENG',
    description: 'Load Calculations',
    catalogPrice: 900,
    unit: 'LS',
    notes: 'Frequently overridden to $1,050 on actual estimates',
    status: 'priced',
  },
  {
    id: 'deseng-site-walk',
    category: 'DES/ENG',
    description: 'Site Walk / Evaluation',
    catalogPrice: 400,
    unit: 'EA',
    notes: 'Can be credited back',
    status: 'priced',
  },
  {
    id: 'deseng-utility-coord',
    category: 'DES/ENG',
    description: 'Utility Coordination-Up to 2 visits in person',
    catalogPrice: 950,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'deseng-private-utility-markout',
    category: 'DES/ENG',
    description: 'Private Utility Mark-Out And Coordination',
    catalogPrice: 2000,
    unit: 'LS',
    notes: 'TBD - if public property, free. Range $800-$2000',
    status: 'priced',
  },

  // ── ELEC ─────────────────────────────────────────────────────
  {
    id: 'elec-transformer',
    category: 'ELEC',
    description: 'Transformer Upgrade',
    catalogPrice: null,
    unit: 'LS',
    notes: 'TBD in pricebook - always requires manual review',
    status: 'tbd',
  },

  // ── ELEC LBR ─────────────────────────────────────────────────
  {
    id: 'eleclbr-install-ped-single',
    category: 'ELEC LBR',
    description: 'Installation & Commissioning Of Pedestal-Mounted Charger - Single Port',
    catalogPrice: 850,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'eleclbr-install-wall-single',
    category: 'ELEC LBR',
    description: 'Installation & Commissioning Of Wall-Mounted Charger - Single Port',
    catalogPrice: 850,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'eleclbr-install-ped-dual',
    category: 'ELEC LBR',
    description: 'Installation & Commissioning Of Pedestal-Mounted Charger - Dual Port',
    catalogPrice: 1600,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'eleclbr-install-wall-dual',
    category: 'ELEC LBR',
    description: 'Installation & Commissioning Of Wall-Mounted Charger - Dual Port',
    catalogPrice: 1600,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'eleclbr-install-xeal-ped-dual',
    category: 'ELEC LBR',
    description: 'Xeal - Installation & Commissioning Of Pedestal-Mounted Charger - Dual Port',
    catalogPrice: 2300,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'eleclbr-removal',
    category: 'ELEC LBR',
    description: 'Removal And Disposal Of Existing Ev Chargers',
    catalogPrice: 400,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },

  // ── ELEC LBR MAT ────────────────────────────────────────────
  {
    id: 'eleclbrmat-submeter',
    category: 'ELEC LBR MAT',
    description: 'Austin Energy Approved Sub-Meter',
    catalogPrice: 1300,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'eleclbrmat-conduit-wire',
    category: 'ELEC LBR MAT',
    description: 'Emt Conduit, Wire, Breakers, Connectors, And Strut Cradles (Includes Materials + Labor)',
    catalogPrice: 32,
    unit: 'LF',
    notes: 'Frequently overridden to $36/ft on actual estimates',
    status: 'priced',
  },
  {
    id: 'eleclbrmat-subpanel',
    category: 'ELEC LBR MAT',
    description: 'EV Dedicated Sub-Panel for Sub-Metering (Includes Materials + Labor)',
    catalogPrice: 1050,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },

  // ── MATERIAL ─────────────────────────────────────────────────
  {
    id: 'material-mounting-hardware',
    category: 'MATERIAL',
    description: 'Misc. Mounting Hardware & BOS (Materials Only)',
    catalogPrice: 165,
    unit: 'EA',
    notes: 'per charger',
    status: 'priced',
  },

  // ── MISC ─────────────────────────────────────────────────────
  {
    id: 'misc-travel-adder',
    category: 'MISC',
    description: 'Travel Adder',
    catalogPrice: null,
    unit: 'LS',
    notes: 'TBD in pricebook',
    status: 'tbd',
  },

  // ── NETWORK ──────────────────────────────────────────────────
  {
    id: 'network-teltonika-rut-m50',
    category: 'NETWORK',
    description: 'Teltonika RUT M50',
    catalogPrice: 2400,
    unit: 'EA',
    notes: 'Cellular router',
    status: 'priced',
  },
  {
    id: 'network-ubiquiti-u7',
    category: 'NETWORK',
    description: 'Ubiquiti U7 Outdoor',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'network-teltonika-tsw202',
    category: 'NETWORK',
    description: 'Teltonika TSW202',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'network-enclosure',
    category: 'NETWORK',
    description: 'Aletelix NP 1711406A1 Or Akwscyby Enclosure',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'network-install-enclosure',
    category: 'NETWORK',
    description: 'Install Outdoor-Rated Networking Enclosure',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'network-poe-switch',
    category: 'NETWORK',
    description: 'Provide Power Over Ethernet (Poe) Switch',
    catalogPrice: null,
    unit: 'EA',
    notes: 'No price in pricebook',
    status: 'blank',
  },
  {
    id: 'network-cat6-cable',
    category: 'NETWORK',
    description: 'Run Cat6 Shielded Cable With Conduit',
    catalogPrice: null,
    unit: 'LF',
    notes: 'No price in pricebook',
    status: 'blank',
  },

  // ── PEDESTAL ─────────────────────────────────────────────────
  {
    id: 'pedestal-tesla-wc',
    category: 'PEDESTAL',
    description: 'Tesla Wall Connector Pedestal (Includes Mounting Kit)',
    catalogPrice: 550,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },

  // ── PERMIT ───────────────────────────────────────────────────
  {
    id: 'permit-fees',
    category: 'PERMIT',
    description: 'Permit Fees (Billed At Actual Cost + 10%)',
    catalogPrice: 0,
    unit: 'LS',
    notes: 'Billed at actual cost + 10% markup; $0 placeholder on estimate',
    status: 'zero_passthrough',
  },
  {
    id: 'permit-stamped-plans',
    category: 'PERMIT',
    description: 'Stamped Permit Plan Set',
    catalogPrice: null,
    unit: 'LS',
    notes: 'No price in pricebook',
    status: 'blank',
  },

  // ── SAFETY ───────────────────────────────────────────────────
  {
    id: 'safety-traffic-control',
    category: 'SAFETY',
    description: 'On-Site Traffic Control, Safety Fence, And Trench Plates',
    catalogPrice: 1100,
    unit: 'LS',
    notes: 'Depending on site conditions, number of chargers & days of work',
    status: 'priced',
  },
  {
    id: 'safety-ada',
    category: 'SAFETY',
    description: 'ADA Compliance Coordination',
    catalogPrice: null,
    unit: 'LS',
    notes: 'No price in pricebook',
    status: 'blank',
  },

  // ── SITE WORK ────────────────────────────────────────────────
  {
    id: 'sitework-signage',
    category: 'SITE WORK',
    description: 'Ev Signage (Includes Materials + Labor)',
    catalogPrice: 300,
    unit: 'EA',
    notes: 'Per Parking Spot',
    status: 'priced',
  },
  {
    id: 'sitework-debris-removal',
    category: 'SITE WORK',
    description: 'Removal Of Debris (Includes Disposal Labor)',
    catalogPrice: null,
    unit: 'LS',
    notes: 'TBD in pricebook',
    status: 'tbd',
  },
  {
    id: 'sitework-wheel-stops',
    category: 'SITE WORK',
    description: 'Rubber Wheel Stops (Includes Materials + Labor)',
    catalogPrice: 650,
    unit: 'EA',
    notes: 'Per Parking Spot',
    status: 'priced',
  },
  {
    id: 'sitework-bollards',
    category: 'SITE WORK',
    description: 'Steel Safety Bollards (4" X 36"/42") (Includes Materials + Labor)',
    catalogPrice: 550,
    unit: 'EA',
    notes: 'Per Bollard',
    status: 'priced',
  },

  // ── SOFTWARE ─────────────────────────────────────────────────
  {
    id: 'software-cp-fleet-activation',
    category: 'SOFTWARE',
    description: 'ChargePoint CPF - Active Fleet Application Only - Initial Station Activation & Configuration Service',
    catalogPrice: 126,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'software-cp-cloud-1yr',
    category: 'SOFTWARE',
    description: 'ChargePoint CPCLD-Community-1 - 1 Year - Prepaid ChargePoint Management Software for CPF50',
    catalogPrice: 355,
    unit: 'EA',
    notes: '',
    status: 'priced',
  },
  {
    id: 'software-cp-assure-1yr',
    category: 'SOFTWARE',
    description: 'ChargePoint CPF-Assure - 1 Year - Prepaid ChargePoint Assure for CPF Stations',
    catalogPrice: 0,
    unit: 'EA',
    notes: '',
    status: 'zero_passthrough',
  },
] as const;

// ── Standard Exclusion Texts from Pricebook ────────────────────

export const EXCLUSION_TEXTS: readonly string[] = [
  'Excludes: Transformer (XFRMR), MPU, main feeds/fuses, ADA compliance (TBD), traffic control outside of blocking designated spaces, off-site laydown area, all other installation work/material not listed above, and after-hours work (except for shutdown coordination).',
  'Excludes: Transformer (XFRMR), MPU, Main Feeds/Fuses, ADA Compliance (TBD), Traffic Control (TBD), All Other Installation Work/Material Not Listed Above, And After-Hours Work.',
  'Excludes: Transformer (XFRMR), MPU, Main Feeds/Fuses, ADA Compliance (TBD), Off-Site Laydown Area, All Other Installation Work/Material Not Listed Above, And After-Hours Work.',
  'Excludes: Transformer (XFRMR), MPU, Main Feeds/Fuses, All Other Installation Work/Material Not Listed Above, And After-Hours Work.',
  'Excludes: All Other Installation Work/Material Not Listed Above.',
];

// ── Tesla Supercharger Package Pricing ─────────────────────────
// From Tesla Supercharger Pricing Sheet 9.2025.xlsx

export interface SuperchargerPackage {
  id: string;
  description: string;
  stallCount: number;
  cabinetCount: number;
  bulkPrice: number;
  msrpPrice: number;
  availability: 'current' | 'roadmap';
  availabilityNote: string;
}

export const TESLA_SUPERCHARGER_PACKAGES: readonly SuperchargerPackage[] = [
  { id: 'tsc-std-4', description: 'Standard 4-Stall Supercharger Set', stallCount: 4, cabinetCount: 1, bulkPrice: 187500, msrpPrice: 250000, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-prefab-4', description: 'Pre-Fabricated 4-Stall Supercharger Set (PSU)', stallCount: 4, cabinetCount: 1, bulkPrice: 225000, msrpPrice: 315000, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-std-6', description: 'Standard 6-Stall Supercharger Set', stallCount: 6, cabinetCount: 2, bulkPrice: 288000, msrpPrice: 400000, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-150kw-4', description: '4-Stall Supercharger Set >150 kW Min/stall', stallCount: 4, cabinetCount: 2, bulkPrice: 272000, msrpPrice: 330000, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-150kw-5', description: '5-Stall Supercharger Set >150 kW Min/stall', stallCount: 5, cabinetCount: 2, bulkPrice: 274000, msrpPrice: 341000, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-150kw-7', description: '7-Stall Supercharger Set >150 kW Min/stall', stallCount: 7, cabinetCount: 3, bulkPrice: 402000, msrpPrice: 502000, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-150kw-10', description: '10-Stall Supercharger Set >150 kW Min/stall', stallCount: 10, cabinetCount: 4, bulkPrice: 539000, msrpPrice: 672500, availability: 'current', availabilityNote: '4-week lead time' },
  { id: 'tsc-v4-8', description: 'Standard 8-Stall Supercharger Set', stallCount: 8, cabinetCount: 1, bulkPrice: 475000, msrpPrice: 500000, availability: 'roadmap', availabilityNote: 'Q4 2026' },
  { id: 'tsc-semi-2', description: 'Semi Truck Charging 2-Stall Set', stallCount: 2, cabinetCount: 1, bulkPrice: 178000, msrpPrice: 178000, availability: 'roadmap', availabilityNote: 'Q1 2027' },
];

// ── Tesla Service Fees ─────────────────────────────────────────

export interface ServiceFee {
  id: string;
  name: string;
  rate: number;
  unit: string;
  applicableTo: string;
}

export const SERVICE_FEES: readonly ServiceFee[] = [
  { id: 'svc-public-ppu', name: 'Public Pay-Per-Use', rate: 0.10, unit: '$/kWh', applicableTo: 'Public Supercharger sites' },
  { id: 'svc-semi-ppu', name: 'Semi Truck', rate: 0.08, unit: '$/kWh', applicableTo: 'Semi Truck Supercharger sites' },
  { id: 'svc-private-ppu', name: 'Private Per-kWh', rate: 0.06, unit: '$/kWh', applicableTo: 'Private Supercharger sites' },
  { id: 'svc-private-annual', name: 'Private Annual', rate: 6000, unit: '$/stall/year', applicableTo: 'Private Supercharger sites (annual option)' },
];

// ── Known Price Override Patterns ──────────────────────────────
// Observed from the 396 Property Management estimate vs pricebook

export const KNOWN_OVERRIDES: Record<string, { catalogPrice: number; typicalOverride: number; reason: string }> = {
  'eleclbrmat-conduit-wire': { catalogPrice: 32, typicalOverride: 36, reason: 'Per-project complexity adjustment' },
  'civil-coring-slab-scan': { catalogPrice: 312, typicalOverride: 950, reason: 'Site-specific conditions; catalog price may be base only' },
  'deseng-stamped-plans': { catalogPrice: 3500, typicalOverride: 4250, reason: 'Complex permit jurisdictions' },
  'deseng-load-calc': { catalogPrice: 900, typicalOverride: 1050, reason: 'Per-project complexity adjustment' },
};

// ── Lookup Helpers ─────────────────────────────────────────────

export function findPricebookItem(id: string): PricebookItem | undefined {
  return PRICEBOOK.find((item) => item.id === id);
}

export function findPricebookItemsByCategory(category: EstimateCategory): PricebookItem[] {
  return PRICEBOOK.filter((item) => item.category === category);
}

export function findChargerByDescription(description: string): PricebookItem | undefined {
  const descLower = description.toLowerCase();
  return PRICEBOOK.filter((item) => item.category === 'CHARGER').find(
    (item) => item.description.toLowerCase().includes(descLower) || descLower.includes(item.description.toLowerCase()),
  );
}

export function findSuperchargerPackage(stallCount: number): SuperchargerPackage | undefined {
  const exact = TESLA_SUPERCHARGER_PACKAGES.find((p) => p.stallCount === stallCount);
  if (exact) return exact;
  const larger = [...TESLA_SUPERCHARGER_PACKAGES]
    .filter((p) => p.stallCount >= stallCount && p.availability === 'current')
    .sort((a, b) => a.stallCount - b.stallCount);
  return larger[0];
}

/**
 * Resolve the price for a pricebook item, applying known overrides if enabled.
 * Returns { price, source } where source indicates catalog or override.
 */
export function resolvePrice(
  item: PricebookItem,
  useOverrides: boolean = false,
): { price: number | null; source: 'catalog' | 'override' | 'tbd' } {
  if (item.status === 'tbd' || item.status === 'blank') {
    return { price: null, source: 'tbd' };
  }
  if (useOverrides && item.id in KNOWN_OVERRIDES) {
    return { price: KNOWN_OVERRIDES[item.id].typicalOverride, source: 'override' };
  }
  return { price: item.catalogPrice, source: 'catalog' };
}
