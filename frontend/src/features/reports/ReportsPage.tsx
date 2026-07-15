import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getBudgetPeriod, isValidLocalDateString } from '@/lib/budgetPeriod';
import { formatRupiah } from '@/lib/currency';
import { getPocketBudgetStatus } from '@/lib/balanceCalculations';
import {
  calculateReportTotals,
  calculateExpenseBreakdownByCategory,
  calculateExpenseBreakdownByPocket,
} from '@/lib/reportCalculations';

export function ReportsPage() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((state) => state.transactions);
  const pockets = usePocketStore((state) => state.pockets);
  const categories = useCategoryStore((state) => state.categories);

  // Current budget period
  const period = useMemo(() => getBudgetPeriod(), []);

  // Filter current-period active transactions
  const activePeriodTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        !t.isArchived &&
        isValidLocalDateString(t.date) &&
        t.date >= period.startDate &&
        t.date <= period.endDate
    );
  }, [transactions, period]);

  // Period totals
  const totals = useMemo(() => {
    return calculateReportTotals(activePeriodTransactions);
  }, [activePeriodTransactions]);

  // Active pockets for allocation
  const activePocketsForAllocation = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  // Total monthly allocation
  const totalMonthlyAllocation = useMemo(() => {
    return activePocketsForAllocation.reduce((sum, p) => {
      const alloc = p.monthlyAllocation ?? 0;
      return sum + (Number.isFinite(alloc) ? alloc : 0);
    }, 0);
  }, [activePocketsForAllocation]);

  // Remaining allocation
  const remainingAllocation = totalMonthlyAllocation - totals.totalExpense;

  // Budget status and progress
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

  const expenseDisplay = totals.totalExpense > 0 ? `-${formatRupiah(totals.totalExpense)}` : 'Rp0';
  const incomeDisplay = totals.totalIncome > 0 ? `+${formatRupiah(totals.totalIncome)}` : 'Rp0';

  const formatPercent = (pct: number): string => {
    if (pct <= 0) return '0%';
    if (pct < 1) return '<1%';
    return `${Math.round(pct)}%`;
  };

  return (
    <div className="flex flex-col gap-6 px-safe py-6 min-h-screen bg-background pb-24">
      {/* Header */}
      <div>
        <h1 className="font-display text-headline-lg-mobile text-text-primary">
          Laporan
        </h1>
        <p className="text-body-sm text-text-secondary mt-1">
          {period.label}
        </p>
      </div>

      {/* Arus Kas Bersih Card */}
      <Card variant="flat" className="p-4 bg-surface flex flex-col gap-1 border border-border/30 shadow-sm">
        <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">
          Arus Kas Bersih
        </span>
        <span className={`font-display text-amount-xl font-bold tracking-tight mt-0.5 block ${
          totals.netCashFlow > 0 ? 'text-aman' : totals.netCashFlow < 0 ? 'text-bahaya' : 'text-text-primary'
        }`}>
          {totals.netCashFlow > 0 ? `+${formatRupiah(totals.netCashFlow)}` : formatRupiah(totals.netCashFlow)}
        </span>
      </Card>

      {/* Expense and Income Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card variant="flat" className="p-4 bg-bahaya-soft/35 border border-bahaya-soft/20 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-bahaya tracking-wider uppercase block">
            Pengeluaran
          </span>
          <span className="font-display text-amount-md font-bold text-bahaya mt-1 block">
            {expenseDisplay}
          </span>
        </Card>

        <Card variant="flat" className="p-4 bg-aman-soft/35 border border-aman-soft/20 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-aman tracking-wider uppercase block">
            Pemasukan
          </span>
          <span className="font-display text-amount-md font-bold text-aman mt-1 block">
            {incomeDisplay}
          </span>
        </Card>
      </div>

      {/* Budget Period Card */}
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
            {formatRupiah(remainingAllocation)}
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

      {/* Category Expense Breakdown */}
      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
          Distribusi Pengeluaran Kategori
        </span>
        {totals.totalExpense > 0 && categoryBreakdown.length > 0 ? (
          <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-1">
            {categoryBreakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-b-0 gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0" aria-hidden="true">{item.emoji || '🧾'}</span>
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
        ) : (
          <Card variant="flat" className="py-8 px-4 text-center flex flex-col items-center gap-3 border border-border/20 bg-surface shadow-sm">
            <span className="text-2xl" role="img" aria-label="No expenses">🧾</span>
            <p className="text-body-sm text-text-secondary">
              Belum ada pengeluaran pada periode ini.
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
          </Card>
        )}
      </div>

      {/* Pocket Expense Breakdown */}
      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
          Distribusi Pengeluaran Pocket
        </span>
        {totals.totalExpense > 0 && pocketBreakdown.length > 0 ? (
          <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-1">
            {pocketBreakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-b-0 gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0" aria-hidden="true">{item.emoji || '📁'}</span>
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
        ) : (
          <Card variant="flat" className="py-8 px-4 text-center flex flex-col items-center gap-3 border border-border/20 bg-surface shadow-sm">
            <span className="text-2xl" role="img" aria-label="No expenses">📁</span>
            <p className="text-body-sm text-text-secondary">
              Belum ada pengeluaran pada periode ini.
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
          </Card>
        )}
      </div>

      {/* Transaction Activity Summary */}
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
    </div>
  );
}
