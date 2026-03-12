'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SCENARIOS } from '@/lib/estimate/scenarios';
import { generateEstimate } from '@/lib/estimate/engine';
import {
  PRICEBOOK,
  TESLA_SUPERCHARGER_PACKAGES,
  SERVICE_FEES,
  KNOWN_OVERRIDES,
  findPricebookItemsByCategory,
} from '@/lib/estimate/catalog';
import { BOARD_CONFIG } from '@/lib/monday/config';

type DebugTab = 'payload' | 'lineItems' | 'reviews' | 'catalog' | 'fieldMap';

export default function DebugPage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [activeTab, setActiveTab] = useState<DebugTab>('payload');

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const output = generateEstimate(scenario.input);

  const tabs: { id: DebugTab; label: string }[] = [
    { id: 'payload', label: 'Raw Input JSON' },
    { id: 'lineItems', label: 'Line Items JSON' },
    { id: 'reviews', label: 'Manual Reviews' },
    { id: 'catalog', label: 'Catalog Data' },
    { id: 'fieldMap', label: 'Field Map' },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#0B1220] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">Debug View</h1>
            <p className="text-xs text-blue-300">Raw data inspector</p>
          </div>
          <Link href="/" className="text-sm text-blue-300 hover:text-white">Home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Scenario selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Scenario:</label>
          <select
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">{scenario.description}</span>
        </div>

        {/* Tab bar */}
        <div className="mb-4 flex gap-0 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                activeTab === t.id
                  ? 'border-b-2 border-[#2563EB] text-[#2563EB]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {activeTab === 'payload' && (
            <div className="p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Normalized EstimateInput (JSON)</h3>
              <pre className="max-h-[70vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(scenario.input, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'lineItems' && (
            <div className="p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Generated Line Items ({output.lineItems.length}) | Total: ${output.summary.total.toLocaleString()}
              </h3>
              <pre className="max-h-[70vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(output.lineItems, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Manual Review Triggers ({output.manualReviewTriggers.length})
              </h3>
              {output.manualReviewTriggers.length === 0 ? (
                <p className="text-sm text-gray-500">No manual review triggers for this scenario.</p>
              ) : (
                <div className="space-y-3">
                  {output.manualReviewTriggers.map((trigger) => (
                    <div key={trigger.id} className={`rounded border p-4 ${
                      trigger.severity === 'critical' ? 'border-red-300 bg-red-50' :
                      trigger.severity === 'warning' ? 'border-amber-300 bg-amber-50' :
                      'border-blue-300 bg-blue-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                          trigger.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          trigger.severity === 'warning' ? 'bg-amber-200 text-amber-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>{trigger.severity}</span>
                        <span className="font-mono text-xs text-gray-500">{trigger.id}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-900">{trigger.message}</p>
                      <p className="mt-1 text-xs text-gray-500">Field: <code>{trigger.field}</code> | Condition: {trigger.condition}</p>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="mt-6 mb-2 text-sm font-medium text-gray-700">Raw JSON</h3>
              <pre className="max-h-[40vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(output.manualReviewTriggers, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="p-4 space-y-6">
              <CatalogSection title="Tesla Supercharger Packages" data={TESLA_SUPERCHARGER_PACKAGES} />
              <CatalogSection title="Charger Hardware" data={findPricebookItemsByCategory('CHARGER')} />
              <CatalogSection title="Pedestals" data={findPricebookItemsByCategory('PEDESTAL')} />
              <CatalogSection title="Install Labor (ELEC LBR)" data={findPricebookItemsByCategory('ELEC LBR')} />
              <CatalogSection title="Electrical Labor+Material" data={findPricebookItemsByCategory('ELEC LBR MAT')} />
              <CatalogSection title="Civil" data={findPricebookItemsByCategory('CIVIL')} />
              <CatalogSection title="Design/Engineering" data={findPricebookItemsByCategory('DES/ENG')} />
              <CatalogSection title="Network" data={findPricebookItemsByCategory('NETWORK')} />
              <CatalogSection title="Site Work" data={findPricebookItemsByCategory('SITE WORK')} />
              <CatalogSection title="Safety" data={findPricebookItemsByCategory('SAFETY')} />
              <CatalogSection title="Software" data={findPricebookItemsByCategory('SOFTWARE')} />
              <CatalogSection title="Permit" data={findPricebookItemsByCategory('PERMIT')} />
              <CatalogSection title="Material" data={findPricebookItemsByCategory('MATERIAL')} />

              <div>
                <h4 className="text-sm font-medium text-gray-700">Service Fees</h4>
                <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                  {JSON.stringify(SERVICE_FEES, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Known Price Overrides</h4>
                <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                  {JSON.stringify(KNOWN_OVERRIDES, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Full Pricebook ({PRICEBOOK.length} items)</h4>
                <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                  {JSON.stringify(PRICEBOOK, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'fieldMap' && (
            <div className="p-4">
              <h3 className="mb-4 text-sm font-medium text-gray-700">
                monday.com Column ID Mappings
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Field Name</th>
                      <th className="px-4 py-2">Column ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(BOARD_CONFIG.columnMappings).map(([field, colId], idx) => (
                      <tr key={field} className={idx % 2 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2 font-mono text-xs">{field}</td>
                        <td className="px-4 py-2 font-mono text-xs text-blue-600">{colId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 mb-4 text-sm font-medium text-gray-700">Label Maps</h3>
              <pre className="max-h-[40vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(BOARD_CONFIG.labelMaps, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function CatalogSection({ title, data }: { title: string; data: readonly unknown[] }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700">{title} ({data.length} items)</h4>
      <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
