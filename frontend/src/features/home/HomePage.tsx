import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import {
  getTotalEffectiveBalance,
  getSpendableEffectiveBalance,
  getPocketBudgetStatus,
} from '@/lib/balanceCalculations';
import { getBudgetPeriod, isValidLocalDateString } from '@/lib/budgetPeriod';
import { formatRupiah } from '@/lib/currency';
import { sortTransactions, formatCompactTransactionDateTime } from '@/lib/transactionDisplay';
import { INCOME_SOURCE_LABELS, TRANSFER_TYPE_LABELS } from '@/data/constants';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function HomePage() {
  const navigate = useNavigate();

  // User
  const user = useAuthStore((s) => s.user);

  // Reactive subscriptions — direct state arrays for full reactivity
  const pockets = usePocketStore((s) => s.pockets);
  const transactions = useTransactionStore((s) => s.transactions);

  // ─── Budget period ───────────────────────────────────────────────────────
  const period = getBudgetPeriod();

  // ─── Active pockets ───────────────────────────────────────────────────────
  const activePockets = useMemo(
    () => pockets.filter((p) => p.isActive && !p.isArchived),
    [pockets]
  );

  // ─── Active transactions (non-archived) ──────────────────────────────────
  const activeTransactions = useMemo(
    () => transactions.filter((t) => !t.isArchived),
    [transactions]
  );

  // ─── Recent active transactions (latest 5) ───────────────────────────────
  const recentTransactions = useMemo(
    () => sortTransactions(activeTransactions).slice(0, 5),
    [activeTransactions]
  );

  const getPocketById = usePocketStore((s) => s.getPocketById);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  // ─── Total effective balance (all active pockets) ─────────────────────────
  const totalBalance = useMemo(
    () => getTotalEffectiveBalance(activePockets, activeTransactions),
    [activePockets, activeTransactions]
  );

  // ─── Spendable balance (active daily spendable pockets only) ─────────────
  const spendableBalance = useMemo(
    () => getSpendableEffectiveBalance(activePockets, activeTransactions),
    [activePockets, activeTransactions]
  );

  // ─── Period-filtered transactions ─────────────────────────────────────────
  // Uses lexicographic YYYY-MM-DD comparison which is safe and correct.
  const periodTransactions = useMemo(() => {
    return activeTransactions.filter((t) => {
      // Reject malformed dates rather than throwing
      if (!isValidLocalDateString(t.date)) {
        return false;
      }
      return t.date >= period.startDate && t.date <= period.endDate;
    });
  }, [activeTransactions, period.startDate, period.endDate]);

  // ─── Period expense (active, non-transfer) ────────────────────────────────
  const periodExpense = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  // ─── Period income (active, non-transfer) ─────────────────────────────────
  const periodIncome = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  // ─── Total monthly allocation (active pockets) ───────────────────────────
  const totalMonthlyAllocation = useMemo(
    () =>
      activePockets.reduce((sum, p) => {
        const alloc = p.monthlyAllocation ?? 0;
        return sum + (Number.isFinite(alloc) ? alloc : 0);
      }, 0),
    [activePockets]
  );

  // ─── Remaining allocation ─────────────────────────────────────────────────
  const remainingAllocation = totalMonthlyAllocation - periodExpense;

  // ─── Budget usage ratio (clamped to 0–1 for progress bar; raw for label) ──
  const budgetUsageRatio =
    totalMonthlyAllocation > 0
      ? periodExpense / totalMonthlyAllocation
      : 0;
  const budgetUsageRatioClamped = Math.min(1, Math.max(0, budgetUsageRatio));
  const budgetUsagePercent = Math.round(budgetUsageRatio * 100);

  const budgetUsageLabel =
    periodExpense > 0 &&
    totalMonthlyAllocation > 0 &&
    budgetUsagePercent === 0
      ? '<1%'
      : `${budgetUsagePercent}%`;

  // ─── Budget status for colour ─────────────────────────────────────────────
  const budgetStatus = useMemo(
    () => getPocketBudgetStatus(periodExpense, totalMonthlyAllocation || null),
    [periodExpense, totalMonthlyAllocation]
  );

  // ─── Greeting ─────────────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'Kamu';

  return (
    <div className="flex flex-col gap-5 px-safe py-6 min-h-screen bg-background pb-28">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-body-sm text-text-secondary">{greeting},</p>
        <h1 className="font-display text-headline-lg-mobile text-text-primary">
          {firstName} 👋
        </h1>
        <p className="text-[11px] text-text-muted mt-0.5">{period.label}</p>
      </div>

      {/* ── Hero Balance Card ────────────────────────────────────────────── */}
      <Card variant="flat" className="bg-primary-soft/40 border border-primary/10 p-5">
        <span className="text-[10px] font-bold text-primary tracking-wider uppercase block">
          Total Saldo
        </span>
        <span className="font-display text-amount-xl font-bold tracking-tight tabular-nums text-primary mt-1 block">
          {formatRupiah(totalBalance)}
        </span>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="material-symbols-rounded text-sm text-primary/70">savings</span>
          <span className="text-[11px] text-primary/80 font-medium">
            Bisa dipakai: {formatRupiah(spendableBalance)}
          </span>
        </div>
      </Card>

      {/* ── Period Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Card variant="flat" className="bg-bahaya-soft/40 border border-bahaya-soft/30 p-4">
          <span className="text-[10px] font-bold text-bahaya tracking-wider uppercase block">
            Pengeluaran Periode
          </span>
          <span className="font-display text-amount-md text-bahaya mt-1 block">
            -{formatRupiah(periodExpense)}
          </span>
        </Card>

        <Card variant="flat" className="bg-aman-soft/40 border border-aman-soft/30 p-4">
          <span className="text-[10px] font-bold text-aman tracking-wider uppercase block">
            Pemasukan Periode
          </span>
          <span className="font-display text-amount-md text-aman mt-1 block">
            +{formatRupiah(periodIncome)}
          </span>
        </Card>
      </div>

      {/* ── Budget Progress Card ─────────────────────────────────────────── */}
      {totalMonthlyAllocation > 0 && (
        <Card variant="flat" className="flex flex-col gap-3 p-4">
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

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">
              Sisa anggaran
            </span>
            <span className={`font-display font-bold ${
              remainingAllocation >= 0 ? 'text-aman' : 'text-bahaya'
            }`}>
              {formatRupiah(remainingAllocation)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Total alokasi</span>
            <span className="font-display font-semibold text-text-secondary">
              {formatRupiah(totalMonthlyAllocation)}
            </span>
          </div>
        </Card>
      )}

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
          Aksi Cepat
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            id="home-quick-expense"
            onClick={() => navigate('/transactions/add/expense')}
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-card bg-bahaya-soft/50 border border-bahaya-soft/40 hover:bg-bahaya-soft/80 active:scale-[0.97] transition-all"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-bahaya-soft">
              <span className="material-symbols-rounded text-bahaya text-xl">remove_circle</span>
            </span>
            <span className="text-[11px] font-semibold text-bahaya text-center leading-tight">
              Catat Pengeluaran
            </span>
          </button>

          <button
            id="home-quick-income"
            onClick={() => navigate('/transactions/add/income')}
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-card bg-aman-soft/50 border border-aman-soft/40 hover:bg-aman-soft/80 active:scale-[0.97] transition-all"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-aman-soft">
              <span className="material-symbols-rounded text-aman text-xl">add_circle</span>
            </span>
            <span className="text-[11px] font-semibold text-aman text-center leading-tight">
              Tambah Pemasukan
            </span>
          </button>

          <button
            id="home-quick-transfer"
            onClick={() => navigate('/transactions/add/transfer')}
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-card bg-primary-soft/50 border border-primary-soft/40 hover:bg-primary-soft/80 active:scale-[0.97] transition-all"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-soft">
              <span className="material-symbols-rounded text-primary text-xl">swap_horiz</span>
            </span>
            <span className="text-[11px] font-semibold text-primary text-center leading-tight">
              Transfer
            </span>
          </button>
        </div>
      </div>

      {/* ── Transaksi Terbaru ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
            Transaksi Terbaru
          </span>
          {recentTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="text-body-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Lihat semua
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <Card variant="flat" className="py-6 px-4 text-center flex flex-col items-center gap-3">
            <span className="text-2xl" role="img" aria-label="No transactions">📝</span>
            <div>
              <h3 className="font-display text-body-md font-bold text-text-primary">
                Belum ada transaksi.
              </h3>
              <p className="text-[11px] text-text-secondary mt-1 max-w-[200px] mx-auto">
                Transaksi terbaru kamu akan muncul di sini.
              </p>
            </div>
            <div className="w-full max-w-[150px]">
              <Button
                onClick={() => navigate('/transactions/add/expense')}
                variant="secondary"
                size="sm"
                fullWidth
              >
                Catat transaksi
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentTransactions.map((t) => {
              // Resolve Pocket Names
              const pocket = t.pocketId ? getPocketById(t.pocketId) : undefined;
              const fromPocket = t.fromPocketId ? getPocketById(t.fromPocketId) : undefined;
              const toPocket = t.toPocketId ? getPocketById(t.toPocketId) : undefined;

              // Resolve Category/Source/Transfer details
              let rowTitle = '';
              let sub = '';
              let iconName = '';
              let iconBg = '';
              let iconColor = '';
              let amountText = '';
              let amountColor = '';

              if (t.type === 'expense') {
                const category = t.categoryId ? getCategoryById(t.categoryId) : undefined;
                rowTitle = category ? `${category.emoji} ${category.name}` : 'Tanpa kategori';
                sub = pocket ? pocket.name : 'Pocket tidak tersedia';
                iconName = 'remove_circle';
                iconBg = 'bg-bahaya-soft';
                iconColor = 'text-bahaya';
                amountText = `-${formatRupiah(t.amount)}`;
                amountColor = 'text-bahaya';
              } else if (t.type === 'income') {
                const sourceLabel = t.incomeSource ? (INCOME_SOURCE_LABELS[t.incomeSource] || 'Pemasukan') : 'Pemasukan';
                rowTitle = sourceLabel;
                sub = pocket ? pocket.name : 'Pocket tidak tersedia';
                iconName = 'add_circle';
                iconBg = 'bg-aman-soft';
                iconColor = 'text-aman';
                amountText = `+${formatRupiah(t.amount)}`;
                amountColor = 'text-aman';
              } else if (t.type === 'transfer') {
                const transferLabel = t.transferType ? (TRANSFER_TYPE_LABELS[t.transferType] || 'Transfer') : 'Transfer';
                rowTitle = transferLabel;
                const fromName = fromPocket ? fromPocket.name : 'Pocket tidak tersedia';
                const toName = toPocket ? toPocket.name : 'Pocket tidak tersedia';
                sub = `${fromName} → ${toName}`;
                iconName = 'swap_horiz';
                iconBg = 'bg-primary-soft';
                iconColor = 'text-primary';
                amountText = formatRupiah(t.amount);
                amountColor = 'text-text-primary';
              }

              // Localized compact date label
              const timeLabel = formatCompactTransactionDateTime(t.date, t.time);

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/transactions/${t.id}`, { state: { from: '/' } })}
                  className="w-full text-left cursor-pointer active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-card"
                >
                  <Card
                    variant="flat"
                    className="flex items-center justify-between gap-3 border border-border/40 hover:border-primary/20 hover:shadow-card transition-all p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Circular icon */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${iconBg}`}>
                        <span className={`material-symbols-rounded ${iconColor} text-xl`}>
                          {iconName}
                        </span>
                      </div>

                      {/* Text descriptions */}
                      <div className="min-w-0">
                        <div className="font-display text-body-md font-bold text-text-primary truncate">
                          {rowTitle}
                        </div>
                        <div className="text-[10px] text-text-secondary font-medium">
                          {sub}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Time Display */}
                    <div className="text-right flex-shrink-0">
                      <span className={`font-display text-body-md font-bold ${amountColor} block`}>
                        {amountText}
                      </span>
                      <span className="text-[10px] text-text-muted font-body">
                        {timeLabel}
                      </span>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Navigation Links ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <span className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
          Menu
        </span>
        <Card
          variant="flat"
          className="divide-y divide-border/40"
        >
          <button
            id="home-nav-pockets"
            onClick={() => navigate('/pockets')}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-surface-container/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-primary text-xl">wallet</span>
              <div>
                <div className="font-display text-body-md font-bold text-text-primary">
                  Pocket Saya
                </div>
                <div className="text-[11px] text-text-secondary">
                  {activePockets.length} pocket aktif
                </div>
              </div>
            </div>
            <span className="material-symbols-rounded text-text-muted text-lg">
              chevron_right
            </span>
          </button>

          <button
            id="home-nav-history"
            onClick={() => navigate('/transactions')}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-surface-container/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-primary text-xl">receipt_long</span>
              <div>
                <div className="font-display text-body-md font-bold text-text-primary">
                  Riwayat Transaksi
                </div>
                <div className="text-[11px] text-text-secondary">
                  {activeTransactions.length} transaksi aktif
                </div>
              </div>
            </div>
            <span className="material-symbols-rounded text-text-muted text-lg">
              chevron_right
            </span>
          </button>
        </Card>
      </div>

      {/* ── Empty / zero state notice ─────────────────────────────────────── */}
      {activePockets.length === 0 && (
        <Card variant="flat" className="py-8 px-6 text-center flex flex-col items-center gap-3">
          <span className="text-3xl" role="img" aria-label="Setup">👛</span>
          <div>
            <h3 className="font-display text-headline-sm text-text-primary">
              Belum ada pocket aktif.
            </h3>
            <p className="text-body-sm text-text-secondary mt-1 max-w-[240px] mx-auto">
              Selesaikan setup untuk mulai mengelola keuanganmu.
            </p>
          </div>
          <Button onClick={() => navigate('/setup')} variant="primary" size="md">
            Mulai Setup
          </Button>
        </Card>
      )}
    </div>
  );
}
