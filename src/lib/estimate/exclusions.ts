import { EstimateExclusion, EstimateInput } from './types';

// ============================================================
// Standard Exclusion Library
// ============================================================

interface ExclusionTemplate {
  id: string;
  text: string;
  category: string;
  isStandard: boolean;
  /** If provided, exclusion is only included when condition returns true */
  condition?: (input: EstimateInput) => boolean;
  /** Static reason (used when there is no condition or condition is always true) */
  reason: string;
}

const EXCLUSION_TEMPLATES: readonly ExclusionTemplate[] = [
  {
    id: 'excl-utility-upgrade',
    text: 'Utility service upgrades beyond the electrical meter, including transformer upgrades by the utility company, service entrance changes, and utility-side infrastructure.',
    category: 'Electrical',
    isStandard: true,
    reason: 'Standard exclusion - utility-side work is outside installer scope',
  },
  {
    id: 'excl-hazmat',
    text: 'Asbestos abatement, lead paint remediation, or any hazardous material handling and disposal.',
    category: 'Environmental',
    isStandard: true,
    reason: 'Standard exclusion - requires specialized environmental contractor',
  },
  {
    id: 'excl-ada-beyond',
    text: 'ADA compliance modifications beyond the immediate EV charging area, including pathway upgrades, curb cuts, and signage outside the charging zone.',
    category: 'Civil',
    isStandard: true,
    reason: 'Standard exclusion - broader ADA compliance is property owner responsibility',
  },
  {
    id: 'excl-landscaping',
    text: 'Landscaping restoration beyond the immediate work area, including tree removal, irrigation repair, and decorative hardscaping.',
    category: 'Civil',
    isStandard: true,
    reason: 'Standard exclusion - landscaping scope varies widely',
  },
  {
    id: 'excl-structural',
    text: 'Structural modifications to buildings, including load-bearing wall changes, foundation work, and structural reinforcement.',
    category: 'Structural',
    isStandard: true,
    reason: 'Standard exclusion - requires structural engineering and separate permits',
  },
  {
    id: 'excl-fire-suppression',
    text: 'Fire suppression system modifications, including sprinkler relocation, fire alarm integration, and fire-rated assembly work beyond immediate penetrations.',
    category: 'Fire/Safety',
    isStandard: true,
    condition: (input) =>
      input.parkingEnvironment.type === 'parking_garage' ||
      input.parkingEnvironment.type === 'mixed',
    reason: 'Garage and mixed environments may involve fire suppression systems. Fire system modifications require a specialized contractor.',
  },
  {
    id: 'excl-lighting',
    text: 'Lighting upgrades beyond the immediate EV charging area, including parking lot lighting, security lighting, and decorative fixtures.',
    category: 'Electrical',
    isStandard: true,
    reason: 'Standard exclusion - lighting scope is separate from charging infrastructure',
  },
  {
    id: 'excl-network-infra',
    text: 'Network infrastructure beyond the specified connectivity solution, including fiber optic runs, network switch upgrades, and ISP coordination.',
    category: 'Network',
    isStandard: true,
    reason: 'Standard exclusion - network infrastructure varies by building',
  },
  {
    id: 'excl-soil-remediation',
    text: 'Soil remediation, contaminated soil disposal, and environmental testing beyond standard excavation.',
    category: 'Environmental',
    isStandard: true,
    reason: 'Standard exclusion - environmental work requires specialized assessment',
  },
  {
    id: 'excl-rock-excavation',
    text: 'Rock excavation, blasting, or removal of underground obstructions (abandoned utilities, foundations, etc.).',
    category: 'Civil',
    isStandard: true,
    reason: 'Standard exclusion - subsurface conditions cannot be guaranteed',
  },
  {
    id: 'excl-prevailing-wage',
    text: 'Prevailing wage requirements, unless specifically noted. Projects receiving public funding may require prevailing wage compliance.',
    category: 'Labor',
    isStandard: true,
    reason: 'Standard exclusion - prevailing wage significantly affects labor costs',
  },
  {
    id: 'excl-overtime',
    text: 'Overtime, weekend, or holiday labor premiums unless specifically included in the estimate.',
    category: 'Labor',
    isStandard: true,
    reason: 'Standard exclusion - premium labor rates not included by default',
  },
  {
    id: 'excl-bonding',
    text: 'Payment and performance bonds unless specifically requested and quoted.',
    category: 'Administrative',
    isStandard: true,
    reason: 'Standard exclusion - bonding adds 1-3% to project cost',
  },
  {
    id: 'excl-warranty-extended',
    text: 'Extended warranty coverage beyond manufacturer standard warranty periods.',
    category: 'Warranty',
    isStandard: true,
    reason: 'Standard exclusion - extended warranties are optional add-ons',
  },
  {
    id: 'excl-energy-management',
    text: 'Energy management systems, demand response integration, and load balancing hardware beyond charger-native capabilities.',
    category: 'Electrical',
    isStandard: true,
    reason: 'Standard exclusion - EMS is a separate scope item',
  },
  {
    id: 'excl-solar-storage',
    text: 'Solar panel installation, battery energy storage systems (BESS), and renewable energy integration.',
    category: 'Energy',
    isStandard: true,
    reason: 'Standard exclusion - renewable energy is a separate project scope',
  },
  {
    id: 'excl-canopy',
    text: 'Canopy, shade structures, or weather protection structures over charging stations.',
    category: 'Structural',
    isStandard: true,
    reason: 'Standard exclusion - canopy is a separate scope with structural requirements',
  },
  {
    id: 'excl-camera-security',
    text: 'Security cameras, access control systems, and monitoring equipment beyond charger-native features.',
    category: 'Security',
    isStandard: true,
    reason: 'Standard exclusion - security systems are separate scope',
  },
  {
    id: 'excl-utility-coord-fees',
    text: 'Utility coordination fees, demand charges, or rate schedule analysis.',
    category: 'Electrical',
    isStandard: true,
    reason: 'Standard exclusion - utility fees are variable and project-specific',
  },
  {
    id: 'excl-restoration-beyond',
    text: 'Surface restoration beyond the immediate trenching/boring path, including full-depth asphalt overlay and decorative concrete matching.',
    category: 'Civil',
    isStandard: true,
    reason: 'Standard exclusion - restoration scope depends on site owner requirements',
  },
  {
    id: 'excl-winterization',
    text: 'Winterization, heating elements, or cold-weather protection beyond standard equipment ratings.',
    category: 'Equipment',
    isStandard: true,
    reason: 'Standard exclusion - cold weather packages are site-specific',
  },
  {
    id: 'excl-elevator-crane',
    text: 'Crane rental, rigging, or elevator reservations for equipment delivery to upper floors.',
    category: 'Logistics',
    isStandard: true,
    condition: (input) => input.parkingEnvironment.type === 'parking_garage',
    reason: 'Conditional exclusion - applies to garage installations requiring equipment transport',
  },
  {
    id: 'excl-tenant-coord',
    text: 'Tenant coordination, move-out scheduling, and access coordination beyond standard business hours.',
    category: 'Administrative',
    isStandard: true,
    condition: (input) =>
      input.site.siteType === 'apartment' || input.site.siteType === 'office',
    reason: 'Conditional exclusion - multi-tenant sites require coordination',
  },
  {
    id: 'excl-fuel-system',
    text: 'Fuel system decommissioning, underground storage tank removal, and petroleum-related environmental work.',
    category: 'Environmental',
    isStandard: true,
    condition: (input) => input.site.siteType === 'fuel_station',
    reason: 'Conditional exclusion - fuel station conversions may involve UST work',
  },
] as const;

// ── Selection Engine ─────────────────────────────────────────

export function selectExclusions(input: EstimateInput): EstimateExclusion[] {
  return EXCLUSION_TEMPLATES.filter((tmpl) => {
    if (tmpl.condition) {
      return tmpl.condition(input);
    }
    return true; // standard exclusions always included
  }).map((tmpl) => ({
    id: tmpl.id,
    text: tmpl.text,
    category: tmpl.category,
    reason: tmpl.reason,
    isStandard: tmpl.isStandard,
  }));
}
