/**
 * Proposal Portal ViewModel adapter.
 *
 * Translates the canonical `EstimateOutput` (src/lib/estimate/types.ts) into a
 * plain data shape (`ProposalViewModel`) that the customer-facing proposal
 * portal components consume. Keeping this adapter as the single boundary means
 * future changes to the estimator's internal shape don't ripple into the
 * presentation layer.
 */

import type {
  EstimateCategory,
  EstimateLineItem,
  EstimateOutput,
} from '@/lib/estimate/types';

// -----------------------------------------------------------------------------
// ViewModel
// -----------------------------------------------------------------------------

export type ProposalBucketKey =
  | 'hardware'
  | 'infrastructure'
  | 'services'
  | 'accessories'
  | 'controls';

export interface ProposalLineItemView {
  id: string;
  name: string;
  detail: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  bucket: ProposalBucketKey;
  sourceCategory: EstimateCategory;
}

export interface ProposalBucketView {
  key: ProposalBucketKey;
  label: string;
  items: ProposalLineItemView[];
  subtotal: number;
}

export interface ProposalChargerView {
  brand: string;
  model: string;
  level: 'l2' | 'l3_dcfc' | 'unknown';
  count: number;
  portType: string | null;
  amps: number | null;
  volts: number | null;
}

export interface ProposalTotalsView {
  lineItemTotal: number;
  subtotal: number;
  tax: number;
  contingency: number;
  grossTotal: number;
  hardwareTotal: number;
  installationTotal: number;
  permitDesignTotal: number;
  networkTotal: number;
  accessoriesTotal: number;
  serviceTotal: number;
}

export interface ProposalSiteView {
  address: string;
  state: string;
  siteType: string | null;
  cityRegion: string;
}

export interface ProposalCustomerView {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface ProposalTimelinePhase {
  stepNumber: number;
  weekLabel: string;
  title: string;
  detail: string;
}

export interface ProposalViewModel {
  proposalId: string;
  preparedBy: string;
  generatedAt: string;
  validUntil: string | null;
  customer: ProposalCustomerView;
  site: ProposalSiteView;
  charger: ProposalChargerView;
  totalPorts: number;
  totals: ProposalTotalsView;
  buckets: ProposalBucketView[];
  timeline: ProposalTimelinePhase[];
  notes: string;
}

// -----------------------------------------------------------------------------
// Category → bucket mapping
// -----------------------------------------------------------------------------

const BUCKET_LABELS: Record<ProposalBucketKey, string> = {
  hardware: 'Hardware',
  infrastructure: 'Infrastructure',
  services: 'Services',
  accessories: 'Accessories',
  controls: 'Controls & Project Fees',
};

/**
 * Map the fine-grained estimator categories to the four display buckets the
 * customer-facing portal uses.
 */
function categoryToBucket(category: EstimateCategory): ProposalBucketKey {
  switch (category) {
    case 'CHARGER':
    case 'PEDESTAL':
      return 'hardware';
    case 'CIVIL':
    case 'ELEC':
    case 'ELEC LBR':
    case 'ELEC LBR MAT':
    case 'ELEC MAT':
    case 'MATERIAL':
    case 'SITE WORK':
      return 'infrastructure';
    case 'DES/ENG':
    case 'PERMIT':
    case 'NETWORK':
    case 'SOFTWARE':
    case 'SAFETY':
    case 'SERVICE_FEE':
      return 'services';
    case 'MISC':
      return 'accessories';
    case 'EXCLUSION':
      // Exclusions shouldn't surface as line items on the proposal
      return 'accessories';
    default:
      return 'services';
  }
}

function adaptLineItem(item: EstimateLineItem): ProposalLineItemView {
  const bucket = categoryToBucket(item.category);
  const detail = item.ruleReason || item.ruleName || item.unit;
  return {
    id: item.id,
    name: item.description,
    detail,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: item.unitPrice,
    totalCost: item.extendedPrice,
    bucket,
    sourceCategory: item.category,
  };
}

function buildBuckets(items: ProposalLineItemView[]): ProposalBucketView[] {
  const order: ProposalBucketKey[] = [
    'hardware',
    'infrastructure',
    'services',
    'accessories',
    'controls',
  ];

  return order
    .map((key) => {
      const bucketItems = items.filter((i) => i.bucket === key);
      const subtotal = bucketItems.reduce((sum, i) => sum + i.totalCost, 0);
      return {
        key,
        label: BUCKET_LABELS[key],
        items: bucketItems,
        subtotal,
      };
    })
    .filter((b) => b.items.length > 0);
}

function normalizeChargerLevel(
  level: EstimateOutput['input']['charger']['chargingLevel']
): 'l2' | 'l3_dcfc' | 'unknown' {
  if (level === 'l2') return 'l2';
  if (level === 'l3_dcfc') return 'l3_dcfc';
  return 'unknown';
}

function extractCityRegion(address: string): string {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  // For "4200 Commerce Dr, Dallas, TX 75201" return "Dallas, TX".
  return parts.slice(-2).join(', ');
}

function defaultTimeline(timelineHint: string): ProposalTimelinePhase[] {
  // timelineHint is a free-text field like "6-8 weeks"; we still show the
  // standard four-phase breakdown so customers understand the rollout.
  const hint = timelineHint?.trim() || '6–8 weeks';
  return [
    {
      stepNumber: 1,
      weekLabel: 'Week 1–2',
      title: 'Site Survey & Design',
      detail: `Kick-off, site walk, engineered drawings (${hint} total).`,
    },
    {
      stepNumber: 2,
      weekLabel: 'Week 2–4',
      title: 'Permitting & Procurement',
      detail: 'Permit submittal, AHJ review, charger + material ordering.',
    },
    {
      stepNumber: 3,
      weekLabel: 'Week 4–7',
      title: 'Construction & Install',
      detail: 'Trenching, conduit, panel work, charger installation.',
    },
    {
      stepNumber: 4,
      weekLabel: 'Week 7–8',
      title: 'Testing & Launch',
      detail: 'Commissioning, network activation, operator training, go-live.',
    },
  ];
}

// -----------------------------------------------------------------------------
// Public adapter
// -----------------------------------------------------------------------------

export function adaptEstimateToProposal(
  estimate: EstimateOutput
): ProposalViewModel {
  const { input, lineItems, summary, metadata } = estimate;

  // Filter out EXCLUSION pseudo-items — those belong in the fine print, not
  // the priced line-item table.
  const visibleItems = lineItems.filter((li) => li.category !== 'EXCLUSION');
  const views = visibleItems.map(adaptLineItem);
  const buckets = buildBuckets(views);

  const totalPorts = input.charger.count;

  return {
    proposalId: `BEV-${metadata.generatedAt.slice(0, 10).replace(/-/g, '')}`,
    preparedBy: input.project.salesRep || 'BulletEV Sales',
    generatedAt: metadata.generatedAt,
    validUntil: null,
    customer: {
      companyName: input.customer.companyName || 'Your Property',
      contactName: input.customer.contactName,
      contactEmail: input.customer.contactEmail,
      contactPhone: input.customer.contactPhone,
    },
    site: {
      address: input.site.address,
      state: input.site.state,
      siteType: input.site.siteType,
      cityRegion: extractCityRegion(input.site.address),
    },
    charger: {
      brand: input.charger.brand,
      model: input.charger.model,
      level: normalizeChargerLevel(input.charger.chargingLevel),
      count: input.charger.count,
      portType: input.charger.portType,
      amps: input.charger.ampsPerCharger,
      volts: input.charger.volts,
    },
    totalPorts,
    totals: {
      lineItemTotal: summary.lineItemTotal,
      subtotal: summary.subtotal,
      tax: summary.tax,
      contingency: summary.contingency,
      grossTotal: summary.total,
      hardwareTotal: summary.hardwareTotal,
      installationTotal: summary.installationTotal,
      permitDesignTotal: summary.permitDesignTotal,
      networkTotal: summary.networkTotal,
      accessoriesTotal: summary.accessoriesTotal,
      serviceTotal: summary.serviceTotal,
    },
    buckets,
    timeline: defaultTimeline(input.project.timeline),
    notes: input.notes,
  };
}

// -----------------------------------------------------------------------------
// Formatting helpers (intentionally here, not in components, so they stay in
// one place and can be shared by PDF export later).
// -----------------------------------------------------------------------------

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function formatCurrencyPrecise(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
