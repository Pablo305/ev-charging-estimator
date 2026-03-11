'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { EstimateInput, EstimateOutput, EstimateLineItem, ManualReviewTrigger } from '@/lib/estimate/types';
import { generateEstimate } from '@/lib/estimate/engine';
import { SCENARIOS } from '@/lib/estimate/scenarios';

// ============================================================
// Helpers
// ============================================================

function emptyInput(): EstimateInput {
  return {
    project: { name: '', salesRep: '', projectType: 'full_turnkey', timeline: '', isNewConstruction: null },
    customer: { companyName: '', contactName: '', contactEmail: '', contactPhone: '', billingAddress: '' },
    site: { address: '', siteType: null, state: '' },
    parkingEnvironment: {
      type: null, hasPTSlab: null, slabScanRequired: null, coringRequired: null,
      surfaceType: null, trenchingRequired: null, boringRequired: null,
      trafficControlRequired: null, indoorOutdoor: null, fireRatedPenetrations: null,
      accessRestrictions: '',
    },
    charger: {
      brand: '', model: '', count: 0, pedestalCount: 0, portType: null,
      mountType: null, isCustomerSupplied: false, chargingLevel: null,
      ampsPerCharger: null, volts: null,
    },
    electrical: {
      serviceType: null, availableCapacityKnown: false, availableAmps: null,
      breakerSpaceAvailable: null, panelUpgradeRequired: null, transformerRequired: null,
      switchgearRequired: null, distanceToPanel_ft: null, utilityCoordinationRequired: null,
      electricalRoomDescription: '',
    },
    civil: { installationLocationDescription: '' },
    permit: { responsibility: null, feeAllowance: null },
    designEngineering: { responsibility: null, stampedPlansRequired: null },
    network: { type: null, wifiInstallResponsibility: null },
    accessories: { bollardQty: 0, signQty: 0, wheelStopQty: 0, stripingRequired: false, padRequired: false, debrisRemoval: false },
    makeReady: { responsibility: null },
    chargerInstall: { responsibility: null },
    purchasingChargers: { responsibility: null },
    signageBollards: { responsibility: null },
    estimateControls: { pricingTier: 'msrp', taxRate: 7.0, contingencyPercent: 10, markupPercent: 20 },
    notes: '',
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ============================================================
// Tabs
// ============================================================

const TABS = [
  'Project', 'Customer', 'Site', 'Parking', 'Charger', 'Electrical',
  'Civil', 'Permit/Design', 'Network', 'Accessories', 'Responsibilities', 'Controls',
] as const;

type TabName = (typeof TABS)[number];

// ============================================================
// Badges
// ============================================================

function PricingBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    catalog_bulk: 'bg-green-100 text-green-800',
    catalog_msrp: 'bg-green-100 text-green-800',
    calculated: 'bg-blue-100 text-blue-800',
    allowance: 'bg-blue-100 text-blue-800',
    industry_standard: 'bg-yellow-100 text-yellow-800',
    manual_override: 'bg-purple-100 text-purple-800',
    tbd: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[source] ?? 'bg-gray-100 text-gray-600'}`}>
      {source.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const c = level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} title={`Confidence: ${level}`} />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const c = severity === 'critical' ? 'bg-red-100 text-red-800 border-red-300'
    : severity === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-blue-100 text-blue-800 border-blue-300';
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${c}`}>{severity}</span>;
}

// ============================================================
// Main Page
// ============================================================

export default function EstimatePage() {
  const [input, setInput] = useState<EstimateInput>(emptyInput());
  const [output, setOutput] = useState<EstimateOutput | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Project');
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  // URL param scenario loading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get('scenario');
    if (scenarioId) {
      const found = SCENARIOS.find((s) => s.id === scenarioId);
      if (found) {
        setInput(found.input);
      }
    }
  }, []);

  const loadScenario = useCallback((id: string) => {
    const found = SCENARIOS.find((s) => s.id === id);
    if (found) {
      setInput(found.input);
      setOutput(null);
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('scenario', id);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleGenerate = useCallback(() => {
    const result = generateEstimate(input);
    setOutput(result);
  }, [input]);

  const toggleLine = useCallback((id: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Deep updater
  const updateField = useCallback((path: string, value: unknown) => {
    setInput((prev) => {
      const parts = path.split('.');
      const newInput = JSON.parse(JSON.stringify(prev));
      let obj: Record<string, unknown> = newInput;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]] as Record<string, unknown>;
      }
      obj[parts[parts.length - 1]] = value;
      return newInput;
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0B1220] text-white print:bg-white print:text-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">BulletEV Estimate Generator</h1>
            <p className="text-xs text-blue-300 print:text-gray-500">Prototype v0.1.0</p>
          </div>
          <Link href="/" className="text-sm text-blue-300 hover:text-white print:hidden">Home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 print:px-0">
        {/* Scenario Loader */}
        <div className="mb-6 flex flex-wrap items-center gap-4 print:hidden">
          <label className="text-sm font-medium text-gray-700">Load Sample Scenario:</label>
          <select
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            defaultValue=""
            onChange={(e) => { if (e.target.value) loadScenario(e.target.value); }}
          >
            <option value="">-- Select --</option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setInput(emptyInput()); setOutput(null); }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Clear All
          </button>
        </div>

        {/* Form */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm print:hidden">
          {/* Tab Bar */}
          <div className="flex flex-wrap gap-0 border-b border-gray-200 bg-gray-50">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'border-b-2 border-[#2563EB] bg-white text-[#2563EB]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <TabContent tab={activeTab} input={input} updateField={updateField} />
          </div>

          {/* Generate Button */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              onClick={handleGenerate}
              className="rounded-lg bg-[#2563EB] px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Generate Estimate
            </button>
          </div>
        </div>

        {/* Results */}
        {output && (
          <EstimateResults output={output} expandedLines={expandedLines} toggleLine={toggleLine} />
        )}
      </div>
    </main>
  );
}

// ============================================================
// Tab Content
// ============================================================

function TabContent({
  tab, input, updateField,
}: {
  tab: TabName;
  input: EstimateInput;
  updateField: (path: string, value: unknown) => void;
}) {
  const cls = 'block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const label = 'block text-sm font-medium text-gray-700 mb-1';
  const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  switch (tab) {
    case 'Project':
      return (
        <div className={grid}>
          <div>
            <label className={label}>Project Name</label>
            <input className={cls} value={input.project.name} onChange={(e) => updateField('project.name', e.target.value)} />
          </div>
          <div>
            <label className={label}>Sales Rep</label>
            <input className={cls} value={input.project.salesRep} onChange={(e) => updateField('project.salesRep', e.target.value)} />
          </div>
          <div>
            <label className={label}>Project Type</label>
            <select className={cls} value={input.project.projectType} onChange={(e) => updateField('project.projectType', e.target.value)}>
              {['full_turnkey','full_turnkey_connectivity','equipment_install_commission','install_commission','equipment_purchase','remove_replace','commission_only','service_work','supercharger'].map((v) => (
                <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Timeline</label>
            <input className={cls} value={input.project.timeline} onChange={(e) => updateField('project.timeline', e.target.value)} />
          </div>
          <div>
            <label className={label}>New Construction?</label>
            <select className={cls} value={input.project.isNewConstruction === null ? 'null' : String(input.project.isNewConstruction)} onChange={(e) => updateField('project.isNewConstruction', e.target.value === 'null' ? null : e.target.value === 'true')}>
              <option value="null">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      );

    case 'Customer':
      return (
        <div className={grid}>
          <div><label className={label}>Company Name</label><input className={cls} value={input.customer.companyName} onChange={(e) => updateField('customer.companyName', e.target.value)} /></div>
          <div><label className={label}>Contact Name</label><input className={cls} value={input.customer.contactName} onChange={(e) => updateField('customer.contactName', e.target.value)} /></div>
          <div><label className={label}>Email</label><input className={cls} type="email" value={input.customer.contactEmail} onChange={(e) => updateField('customer.contactEmail', e.target.value)} /></div>
          <div><label className={label}>Phone</label><input className={cls} value={input.customer.contactPhone} onChange={(e) => updateField('customer.contactPhone', e.target.value)} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Billing Address</label><input className={cls} value={input.customer.billingAddress} onChange={(e) => updateField('customer.billingAddress', e.target.value)} /></div>
        </div>
      );

    case 'Site':
      return (
        <div className={grid}>
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Site Address</label><input className={cls} value={input.site.address} onChange={(e) => updateField('site.address', e.target.value)} /></div>
          <div>
            <label className={label}>Site Type</label>
            <select className={cls} value={input.site.siteType ?? ''} onChange={(e) => updateField('site.siteType', e.target.value || null)}>
              <option value="">-- Select --</option>
              {['airport','apartment','event_venue','fleet_dealer','hospital','hotel','industrial','mixed_use','fuel_station','municipal','office','parking_structure','police_gov','recreational','campground','restaurant','retail','school','other'].map((v) => (
                <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div><label className={label}>State</label><input className={cls} value={input.site.state} onChange={(e) => updateField('site.state', e.target.value)} maxLength={2} /></div>
        </div>
      );

    case 'Parking':
      return (
        <div className={grid}>
          <div>
            <label className={label}>Parking Type</label>
            <select className={cls} value={input.parkingEnvironment.type ?? ''} onChange={(e) => updateField('parkingEnvironment.type', e.target.value || null)}>
              <option value="">-- Unknown --</option>
              <option value="surface_lot">Surface Lot</option>
              <option value="parking_garage">Parking Garage</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className={label}>Surface Type</label>
            <select className={cls} value={input.parkingEnvironment.surfaceType ?? ''} onChange={(e) => updateField('parkingEnvironment.surfaceType', e.target.value || null)}>
              <option value="">-- Unknown --</option>
              <option value="asphalt">Asphalt</option>
              <option value="concrete">Concrete</option>
              <option value="gravel">Gravel</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={label}>Indoor/Outdoor</label>
            <select className={cls} value={input.parkingEnvironment.indoorOutdoor ?? ''} onChange={(e) => updateField('parkingEnvironment.indoorOutdoor', e.target.value || null)}>
              <option value="">-- Unknown --</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="both">Both</option>
            </select>
          </div>
          <BoolField label="Has PT Slab?" path="parkingEnvironment.hasPTSlab" value={input.parkingEnvironment.hasPTSlab} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Trenching Required?" path="parkingEnvironment.trenchingRequired" value={input.parkingEnvironment.trenchingRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Boring Required?" path="parkingEnvironment.boringRequired" value={input.parkingEnvironment.boringRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Coring Required?" path="parkingEnvironment.coringRequired" value={input.parkingEnvironment.coringRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Traffic Control?" path="parkingEnvironment.trafficControlRequired" value={input.parkingEnvironment.trafficControlRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Fire-Rated Penetrations?" path="parkingEnvironment.fireRatedPenetrations" value={input.parkingEnvironment.fireRatedPenetrations} updateField={updateField} cls={cls} labelCls={label} />
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Access Restrictions</label><input className={cls} value={input.parkingEnvironment.accessRestrictions} onChange={(e) => updateField('parkingEnvironment.accessRestrictions', e.target.value)} /></div>
        </div>
      );

    case 'Charger':
      return (
        <div className={grid}>
          <div><label className={label}>Brand</label><input className={cls} value={input.charger.brand} onChange={(e) => updateField('charger.brand', e.target.value)} placeholder="e.g. Tesla, ChargePoint, Xeal" /></div>
          <div><label className={label}>Model</label><input className={cls} value={input.charger.model} onChange={(e) => updateField('charger.model', e.target.value)} placeholder="e.g. Universal Wall Connector, Supercharger, CT4000" /></div>
          <div><label className={label}>Count</label><input className={cls} type="number" min={0} value={input.charger.count} onChange={(e) => updateField('charger.count', parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Pedestal Count</label><input className={cls} type="number" min={0} value={input.charger.pedestalCount} onChange={(e) => updateField('charger.pedestalCount', parseInt(e.target.value) || 0)} /></div>
          <div>
            <label className={label}>Charging Level</label>
            <select className={cls} value={input.charger.chargingLevel ?? ''} onChange={(e) => updateField('charger.chargingLevel', e.target.value || null)}>
              <option value="">-- Select --</option>
              <option value="l2">Level 2</option>
              <option value="l3_dcfc">Level 3 / DCFC</option>
            </select>
          </div>
          <div>
            <label className={label}>Mount Type</label>
            <select className={cls} value={input.charger.mountType ?? ''} onChange={(e) => updateField('charger.mountType', e.target.value || null)}>
              <option value="">-- Select --</option>
              <option value="pedestal">Pedestal</option>
              <option value="wall">Wall</option>
              <option value="mix">Mix</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={label}>Port Type</label>
            <select className={cls} value={input.charger.portType ?? ''} onChange={(e) => updateField('charger.portType', e.target.value || null)}>
              <option value="">-- Select --</option>
              <option value="single">Single</option>
              <option value="dual">Dual</option>
              <option value="mix">Mix</option>
            </select>
          </div>
          <div><label className={label}>Amps per Charger</label><input className={cls} type="number" value={input.charger.ampsPerCharger ?? ''} onChange={(e) => updateField('charger.ampsPerCharger', e.target.value ? parseInt(e.target.value) : null)} /></div>
          <div><label className={label}>Volts</label><input className={cls} type="number" value={input.charger.volts ?? ''} onChange={(e) => updateField('charger.volts', e.target.value ? parseInt(e.target.value) : null)} /></div>
          <div>
            <label className={label}>Customer Supplied?</label>
            <select className={cls} value={String(input.charger.isCustomerSupplied)} onChange={(e) => updateField('charger.isCustomerSupplied', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
      );

    case 'Electrical':
      return (
        <div className={grid}>
          <div>
            <label className={label}>Service Type</label>
            <select className={cls} value={input.electrical.serviceType ?? ''} onChange={(e) => updateField('electrical.serviceType', e.target.value || null)}>
              <option value="">-- Unknown --</option>
              <option value="120v">120V</option>
              <option value="208v">208V</option>
              <option value="240v">240V</option>
              <option value="480v_3phase">480V 3-Phase</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div><label className={label}>Distance to Panel (ft)</label><input className={cls} type="number" value={input.electrical.distanceToPanel_ft ?? ''} onChange={(e) => updateField('electrical.distanceToPanel_ft', e.target.value ? parseInt(e.target.value) : null)} /></div>
          <div><label className={label}>Available Amps</label><input className={cls} type="number" value={input.electrical.availableAmps ?? ''} onChange={(e) => updateField('electrical.availableAmps', e.target.value ? parseInt(e.target.value) : null)} /></div>
          <div>
            <label className={label}>Capacity Known?</label>
            <select className={cls} value={String(input.electrical.availableCapacityKnown)} onChange={(e) => updateField('electrical.availableCapacityKnown', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <BoolField label="Breaker Space Available?" path="electrical.breakerSpaceAvailable" value={input.electrical.breakerSpaceAvailable} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Panel Upgrade Required?" path="electrical.panelUpgradeRequired" value={input.electrical.panelUpgradeRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Transformer Required?" path="electrical.transformerRequired" value={input.electrical.transformerRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Switchgear Required?" path="electrical.switchgearRequired" value={input.electrical.switchgearRequired} updateField={updateField} cls={cls} labelCls={label} />
          <BoolField label="Utility Coordination?" path="electrical.utilityCoordinationRequired" value={input.electrical.utilityCoordinationRequired} updateField={updateField} cls={cls} labelCls={label} />
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Electrical Room Description</label><input className={cls} value={input.electrical.electricalRoomDescription} onChange={(e) => updateField('electrical.electricalRoomDescription', e.target.value)} /></div>
        </div>
      );

    case 'Civil':
      return (
        <div>
          <label className={label}>Installation Location Description</label>
          <textarea className={cls + ' h-32'} value={input.civil.installationLocationDescription} onChange={(e) => updateField('civil.installationLocationDescription', e.target.value)} />
        </div>
      );

    case 'Permit/Design':
      return (
        <div className={grid}>
          <div>
            <label className={label}>Permit Responsibility</label>
            <select className={cls} value={input.permit.responsibility ?? ''} onChange={(e) => updateField('permit.responsibility', e.target.value || null)}>
              <option value="">-- TBD --</option>
              <option value="bullet">Bullet</option>
              <option value="client">Client</option>
              <option value="tbd">TBD</option>
            </select>
          </div>
          <div><label className={label}>Permit Fee Allowance ($)</label><input className={cls} type="number" value={input.permit.feeAllowance ?? ''} onChange={(e) => updateField('permit.feeAllowance', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          <div>
            <label className={label}>Design/Eng Responsibility</label>
            <select className={cls} value={input.designEngineering.responsibility ?? ''} onChange={(e) => updateField('designEngineering.responsibility', e.target.value || null)}>
              <option value="">-- TBD --</option>
              <option value="bullet">Bullet</option>
              <option value="client">Client</option>
              <option value="tbd">TBD</option>
            </select>
          </div>
          <BoolField label="Stamped Plans Required?" path="designEngineering.stampedPlansRequired" value={input.designEngineering.stampedPlansRequired} updateField={updateField} cls={cls} labelCls={label} />
        </div>
      );

    case 'Network':
      return (
        <div className={grid}>
          <div>
            <label className={label}>Network Type</label>
            <select className={cls} value={input.network.type ?? ''} onChange={(e) => updateField('network.type', e.target.value || null)}>
              <option value="">-- Unknown --</option>
              <option value="none">None</option>
              <option value="customer_lan">Customer LAN</option>
              <option value="wifi_bridge">WiFi Bridge</option>
              <option value="cellular_router">Cellular Router</option>
              <option value="included_in_package">Included in Package</option>
            </select>
          </div>
          <div>
            <label className={label}>WiFi Install Responsibility</label>
            <select className={cls} value={input.network.wifiInstallResponsibility ?? ''} onChange={(e) => updateField('network.wifiInstallResponsibility', e.target.value || null)}>
              <option value="">-- N/A --</option>
              <option value="bullet">Bullet</option>
              <option value="client">Client</option>
              <option value="na">N/A</option>
              <option value="tbd">TBD</option>
            </select>
          </div>
        </div>
      );

    case 'Accessories':
      return (
        <div className={grid}>
          <div><label className={label}>Bollard Qty</label><input className={cls} type="number" min={0} value={input.accessories.bollardQty} onChange={(e) => updateField('accessories.bollardQty', parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Sign Qty</label><input className={cls} type="number" min={0} value={input.accessories.signQty} onChange={(e) => updateField('accessories.signQty', parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Wheel Stop Qty</label><input className={cls} type="number" min={0} value={input.accessories.wheelStopQty} onChange={(e) => updateField('accessories.wheelStopQty', parseInt(e.target.value) || 0)} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={input.accessories.stripingRequired} onChange={(e) => updateField('accessories.stripingRequired', e.target.checked)} /><span className="text-sm text-gray-700">Striping Required</span></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={input.accessories.padRequired} onChange={(e) => updateField('accessories.padRequired', e.target.checked)} /><span className="text-sm text-gray-700">Concrete Pad Required</span></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={input.accessories.debrisRemoval} onChange={(e) => updateField('accessories.debrisRemoval', e.target.checked)} /><span className="text-sm text-gray-700">Debris Removal</span></div>
        </div>
      );

    case 'Responsibilities':
      return (
        <div className={grid}>
          {[
            { label: 'Make Ready', path: 'makeReady.responsibility', value: input.makeReady.responsibility },
            { label: 'Charger Install', path: 'chargerInstall.responsibility', value: input.chargerInstall.responsibility },
            { label: 'Purchasing Chargers', path: 'purchasingChargers.responsibility', value: input.purchasingChargers.responsibility },
          ].map((f) => (
            <div key={f.path}>
              <label className={label}>{f.label}</label>
              <select className={cls} value={f.value ?? ''} onChange={(e) => updateField(f.path, e.target.value || null)}>
                <option value="">-- TBD --</option>
                <option value="bullet">Bullet</option>
                <option value="client">Client</option>
                <option value="tbd">TBD</option>
              </select>
            </div>
          ))}
          <div>
            <label className={label}>Signage/Bollards</label>
            <select className={cls} value={input.signageBollards.responsibility ?? ''} onChange={(e) => updateField('signageBollards.responsibility', e.target.value || null)}>
              <option value="">-- TBD --</option>
              <option value="signage">Signage Only</option>
              <option value="bollards">Bollards Only</option>
              <option value="signage_bollards">Signage + Bollards</option>
              <option value="none">None</option>
              <option value="tbd">TBD</option>
            </select>
          </div>
        </div>
      );

    case 'Controls':
      return (
        <div className={grid}>
          <div>
            <label className={label}>Pricing Tier</label>
            <select className={cls} value={input.estimateControls.pricingTier} onChange={(e) => updateField('estimateControls.pricingTier', e.target.value)}>
              <option value="bulk_discount">Bulk Discount</option>
              <option value="msrp">MSRP</option>
            </select>
          </div>
          <div><label className={label}>Tax Rate (%)</label><input className={cls} type="number" step="0.1" value={input.estimateControls.taxRate} onChange={(e) => updateField('estimateControls.taxRate', parseFloat(e.target.value) || 0)} /></div>
          <div><label className={label}>Contingency (%)</label><input className={cls} type="number" step="1" value={input.estimateControls.contingencyPercent} onChange={(e) => updateField('estimateControls.contingencyPercent', parseFloat(e.target.value) || 0)} /></div>
          <div><label className={label}>Markup (%)</label><input className={cls} type="number" step="1" value={input.estimateControls.markupPercent} onChange={(e) => updateField('estimateControls.markupPercent', parseFloat(e.target.value) || 0)} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Notes</label><textarea className={cls + ' h-24'} value={input.notes} onChange={(e) => updateField('notes', e.target.value)} /></div>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================
// Bool Field Helper
// ============================================================

function BoolField({
  label, path, value, updateField, cls, labelCls,
}: {
  label: string; path: string; value: boolean | null;
  updateField: (p: string, v: unknown) => void; cls: string; labelCls: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={cls} value={value === null ? 'null' : String(value)} onChange={(e) => updateField(path, e.target.value === 'null' ? null : e.target.value === 'true')}>
        <option value="null">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}

// ============================================================
// Estimate Results
// ============================================================

function EstimateResults({
  output, expandedLines, toggleLine,
}: {
  output: EstimateOutput;
  expandedLines: Set<string>;
  toggleLine: (id: string) => void;
}) {
  const { summary, metadata, lineItems, exclusions, manualReviewTriggers } = output;

  // Group line items by category
  const byCategory = lineItems.reduce<Record<string, EstimateLineItem[]>>((acc, li) => {
    if (!acc[li.category]) acc[li.category] = [];
    acc[li.category].push(li);
    return acc;
  }, {});

  return (
    <div id="estimate-output" className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{output.input.project.name || 'Untitled Project'}</h2>
            <p className="mt-1 text-sm text-gray-500">{output.input.customer.companyName} | {output.input.site.address}</p>
            <p className="mt-1 text-xs text-gray-400">Generated {new Date(metadata.generatedAt).toLocaleString()} | Engine {metadata.engineVersion}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-right">
            <div className="rounded-lg bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500">Input Completeness</p>
              <p className={`text-lg font-bold ${metadata.inputCompleteness >= 70 ? 'text-green-600' : metadata.inputCompleteness >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {metadata.inputCompleteness}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500">Confidence</p>
              <p className={`text-lg font-bold ${metadata.automationConfidence === 'high' ? 'text-green-600' : metadata.automationConfidence === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                {metadata.automationConfidence.toUpperCase()}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{fmt(summary.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Review Triggers */}
      {manualReviewTriggers.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 print:border-gray-300 print:bg-gray-50">
          <h3 className="text-lg font-semibold text-amber-900">Manual Review Required ({manualReviewTriggers.length})</h3>
          <div className="mt-3 space-y-2">
            {manualReviewTriggers.map((trigger: ManualReviewTrigger) => (
              <div key={trigger.id} className="flex items-start gap-3 rounded border border-amber-200 bg-white px-4 py-3">
                <SeverityBadge severity={trigger.severity} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{trigger.message}</p>
                  <p className="text-xs text-gray-500">Field: {trigger.field} | Condition: {trigger.condition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Cost Summary</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Hardware', value: summary.hardwareTotal },
            { label: 'Installation', value: summary.installationTotal },
            { label: 'Permit/Design', value: summary.permitDesignTotal },
            { label: 'Network', value: summary.networkTotal },
            { label: 'Accessories', value: summary.accessoriesTotal },
            { label: 'Service/Software', value: summary.serviceTotal },
          ].map((item) => (
            <div key={item.label} className="flex justify-between rounded bg-gray-50 px-4 py-2">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{fmt(item.value)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4 space-y-1">
          <div className="flex justify-between"><span className="text-sm text-gray-600">Subtotal (with {output.input.estimateControls.markupPercent}% markup)</span><span className="text-sm font-medium">{fmt(summary.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-gray-600">Tax ({output.input.estimateControls.taxRate}%)</span><span className="text-sm font-medium">{fmt(summary.tax)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-gray-600">Contingency ({output.input.estimateControls.contingencyPercent}%)</span><span className="text-sm font-medium">{fmt(summary.contingency)}</span></div>
          <div className="flex justify-between border-t border-gray-300 pt-2"><span className="text-base font-semibold text-gray-900">Total</span><span className="text-base font-bold text-gray-900">{fmt(summary.total)}</span></div>
        </div>
      </div>

      {/* Line Items by Category */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Line Items ({lineItems.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Ext. Price</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-center">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCategory).map(([cat, items]) => (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  items={items}
                  expandedLines={expandedLines}
                  toggleLine={toggleLine}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exclusions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Exclusions ({exclusions.length})</h3>
        <ul className="mt-3 space-y-2">
          {exclusions.map((ex) => (
            <li key={ex.id} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{ex.category}</span>
              <span className="text-gray-700">{ex.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Category Group (line items grouped)
// ============================================================

function CategoryGroup({
  category, items, expandedLines, toggleLine,
}: {
  category: string;
  items: EstimateLineItem[];
  expandedLines: Set<string>;
  toggleLine: (id: string) => void;
}) {
  const catTotal = items.reduce((s, li) => s + li.extendedPrice, 0);

  return (
    <>
      {/* Category header row */}
      <tr className="bg-gray-100">
        <td colSpan={6} className="px-4 py-2 text-xs font-bold uppercase text-gray-600">{category}</td>
        <td className="px-4 py-2 text-right text-xs font-bold text-gray-600">{fmt(catTotal)}</td>
        <td colSpan={2} />
      </tr>
      {items.map((li, idx) => (
        <LineItemRow
          key={li.id}
          item={li}
          isOdd={idx % 2 === 1}
          expanded={expandedLines.has(li.id)}
          onToggle={() => toggleLine(li.id)}
        />
      ))}
    </>
  );
}

// ============================================================
// Line Item Row
// ============================================================

function LineItemRow({
  item, isOdd, expanded, onToggle,
}: {
  item: EstimateLineItem;
  isOdd: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`${isOdd ? 'bg-gray-50' : 'bg-white'} ${item.manualReviewRequired ? 'border-l-4 border-l-amber-400' : ''} cursor-pointer hover:bg-blue-50`}
        onClick={onToggle}
      >
        <td className="px-4 py-2 text-xs text-gray-400">{item.id}</td>
        <td className="px-4 py-2 text-xs text-gray-500">{item.category}</td>
        <td className="px-4 py-2 text-gray-900">
          {item.description}
          {item.manualReviewRequired && (
            <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">REVIEW</span>
          )}
        </td>
        <td className="px-4 py-2 text-right">{item.quantity}</td>
        <td className="px-4 py-2 text-xs text-gray-500">{item.unit}</td>
        <td className="px-4 py-2 text-right">{fmt(item.unitPrice)}</td>
        <td className="px-4 py-2 text-right font-medium">{fmt(item.extendedPrice)}</td>
        <td className="px-4 py-2"><PricingBadge source={item.pricingSource} /></td>
        <td className="px-4 py-2 text-center"><ConfidenceDot level={item.confidence} /></td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50">
          <td colSpan={9} className="px-6 py-4">
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-gray-700">Rule:</span> <span className="font-mono text-xs text-gray-500">{item.ruleName}</span></p>
              <p><span className="font-medium text-gray-700">Why this line?</span> {item.ruleReason}</p>
              <p><span className="font-medium text-gray-700">Source Inputs:</span> {item.sourceInputs.join(', ')}</p>
              {item.manualReviewReason && (
                <p className="text-amber-700"><span className="font-medium">Review Reason:</span> {item.manualReviewReason}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
