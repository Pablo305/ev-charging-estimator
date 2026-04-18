/**
 * EquipmentShowcase — ported from portfolio/EquipmentShowcase.
 * Displays the selected charger(s) with a stock product image and spec list
 * derived from the estimator input.
 */

import Image from 'next/image';
import type { ProposalViewModel } from '@/lib/proposal/adapter';
import { formatCurrency } from '@/lib/proposal/adapter';

interface EquipmentShowcaseProps {
  vm: ProposalViewModel;
}

interface ChargerCardData {
  image: string;
  levelLabel: string;
  name: string;
  detail: string;
  unitCost: number | null;
  quantity: number;
  specs: Array<[string, string]>;
}

function buildChargerCards(vm: ProposalViewModel): ChargerCardData[] {
  const hardwareItems = vm.buckets.find((b) => b.key === 'hardware')?.items ?? [];

  if (hardwareItems.length === 0) {
    // Fall back to the input-declared charger so the section still renders.
    return [
      {
        image: vm.charger.level === 'l3_dcfc' ? '/brand/charger-dcfc.jpg' : '/brand/charger-l2.jpg',
        levelLabel: vm.charger.level === 'l3_dcfc' ? 'DC Fast Charging' : 'Level 2 · AC',
        name: `${vm.charger.brand} ${vm.charger.model}`.trim() || 'EV Charger',
        detail: 'Ports and infrastructure sized for your site.',
        unitCost: null,
        quantity: vm.charger.count,
        specs: [
          ['Port type', vm.charger.portType ?? '—'],
          ['Amps per charger', vm.charger.amps ? `${vm.charger.amps}A` : '—'],
          ['Voltage', vm.charger.volts ? `${vm.charger.volts}V` : '—'],
          ['Quantity', `${vm.charger.count} units`],
        ],
      },
    ];
  }

  return hardwareItems.map((item) => {
    const lower = item.name.toLowerCase();
    const isDcfc =
      lower.includes('dcfc') ||
      lower.includes('dc fast') ||
      lower.includes('supercharger') ||
      vm.charger.level === 'l3_dcfc';

    return {
      image: isDcfc ? '/brand/charger-dcfc.jpg' : '/brand/charger-l2.jpg',
      levelLabel: isDcfc ? 'DC Fast Charging' : 'Level 2 · AC',
      name: item.name,
      detail: item.detail,
      unitCost: item.unitCost,
      quantity: item.quantity,
      specs: [
        ['Category', item.sourceCategory],
        ['Unit of measure', item.unit || 'ea'],
        ['Quantity', `${item.quantity}`],
        ['Extended', formatCurrency(item.totalCost)],
      ],
    };
  });
}

export function EquipmentShowcase({ vm }: EquipmentShowcaseProps) {
  const cards = buildChargerCards(vm);

  return (
    <section className="py-16 md:py-24 px-6" style={{ background: 'hsl(var(--pp-surface-cool))' }}>
      <div className="max-w-6xl mx-auto">
        <div className="reveal text-center mb-12 md:mb-16">
          <p className="text-xs uppercase tracking-[0.2em] pp-text-muted font-medium mb-3">
            Hardware for your site
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight pp-text-foreground">
            Your equipment
          </h2>
          <p className="pp-text-muted mt-3 text-base md:text-lg max-w-md mx-auto">
            Selected specifically for the electrical and physical requirements
            of {vm.site.cityRegion || vm.customer.companyName}.
          </p>
        </div>

        <div className="space-y-16 md:space-y-20">
          {cards.map((card, idx) => {
            const reversed = idx % 2 !== 0;
            return (
              <div key={`${card.name}-${idx}`} className="reveal">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                  <div className={reversed ? 'md:order-2' : ''}>
                    <div
                      className="aspect-[4/3] overflow-hidden rounded-xl"
                      style={{ background: 'hsl(var(--pp-secondary))' }}
                    >
                      <Image
                        src={card.image}
                        alt={card.name}
                        width={800}
                        height={600}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className={reversed ? 'md:order-1' : ''}>
                    <p className="pp-text-primary text-sm font-medium tracking-wide uppercase mb-3">
                      {card.levelLabel}
                    </p>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 pp-text-foreground">
                      {card.name}
                    </h3>
                    {card.detail && (
                      <p className="pp-text-muted mb-6">{card.detail}</p>
                    )}
                    <dl
                      className="space-y-3 border-t pt-5"
                      style={{ borderColor: 'hsl(var(--pp-border))' }}
                    >
                      {card.specs.map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <dt className="pp-text-muted">{label}</dt>
                          <dd className="font-medium pp-text-foreground">
                            {value}
                          </dd>
                        </div>
                      ))}
                      {card.unitCost !== null && (
                        <div
                          className="flex justify-between text-sm pt-3 border-t"
                          style={{ borderColor: 'hsl(var(--pp-border))' }}
                        >
                          <dt className="pp-text-muted">Unit price</dt>
                          <dd className="font-semibold pp-text-foreground">
                            {formatCurrency(card.unitCost)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default EquipmentShowcase;
