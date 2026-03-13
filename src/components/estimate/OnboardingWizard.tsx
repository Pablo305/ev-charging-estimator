'use client';

import { useState, useCallback } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';
import { SCENARIOS } from '@/lib/estimate/scenarios';

type EntryPoint = 'sow' | 'chat' | 'map' | 'form';

const PROJECT_TYPES = [
  { id: 'full_turnkey', label: 'Full Turnkey', desc: 'We handle everything end-to-end' },
  { id: 'full_turnkey_connectivity', label: 'Turnkey + Network', desc: 'Full install plus connectivity setup' },
  { id: 'equipment_install_commission', label: 'Equip + Install', desc: 'Client purchases, we install' },
  { id: 'install_commission', label: 'Install Only', desc: 'Client supplies chargers, we install' },
  { id: 'remove_replace', label: 'Remove & Replace', desc: 'Swap existing chargers for new' },
  { id: 'supercharger', label: 'Supercharger', desc: 'Tesla Supercharger package' },
  { id: 'equipment_purchase', label: 'Equipment Only', desc: 'Hardware procurement only' },
  { id: 'commission_only', label: 'Commission Only', desc: 'Activation and configuration' },
  { id: 'service_work', label: 'Service Work', desc: 'Maintenance and repairs' },
] as const;

interface OnboardingWizardProps {
  readonly onEntrySelect: (entry: EntryPoint) => void;
}

export function OnboardingWizard({ onEntrySelect }: OnboardingWizardProps) {
  const { updateField, setInput } = useEstimate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleProjectType = useCallback((typeId: string) => {
    updateField('project.projectType', typeId);
    setStep(3);
  }, [updateField]);

  const handleScenario = useCallback((scenarioId: string) => {
    const found = SCENARIOS.find((s) => s.id === scenarioId);
    if (found) {
      setInput(found.input);
      onEntrySelect('form');
    }
  }, [setInput, onEntrySelect]);

  if (step === 1) {
    return (
      <div className="mx-auto max-w-3xl px-2 py-6 sm:py-12">
        <div className="mb-6 text-center sm:mb-8">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">How would you like to start?</h2>
          <p className="mt-2 text-sm text-gray-500">Choose the best entry point for your project</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <EntryCard
            icon="&#128196;"
            title="Paste a project description"
            desc="AI extracts structured fields from SOW or project notes"
            onClick={() => onEntrySelect('sow')}
          />
          <EntryCard
            icon="&#128172;"
            title="Tell me about the project"
            desc="Answer questions conversationally — AI builds the estimate"
            onClick={() => onEntrySelect('chat')}
          />
          <EntryCard
            icon="&#127758;"
            title="Enter an address"
            desc="Map workspace with AI site assessment from satellite + street view"
            onClick={() => onEntrySelect('map')}
          />
          <EntryCard
            icon="&#128221;"
            title="Fill out the form"
            desc="Standard 12-section form — full control over every field"
            onClick={() => setStep(2)}
          />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="mx-auto max-w-3xl px-2 py-6 sm:py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">What type of project?</h2>
          <p className="mt-2 text-sm text-gray-500">This pre-fills relevant settings and determines included line items</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROJECT_TYPES.map((pt) => (
            <button
              key={pt.id}
              onClick={() => handleProjectType(pt.id)}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="text-sm font-semibold text-gray-900">{pt.label}</div>
              <div className="mt-1 text-xs text-gray-500">{pt.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep(1)} className="mt-6 text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Load a sample scenario?</h2>
        <p className="mt-2 text-sm text-gray-500">Start from a realistic example, or skip to the blank form</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleScenario(s.id)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-gray-900">{s.name}</div>
            <div className="mt-1 text-xs text-gray-500">{s.description}</div>
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </button>
        <button
          onClick={() => onEntrySelect('form')}
          className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Start with blank form
        </button>
      </div>
    </div>
  );
}

function EntryCard({ icon, title, desc, onClick }: {
  icon: string; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <span className="text-3xl" role="img">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-1 text-xs text-gray-500">{desc}</div>
      </div>
    </button>
  );
}
