// ============================================================
// Guided Flow Configuration
// Maps installation types → templates, conditional fields, cell mappings
// ============================================================

import type { ProposalTemplate } from './templates';
import { suggestTemplate } from './templates';

// ── Installation Type Definitions ─────────────────────────────

export type InstallationType =
  | 'commission_only'
  | 'equipment_purchase'
  | 'remove_replace'
  | 'install_commission'
  | 'full_turnkey_garage'
  | 'full_turnkey_lot'
  | 'supercharger'
  | 'service_call';

export interface InstallationTypeOption {
  id: InstallationType;
  label: string;
  description: string;
  icon: string;
  projectType: string;
  parkingType?: string | null;
}

export const INSTALLATION_TYPES: readonly InstallationTypeOption[] = [
  {
    id: 'commission_only',
    label: 'Commission Only',
    description: 'Commission existing chargers, no installation',
    icon: '\u2705',
    projectType: 'commission_only',
  },
  {
    id: 'equipment_purchase',
    label: 'Equipment Purchase Only',
    description: 'Equipment procurement only, no install',
    icon: '\uD83D\uDCE6',
    projectType: 'equipment_purchase',
  },
  {
    id: 'remove_replace',
    label: 'Remove & Replace',
    description: 'Remove existing chargers, install new ones',
    icon: '\uD83D\uDD04',
    projectType: 'remove_replace',
  },
  {
    id: 'install_commission',
    label: 'Install & Commission',
    description: 'New installation with full commissioning',
    icon: '\uD83D\uDD27',
    projectType: 'install_commission',
  },
  {
    id: 'full_turnkey_garage',
    label: 'Full Turnkey \u00B7 Garage',
    description: 'Complete parking garage installation package',
    icon: '\uD83C\uDFE2',
    projectType: 'full_turnkey',
    parkingType: 'parking_garage',
  },
  {
    id: 'full_turnkey_lot',
    label: 'Full Turnkey \u00B7 Parking Lot',
    description: 'Complete outdoor parking lot installation package',
    icon: '\uD83C\uDFD7\uFE0F',
    projectType: 'full_turnkey',
    parkingType: 'surface_lot',
  },
  {
    id: 'service_call',
    label: 'Service Call',
    description: 'Diagnostic visit or repair, truck roll + hourly',
    icon: '\uD83D\uDCDE',
    projectType: 'service_call',
  },
  {
    id: 'supercharger',
    label: 'Supercharger',
    description: 'DC fast-charging station (multiples of 4)',
    icon: '\u26A1',
    projectType: 'supercharger',
  },
];

// ── Conditional Field Definitions ─────────────────────────────

export type FieldInputType = 'number' | 'select' | 'text' | 'radio';

export interface ConditionalField {
  id: string;
  label: string;
  inputType: FieldInputType;
  /** Path in EstimateInput to write to */
  fieldPath: string;
  /** If true, this field can be auto-populated from map drawings */
  mapDerived?: boolean;
  /** Which map drawing tool populates this field */
  mapTool?: string;
  /** Contextual map prompt shown to user */
  mapPrompt?: string;
  /** Hint text shown below the field */
  hint?: string;
  /** Required field */
  required?: boolean;
  /** Options for select/radio inputs */
  options?: Array<{ value: string; label: string }>;
  /** Min/max for number inputs */
  min?: number;
  max?: number;
  /** Placeholder text */
  placeholder?: string;
}

const INSTALL_TYPE_OPTIONS = [
  { value: 'pedestal_single', label: 'Pedestal Mounted Charger, Single Port' },
  { value: 'wall_single', label: 'Wall Mounted Charger, Single Port' },
  { value: 'pedestal_dual', label: 'Pedestal Mounted Charger, Dual Port' },
];

const CORE_DRILLING_OPTIONS = [
  { value: 'true', label: 'Yes \u2014 Core drilling required' },
  { value: 'false', label: 'No \u2014 No core drilling needed' },
];

export const CONDITIONAL_FIELDS: Record<InstallationType, ConditionalField[]> = {
  commission_only: [
    {
      id: 'numCommissioned',
      label: 'Number of Chargers Being Commissioned',
      inputType: 'number',
      fieldPath: 'charger.count',
      required: true,
      min: 1,
      placeholder: '0',
      hint: 'Count each charger unit separately, even if two are mounted on one pedestal. (2 chargers on 1 pedestal = 2)',
    },
  ],

  equipment_purchase: [],

  remove_replace: [
    {
      id: 'numRemoved',
      label: 'Number of Chargers Being Removed',
      inputType: 'number',
      fieldPath: 'notes',
      required: true,
      min: 0,
      placeholder: '0',
      hint: 'Wall mounted \u2192 count each charger. Pedestal mounted \u2192 count each pedestal.',
    },
    {
      id: 'installCommType',
      label: 'Type of Installation & Commissioning',
      inputType: 'select',
      fieldPath: 'charger.mountType',
      required: true,
      options: INSTALL_TYPE_OPTIONS,
    },
    {
      id: 'numInstallComm',
      label: 'Number of Units',
      inputType: 'number',
      fieldPath: 'charger.count',
      required: true,
      min: 1,
      placeholder: '0',
      hint: 'Wall mounted = chargers. Pedestal mounted = pedestals.',
    },
  ],

  install_commission: [
    {
      id: 'installCommType',
      label: 'Type of Installation & Commissioning',
      inputType: 'select',
      fieldPath: 'charger.mountType',
      required: true,
      options: INSTALL_TYPE_OPTIONS,
    },
    {
      id: 'numInstallComm',
      label: 'Number of Units',
      inputType: 'number',
      fieldPath: 'charger.count',
      required: true,
      min: 1,
      placeholder: '0',
      hint: 'Wall mounted = chargers. Pedestal mounted = pedestals.',
    },
  ],

  full_turnkey_garage: [
    {
      id: 'installCommType',
      label: 'Type of Installation & Commissioning',
      inputType: 'select',
      fieldPath: 'charger.mountType',
      required: true,
      options: INSTALL_TYPE_OPTIONS,
    },
    {
      id: 'numInstallComm',
      label: 'Number of Units',
      inputType: 'number',
      fieldPath: 'charger.count',
      required: true,
      min: 1,
      placeholder: '0',
      hint: 'Wall mounted = chargers. Pedestal mounted = pedestals.',
    },
    {
      id: 'coreDrilling',
      label: 'Core Drilling Required?',
      inputType: 'radio',
      fieldPath: 'parkingEnvironment.coringRequired',
      required: true,
      options: CORE_DRILLING_OPTIONS,
    },
    {
      id: 'emtConduitLength',
      label: 'EMT Conduit Length (linear ft)',
      inputType: 'number',
      fieldPath: 'mapWorkspace.conduitDistance_ft',
      required: true,
      min: 0,
      placeholder: 'e.g. 165',
      hint: 'Total route from panel to furthest charger \u00D7 number of units.',
      mapDerived: true,
      mapTool: 'conduit_run',
      mapPrompt: 'Draw the conduit route from the electrical panel to each charger location',
    },
    {
      id: 'numBollards',
      label: 'Number of Bollards',
      inputType: 'number',
      fieldPath: 'accessories.bollardQty',
      min: 0,
      placeholder: '0',
      hint: 'Protective posts per space. Enter 0 if none.',
    },
    {
      id: 'numSignage',
      label: 'Signage and Stencils',
      inputType: 'number',
      fieldPath: 'accessories.signQty',
      min: 0,
      placeholder: '0',
      hint: 'Number of parking spaces requiring signage or stencils.',
    },
  ],

  full_turnkey_lot: [
    {
      id: 'installCommType',
      label: 'Type of Installation & Commissioning',
      inputType: 'select',
      fieldPath: 'charger.mountType',
      required: true,
      options: INSTALL_TYPE_OPTIONS,
    },
    {
      id: 'numInstallComm',
      label: 'Number of Units',
      inputType: 'number',
      fieldPath: 'charger.count',
      required: true,
      min: 1,
      placeholder: '0',
      hint: 'Wall mounted = chargers. Pedestal mounted = pedestals.',
    },
    {
      id: 'trenchingLength',
      label: 'Trenching Length (linear ft)',
      inputType: 'number',
      fieldPath: 'mapWorkspace.trenchingDistance_ft',
      required: true,
      min: 0,
      placeholder: '0',
      hint: 'Feet through dirt or grass only. Add a few extra as buffer.',
      mapDerived: true,
      mapTool: 'trench_run',
      mapPrompt: 'Draw the trench route through dirt/grass areas',
    },
    {
      id: 'concreteRemovalLength',
      label: 'Concrete Removal Length (linear ft)',
      inputType: 'number',
      fieldPath: 'mapWorkspace.concreteCuttingDistance_ft',
      required: true,
      min: 0,
      placeholder: '0',
      hint: 'Feet of concrete to cut or break. Does not include dirt sections.',
    },
    {
      id: 'concretePadsRequired',
      label: 'Are Concrete Pads Required?',
      inputType: 'radio',
      fieldPath: 'accessories.padRequired',
      required: true,
      options: [
        { value: 'true', label: 'Yes \u2014 pads needed' },
        { value: 'false', label: 'No \u2014 existing surface usable' },
      ],
      hint: 'Select Yes if pedestal will sit on dirt, grass, or asphalt with no existing concrete pad.',
    },
    {
      id: 'numConcretePads',
      label: 'Number of Concrete Pads Required',
      inputType: 'number',
      fieldPath: 'mapWorkspace.concretePadCount',
      min: 0,
      placeholder: '0',
      hint: 'One pad per pedestal location that needs a new pad.',
    },
    {
      id: 'coreDrilling',
      label: 'Core Drilling Required?',
      inputType: 'radio',
      fieldPath: 'parkingEnvironment.coringRequired',
      required: true,
      options: CORE_DRILLING_OPTIONS,
    },
    {
      id: 'totalConductorLength',
      label: 'Total Conductor / Wire Length (ft)',
      inputType: 'number',
      fieldPath: 'electrical.wire500mcm_ft',
      required: true,
      min: 0,
      placeholder: 'e.g. 100',
      hint: 'Sum of all wire runs from panel to each charger.',
      mapDerived: true,
      mapTool: 'conduit_run',
      mapPrompt: 'Draw the wire route from the electrical panel to each charger',
    },
    {
      id: 'pvcConduitLength',
      label: 'PVC Conduit Length (ft)',
      inputType: 'number',
      fieldPath: 'mapWorkspace.pvcConduitDistance_ft',
      required: true,
      min: 0,
      placeholder: 'e.g. 100',
      hint: 'Total underground PVC from panel to each install location.',
      mapDerived: true,
      mapTool: 'conduit_run',
      mapPrompt: 'Draw the underground conduit route from panel to chargers',
    },
    {
      id: 'numBollards',
      label: 'Number of Bollards',
      inputType: 'number',
      fieldPath: 'accessories.bollardQty',
      min: 0,
      placeholder: '0',
      hint: 'Protective posts per space. Enter 0 if none.',
    },
    {
      id: 'numSignage',
      label: 'Signage and Stencils',
      inputType: 'number',
      fieldPath: 'accessories.signQty',
      min: 0,
      placeholder: '0',
      hint: 'Number of parking spaces requiring signage or stencils.',
    },
  ],

  supercharger: [
    {
      id: 'numSuperchargers',
      label: 'How Many Superchargers?',
      inputType: 'select',
      fieldPath: 'charger.count',
      required: true,
      options: [
        { value: '4', label: '4 Superchargers' },
        { value: '8', label: '8 Superchargers' },
        { value: '12', label: '12 Superchargers' },
        { value: '16', label: '16 Superchargers' },
        { value: '20', label: '20 Superchargers' },
        { value: '24', label: '24 Superchargers' },
        { value: '28', label: '28 Superchargers' },
        { value: '32', label: '32 Superchargers' },
      ],
      hint: 'Superchargers can only be ordered in groups of 4.',
    },
  ],

  service_call: [],
};

// ── Helpers ───────────────────────────────────────────────────

export function getTemplateForInstallationType(type: InstallationType): ProposalTemplate | undefined {
  const option = INSTALLATION_TYPES.find((t) => t.id === type);
  if (!option) return undefined;
  return suggestTemplate(option.projectType, option.parkingType);
}

export function getConditionalFields(type: InstallationType): ConditionalField[] {
  return CONDITIONAL_FIELDS[type] ?? [];
}

export function hasMapFields(type: InstallationType): boolean {
  return getConditionalFields(type).some((f) => f.mapDerived);
}

// ── Cell Mappings for Make.com Webhook ────────────────────────

export const CELL_MAPPINGS: Record<string, string> = {
  'project.salesRep': 'K15',
  'customer.contactName': 'F11',
  'site.address': 'F12',
  'customer.contactPhone': 'F14',
  'customer.contactEmail': 'F15',
  'project.name': 'K11',
  'customer.companyName': 'K12',
};

/** Sheet name mapping per installation type (for Make.com webhook) */
export const SHEET_MAP: Record<InstallationType, { sheetName: string; tabName: string }> = {
  commission_only: { sheetName: '8- COMMISSIONING ONLY', tabName: 'EV CHARGING - COMMISSIONING' },
  equipment_purchase: { sheetName: '9 - EQUIPMENT PURCHASE ONLY', tabName: 'EV CHARGING - EQUIPMENT PURCHASE' },
  remove_replace: { sheetName: '10 - REMOVE & REPLACE', tabName: 'EV CHARGING - REMOVE & REPLACE' },
  install_commission: { sheetName: '7 - INSTALL & COMMISSION TEMPLATE', tabName: 'EV CHARGING - INSTALL & COMMISSION' },
  full_turnkey_garage: { sheetName: '12 - (GARAGE) FULL TURNKEY', tabName: 'EV CHARGING - FULL TURNKEY' },
  full_turnkey_lot: { sheetName: '13 - (PARKING LOT) FULL TURNKEY', tabName: 'EV CHARGING - FULL TURNKEY' },
  supercharger: { sheetName: '4 - SUPERCHARGER PROPOSAL', tabName: 'EV CHARGING PROPOSAL' },
  service_call: { sheetName: '2 - SERVICE CALL TEMPLATE', tabName: 'EV CHARGING PROPOSAL' },
};

// ── Guided Flow Step Definitions ──────────────────────────────

export type GuidedStep = 1 | 2 | 3 | 4 | 5 | 6;

export const STEP_LABELS: Record<GuidedStep, string> = {
  1: 'Rep & Project',
  2: 'Contact & Site',
  3: 'Equipment',
  4: 'Installation Type',
  5: 'Details',
  6: 'Review',
};
