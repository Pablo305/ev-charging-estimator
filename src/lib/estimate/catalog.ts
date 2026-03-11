// ============================================================
// Hardware Pricing Catalog
// ============================================================

export interface CatalogItem {
  id: string;
  brand: string;
  model: string;
  description: string;
  chargingLevel: 'l2' | 'l3_dcfc';
  bulkPrice: number | null;
  msrpPrice: number | null;
  priceNote: string;
  isPackage: boolean;
  stallCount?: number;
  minStalls?: number;
  maxStalls?: number;
  availability: 'available' | 'q4_2026' | 'q1_2027' | 'tbd';
}

export interface ServiceFee {
  id: string;
  name: string;
  rate: number;
  unit: string;
  applicableTo: string;
  note: string;
}

export interface AccessoryPrice {
  id: string;
  name: string;
  lowPrice: number;
  midPrice: number;
  highPrice: number;
  unit: string;
  source: string;
}

// ── Tesla Supercharger Packages ──────────────────────────────

export const TESLA_SUPERCHARGER_PACKAGES: readonly CatalogItem[] = [
  {
    id: 'tsc-std-4',
    brand: 'Tesla',
    model: 'Supercharger Standard 4-Stall',
    description: 'Standard 4-Stall Supercharger Package (up to 150kW)',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 187_500,
    msrpPrice: 250_000,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 4,
    minStalls: 4,
    maxStalls: 4,
    availability: 'available',
  },
  {
    id: 'tsc-prefab-4',
    brand: 'Tesla',
    model: 'Supercharger Pre-Fab 4-Stall (PSU)',
    description: 'Pre-Fabricated 4-Stall Supercharger with Power Supply Unit',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 225_000,
    msrpPrice: 292_500,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 4,
    minStalls: 4,
    maxStalls: 4,
    availability: 'available',
  },
  {
    id: 'tsc-std-6',
    brand: 'Tesla',
    model: 'Supercharger Standard 6-Stall',
    description: 'Standard 6-Stall Supercharger Package',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 288_000,
    msrpPrice: 400_000,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 6,
    minStalls: 6,
    maxStalls: 6,
    availability: 'available',
  },
  {
    id: 'tsc-150kw-4',
    brand: 'Tesla',
    model: 'Supercharger 4-Stall >150kW',
    description: '4-Stall Supercharger Package >150kW',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 272_000,
    msrpPrice: 340_000,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 4,
    minStalls: 4,
    maxStalls: 4,
    availability: 'available',
  },
  {
    id: 'tsc-150kw-5',
    brand: 'Tesla',
    model: 'Supercharger 5-Stall >150kW',
    description: '5-Stall Supercharger Package >150kW',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 274_000,
    msrpPrice: 342_500,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 5,
    minStalls: 5,
    maxStalls: 5,
    availability: 'available',
  },
  {
    id: 'tsc-150kw-7',
    brand: 'Tesla',
    model: 'Supercharger 7-Stall >150kW',
    description: '7-Stall Supercharger Package >150kW',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 402_000,
    msrpPrice: 502_500,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 7,
    minStalls: 7,
    maxStalls: 7,
    availability: 'available',
  },
  {
    id: 'tsc-150kw-10',
    brand: 'Tesla',
    model: 'Supercharger 10-Stall >150kW',
    description: '10-Stall Supercharger Package >150kW',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 539_000,
    msrpPrice: 674_000,
    priceNote: 'From Tesla commercial workbook',
    isPackage: true,
    stallCount: 10,
    minStalls: 10,
    maxStalls: 10,
    availability: 'available',
  },
  {
    id: 'tsc-v4-8',
    brand: 'Tesla',
    model: 'Supercharger V4 8-Stall',
    description: '8-Stall V4 Supercharger (Q4 2026 availability)',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 475_000,
    msrpPrice: 593_750,
    priceNote: 'From Tesla commercial workbook - Q4 2026',
    isPackage: true,
    stallCount: 8,
    minStalls: 8,
    maxStalls: 8,
    availability: 'q4_2026',
  },
  {
    id: 'tsc-semi-2',
    brand: 'Tesla',
    model: 'Supercharger Semi Truck 2-Stall',
    description: '2-Stall Semi Truck Supercharger (Q1 2027 availability)',
    chargingLevel: 'l3_dcfc',
    bulkPrice: 178_000,
    msrpPrice: 222_500,
    priceNote: 'From Tesla commercial workbook - Q1 2027',
    isPackage: true,
    stallCount: 2,
    minStalls: 2,
    maxStalls: 2,
    availability: 'q1_2027',
  },
] as const;

// ── Tesla L2 (UWC) ──────────────────────────────────────────

export const TESLA_UWC_ITEMS: readonly CatalogItem[] = [
  {
    id: 'tesla-uwc-single',
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    description: 'Tesla Universal Wall Connector (L2, up to 48A)',
    chargingLevel: 'l2',
    bulkPrice: 550,
    msrpPrice: 700,
    priceNote: 'Industry estimate - not in Tesla workbook',
    isPackage: false,
    availability: 'available',
  },
] as const;

// ── ChargePoint ──────────────────────────────────────────────

export const CHARGEPOINT_ITEMS: readonly CatalogItem[] = [
  {
    id: 'cp-cpf50',
    brand: 'ChargePoint',
    model: 'CPF50',
    description: 'ChargePoint CPF50 Level 2 (single port)',
    chargingLevel: 'l2',
    bulkPrice: null,
    msrpPrice: 2_500,
    priceNote: 'Industry estimate - verify with ChargePoint rep',
    isPackage: false,
    availability: 'available',
  },
  {
    id: 'cp-ct4000',
    brand: 'ChargePoint',
    model: 'CT4000',
    description: 'ChargePoint CT4000 Level 2 (dual port)',
    chargingLevel: 'l2',
    bulkPrice: null,
    msrpPrice: 5_500,
    priceNote: 'Industry estimate - verify with ChargePoint rep',
    isPackage: false,
    availability: 'available',
  },
  {
    id: 'cp-cpf32',
    brand: 'ChargePoint',
    model: 'CPF32',
    description: 'ChargePoint CPF32 Fleet Level 2',
    chargingLevel: 'l2',
    bulkPrice: null,
    msrpPrice: 3_800,
    priceNote: 'Industry estimate - verify with ChargePoint rep',
    isPackage: false,
    availability: 'available',
  },
  {
    id: 'cp-express-plus',
    brand: 'ChargePoint',
    model: 'Express Plus',
    description: 'ChargePoint Express Plus DCFC (L3)',
    chargingLevel: 'l3_dcfc',
    bulkPrice: null,
    msrpPrice: 8_500,
    priceNote: 'Industry estimate - verify with ChargePoint rep',
    isPackage: false,
    availability: 'available',
  },
] as const;

// ── Other Brands ─────────────────────────────────────────────

export const OTHER_BRAND_ITEMS: readonly CatalogItem[] = [
  {
    id: 'xeal-generic',
    brand: 'Xeal',
    model: 'Generic L2',
    description: 'Xeal Level 2 Charger',
    chargingLevel: 'l2',
    bulkPrice: null,
    msrpPrice: null,
    priceNote: 'TBD - contact Xeal for pricing',
    isPackage: false,
    availability: 'tbd',
  },
  {
    id: 'swtch-generic',
    brand: 'SWTCH',
    model: 'Generic L2',
    description: 'SWTCH Level 2 Charger',
    chargingLevel: 'l2',
    bulkPrice: null,
    msrpPrice: null,
    priceNote: 'TBD - contact SWTCH for pricing',
    isPackage: false,
    availability: 'tbd',
  },
] as const;

// ── Pedestal Pricing ─────────────────────────────────────────

export const PEDESTAL_PRICING = {
  tesla_roi: { price: 425, source: 'Tesla ROI calculator' as const },
  l2_typical_low: { price: 500, source: 'industry_standard' as const },
  l2_typical_mid: { price: 1_000, source: 'industry_standard' as const },
  l2_typical_high: { price: 1_500, source: 'industry_standard' as const },
  l2_typical_max: { price: 2_000, source: 'industry_standard' as const },
} as const;

// ── Service Fees ─────────────────────────────────────────────

export const SERVICE_FEES: readonly ServiceFee[] = [
  {
    id: 'svc-public-ppu',
    name: 'Public Pay-Per-Use',
    rate: 0.10,
    unit: 'per kWh',
    applicableTo: 'Public Supercharger sites',
    note: 'Tesla recurring service fee for public stations',
  },
  {
    id: 'svc-semi-ppu',
    name: 'Semi Truck Pay-Per-Use',
    rate: 0.08,
    unit: 'per kWh',
    applicableTo: 'Semi Truck Supercharger sites',
    note: 'Tesla recurring service fee for semi truck stations',
  },
  {
    id: 'svc-private-ppu',
    name: 'Private Pay-Per-Use',
    rate: 0.06,
    unit: 'per kWh',
    applicableTo: 'Private/fleet Supercharger sites',
    note: 'Tesla recurring service fee for private stations',
  },
  {
    id: 'svc-private-annual',
    name: 'Private Annual Fee',
    rate: 6_000,
    unit: 'per stall/year',
    applicableTo: 'Private Supercharger sites (annual option)',
    note: 'Alternative to per-kWh for private sites',
  },
] as const;

// ── Accessory Prices (industry standard ranges) ─────────────

export const ACCESSORY_PRICES: readonly AccessoryPrice[] = [
  {
    id: 'acc-bollard',
    name: 'Bollard (installed)',
    lowPrice: 250,
    midPrice: 375,
    highPrice: 500,
    unit: 'each',
    source: 'industry_standard',
  },
  {
    id: 'acc-sign',
    name: 'EV Charging Sign (installed)',
    lowPrice: 150,
    midPrice: 275,
    highPrice: 400,
    unit: 'each',
    source: 'industry_standard',
  },
  {
    id: 'acc-wheelstop',
    name: 'Wheel Stop (installed)',
    lowPrice: 75,
    midPrice: 112,
    highPrice: 150,
    unit: 'each',
    source: 'industry_standard',
  },
  {
    id: 'acc-striping',
    name: 'Parking Space Striping',
    lowPrice: 200,
    midPrice: 350,
    highPrice: 500,
    unit: 'per space',
    source: 'industry_standard',
  },
  {
    id: 'acc-pad',
    name: 'Concrete Charging Pad',
    lowPrice: 1_500,
    midPrice: 2_750,
    highPrice: 4_000,
    unit: 'each',
    source: 'industry_standard',
  },
] as const;

// ── Installation Cost Ranges ─────────────────────────────────

export const INSTALLATION_COSTS = {
  electricalLabor: { low: 85, mid: 105, high: 125, unit: 'per hour' },
  conduitPerFt: { low: 15, mid: 25, high: 35, unit: 'per ft' },
  wirePerFt: { low: 8, mid: 16, high: 25, unit: 'per ft' },
  trenchingPerFt: { low: 25, mid: 50, high: 75, unit: 'per ft' },
  boringPerFt: { low: 40, mid: 80, high: 120, unit: 'per ft' },
  permitFee: { low: 500, mid: 1_750, high: 3_000, unit: 'lump sum' },
  engineeringPlans: { low: 2_500, mid: 5_250, high: 8_000, unit: 'lump sum' },
  loadCalc: { low: 500, mid: 1_000, high: 1_500, unit: 'lump sum' },
  slabScan: { low: 500, mid: 1_000, high: 1_500, unit: 'lump sum' },
  coreDrilling: { low: 300, mid: 550, high: 800, unit: 'each' },
  panelUpgrade: { low: 3_000, mid: 5_500, high: 8_000, unit: 'lump sum' },
  transformer: { low: 15_000, mid: 32_500, high: 50_000, unit: 'lump sum' },
  switchgear: { low: 10_000, mid: 25_000, high: 40_000, unit: 'lump sum' },
  debrisRemoval: { low: 500, mid: 1_000, high: 2_000, unit: 'lump sum' },
  trafficControl: { low: 500, mid: 1_250, high: 2_000, unit: 'per day' },
  fireRatedPenetration: { low: 500, mid: 1_000, high: 2_000, unit: 'each' },
  cellularRouter: { low: 800, mid: 1_200, high: 1_600, unit: 'each' },
  routerEnclosure: { low: 200, mid: 400, high: 600, unit: 'each' },
  wifiBridge: { low: 500, mid: 1_000, high: 1_500, unit: 'each' },
  networkInstallLabor: { low: 500, mid: 1_000, high: 1_500, unit: 'lump sum' },
} as const;

// ── Catalog Lookup Helpers ───────────────────────────────────

const ALL_CATALOG: readonly CatalogItem[] = [
  ...TESLA_SUPERCHARGER_PACKAGES,
  ...TESLA_UWC_ITEMS,
  ...CHARGEPOINT_ITEMS,
  ...OTHER_BRAND_ITEMS,
];

export function findCatalogItem(
  brand: string,
  model: string,
): CatalogItem | undefined {
  const bLower = brand.toLowerCase();
  const mLower = model.toLowerCase();
  return ALL_CATALOG.find(
    (item) =>
      item.brand.toLowerCase() === bLower &&
      item.model.toLowerCase().includes(mLower),
  );
}

export function findSuperchargerPackage(
  stallCount: number,
): CatalogItem | undefined {
  // Find exact match first
  const exact = TESLA_SUPERCHARGER_PACKAGES.find(
    (p) => p.stallCount === stallCount,
  );
  if (exact) return exact;

  // Find closest with >= stall count
  const larger = [...TESLA_SUPERCHARGER_PACKAGES]
    .filter((p) => p.stallCount !== undefined && p.stallCount >= stallCount)
    .sort((a, b) => (a.stallCount ?? 0) - (b.stallCount ?? 0));
  return larger[0];
}

export function getAccessoryPrice(
  id: string,
): AccessoryPrice | undefined {
  return ACCESSORY_PRICES.find((a) => a.id === id);
}
