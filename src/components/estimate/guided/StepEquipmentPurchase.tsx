'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField } from '@/components/estimate/FormField';

export function StepEquipmentPurchase() {
  const { input, updateField } = useEstimate();

  const isBullet = input.purchasingChargers.responsibility === 'bullet';
  const isClient = input.purchasingChargers.responsibility === 'client';

  function handleSelection(purchasing: boolean) {
    if (purchasing) {
      updateField('purchasingChargers.responsibility', 'bullet');
      updateField('charger.brand', 'Tesla');
      updateField('charger.model', 'Universal Wall Connector Gen3');
      updateField('charger.chargingLevel', 'l2');
      updateField('charger.volts', 240);
      updateField('charger.mountType', 'pedestal');
      updateField('charger.portType', 'single');
    } else {
      updateField('purchasingChargers.responsibility', 'client');
      updateField('charger.isCustomerSupplied', true);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Equipment Purchase</h2>
        <p className="mt-1 text-sm text-gray-500">
          Are we purchasing equipment for the client?
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSelection(true)}
          className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
            isBullet
              ? 'border-[var(--system-blue)] bg-[var(--system-blue)]/5 text-[var(--system-blue)]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => handleSelection(false)}
          className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
            isClient
              ? 'border-[var(--system-blue)] bg-[var(--system-blue)]/5 text-[var(--system-blue)]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          No
        </button>
      </div>

      {isBullet && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <InputField
              label="# L2 Chargers"
              value={input.charger.count}
              onChange={(v) => updateField('charger.count', v === '' ? 0 : Number(v))}
              type="number"
              min={0}
              placeholder="0"
              hint="Tesla Universal Wall Connector, Gen 3"
            />
          </div>
          <div>
            <InputField
              label="# L2 Pedestals"
              value={input.charger.pedestalCount}
              onChange={(v) => updateField('charger.pedestalCount', v === '' ? 0 : Number(v))}
              type="number"
              min={0}
              placeholder="0"
              hint="Pedestal for Wall Connector"
            />
          </div>
        </div>
      )}
    </div>
  );
}
