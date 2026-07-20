import { CategoryChartItem } from '@/lib/reportCalculations';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/currency';

interface CategoryDistributionChartProps {
  items: CategoryChartItem[];
  totalExpense: number;
}

const PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export function CategoryDistributionChart({ items, totalExpense }: CategoryDistributionChartProps) {
  const hasData = totalExpense > 0 && items.length > 0;

  // Donut geometry constants
  const size = 180;
  const radius = 65;
  const strokeWidth = 20;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Format percentage helper
  const formatPercent = (pct: number): string => {
    if (pct <= 0) return '0%';
    if (pct < 1) return '<1%';
    return `${Math.round(pct)}%`;
  };

  const chartItems = items.map((item, index) => {
    const color = item.id === 'other' ? PALETTE[PALETTE.length - 1] : PALETTE[index % (PALETTE.length - 1)];
    return {
      ...item,
      color,
    };
  });

  let accumulatedPercent = 0;

  return (
    <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-4">
      <h3 className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
        Distribusi Kategori
      </h3>

      {!hasData ? (
        <div className="py-10 px-4 text-center flex flex-col items-center gap-2">
          <span className="material-symbols-rounded text-3xl text-text-muted" aria-hidden="true">
            donut_large
          </span>
          <h4 className="text-body-sm font-bold text-text-primary">
            Belum ada pengeluaran untuk dibagi per kategori.
          </h4>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 w-full">
          {/* Donut Render */}
          <div className="relative w-[180px] h-[180px] flex-shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full transform -rotate-90"
              aria-label="Distribusi pengeluaran kategori untuk periode terpilih."
            >
              {chartItems.map((item) => {
                const fraction = item.percentage / 100;
                const strokeLength = fraction * circumference;
                const strokeOffset = -accumulatedPercent * circumference;
                accumulatedPercent += fraction;

                return (
                  <circle
                    key={item.id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${strokeLength} ${circumference}`}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Inner Content Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                Total Pengeluaran
              </span>
              <span className="font-display text-base font-black text-text-primary mt-0.5 truncate max-w-full">
                {formatRupiah(totalExpense)}
              </span>
            </div>
          </div>

          {/* Legend Listing */}
          <div className="w-full flex flex-col gap-1">
            {chartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border/10 last:border-b-0 gap-3 min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  {item.emoji ? (
                    <span className="text-base flex-shrink-0" aria-hidden="true">{item.emoji}</span>
                  ) : (
                    <span
                      className="material-symbols-rounded text-base text-text-muted flex-shrink-0"
                      aria-hidden="true"
                    >
                      receipt_long
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
                  <span className="text-[10px] font-semibold text-text-secondary mt-0.5">
                    {formatPercent(item.percentage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
