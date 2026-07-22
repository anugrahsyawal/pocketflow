import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRupiah } from '@/lib/currency';
import { formatUsagePercent, type PocketBudgetActualItem } from '@/lib/reportCalculations';

interface BudgetVsActualPocketChartProps {
  items: PocketBudgetActualItem[];
  isCurrentPeriod: boolean;
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

const progressVariantMap: Record<string, 'aman' | 'waspada' | 'bahaya' | 'neutral'> = {
  aman: 'aman',
  waspada: 'waspada',
  bahaya: 'bahaya',
  overbudget: 'bahaya',
  'tanpa-alokasi': 'neutral',
};

export function BudgetVsActualPocketChart({
  items,
  isCurrentPeriod,
}: BudgetVsActualPocketChartProps) {
  const [expandedPockets, setExpandedPockets] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedPockets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card
      variant="flat"
      className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-3"
    >
      <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
        Budget vs Aktual Pocket
      </span>

      {items.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          Belum ada pocket untuk dianalisis.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const hasAllocation = item.revisedAllocation > 0 || item.allocation > 0;
            const progressValue = hasAllocation
              ? Math.min(1, Math.max(0, item.usageRatio))
              : 0;
            const isExpanded = !!expandedPockets[item.id];
            const disclosureId = `pocket-disclosure-${item.id}`;
            const hasReallocation = item.reallocationIn > 0 || item.reallocationOut > 0;

            return (
              <div
                key={item.id}
                className="flex flex-col gap-1.5 pb-2 border-b border-border/10 last:border-0 last:pb-0"
              >
                {/* Pocket header row */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isExpanded}
                    aria-controls={disclosureId}
                    className="flex items-center gap-1.5 min-w-0 text-left hover:opacity-80 transition-opacity focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 -mx-1"
                  >
                    <span
                      className="material-symbols-rounded text-sm text-text-muted transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      aria-hidden="true"
                    >
                      chevron_right
                    </span>
                    {item.emoji ? (
                      <span className="text-sm flex-shrink-0" aria-hidden="true">
                        {item.emoji}
                      </span>
                    ) : (
                      <span
                        className="material-symbols-rounded text-sm text-text-muted flex-shrink-0"
                        aria-hidden="true"
                      >
                        account_balance_wallet
                      </span>
                    )}
                    <span className="text-body-sm font-semibold text-text-primary truncate">
                      {item.label}
                    </span>
                  </button>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      statusColors[item.status] || 'text-text-muted'
                    }`}
                  >
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>

                {/* Allocated pocket row content */}
                {hasAllocation ? (
                  <>
                    <ProgressBar
                      value={progressValue}
                      variant={progressVariantMap[item.status] || 'neutral'}
                      height="sm"
                    />

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Pengeluaran</span>
                      <span className="font-display font-semibold text-text-secondary tabular-nums">
                        {item.expense > 0 ? formatRupiah(item.expense) : 'Rp0'}
                        <span className="text-text-muted font-normal">
                          {' '}/ {formatRupiah(item.revisedAllocation)}
                          {hasReallocation && (
                            <span className="text-[10px] text-primary font-medium ml-1">
                              (revisi)
                            </span>
                          )}
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
                          : `Melebihi anggaran ${formatRupiah(Math.abs(item.remaining))}`}
                      </span>
                    </div>
                  </>
                ) : (
                  /* Zero-allocation pocket row content */
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Pengeluaran</span>
                      <span className="font-display font-semibold text-text-secondary tabular-nums">
                        {item.expense > 0 ? formatRupiah(item.expense) : 'Rp0'}
                      </span>
                    </div>
                    <span className="text-text-muted italic text-[10px]">
                      Belum memiliki alokasi periode.
                    </span>
                  </div>
                )}

                {/* Expanded Disclosure Details */}
                {isExpanded && (
                  <div
                    id={disclosureId}
                    className="mt-2 pt-2 border-t border-border/20 flex flex-col gap-1.5 bg-surface-container-low/50 p-2.5 rounded-lg text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Alokasi awal</span>
                      <span className="font-display font-medium text-text-secondary tabular-nums">
                        {item.allocation > 0 ? formatRupiah(item.allocation) : 'Rp0'}
                      </span>
                    </div>

                    {item.reallocationIn > 0 && (
                      <div className="flex items-center justify-between text-aman">
                        <span>Pindah alokasi masuk</span>
                        <span className="font-display font-medium tabular-nums">
                          +{formatRupiah(item.reallocationIn)}
                        </span>
                      </div>
                    )}

                    {item.reallocationOut > 0 && (
                      <div className="flex items-center justify-between text-bahaya">
                        <span>Pindah alokasi keluar</span>
                        <span className="font-display font-medium tabular-nums">
                          -{formatRupiah(item.reallocationOut)}
                        </span>
                      </div>
                    )}

                    {hasReallocation && (
                      <div className="flex items-center justify-between font-semibold border-t border-border/10 pt-1">
                        <span className="text-text-primary">Alokasi revisi</span>
                        <span className="font-display text-primary tabular-nums">
                          {formatRupiah(item.revisedAllocation)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border/10 pt-1">
                      <span className="text-text-muted">Pengeluaran aktual</span>
                      <span className="font-display font-medium text-bahaya tabular-nums">
                        {item.expense > 0 ? formatRupiah(item.expense) : 'Rp0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Sisa budget</span>
                      <span
                        className={`font-display font-semibold tabular-nums ${
                          item.remaining >= 0 ? 'text-aman' : 'text-bahaya'
                        }`}
                      >
                        {item.remaining >= 0
                          ? formatRupiah(item.remaining)
                          : `-${formatRupiah(Math.abs(item.remaining))}`}
                      </span>
                    </div>

                    {/* Attributed Payment Disclosure */}
                    {item.attributedBudgetsList.length > 0 && (
                      <div className="mt-1 pt-1.5 border-t border-border/20 flex flex-col gap-1 text-[10px]">
                        <span className="font-bold text-text-secondary uppercase tracking-wider">
                          Pembayaran Melalui Pocket Ini
                        </span>
                        {item.attributedBudgetsList.map((attr) => (
                          <div key={attr.pocketId} className="flex items-center justify-between text-text-muted">
                            <span>
                              Dicatat ke budget: <strong className="text-text-primary">{attr.emoji ? `${attr.emoji} ` : ''}{attr.label}</strong>
                            </span>
                            <span className="font-display font-semibold text-text-secondary tabular-nums">
                              {formatRupiah(attr.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Specific Transfer Breakdown Lines */}
                    {item.transferBreakdown.length > 0 ? (
                      <div className="mt-1 pt-1 border-t border-border/10 flex flex-col gap-1">
                        {item.transferBreakdown.map((tb) => (
                          <div key={tb.type} className="flex flex-col gap-0.5">
                            {tb.inAmount > 0 && (
                              <div className="flex items-center justify-between text-text-muted">
                                <span>{tb.label} masuk</span>
                                <span className="font-display font-medium tabular-nums">
                                  +{formatRupiah(tb.inAmount)}
                                </span>
                              </div>
                            )}
                            {tb.outAmount > 0 && (
                              <div className="flex items-center justify-between text-text-muted">
                                <span>{tb.label} keluar</span>
                                <span className="font-display font-medium tabular-nums">
                                  -{formatRupiah(tb.outAmount)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      item.transferIn > 0 || item.transferOut > 0 ? (
                        <div className="mt-1 pt-1 border-t border-border/10 flex flex-col gap-1">
                          {item.transferIn > 0 && (
                            <div className="flex items-center justify-between text-text-muted">
                              <span>Transfer masuk</span>
                              <span className="font-display font-medium tabular-nums">
                                +{formatRupiah(item.transferIn)}
                              </span>
                            </div>
                          )}
                          {item.transferOut > 0 && (
                            <div className="flex items-center justify-between text-text-muted">
                              <span>Transfer keluar</span>
                              <span className="font-display font-medium tabular-nums">
                                -{formatRupiah(item.transferOut)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/10">
                      <span className="text-text-muted">Saldo saat ini</span>
                      <span
                        className={`font-display font-medium tabular-nums ${
                          isCurrentPeriod && item.currentBalance !== null
                            ? item.currentBalance < 0
                              ? 'text-bahaya'
                              : 'text-text-secondary'
                            : 'text-text-muted'
                        }`}
                      >
                        {isCurrentPeriod && item.currentBalance !== null
                          ? item.currentBalance < 0
                            ? `-${formatRupiah(Math.abs(item.currentBalance))}`
                            : formatRupiah(item.currentBalance)
                          : 'Tidak tersedia'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
                      <span>Transaksi pengeluaran / transfer</span>
                      <span className="font-semibold text-text-primary tabular-nums">
                        {item.expenseTransactionCount} pengeluaran, {item.reallocationTransactionCount} pindah alokasi, {item.transferTransactionCount} transfer
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
