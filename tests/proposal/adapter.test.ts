/**
 * Unit tests for the proposal ViewModel adapter.
 */

import { describe, expect, it } from 'vitest';
import {
  adaptEstimateToProposal,
  formatCurrency,
} from '@/lib/proposal/adapter';
import type { EstimateOutput } from '@/lib/estimate/types';

function buildEstimate(): EstimateOutput {
  return {
    input: {
      project: {
        name: 'Lone Star Business Park',
        salesRep: 'Marcus Chen',
        projectType: 'full_turnkey',
        timeline: '6-8 weeks',
        isNewConstruction: false,
      },
      customer: {
        companyName: 'Lone Star Business Park',
        contactName: 'David Rodriguez',
        contactEmail: 'd.rodriguez@lonestarpark.com',
        contactPhone: '(214) 555-0192',
        billingAddress: '4200 Commerce Dr, Dallas, TX 75201',
      },
      site: {
        address: '4200 Commerce Dr, Dallas, TX 75201',
        siteType: 'office',
        state: 'TX',
      },
      parkingEnvironment: {
        type: 'surface_lot',
        hasPTSlab: null,
        slabScanRequired: null,
        coringRequired: null,
        surfaceType: 'asphalt',
        trenchingRequired: true,
        boringRequired: false,
        trafficControlRequired: false,
        indoorOutdoor: 'outdoor',
        fireRatedPenetrations: null,
        accessRestrictions: '',
      },
      charger: {
        brand: 'Tesla',
        model: 'Wall Connector',
        count: 8,
        pedestalCount: 4,
        portType: 'dual',
        mountType: 'pedestal',
        isCustomerSupplied: false,
        chargingLevel: 'l2',
        ampsPerCharger: 48,
        volts: 240,
      },
      electrical: {
        serviceType: '480v_3phase',
        availableCapacityKnown: true,
        availableAmps: 400,
        breakerSpaceAvailable: true,
        panelUpgradeRequired: true,
        transformerRequired: false,
        switchgearRequired: false,
        distanceToPanel_ft: 150,
        utilityCoordinationRequired: false,
        meterRoomRequired: false,
        junctionBoxCount: 0,
        disconnectRequired: false,
        electricalRoomDescription: 'Main electrical room',
      },
      civil: { installationLocationDescription: 'East lot' },
      permit: { responsibility: 'bullet', feeAllowance: 4200 },
      designEngineering: { responsibility: 'bullet', stampedPlansRequired: true },
      network: { type: 'cellular_router', wifiInstallResponsibility: 'bullet' },
      accessories: {
        bollardQty: 8,
        signQty: 4,
        wheelStopQty: 8,
        stripingRequired: true,
        padRequired: false,
        debrisRemoval: true,
      },
      makeReady: { responsibility: 'bullet' },
      chargerInstall: { responsibility: 'bullet' },
      purchasingChargers: { responsibility: 'bullet' },
      signageBollards: { responsibility: 'signage_bollards' },
      estimateControls: {
        pricingTier: 'msrp',
        taxRate: 7,
        contingencyPercent: 10,
        markupPercent: 20,
      },
      notes: 'Primary aisle — east lot',
    },
    lineItems: [
      {
        id: 'li-1',
        category: 'CHARGER',
        description: 'Tesla Wall Connector (L2)',
        quantity: 8,
        unit: 'ea',
        unitPrice: 4800,
        extendedPrice: 38400,
        pricingSource: 'catalog',
        ruleName: 'hardware.charger',
        ruleReason: '48A · 11.5 kW NACS',
        sourceInputs: ['charger.brand', 'charger.model', 'charger.count'],
        manualReviewRequired: false,
        confidence: 'high',
      },
      {
        id: 'li-2',
        category: 'PEDESTAL',
        description: 'Pedestal Mount',
        quantity: 4,
        unit: 'ea',
        unitPrice: 650,
        extendedPrice: 2600,
        pricingSource: 'catalog',
        ruleName: 'hardware.pedestal',
        ruleReason: 'Pedestal count · 4',
        sourceInputs: ['charger.pedestalCount'],
        manualReviewRequired: false,
        confidence: 'high',
      },
      {
        id: 'li-3',
        category: 'CIVIL',
        description: 'Trenching + conduit run',
        quantity: 150,
        unit: 'lf',
        unitPrice: 42,
        extendedPrice: 6300,
        pricingSource: 'calculated',
        ruleName: 'civil.trenching',
        ruleReason: '150 LF of trenching required',
        sourceInputs: ['civil.trenchDistance_ft'],
        manualReviewRequired: false,
        confidence: 'medium',
      },
      {
        id: 'li-4',
        category: 'ELEC',
        description: 'Panel upgrade 400A',
        quantity: 1,
        unit: 'ea',
        unitPrice: 18500,
        extendedPrice: 18500,
        pricingSource: 'catalog',
        ruleName: 'electrical.panel_upgrade',
        ruleReason: '400A upgrade (existing 200A)',
        sourceInputs: ['electrical.panelUpgradeRequired'],
        manualReviewRequired: false,
        confidence: 'high',
      },
      {
        id: 'li-5',
        category: 'PERMIT',
        description: 'City of Dallas permits + inspection',
        quantity: 1,
        unit: 'lot',
        unitPrice: 4200,
        extendedPrice: 4200,
        pricingSource: 'allowance',
        ruleName: 'permit.allowance',
        ruleReason: 'AHJ fee allowance',
        sourceInputs: ['permit.feeAllowance'],
        manualReviewRequired: false,
        confidence: 'medium',
      },
      {
        id: 'li-6',
        category: 'NETWORK',
        description: 'Cellular network + OCPP activation',
        quantity: 8,
        unit: 'ea',
        unitPrice: 650,
        extendedPrice: 5200,
        pricingSource: 'catalog',
        ruleName: 'network.cellular',
        ruleReason: 'Per-port cellular + management',
        sourceInputs: ['network.type'],
        manualReviewRequired: false,
        confidence: 'high',
      },
      {
        id: 'li-7',
        category: 'MISC',
        description: 'Bollards',
        quantity: 8,
        unit: 'ea',
        unitPrice: 275,
        extendedPrice: 2200,
        pricingSource: 'catalog',
        ruleName: 'accessories.bollards',
        ruleReason: '8 bollards requested',
        sourceInputs: ['accessories.bollardQty'],
        manualReviewRequired: false,
        confidence: 'high',
      },
      {
        id: 'li-8',
        category: 'EXCLUSION',
        description: 'Utility transformer swap',
        quantity: 0,
        unit: 'lot',
        unitPrice: 0,
        extendedPrice: 0,
        pricingSource: 'tbd',
        ruleName: 'exclusion.utility_transformer',
        ruleReason: 'Utility-side transformer changes excluded',
        sourceInputs: [],
        manualReviewRequired: false,
        confidence: 'high',
      },
    ],
    exclusions: [
      {
        id: 'ex-1',
        text: 'Utility-side transformer swaps excluded.',
        category: 'electrical',
        reason: 'Utility responsibility',
        isStandard: true,
      },
    ],
    manualReviewTriggers: [],
    summary: {
      lineItemTotal: 77400,
      subtotal: 92880,
      tax: 6502,
      contingency: 9288,
      total: 108670,
      hardwareTotal: 41000,
      installationTotal: 24800,
      permitDesignTotal: 4200,
      networkTotal: 5200,
      accessoriesTotal: 2200,
      serviceTotal: 0,
    },
    metadata: {
      generatedAt: '2026-04-17T15:00:00.000Z',
      engineVersion: '1.0.0',
      inputCompleteness: 1,
      automationConfidence: 'high',
      requiresManualReview: false,
    },
  };
}

describe('adaptEstimateToProposal', () => {
  it('resolves the customer name from input.customer.companyName', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    expect(vm.customer.companyName).toBe('Lone Star Business Park');
  });

  it('falls back to "Your Property" when customer name is empty', () => {
    const estimate = buildEstimate();
    estimate.input.customer.companyName = '';
    const vm = adaptEstimateToProposal(estimate);
    expect(vm.customer.companyName).toBe('Your Property');
  });

  it('groups CHARGER and PEDESTAL into the hardware bucket', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    const hardware = vm.buckets.find((b) => b.key === 'hardware');
    expect(hardware).toBeDefined();
    expect(hardware?.items.map((i) => i.sourceCategory).sort()).toEqual([
      'CHARGER',
      'PEDESTAL',
    ]);
    expect(hardware?.subtotal).toBe(38400 + 2600);
  });

  it('groups CIVIL and ELEC into the infrastructure bucket', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    const infra = vm.buckets.find((b) => b.key === 'infrastructure');
    expect(infra?.items.length).toBe(2);
    expect(infra?.subtotal).toBe(6300 + 18500);
  });

  it('groups PERMIT and NETWORK into the services bucket', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    const services = vm.buckets.find((b) => b.key === 'services');
    expect(services?.items.length).toBe(2);
    expect(services?.subtotal).toBe(4200 + 5200);
  });

  it('excludes EXCLUSION category from priced line items', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    const allItems = vm.buckets.flatMap((b) => b.items);
    expect(
      allItems.find((i) => i.sourceCategory === 'EXCLUSION')
    ).toBeUndefined();
  });

  it('passes through the summary totals verbatim', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    expect(vm.totals.lineItemTotal).toBe(77400);
    expect(vm.totals.subtotal).toBe(92880);
    expect(vm.totals.grossTotal).toBe(108670);
    expect(vm.totals.tax).toBe(6502);
    expect(vm.totals.contingency).toBe(9288);
  });

  it('extracts "City, ST" from the site address', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    expect(vm.site.cityRegion).toBe('Dallas, TX 75201');
  });

  it('returns a 4-step timeline keyed to project.timeline hint', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    expect(vm.timeline).toHaveLength(4);
    expect(vm.timeline[0].stepNumber).toBe(1);
    expect(vm.timeline[0].detail).toContain('6-8 weeks');
    expect(vm.timeline[3].title).toBe('Testing & Launch');
  });

  it('produces a structured ViewModel snapshot with stable keys', () => {
    const vm = adaptEstimateToProposal(buildEstimate());
    // Snapshot-style assertion, but explicit — we want schema guarantees, not
    // fragile deep-equal of every field.
    expect(Object.keys(vm).sort()).toEqual(
      [
        'buckets',
        'charger',
        'customer',
        'generatedAt',
        'notes',
        'preparedBy',
        'proposalId',
        'site',
        'timeline',
        'totalPorts',
        'totals',
        'validUntil',
      ].sort()
    );
    expect(Object.keys(vm.totals).sort()).toEqual(
      [
        'accessoriesTotal',
        'contingency',
        'grossTotal',
        'hardwareTotal',
        'installationTotal',
        'lineItemTotal',
        'networkTotal',
        'permitDesignTotal',
        'serviceTotal',
        'subtotal',
        'tax',
      ].sort()
    );
    expect(vm.charger.level).toBe('l2');
    expect(vm.totalPorts).toBe(8);
  });
});

describe('formatCurrency', () => {
  it('renders whole-dollar values without cents', () => {
    expect(formatCurrency(108670)).toBe('$108,670');
    expect(formatCurrency(0)).toBe('$0');
  });

  it('rounds to nearest dollar', () => {
    expect(formatCurrency(4200.49)).toBe('$4,200');
    expect(formatCurrency(4200.5)).toBe('$4,201');
  });

  it('handles NaN / Infinity defensively', () => {
    expect(formatCurrency(NaN)).toBe('$0');
    expect(formatCurrency(Infinity)).toBe('$0');
  });
});
