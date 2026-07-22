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
import { getPocketBudgetStatus, getPocketEffectiveBalance } from '@/lib/balanceCalculations';
import {
  calculateReportTotals,
  calculateExpenseBreakdownByCategory,
  calculateExpenseBreakdownByPocket,
  calculateDailyCashFlow,
  prepareCategoryChartData,
  prepareTopPocketSpending,
  calculatePocketBudgetActuals,
  calculateWeeklyBudgetUsage,
  calculateRuleBasedInsights,
  calculateSinkingFundRecommendation,
} from '@/lib/reportCalculations';
import { generateCsvString, downloadCsv } from '@/lib/reportCsv';
import { useReportPreferencesStore } from '@/features/reports/useReportPreferencesStore';
import { CashFlowTimelineChart } from '@/features/reports/components/CashFlowTimelineChart';
import { CategoryDistributionChart } from '@/features/reports/components/CategoryDistributionChart';
import { TopPocketSpendingChart } from '@/features/reports/components/TopPocketSpendingChart';
import { BudgetVsActualPocketChart } from '@/features/reports/components/BudgetVsActualPocketChart';
import { WeeklyBudgetUsageChart } from '@/features/reports/components/WeeklyBudgetUsageChart';
import { RuleBasedInsightsCard } from '@/features/reports/components/RuleBasedInsightsCard';
import { SinkingFundRecommendationCard } from '@/features/reports/components/SinkingFundRecommendationCard';

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

  // Derived chart data
  const dailyPoints = useMemo(() => {
    return calculateDailyCashFlow(
      activePeriodTransactions,
      selectedPeriod.startDate,
      selectedPeriod.endDate
    );
  }, [activePeriodTransactions, selectedPeriod]);

  const categoryChartData = useMemo(() => {
    return prepareCategoryChartData(categoryBreakdown);
  }, [categoryBreakdown]);

  const topPocketSpendingData = useMemo(() => {
    return prepareTopPocketSpending(pocketBreakdown);
  }, [pocketBreakdown]);

  // Phase 6C: Budget vs Actual Pocket data
  const allActiveTransactions = useMemo(() => {
    return transactions.filter((t) => !t.isArchived);
  }, [transactions]);

  const budgetActualData = useMemo(() => {
    return calculatePocketBudgetActuals(
      activePeriodTransactions,
      pockets,
      allActiveTransactions,
      getPocketEffectiveBalance
    );
  }, [activePeriodTransactions, pockets, allActiveTransactions]);

  // Phase 6C: Weekly Budget Usage data
  const weeklyUsageData = useMemo(() => {
    return calculateWeeklyBudgetUsage(
      activePeriodTransactions,
      selectedPeriod.startDate,
      selectedPeriod.endDate,
      totalMonthlyAllocation
    );
  }, [activePeriodTransactions, selectedPeriod, totalMonthlyAllocation]);

  // Phase 6D: Rule-Based Insights data
  const ruleBasedInsights = useMemo(() => {
    return calculateRuleBasedInsights({
      transactions: activePeriodTransactions,
      totals,
      budgetActualItems: budgetActualData,
      weeklyUsageItems: weeklyUsageData,
      categoryBreakdown,
      pocketBreakdown,
      pockets,
      categories,
      isCurrentPeriod,
    });
  }, [
    activePeriodTransactions,
    totals,
    budgetActualData,
    weeklyUsageData,
    categoryBreakdown,
    pocketBreakdown,
    pockets,
    categories,
    isCurrentPeriod,
  ]);

  // Phase 6D: Sinking Fund Recommendation data
  const excludedPocketIds = useReportPreferencesStore(
    (state) => state.sinkingFundExcludedPocketIds
  );

  const sinkingFundRecommendation = useMemo(() => {
    return calculateSinkingFundRecommendation({
      pockets,
      allActiveTransactions,
      excludedPocketIds,
      periodEndDate: selectedPeriod.endDate,
      isCurrentPeriod,
      getPocketEffectiveBalanceFn: getPocketEffectiveBalance,
    });
  }, [
    pockets,
    allActiveTransactions,
    excludedPocketIds,
    selectedPeriod.endDate,
    isCurrentPeriod,
  ]);

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
      <div className="flex justify-between items-center">
        <h1 className="font-display text-headline-lg-mobile text-text-primary">
          Laporan
        </h1>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!hasSelectedPeriodTransactions}
          className="px-2.5 py-1 rounded-full flex items-center gap-1 bg-primary-soft text-primary hover:opacity-80 transition-opacity disabled:bg-surface-container disabled:text-text-muted disabled:opacity-100 disabled:cursor-not-allowed text-[11px] font-bold tracking-wide"
          title={!hasSelectedPeriodTransactions ? 'Tidak ada transaksi untuk diekspor' : 'Ekspor transaksi periode ini ke CSV'}
          aria-label="Ekspor CSV"
        >
          <span className="material-symbols-rounded text-base" aria-hidden="true">download</span>
          <span>Export CSV</span>
        </button>
      </div>

      {/* 2. Period Selector */}
      <div className="w-full flex items-center justify-between bg-surface p-1 rounded-full shadow-sm border border-border/50">
        <button
          type="button"
          onClick={handlePrevPeriod}
          className="text-text-secondary hover:text-primary p-1.5 flex items-center justify-center rounded-full hover:bg-black/5 flex-shrink-0"
          aria-label="Periode sebelumnya"
        >
          <span className="material-symbols-rounded text-[20px]" aria-hidden="true">chevron_left</span>
        </button>
        <div className="flex-1 flex flex-col items-center text-center px-2 min-w-0">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider truncate max-w-full">
            {isCurrentPeriod ? 'Periode berjalan' : 'Periode historis'}
          </span>
          <span className="text-body-sm font-semibold text-text-secondary text-xs truncate max-w-full">
            {selectedPeriod.label}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNextPeriod}
          disabled={isCurrentPeriod}
          className="text-text-secondary hover:text-primary p-1.5 flex items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
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

      {/* 5. Arus Kas Periode timeline */}
      {hasSelectedPeriodTransactions && (
        <CashFlowTimelineChart points={dailyPoints} />
      )}

      {/* 6. Current-period Budget Summary or Historical Allocation Notice */}
      {isCurrentPeriod ? (
        <Card variant="flat" className="flex flex-col gap-3.5 p-4 border border-border/30 bg-surface shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
              Anggaran Periode
            </span>
          </div>

          {/* Main 2-column metrics */}
          <div className="flex items-end justify-between gap-3 pt-0.5">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] text-text-secondary font-medium">
                Total Terpakai
              </span>
              <span className="font-display text-headline-sm font-bold text-text-primary truncate">
                {formatRupiah(totals.totalExpense)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right min-w-0">
              <span className="text-[11px] text-text-secondary font-medium">
                Dari Total Anggaran
              </span>
              <span className="font-display text-headline-sm font-bold text-text-primary truncate">
                {formatRupiah(totalMonthlyAllocation)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            value={budgetUsageRatioClamped}
            variant={
              budgetStatus.status === 'aman'
                ? 'neutral'
                : budgetStatus.status === 'overbudget'
                ? 'bahaya'
                : budgetStatus.status
            }
            height="md"
          />

          {/* Compact Footer */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                budgetStatus.status === 'overbudget' || budgetStatus.status === 'bahaya'
                  ? 'bg-bahaya-soft text-bahaya'
                  : budgetStatus.status === 'waspada'
                  ? 'bg-waspada-soft text-waspada'
                  : 'bg-primary-soft text-primary'
              }`}
            >
              {budgetUsageLabel} Terpakai
            </span>

            <span
              className={`font-display text-xs font-bold ${
                remainingAllocation >= 0 ? 'text-aman' : 'text-bahaya'
              }`}
            >
              {remainingAllocation >= 0
                ? `Sisa ${formatRupiah(remainingAllocation)}`
                : `Melebihi ${formatRupiah(Math.abs(remainingAllocation))}`}
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

      {/* 7. Budget vs Aktual Pocket or historical placeholder */}
      {isCurrentPeriod ? (
        <BudgetVsActualPocketChart
          items={budgetActualData}
          isCurrentPeriod={isCurrentPeriod}
        />
      ) : (
        <Card variant="flat" className="flex flex-col gap-2 p-4 border border-border/30 bg-surface shadow-sm">
          <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
            Budget vs Aktual Pocket
          </span>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Analisis budget historis belum tersedia karena PocketFlow belum menyimpan snapshot alokasi untuk periode ini.
          </p>
        </Card>
      )}

      {/* 8. Distribusi Kategori Donut */}
      {hasSelectedPeriodTransactions && (
        <CategoryDistributionChart items={categoryChartData} totalExpense={totals.totalExpense} />
      )}

      {/* 9. Pocket Pengeluaran Terbesar Bars */}
      {hasSelectedPeriodTransactions && (
        <TopPocketSpendingChart items={topPocketSpendingData} totalExpense={totals.totalExpense} />
      )}

      {/* 10. Pemakaian Mingguan or historical placeholder */}
      {isCurrentPeriod ? (
        <WeeklyBudgetUsageChart
          items={weeklyUsageData}
          totalMonthlyAllocation={totalMonthlyAllocation}
        />
      ) : (
        <Card variant="flat" className="flex flex-col gap-2 p-4 border border-border/30 bg-surface shadow-sm">
          <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
            Pemakaian Mingguan
          </span>
          <p className="text-[11px] font-medium text-text-secondary">
            Pemakaian mingguan historis belum tersedia.
          </p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            PocketFlow belum menyimpan snapshot alokasi untuk periode ini.
          </p>
        </Card>
      )}

      {/* 11. Rule-Based Insights */}
      <RuleBasedInsightsCard
        insights={ruleBasedInsights}
        hasExpenseData={expenseTransactions.length > 0}
      />

      {/* 12. Sinking Fund Recommendation */}
      <SinkingFundRecommendationCard
        recommendation={sinkingFundRecommendation}
        isCurrentPeriod={isCurrentPeriod}
      />

      {/* 13. Compact Transaction Activity Summary */}
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

      {/* 14. Unified Page-level Empty Action when the entire selected period has no transactions */}
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

