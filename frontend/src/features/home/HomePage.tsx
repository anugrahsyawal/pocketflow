import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import {
  getTotalEffectiveBalance,
  getSpendableEffectiveBalance,
  getPocketEffectiveBalance,
  getPocketUsedAmount,
  getPocketReallocationsInPeriod,
  getPocketBudgetStatus,
  type BudgetStatusType,
} from '@/lib/balanceCalculations';
import { getBudgetPeriod, isValidLocalDateString } from '@/lib/budgetPeriod';
import { formatRupiah } from '@/lib/currency';
import { sortTransactions, formatCompactTransactionDateTime } from '@/lib/transactionDisplay';
import { INCOME_SOURCE_LABELS, TRANSFER_TYPE_LABELS } from '@/data/constants';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Pocket } from '@/types/pocket';

export function HomePage() {
  const navigate = useNavigate();

  // User
  const user = useAuthStore((s) => s.user);

  // Privacy toggle (Home scoped)
  const [isPrivate, setIsPrivate] = useState(false);

  // Reactive subscriptions
  const pockets = usePocketStore((s) => s.pockets);
  const transactions = useTransactionStore((s) => s.transactions);

  // Budget period
  const period = getBudgetPeriod();

  // Active pockets
  const activePockets = useMemo(
    () => pockets.filter((p) => p.isActive && !p.isArchived),
    [pockets]
  );

  // Active transactions (non-archived)
  const activeTransactions = useMemo(
    () => transactions.filter((t) => !t.isArchived),
    [transactions]
  );

  // Recent active transactions (latest 3 for Home)
  const recentTransactions = useMemo(
    () => sortTransactions(activeTransactions).slice(0, 3),
    [activeTransactions]
  );

  const getPocketById = usePocketStore((s) => s.getPocketById);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  // Total effective balance
  const totalBalance = useMemo(
    () => getTotalEffectiveBalance(activePockets, activeTransactions),
    [activePockets, activeTransactions]
  );

  // Spendable balance
  const spendableBalance = useMemo(
    () => getSpendableEffectiveBalance(activePockets, activeTransactions),
    [activePockets, activeTransactions]
  );

  // Period-filtered transactions
  const periodTransactions = useMemo(() => {
    return activeTransactions.filter((t) => {
      if (!isValidLocalDateString(t.date)) return false;
      return t.date >= period.startDate && t.date <= period.endDate;
    });
  }, [activeTransactions, period.startDate, period.endDate]);

  // Period expense
  const periodExpense = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  // Total monthly allocation
  const totalMonthlyAllocation = useMemo(
    () =>
      activePockets.reduce((sum, p) => {
        const alloc = p.monthlyAllocation ?? 0;
        return sum + (Number.isFinite(alloc) ? alloc : 0);
      }, 0),
    [activePockets]
  );

  // Remaining allocation
  const remainingAllocation = totalMonthlyAllocation - periodExpense;

  // Budget usage ratio
  const budgetUsageRatio =
    totalMonthlyAllocation > 0
      ? periodExpense / totalMonthlyAllocation
      : 0;
  const budgetUsageRatioClamped = Math.min(1, Math.max(0, budgetUsageRatio));

  // Overall budget status
  const budgetStatus = useMemo(
    () => getPocketBudgetStatus(periodExpense, totalMonthlyAllocation || null),
    [periodExpense, totalMonthlyAllocation]
  );

  // Safe Per Day (Aman Per Hari) calculation with safe date parsing
  const safePerDay = useMemo(() => {
    if (spendableBalance <= 0) return 0;
    const today = new Date();
    const parts = period.endDate.split('-').map(Number);
    const endY = parts[0] ?? today.getFullYear();
    const endM = parts[1] ?? (today.getMonth() + 1);
    const endD = parts[2] ?? today.getDate();

    const endLocalDate = new Date(endY, endM - 1, endD);
    const todayLocalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.round((endLocalDate.getTime() - todayLocalDate.getTime()) / msPerDay);
    const remainingDays = Math.max(1, diffDays + 1); // inclusive of today
    return Math.max(0, Math.floor(spendableBalance / remainingDays));
  }, [spendableBalance, period.endDate]);

  // Mask amount helper for privacy mode
  const displayAmount = (val: number, formatFn = formatRupiah) => {
    if (isPrivate) return '••••••••';
    return formatFn(val);
  };

  const displayRawString = (str: string) => {
    if (isPrivate) return '••••••••';
    return str;
  };

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'Kyune';

  // Resolve Key Combined & Other Pockets for Carousel
  const transportationPocket = useMemo(
    () => activePockets.find((p) => p.id === 'transportation' || p.name.toLowerCase().includes('transportation')),
    [activePockets]
  );
  const nfcPocket = useMemo(
    () => activePockets.find((p) => p.id === 'nfc-card' || p.name.toLowerCase().includes('nfc')),
    [activePockets]
  );
  const foodPocket = useMemo(
    () => activePockets.find((p) => p.id === 'food-groceries' || p.name.toLowerCase().includes('food')),
    [activePockets]
  );
  const cashPocket = useMemo(
    () => activePockets.find((p) => p.id === 'cash' || p.name.toLowerCase().includes('cash')),
    [activePockets]
  );

  // Other individual active pockets (excluding Cash & NFC)
  const otherPockets = useMemo(() => {
    const combinedIds = new Set([
      transportationPocket?.id,
      nfcPocket?.id,
      foodPocket?.id,
      cashPocket?.id,
    ].filter(Boolean));
    return activePockets.filter((p) => !combinedIds.has(p.id));
  }, [activePockets, transportationPocket, nfcPocket, foodPocket, cashPocket]);

  // Pocket status helper for individual pockets
  const getPocketCalculatedStatus = (pocket: Pocket) => {
    const used = getPocketUsedAmount(pocket.id, activeTransactions, period.startDate, period.endDate);
    const realloc = getPocketReallocationsInPeriod(pocket.id, activeTransactions, period.startDate, period.endDate);
    const revisedAlloc = (pocket.monthlyAllocation ?? 0) + realloc.netReallocation;
    if (pocket.monthlyAllocation === null || pocket.monthlyAllocation <= 0) {
      return { used, revisedAlloc: 0, status: null, remaining: 0 };
    }
    const statusResult = getPocketBudgetStatus(used, revisedAlloc);
    return {
      used,
      revisedAlloc,
      status: statusResult.status,
      remaining: revisedAlloc - used,
    };
  };

  // Transportation + NFC Card Status
  const transStatus = useMemo(() => {
    if (!transportationPocket) return null;
    return getPocketCalculatedStatus(transportationPocket);
  }, [transportationPocket, activeTransactions, period.startDate, period.endDate]);

  // Food & Groceries + Cash Status
  const foodStatus = useMemo(() => {
    if (!foodPocket) return null;
    return getPocketCalculatedStatus(foodPocket);
  }, [foodPocket, activeTransactions, period.startDate, period.endDate]);

  // Attention Pockets (max 2 pockets in waspada/bahaya/overbudget status)
  const attentionPockets = useMemo(() => {
    const list: Array<{
      pocket: Pocket;
      status: BudgetStatusType;
      message: string;
    }> = [];

    // Check Transportation
    if (transportationPocket && transStatus && transStatus.status && transStatus.status !== 'aman') {
      const pct = Math.round((transStatus.used / (transStatus.revisedAlloc || 1)) * 100);
      let msg = `Sisa anggaran menipis (${pct}%).`;
      if (transStatus.status === 'overbudget') {
        msg = `Sudah overbudget ${formatRupiah(Math.abs(transStatus.remaining))}.`;
      }
      list.push({ pocket: transportationPocket, status: transStatus.status, message: msg });
    }

    // Check Food & Groceries
    if (foodPocket && foodStatus && foodStatus.status && foodStatus.status !== 'aman') {
      const pct = Math.round((foodStatus.used / (foodStatus.revisedAlloc || 1)) * 100);
      let msg = `Sisa anggaran menipis (${pct}%).`;
      if (foodStatus.status === 'overbudget') {
        msg = `Sudah overbudget ${formatRupiah(Math.abs(foodStatus.remaining))}.`;
      }
      list.push({ pocket: foodPocket, status: foodStatus.status, message: msg });
    }

    // Check Other Pockets
    for (const p of otherPockets) {
      const pStat = getPocketCalculatedStatus(p);
      if (pStat.status && pStat.status !== 'aman') {
        const pct = Math.round((pStat.used / (pStat.revisedAlloc || 1)) * 100);
        let msg = `Sisa anggaran menipis (${pct}%).`;
        if (pStat.status === 'overbudget') {
          msg = `Sudah overbudget ${formatRupiah(Math.abs(pStat.remaining))}.`;
        }
        list.push({ pocket: p, status: pStat.status, message: msg });
      }
    }

    // Sort by severity: overbudget > bahaya > waspada
    const severityMap: Record<BudgetStatusType, number> = {
      overbudget: 3,
      bahaya: 2,
      waspada: 1,
      aman: 0,
    };

    return list.sort((a, b) => severityMap[b.status] - severityMap[a.status]).slice(0, 2);
  }, [transportationPocket, foodPocket, otherPockets, activeTransactions, period.startDate, period.endDate]);

  return (
    <div className="flex flex-col gap-6 px-safe py-6 min-h-screen bg-background pb-28 max-w-[480px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-headline-sm text-text-primary">
            {greeting}, {firstName} 👋
          </h1>
          <div className="bg-surface-container/80 px-2.5 py-1 rounded-full inline-block mt-1 border border-border/40">
            <span className="text-[11px] font-bold text-text-secondary">
              {period.label}
            </span>
          </div>
        </div>

        {/* Profile / Settings Avatar */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Pengaturan"
          className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center font-bold text-sm border border-primary/20 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer min-h-[44px] min-w-[44px]"
        >
          {firstName.charAt(0).toUpperCase()}
        </button>
      </header>

      {/* ── Hero Balance Card "TOTAL SEMUA POCKET" ──────────────────────── */}
      <Card variant="flat" className="bg-surface rounded-[28px] p-5 shadow-[0_4px_20px_rgba(0,74,198,0.08)] border border-border/50 flex flex-col gap-4">
        {/* Card Header Row */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-text-secondary tracking-wider uppercase">
                TOTAL SEMUA POCKET
              </span>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                aria-label={isPrivate ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                className="text-text-muted hover:text-primary transition-colors p-1 rounded-full cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-lg">
                  {isPrivate ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="font-display text-headline-lg font-extrabold text-text-primary mt-1 tracking-tight">
              {displayAmount(totalBalance)}
            </p>
          </div>

          {/* Status Pill Badge */}
          <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border text-[11px] font-bold ${
            budgetStatus.status === 'aman'
              ? 'bg-aman-soft text-aman border-aman/20'
              : budgetStatus.status === 'waspada'
              ? 'bg-waspada-soft text-waspada border-waspada/20'
              : 'bg-bahaya-soft text-bahaya border-bahaya/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              budgetStatus.status === 'aman'
                ? 'bg-aman'
                : budgetStatus.status === 'waspada'
                ? 'bg-waspada'
                : 'bg-bahaya'
            }`} />
            <span className="uppercase">{budgetStatus.status === 'overbudget' ? 'BAHAYA' : budgetStatus.status.toUpperCase()}</span>
          </div>
        </div>

        {/* 2-Column Sub-metrics */}
        <div className="grid grid-cols-2 gap-3 bg-surface-container-low/60 p-3.5 rounded-2xl border border-border/30">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="material-symbols-rounded text-base text-primary">account_balance_wallet</span>
              <span className="text-[12px] font-medium">Sisa spendable</span>
            </div>
            <p className="font-display text-body-lg font-bold text-text-primary">
              {displayAmount(spendableBalance)}
            </p>
          </div>

          <div className="flex flex-col gap-1 border-l border-border/40 pl-3.5">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="material-symbols-rounded text-base text-primary">calendar_month</span>
              <span className="text-[12px] font-medium">Aman per hari</span>
            </div>
            <p className="font-display text-body-lg font-bold text-text-primary">
              {displayAmount(safePerDay)}
            </p>
          </div>
        </div>

        {/* Budget Progress Block */}
        {totalMonthlyAllocation > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-text-secondary">
                {displayAmount(periodExpense)} terpakai dari {displayAmount(totalMonthlyAllocation)}
              </span>
              <span className={`font-display font-bold ${
                remainingAllocation >= 0 ? 'text-text-primary' : 'text-bahaya'
              }`}>
                Sisa anggaran {displayAmount(remainingAllocation)}
              </span>
            </div>

            <ProgressBar
              value={budgetUsageRatioClamped}
              variant={budgetStatus.status === 'overbudget' ? 'bahaya' : budgetStatus.status}
              height="sm"
            />
          </div>
        )}
      </Card>

      {/* ── Ringkasan Pocket Carousel ────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-headline-sm text-text-primary">
            Ringkasan Pocket
          </h2>
          <button
            type="button"
            onClick={() => navigate('/pockets')}
            className="text-body-sm font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer min-h-[44px] px-2 flex items-center"
          >
            Lihat semua
          </button>
        </div>

        <div className="w-full flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Card 1: Transportation + NFC */}
          {transportationPocket && (
            <button
              type="button"
              onClick={() => navigate('/pockets/transportation')}
              className="w-[85%] min-w-[280px] max-w-[320px] flex-shrink-0 snap-start flex flex-col justify-between bg-surface rounded-[24px] p-4 border border-border/60 shadow-card hover:border-primary/30 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[160px]"
            >
              <div className="flex flex-col gap-2.5 w-full">
                <h3 className="font-display text-body-lg font-bold text-text-primary flex items-center gap-2">
                  <span className="text-xl">🚆</span> Transportation + NFC
                </h3>

                <div className="flex flex-col gap-1.5 text-[13px] w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-text-secondary">Pocket Transportation</span>
                    <span className="font-bold text-text-primary">
                      {displayAmount(getPocketEffectiveBalance(transportationPocket, activeTransactions))}
                    </span>
                  </div>
                  {nfcPocket && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-text-secondary">NFC Transportation Card</span>
                      <span className="font-bold text-text-primary">
                        {displayAmount(getPocketEffectiveBalance(nfcPocket, activeTransactions))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-border/40 flex justify-between items-center w-full">
                <span className="text-[13px] font-bold text-text-primary">Total tersedia</span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-body-md font-bold text-primary">
                    {displayAmount(
                      getPocketEffectiveBalance(transportationPocket, activeTransactions) +
                      (nfcPocket ? getPocketEffectiveBalance(nfcPocket, activeTransactions) : 0)
                    )}
                  </span>
                  {transStatus && transStatus.status && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      transStatus.status === 'aman'
                        ? 'bg-aman-soft text-aman'
                        : transStatus.status === 'waspada'
                        ? 'bg-waspada-soft text-waspada'
                        : 'bg-bahaya-soft text-bahaya'
                    }`}>
                      {transStatus.status === 'overbudget' ? 'Bahaya' : transStatus.status.charAt(0).toUpperCase() + transStatus.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Card 2: Food & Groceries + Cash */}
          {foodPocket && (
            <button
              type="button"
              onClick={() => navigate('/pockets/food-groceries')}
              className="w-[85%] min-w-[280px] max-w-[320px] flex-shrink-0 snap-start flex flex-col justify-between bg-surface rounded-[24px] p-4 border border-border/60 shadow-card hover:border-primary/30 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[160px]"
            >
              <div className="flex flex-col gap-2.5 w-full">
                <h3 className="font-display text-body-lg font-bold text-text-primary flex items-center gap-2">
                  <span className="text-xl">🍜</span> Food & Groceries + Cash
                </h3>

                <div className="flex flex-col gap-1.5 text-[13px] w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-text-secondary">Pocket Food & Groceries</span>
                    <span className="font-bold text-text-primary">
                      {displayAmount(getPocketEffectiveBalance(foodPocket, activeTransactions))}
                    </span>
                  </div>
                  {cashPocket && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-text-secondary">Cash</span>
                      <span className="font-bold text-text-primary">
                        {displayAmount(getPocketEffectiveBalance(cashPocket, activeTransactions))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-border/40 flex justify-between items-center w-full">
                <span className="text-[13px] font-bold text-text-primary">Total tersedia</span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-body-md font-bold text-primary">
                    {displayAmount(
                      getPocketEffectiveBalance(foodPocket, activeTransactions) +
                      (cashPocket ? getPocketEffectiveBalance(cashPocket, activeTransactions) : 0)
                    )}
                  </span>
                  {foodStatus && foodStatus.status && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      foodStatus.status === 'aman'
                        ? 'bg-aman-soft text-aman'
                        : foodStatus.status === 'waspada'
                        ? 'bg-waspada-soft text-waspada'
                        : 'bg-bahaya-soft text-bahaya'
                    }`}>
                      {foodStatus.status === 'overbudget' ? 'Bahaya' : foodStatus.status.charAt(0).toUpperCase() + foodStatus.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Cards 3..N: All other individual active pockets */}
          {otherPockets.map((p) => {
            const bal = getPocketEffectiveBalance(p, activeTransactions);
            const pStat = getPocketCalculatedStatus(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/pockets/${p.id}`)}
                className="w-[85%] min-w-[280px] max-w-[320px] flex-shrink-0 snap-start flex flex-col justify-between bg-surface rounded-[24px] p-4 border border-border/60 shadow-card hover:border-primary/30 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[160px]"
              >
                <div className="flex flex-col gap-2.5 w-full">
                  <h3 className="font-display text-body-lg font-bold text-text-primary flex items-center gap-2">
                    <span className="text-xl">{p.emoji}</span> {p.name}
                  </h3>

                  <div className="flex flex-col gap-1.5 text-[13px] w-full">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-text-secondary">Saldo Pocket</span>
                      <span className="font-bold text-text-primary">
                        {displayAmount(bal)}
                      </span>
                    </div>
                    {p.monthlyAllocation && p.monthlyAllocation > 0 ? (
                      <div className="flex justify-between items-center w-full">
                        <span className="text-text-secondary">Sisa Anggaran</span>
                        <span className={`font-bold ${pStat.remaining >= 0 ? 'text-text-primary' : 'text-bahaya'}`}>
                          {displayAmount(pStat.remaining)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="text-text-secondary">Tipe Pocket</span>
                        <span className="font-bold text-text-muted capitalize">
                          {p.groupId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border/40 flex justify-between items-center w-full">
                  <span className="text-[13px] font-bold text-text-primary">Total tersedia</span>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-body-md font-bold text-primary">
                      {displayAmount(bal)}
                    </span>
                    {pStat.status && (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        pStat.status === 'aman'
                          ? 'bg-aman-soft text-aman'
                          : pStat.status === 'waspada'
                          ? 'bg-waspada-soft text-waspada'
                          : 'bg-bahaya-soft text-bahaya'
                      }`}>
                        {pStat.status === 'overbudget' ? 'Bahaya' : pStat.status.charAt(0).toUpperCase() + pStat.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section "Butuh Perhatian" ─────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-headline-sm text-text-primary">
          Butuh perhatian
        </h2>

        {attentionPockets.length === 0 ? (
          <Card variant="flat" className="bg-aman-soft/30 border border-aman/20 p-4 rounded-[20px] flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">🌟</span>
            <p className="text-body-sm font-medium text-text-primary">
              Semua Pocket masih aman. Lanjutkan kebiasaan baikmu.
            </p>
          </Card>
        ) : (
          <div className="w-full flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {attentionPockets.map(({ pocket, status, message }) => {
              const isWaspada = status === 'waspada';
              return (
                <button
                  key={pocket.id}
                  type="button"
                  onClick={() => navigate(`/pockets/${pocket.id}`)}
                  className={`w-[85%] min-w-[280px] max-w-[320px] flex-shrink-0 snap-start rounded-[24px] p-4 shadow-sm flex flex-col justify-between cursor-pointer border transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[110px] ${
                    isWaspada
                      ? 'bg-waspada-soft/30 border-waspada/40 hover:bg-waspada-soft/50'
                      : 'bg-bahaya-soft/30 border-bahaya/40 hover:bg-bahaya-soft/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-3 w-full">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={`text-[12px] font-bold uppercase truncate ${
                        isWaspada ? 'text-waspada' : 'text-bahaya'
                      }`}>
                        {pocket.emoji} {pocket.name}
                      </span>
                      <p className="text-body-sm font-semibold text-text-primary">
                        {message}
                      </p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase shadow-xs flex-shrink-0 ${
                      isWaspada
                        ? 'bg-waspada text-white'
                        : 'bg-bahaya text-white'
                    }`}>
                      {status === 'overbudget' ? 'BAHAYA' : status.toUpperCase()}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between pt-2 border-t w-full ${
                    isWaspada ? 'border-waspada/20 text-waspada' : 'border-bahaya/20 text-bahaya'
                  }`}>
                    <span className="font-bold text-[10px] uppercase tracking-wider">Lihat Detail</span>
                    <span className="material-symbols-rounded text-base">chevron_right</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section "Transaksi Terbaru" ───────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-headline-sm text-text-primary">
            Transaksi terbaru
          </h2>
          {recentTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="text-body-sm font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer min-h-[44px] px-2 flex items-center"
            >
              Lihat semua
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <Card variant="flat" className="py-6 px-4 text-center flex flex-col items-center gap-3 bg-surface rounded-[24px] border border-border/50">
            <span className="text-2xl" role="img" aria-label="No transactions">📝</span>
            <div>
              <h3 className="font-display text-body-md font-bold text-text-primary">
                Belum ada transaksi.
              </h3>
              <p className="text-[11px] text-text-secondary mt-1 max-w-[200px] mx-auto">
                Transaksi terbaru kamu akan muncul di sini.
              </p>
            </div>
            <div className="w-full max-w-[160px]">
              <Button
                onClick={() => navigate('/transactions/add/expense', { state: { from: '/' } })}
                variant="secondary"
                size="sm"
                fullWidth
              >
                Catat transaksi
              </Button>
            </div>
          </Card>
        ) : (
          <Card variant="flat" className="bg-surface rounded-[24px] border border-border/50 p-4 flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,74,198,0.06)]">
            {recentTransactions.map((t) => {
              const pocket = t.pocketId ? getPocketById(t.pocketId) : undefined;
              const fromPocket = t.fromPocketId ? getPocketById(t.fromPocketId) : undefined;
              const toPocket = t.toPocketId ? getPocketById(t.toPocketId) : undefined;

              let rowTitle = '';
              let sub = '';
              let iconEmoji = '';
              let iconSymbol = '';
              let iconBg = '';
              let iconColor = '';
              let amountText = '';
              let amountColor = '';

              if (t.type === 'expense') {
                const category = t.categoryId ? getCategoryById(t.categoryId) : undefined;
                rowTitle = category ? category.name : 'Tanpa kategori';
                iconEmoji = category ? category.emoji : '💸';
                sub = pocket ? pocket.name : 'Pocket tidak tersedia';
                iconBg = 'bg-surface-container-low';
                amountText = `-${formatRupiah(t.amount)}`;
                amountColor = 'text-bahaya';
              } else if (t.type === 'income') {
                const sourceLabel = t.incomeSource ? (INCOME_SOURCE_LABELS[t.incomeSource] || 'Pemasukan') : 'Pemasukan';
                rowTitle = sourceLabel;
                iconEmoji = '💼';
                sub = pocket ? pocket.name : 'Pocket tidak tersedia';
                iconBg = 'bg-aman-soft/50';
                amountText = `+${formatRupiah(t.amount)}`;
                amountColor = 'text-aman';
              } else if (t.type === 'transfer') {
                const transferLabel = t.transferType ? (TRANSFER_TYPE_LABELS[t.transferType] || 'Transfer') : 'Transfer';
                rowTitle = transferLabel;
                iconSymbol = 'sync_alt';
                const fromName = fromPocket ? fromPocket.name : 'Pocket';
                const toName = toPocket ? toPocket.name : 'Pocket';
                sub = `${fromName} → ${toName}`;
                iconBg = 'bg-primary-soft/50';
                iconColor = 'text-primary';
                amountText = formatRupiah(t.amount);
                amountColor = 'text-primary';
              }

              const timeLabel = formatCompactTransactionDateTime(t.date, t.time);

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/transactions/${t.id}`, { state: { from: '/' } })}
                  className="w-full flex items-center justify-between gap-3 text-left py-1 hover:opacity-80 active:scale-[0.99] transition-all focus:outline-none cursor-pointer min-h-[44px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl ${iconBg}`}>
                      {iconEmoji ? (
                        <span>{iconEmoji}</span>
                      ) : (
                        <span className={`material-symbols-rounded ${iconColor} text-xl`}>
                          {iconSymbol}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-display text-body-md font-bold text-text-primary truncate">
                        {rowTitle}
                      </div>
                      <div className="text-[11px] text-text-secondary truncate">
                        {sub} · {timeLabel}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 whitespace-nowrap">
                    <span className={`font-display text-body-md font-bold ${amountColor}`}>
                      {displayRawString(amountText)}
                    </span>
                  </div>
                </button>
              );
            })}
          </Card>
        )}
      </section>

      {/* ── Empty State Notice if No Active Pockets ─────────────────────── */}
      {activePockets.length === 0 && (
        <Card variant="flat" className="py-8 px-6 text-center flex flex-col items-center gap-3 bg-surface rounded-[24px]">
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
