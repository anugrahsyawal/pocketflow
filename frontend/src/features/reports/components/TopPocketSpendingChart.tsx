import { TopPocketSpendingItem } from '@/lib/reportCalculations';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/currency';

interface TopPocketSpendingChartProps {
  items: TopPocketSpendingItem[];
  totalExpense: number;
}

export function TopPocketSpendingChart({ items, totalExpense }: TopPocketSpendingChartProps) {
  const hasData = totalExpense > 0 && items.length > 0;

  const formatPercent = (fraction: number): string => {
    const pct = fraction * 100;
    if (pct <= 0) return '0%';
    if (pct < 1) return '<1%';
    return `${Math.round(pct)}%`;
  };

  return (
    <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-4">
      <h3 className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
        Pocket Pengeluaran Terbesar
      </h3>

      {!hasData ? (
        <div className="py-10 px-4 text-center flex flex-col items-center gap-2">
          <span className="material-symbols-rounded text-3xl text-text-muted" aria-hidden="true">
            account_balance_wallet
          </span>
          <h4 className="text-body-sm font-bold text-text-primary">
            Belum ada pocket dengan pengeluaran pada periode ini.
          </h4>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col w-full min-w-0">
              {/* Pocket info row */}
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.emoji ? (
                    <span className="text-base flex-shrink-0" aria-hidden="true">{item.emoji}</span>
                  ) : (
                    <span
                      className="material-symbols-rounded text-base text-text-muted flex-shrink-0"
                      aria-hidden="true"
                    >
                      account_balance_wallet
                    </span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-body-sm font-semibold text-text-primary truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-text-muted mt-0.5">
                      {item.transactionCount} transaksi
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="font-display text-body-sm font-bold text-text-primary tabular-nums">
                    -{formatRupiah(item.amount)}
                  </span>
                  <span className="text-[10px] text-text-secondary font-semibold mt-0.5">
                    {formatPercent(item.percentageOfTotal)} dari total
                  </span>
                </div>
              </div>

              {/* Relative progress bar */}
              <div className="w-full bg-border/20 h-2.5 rounded-full overflow-hidden mt-2" aria-hidden="true">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(1, item.percentageOfTop * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
