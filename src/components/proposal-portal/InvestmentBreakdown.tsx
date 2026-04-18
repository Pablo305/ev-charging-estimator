/**
 * InvestmentBreakdown — ported from portfolio/InvestmentSection.
 * Renders each ProposalViewModel bucket (Hardware / Infrastructure / Services /
 * Accessories / Controls) with line items grouped under headings, then a
 * subtotal / tax / contingency / grand-total block.
 */

import type { ProposalViewModel } from '@/lib/proposal/adapter';
import { formatCurrency } from '@/lib/proposal/adapter';
import { ArrowRightIcon } from './icons';

interface InvestmentBreakdownProps {
  vm: ProposalViewModel;
}

export function InvestmentBreakdown({ vm }: InvestmentBreakdownProps) {
  const { totals, buckets } = vm;

  return (
    <section className="py-16 md:py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="reveal text-center mb-10 md:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] pp-text-muted font-medium mb-3">
            Line-item breakdown
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight pp-text-foreground">
            Investment
          </h2>
        </div>

        <div className="reveal space-y-10">
          {buckets.map((bucket) => (
            <div key={bucket.key}>
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.15em] pp-text-muted font-medium">
                  {bucket.label}
                </p>
                <p className="text-xs pp-text-muted tabular-nums">
                  {formatCurrency(bucket.subtotal)}
                </p>
              </div>
              <ul className="divide-y" style={{ borderColor: 'hsl(var(--pp-border))' }}>
                {bucket.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-6 py-4"
                    style={{ borderColor: 'hsl(var(--pp-border))' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm pp-text-foreground">
                        {item.name}
                        {item.quantity !== 1 && (
                          <span className="pp-text-muted ml-1 font-normal">
                            ×{item.quantity} {item.unit}
                          </span>
                        )}
                      </p>
                      {item.detail && (
                        <p className="text-xs pp-text-muted mt-1 line-clamp-2">
                          {item.detail}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums text-sm pp-text-foreground whitespace-nowrap">
                      {formatCurrency(item.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="reveal mt-12 pt-6 border-t" style={{ borderColor: 'hsl(var(--pp-border))' }}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-baseline">
              <dt className="pp-text-muted">Line items</dt>
              <dd className="font-medium tabular-nums pp-text-foreground">
                {formatCurrency(totals.lineItemTotal)}
              </dd>
            </div>
            <div className="flex justify-between items-baseline">
              <dt className="pp-text-muted">Markup &amp; subtotal</dt>
              <dd className="font-medium tabular-nums pp-text-foreground">
                {formatCurrency(totals.subtotal)}
              </dd>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between items-baseline">
                <dt className="pp-text-muted">Tax</dt>
                <dd className="font-medium tabular-nums pp-text-foreground">
                  {formatCurrency(totals.tax)}
                </dd>
              </div>
            )}
            {totals.contingency > 0 && (
              <div className="flex justify-between items-baseline">
                <dt className="pp-text-muted">Contingency</dt>
                <dd className="font-medium tabular-nums pp-text-foreground">
                  {formatCurrency(totals.contingency)}
                </dd>
              </div>
            )}
          </dl>

          <div
            className="flex justify-between items-baseline pt-4 mt-4 border-t"
            style={{ borderColor: 'hsl(var(--pp-foreground) / 0.12)' }}
          >
            <span className="text-sm font-medium pp-text-foreground">
              Total Investment
            </span>
            <span className="text-3xl md:text-4xl font-bold tabular-nums pp-text-foreground">
              {formatCurrency(totals.grossTotal)}
            </span>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              className="clay-btn-primary press-effect inline-flex px-10 py-4 text-sm"
            >
              Accept This Estimate
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <p className="pp-text-muted text-xs mt-4">
              Pricing valid for 30 days from{' '}
              {new Date(vm.generatedAt).toLocaleDateString('en-US')}. Quote
              assumes conditions documented during the site survey.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InvestmentBreakdown;
