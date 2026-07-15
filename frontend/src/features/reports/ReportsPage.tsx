import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getBudgetPeriodByOffset, isValidLocalDateString } from '@/lib/budgetPeriod';
import { formatRupiah } from '@/lib/currency';
import { getPocketBudgetStatus } from '@/lib/balanceCalculations';
import {
  calculateReportTotals,
  calculateExpenseBreakdownByCategory,
  calculateExpenseBreakdownByPocket,
} from '@/lib/reportCalculations';
import { generateCsvString, downloadCsv } from '@/lib/reportCsv';

export function ReportsPage() {
  const navigate = useNavigate();
  const [periodOffset, setPeriodOffset] = useState(0);
  const isCurrentPeriod = periodOffset === 0;

  const transactions = useTransactionStore((state) => state.transactions);
  const pockets = usePocketStore((state) => state.pockets);
  const categories = useCategoryStore((state) => state.categories);

  // Selected budget period
  const selectedPeriod = useMemo(() => {
    return getBudgetPeriodByOffset(periodOffset);
  }, [periodOffset]);

  // Filter selected-period active transactions
  const activePeriodTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        !t.isArchived &&
        isValidLocalDateString(t.date) &&
        t.date >= selectedPeriod.startDate &&
        t.date <= selectedPeriod.endDate
    );
  }, [transactions, selectedPeriod]);

  const hasSelectedPeriodTransactions = activePeriodTransactions.length > 0;

  // Period totals
  const totals = useMemo(() => {
    return calculateReportTotals(activePeriodTransactions);
  }, [activePeriodTransactions]);

  // Active pockets for allocation (current period only)
  const activePocketsForAllocation = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  // Total monthly allocation (current period only)
  const totalMonthlyAllocation = useMemo(() => {
    return activePocketsForAllocation.reduce((sum, p) => {
      const alloc = p.monthlyAllocation ?? 0;
      return sum + (Number.isFinite(alloc) ? alloc : 0);
    }, 0);
  }, [activePocketsForAllocation]);

  // Remaining allocation (current period only)
  const remainingAllocation = totalMonthlyAllocation - totals.totalExpense;

  // Budget status and progress (current period only)
  const budgetStatus = useMemo(() => {
    return getPocketBudgetStatus(totals.totalExpense, totalMonthlyAllocation || null);
  }, [totals.totalExpense, totalMonthlyAllocation]);

  const budgetUsageRatio = totalMonthlyAllocation > 0 ? totals.totalExpense / totalMonthlyAllocation : 0;
  const budgetUsageRatioClamped = Math.min(1, Math.max(0, budgetUsageRatio));
  const budgetUsagePercent = Math.round(budgetUsageRatio * 100);
  const budgetUsageLabel =
    totals.totalExpense > 0 && totalMonthlyAllocation > 0 && budgetUsagePercent === 0
      ? '<1%'
      : `${budgetUsagePercent}%`;

  // Expense breakdown by category
  const expenseTransactions = useMemo(() => {
    return activePeriodTransactions.filter((t) => t.type === 'expense');
  }, [activePeriodTransactions]);

  const categoryBreakdown = useMemo(() => {
    return calculateExpenseBreakdownByCategory(expenseTransactions, categories, totals.totalExpense);
  }, [expenseTransactions, categories, totals.totalExpense]);

  // Expense breakdown by pocket
  const pocketBreakdown = useMemo(() => {
    return calculateExpenseBreakdownByPocket(expenseTransactions, pockets, totals.totalExpense);
  }, [expenseTransactions, pockets, totals.totalExpense]);

  const formatPercent = (pct: number): string => {
    if (pct <= 0) return '0%';
    if (pct < 1) return '<1%';
    return `${Math.round(pct)}%`;
  };

  const handlePrevPeriod = () => {
    setPeriodOffset((prev) => prev - 1);
  };

  const handleNextPeriod = () => {
    setPeriodOffset((prev) => (prev < 0 ? prev + 1 : 0));
  };

  const handleExportCsv = () => {
    if (activePeriodTransactions.length === 0) return;
    const csvContent = generateCsvString(activePeriodTransactions, pockets, categories);
    const filename = `pocketflow-transactions_${selectedPeriod.startDate}_to_${selectedPeriod.endDate}.csv`;
    downloadCsv(csvContent, filename);
  };

  return (
    <div className="flex flex-col gap-6 px-safe py-6 min-h-screen bg-background pb-24">
      {/* 1. Header: Title and Export CSV */}
      <div className="flex justify-between items-end">
        <h1 className="font-display text-headline-lg-mobile text-text-primary">
          Laporan
        </h1>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!hasSelectedPeriodTransactions}
          className="bg-primary-soft text-primary px-4 py-2 rounded-full flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:bg-surface-container disabled:text-text-muted disabled:opacity-100 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider"
          title={!hasSelectedPeriodTransactions ? 'Tidak ada transaksi untuk diekspor' : 'Ekspor transaksi periode ini ke CSV'}
          aria-label="Ekspor CSV"
        >
          <span className="material-symbols-rounded text-lg" aria-hidden="true">download</span>
          <span>Export CSV</span>
        </button>
      </div>

      {/* 2. Period Selector */}
      <div className="flex items-center gap-2 bg-surface p-1 rounded-full w-max shadow-sm border border-border/50">
        <button
          type="button"
          onClick={handlePrevPeriod}
          className="text-text-secondary hover:text-primary p-1.5 flex items-center justify-center rounded-full hover:bg-black/5"
          aria-label="Periode sebelumnya"
        >
          <span className="material-symbols-rounded text-[20px]" aria-hidden="true">chevron_left</span>
        </button>
        <div className="flex flex-col items-center px-4">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            {isCurrentPeriod ? 'Periode berjalan' : 'Periode historis'}
          </span>
          <span className="text-body-sm font-semibold text-text-secondary text-xs">
            {selectedPeriod.label}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNextPeriod}
          disabled={isCurrentPeriod}
          className="text-text-secondary hover:text-primary p-1.5 flex items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Periode berikutnya"
        >
          <span className="material-symbols-rounded text-[20px]" aria-hidden="true">chevron_right</span>
        </button>
      </div>

      {/* 3. Net Cash-flow Hero */}
      <section
        aria-labelledby="net-cash-flow-heading"
        className="relative overflow-hidden rounded-card bg-primary p-5 text-white shadow-card flex flex-col gap-1"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" aria-hidden="true" />
        <span className="text-[10px] font-bold text-white/90 tracking-wider uppercase" id="net-cash-flow-heading">
          Arus Kas Bersih
        </span>
        <span className="font-display text-amount-lg font-black tracking-tight block text-white">
          {totals.netCashFlow > 0
            ? `+${formatRupiah(totals.netCashFlow)}`
            : totals.netCashFlow < 0
            ? `-${formatRupiah(Math.abs(totals.netCashFlow))}`
            : 'Rp0'}
        </span>
        <div className="flex items-center gap-1 mt-2 bg-white/20 w-max px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="material-symbols-rounded text-sm" aria-hidden="true">
            {totals.netCashFlow > 0
              ? 'trending_up'
              : totals.netCashFlow < 0
              ? 'trending_down'
              : 'trending_flat'}
          </span>
          <span>
            {totals.netCashFlow > 0
              ? 'Surplus Periode Ini'
              : totals.netCashFlow < 0
              ? 'Defisit Periode Ini'
              : 'Seimbang pada Periode Ini'}
          </span>
        </div>
      </section>

      {/* 4. Paired Income and Expense Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pemasukan Card */}
        <Card variant="flat" className="p-4 bg-surface flex flex-col gap-1 border border-border/30 shadow-sm">
          <div className="flex items-center gap-1 text-text-secondary">
            <span className="material-symbols-rounded text-sm text-aman" aria-hidden="true">arrow_downward</span>
            <span className="text-[10px] font-bold tracking-wider uppercase">Pemasukan</span>
          </div>
          <span className="font-display text-amount-md font-bold text-text-primary mt-1 block">
            {totals.totalIncome > 0 ? `+${formatRupiah(totals.totalIncome)}` : 'Rp0'}
          </span>
        </Card>

        {/* Pengeluaran Card */}
        <Card variant="flat" className="p-4 bg-surface flex flex-col gap-1 border border-border/30 shadow-sm">
          <div className="flex items-center gap-1 text-text-secondary">
            <span className="material-symbols-rounded text-sm text-bahaya" aria-hidden="true">arrow_upward</span>
            <span className="text-[10px] font-bold tracking-wider uppercase">Pengeluaran</span>
          </div>
          <span className="font-display text-amount-md font-bold text-text-primary mt-1 block">
            {totals.totalExpense > 0 ? `-${formatRupiah(totals.totalExpense)}` : 'Rp0'}
          </span>
        </Card>
      </div>

      {/* 5. Current-period Budget Summary or Historical Allocation Notice */}
      {isCurrentPeriod ? (
        <Card variant="flat" className="flex flex-col gap-3 p-4 border border-border/30 bg-surface shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
              Anggaran Periode
            </span>
            <span className={`text-[11px] font-bold ${
              budgetStatus.status === 'aman'
                ? 'text-aman'
                : budgetStatus.status === 'waspada'
                ? 'text-waspada'
                : 'text-bahaya'
            }`}>
              {budgetUsageLabel} terpakai
            </span>
          </div>

          <ProgressBar
            value={budgetUsageRatioClamped}
            variant={budgetStatus.status === 'overbudget' ? 'bahaya' : budgetStatus.status}
            height="md"
          />

          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-text-muted">Sisa anggaran</span>
            <span className={`font-display font-bold ${
              remainingAllocation >= 0 ? 'text-aman' : 'text-bahaya'
            }`}>
              {remainingAllocation < 0 ? `-${formatRupiah(Math.abs(remainingAllocation))}` : formatRupiah(remainingAllocation)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Pengeluaran</span>
            <span className="font-display font-semibold text-text-secondary">
              {formatRupiah(totals.totalExpense)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Total alokasi</span>
            <span className="font-display font-semibold text-text-secondary">
              {formatRupiah(totalMonthlyAllocation)}
            </span>
          </div>
        </Card>
      ) : (
        <Card variant="flat" className="flex flex-col gap-2 p-4 border border-border/30 bg-surface shadow-sm">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="material-symbols-rounded text-lg text-text-muted" aria-hidden="true">info</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Data anggaran historis belum tersedia
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            PocketFlow belum menyimpan snapshot alokasi untuk periode ini. Nilai pemasukan, pengeluaran, arus kas, dan distribusi transaksi tetap akurat.
          </p>
        </Card>
      )}

      {/* 6. Compact Category Breakdown Foundation */}
      {hasSelectedPeriodTransactions && totals.totalExpense > 0 && categoryBreakdown.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
            Distribusi Pengeluaran Kategori
          </span>
          <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-1">
            {categoryBreakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-b-0 gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.emoji ? (
                    <span className="text-lg flex-shrink-0" aria-hidden="true">{item.emoji}</span>
                  ) : (
                    <span
                      className="material-symbols-rounded text-lg text-text-muted flex-shrink-0"
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
          </Card>
        </div>
      )}

      {/* 7. Compact Pocket Breakdown Foundation */}
      {hasSelectedPeriodTransactions && totals.totalExpense > 0 && pocketBreakdown.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
            Distribusi Pengeluaran Pocket
          </span>
          <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-1">
            {pocketBreakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-b-0 gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.emoji ? (
                    <span className="text-lg flex-shrink-0" aria-hidden="true">{item.emoji}</span>
                  ) : (
                    <span
                      className="material-symbols-rounded text-lg text-text-muted flex-shrink-0"
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
                  <span className="text-[10px] font-semibold text-text-secondary mt-0.5">
                    {formatPercent(item.percentage)}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* 8. Compact Transaction Activity Summary */}
      {hasSelectedPeriodTransactions && (
        <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-3">
          <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
            Ringkasan Transaksi
          </span>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-body-sm">
            <div className="flex justify-between items-center py-0.5 border-b border-border/10">
              <span className="text-text-muted">Total transaksi</span>
              <span className="font-semibold text-text-primary tabular-nums">{totals.transactionCount}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-border/10">
              <span className="text-text-muted">Pengeluaran</span>
              <span className="font-semibold text-bahaya tabular-nums">{totals.expenseCount}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-border/10">
              <span className="text-text-muted">Pemasukan</span>
              <span className="font-semibold text-aman tabular-nums">{totals.incomeCount}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-border/10">
              <span className="text-text-muted">Transfer</span>
              <span className="font-semibold text-primary tabular-nums">{totals.transferCount}</span>
            </div>
          </div>
          {totals.transferVolume > 0 && (
            <div className="flex justify-between items-center text-[11px] pt-1 text-text-muted">
              <span>Volume transfer</span>
              <span className="font-display font-medium tabular-nums">{formatRupiah(totals.transferVolume)}</span>
            </div>
          )}
        </Card>
      )}

      {/* 9. One Unified Empty-period Action when applicable */}
      {!hasSelectedPeriodTransactions && (
        <Card variant="flat" className="py-8 px-4 text-center flex flex-col items-center gap-3 border border-border/20 bg-surface shadow-sm">
          {isCurrentPeriod ? (
            <>
              <span
                className="material-symbols-rounded text-3xl text-primary"
                aria-hidden="true"
              >
                receipt_long
              </span>
              <h3 className="text-body-sm font-bold text-text-primary">
                Belum ada transaksi pada periode ini.
              </h3>
              <p className="text-xs text-text-secondary max-w-[280px]">
                Catat transaksi untuk mulai melihat laporan keuanganmu.
              </p>
              <Button
                type="button"
                onClick={() => navigate('/transactions/add/expense', { state: { from: '/reports' } })}
                variant="primary"
                size="sm"
                icon={<span className="material-symbols-rounded text-lg">remove_circle</span>}
              >
                Catat Pengeluaran
              </Button>
            </>
          ) : (
            <>
              <span
                className="material-symbols-rounded text-3xl text-text-muted"
                aria-hidden="true"
              >
                calendar_month
              </span>
              <h3 className="text-body-sm font-bold text-text-primary">
                Tidak ada transaksi pada periode historis ini.
              </h3>
              <p className="text-xs text-text-secondary max-w-[280px]">
                Pilih periode lain atau kembali ke periode berjalan.
              </p>
              <Button
                type="button"
                onClick={() => setPeriodOffset(0)}
                variant="primary"
                size="sm"
                icon={<span className="material-symbols-rounded text-lg">history</span>}
              >
                Kembali ke Periode Berjalan
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

