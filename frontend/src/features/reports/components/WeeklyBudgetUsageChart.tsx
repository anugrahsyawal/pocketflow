import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRupiah } from '@/lib/currency';
import { formatUsagePercent, type WeeklyBudgetUsageItem } from '@/lib/reportCalculations';

interface WeeklyBudgetUsageChartProps {
  items: WeeklyBudgetUsageItem[];
  totalMonthlyAllocation: number;
}

const statusColors: Record<string, string> = {
  aman: 'text-aman',
  waspada: 'text-waspada',
  bahaya: 'text-bahaya',
  overbudget: 'text-bahaya',
  'tanpa-alokasi': 'text-text-muted',
};

const statusLabels: Record<string, string> = {
  aman: 'Aman',
  waspada: 'Waspada',
  bahaya: 'Bahaya',
  overbudget: 'Overbudget',
  'tanpa-alokasi': 'Tanpa alokasi',
};

const statusProgressVariant: Record<string, 'aman' | 'waspada' | 'bahaya' | 'neutral'> = {
  aman: 'aman',
  waspada: 'waspada',
  bahaya: 'bahaya',
  overbudget: 'bahaya',
  'tanpa-alokasi': 'neutral',
};

const temporalStateLabels: Record<string, string> = {
  selesai: 'Selesai',
  berjalan: 'Berjalan',
  'akan-datang': 'Akan datang',
};

const temporalStateColors: Record<string, string> = {
  selesai: 'text-text-muted',
  berjalan: 'text-primary font-medium',
  'akan-datang': 'text-text-muted',
};

const temporalStateIcons: Record<string, string> = {
  selesai: 'check_circle',
  berjalan: 'play_circle',
  'akan-datang': 'schedule',
};

export function WeeklyBudgetUsageChart({
  items,
  totalMonthlyAllocation,
}: WeeklyBudgetUsageChartProps) {
  if (items.length === 0) {
    return null;
  }

  const hasAllocation = totalMonthlyAllocation > 0;

  return (
    <Card
      variant="flat"
      className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
          Pemakaian Mingguan
        </span>
        <span className="text-[10px] text-text-muted font-medium tabular-nums">
          {hasAllocation ? `${formatRupiah(totalMonthlyAllocation / 4)}/minggu` : 'Tanpa target'}
        </span>
      </div>

      {!hasAllocation && (
        <p className="text-[11px] text-text-muted leading-relaxed">
          Alokasi bulanan belum diatur sehingga target pemakaian mingguan tidak tersedia.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const progressValue =
            item.allowance > 0
              ? Math.min(1, Math.max(0, item.usageRatio))
              : 0;

          const isActive = item.temporalState === 'berjalan';

          return (
            <div
              key={item.weekNumber}
              className={`flex flex-col gap-1.5 ${
                isActive
                  ? 'bg-primary/[0.04] -mx-2 px-2 py-2 rounded-xl border border-primary/10'
                  : ''
              }`}
            >
              {/* Week header row: Temporal state (left) + Financial status badge (right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`material-symbols-rounded text-sm ${
                      temporalStateColors[item.temporalState] || 'text-text-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {temporalStateIcons[item.temporalState] || 'schedule'}
                  </span>
                  <span
                    className={`text-body-sm font-semibold ${
                      isActive ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {item.dateLabel} · {temporalStateLabels[item.temporalState] || item.temporalState}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                    statusColors[item.status] || 'text-text-muted'
                  }`}
                >
                  {statusLabels[item.status] || item.status}
                </span>
              </div>

              {/* Allocated weekly row content */}
              {hasAllocation ? (
                <>
                  <ProgressBar
                    value={progressValue}
                    variant={statusProgressVariant[item.status] || 'neutral'}
                    height="sm"
                  />

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Pengeluaran</span>
                    <span className="font-display font-semibold text-text-secondary tabular-nums">
                      {item.expense > 0 ? formatRupiah(item.expense) : 'Rp0'}
                      <span className="text-text-muted font-normal">
                        {' '}/ {formatRupiah(item.allowance)}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">
                      {formatUsagePercent(item.usagePercent)} terpakai
                    </span>
                    <span
                      className={`font-display font-bold tabular-nums ${
                        item.remaining >= 0 ? 'text-aman' : 'text-bahaya'
                      }`}
                    >
                      {item.remaining >= 0
                        ? `Sisa ${formatRupiah(item.remaining)}`
                        : `Lebih ${formatRupiah(Math.abs(item.remaining))}`}
                    </span>
                  </div>
                </>
              ) : (
                /* Zero-allocation weekly row content */
                <div className="flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Pengeluaran</span>
                    <span className="font-display font-semibold text-text-secondary tabular-nums">
                      {item.expense > 0 ? formatRupiah(item.expense) : 'Rp0'}
                    </span>
                  </div>
                  <span className="text-text-muted italic text-[10px]">
                    Belum ada allowance mingguan.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
