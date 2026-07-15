import { useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { formatRupiah } from '@/lib/currency';
import { INCOME_SOURCE_LABELS, TRANSFER_TYPE_LABELS } from '@/data/constants';
import { formatDateGroup, sortTransactions } from '@/lib/transactionDisplay';
import type { Transaction } from '@/types/transaction';

type FilterType = 'all' | 'expense' | 'income' | 'transfer';
type StatusMode = 'active' | 'archived';

export function TransactionHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterType>('all');

  // Derive status mode from URL query parameter
  const statusMode: StatusMode = useMemo(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'archived') return 'archived';
    return 'active';
  }, [searchParams]);

  const setStatusMode = (mode: StatusMode) => {
    setFilter('all'); // Reset type filter on mode change
    if (mode === 'archived') {
      setSearchParams({ status: 'archived' });
    } else {
      setSearchParams({});
    }
  };

  // Store access
  const transactions = useTransactionStore((s) => s.transactions);
  const getPocketById = usePocketStore((s) => s.getPocketById);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  // Filter by status mode
  const modeTransactions = useMemo(() => {
    if (statusMode === 'archived') {
      return transactions.filter((t) => t.isArchived);
    }
    return transactions.filter((t) => !t.isArchived);
  }, [transactions, statusMode]);

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return sortTransactions(modeTransactions);
  }, [modeTransactions]);

  // Type-filtered transactions
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((t) => {
      if (filter === 'all') return true;
      return t.type === filter;
    });
  }, [sortedTransactions, filter]);

  // Grouped by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of filteredTransactions) {
      if (!groups[t.date]) {
        groups[t.date] = [];
      }
      groups[t.date]!.push(t);
    }
    return groups;
  }, [filteredTransactions]);

  // Distinct sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));
  }, [groupedTransactions]);

  // Totals for active mode
  const totals = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'expense') {
        totalExpense += t.amount;
      } else if (t.type === 'income') {
        totalIncome += t.amount;
      }
    }

    return { totalExpense, totalIncome };
  }, [filteredTransactions]);

  // Navigation handlers — pass full origin path with query
  const handleRowClick = (id: string) => {
    const originPath = `${location.pathname}${location.search}`;
    navigate(`/transactions/${id}`, { state: { from: originPath } });
  };

  // State checks
  const hasNoTransactionsInMode = modeTransactions.length === 0;
  const isFilterEmpty = filteredTransactions.length === 0;

  // Check if any archived transactions exist at all (for showing status toggle)
  const hasAnyArchived = useMemo(() => {
    return transactions.some((t) => t.isArchived);
  }, [transactions]);

  const hasAnyActive = useMemo(() => {
    return transactions.some((t) => !t.isArchived);
  }, [transactions]);

  // Active mode: no transactions at all
  if (statusMode === 'active' && hasNoTransactionsInMode && !hasAnyArchived) {
    return (
      <div className="flex flex-col gap-6 px-safe py-6 min-h-screen bg-background">
        <div>
          <h1 className="font-display text-headline-lg-mobile text-text-primary">
            Riwayat Transaksi
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Semua aktivitas keuanganmu dalam satu tempat.
          </p>
        </div>

        <Card variant="flat" className="py-12 px-6 text-center flex flex-col items-center gap-4">
          <span className="text-4xl" role="img" aria-label="No transactions">
            📝
          </span>
          <div>
            <h3 className="font-display text-headline-sm text-text-primary">
              Belum ada transaksi.
            </h3>
            <p className="text-body-sm text-text-secondary mt-2 max-w-[280px] mx-auto">
              Mulai catat pemasukan, pengeluaran, atau transfer pertamamu.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[200px] mt-2">
            <Button
              onClick={() => navigate('/transactions/add/expense')}
              variant="primary"
              size="md"
              icon={<span className="material-symbols-rounded text-xl">remove_circle</span>}
            >
              Catat Pengeluaran
            </Button>
            <Button
              onClick={() => navigate('/transactions/add/income')}
              variant="secondary"
              size="md"
              icon={<span className="material-symbols-rounded text-xl">add_circle</span>}
            >
              Tambah Pemasukan
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-safe py-6 min-h-screen bg-background pb-24">
      {/* Header */}
      <div>
        <h1 className="font-display text-headline-lg-mobile text-text-primary">
          Riwayat Transaksi
        </h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Semua aktivitas keuanganmu dalam satu tempat.
        </p>
      </div>

      {/* Status Mode Switch */}
      {(hasAnyArchived || statusMode === 'archived') && (
        <div className="flex gap-2">
          <button
            onClick={() => setStatusMode('active')}
            className={`flex-1 py-2.5 rounded-card text-body-sm font-semibold border transition-all ${
              statusMode === 'active'
                ? 'border-primary bg-primary-soft text-primary shadow-sm'
                : 'border-border/30 bg-surface text-text-secondary hover:border-primary/20'
            }`}
          >
            Aktif
            {hasAnyActive && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({transactions.filter((t) => !t.isArchived).length})
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusMode('archived')}
            className={`flex-1 py-2.5 rounded-card text-body-sm font-semibold border transition-all ${
              statusMode === 'archived'
                ? 'border-primary bg-primary-soft text-primary shadow-sm'
                : 'border-border/30 bg-surface text-text-secondary hover:border-primary/20'
            }`}
          >
            Diarsipkan
            {hasAnyArchived && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({transactions.filter((t) => t.isArchived).length})
              </span>
            )}
          </button>
        </div>
      )}

      {/* Active mode: Summary Cards */}
      {statusMode === 'active' && !hasNoTransactionsInMode && (
        <div className="grid grid-cols-2 gap-3">
          <Card variant="flat" className="bg-bahaya-soft/40 border border-bahaya-soft/30 p-4">
            <span className="text-[10px] font-bold text-bahaya tracking-wider uppercase block">
              Pengeluaran
            </span>
            <span className="font-display text-amount-md text-bahaya mt-1 block">
              -{formatRupiah(totals.totalExpense)}
            </span>
          </Card>

          <Card variant="flat" className="bg-aman-soft/40 border border-aman-soft/30 p-4">
            <span className="text-[10px] font-bold text-aman tracking-wider uppercase block">
              Pemasukan
            </span>
            <span className="font-display text-amount-md text-aman mt-1 block">
              +{formatRupiah(totals.totalIncome)}
            </span>
          </Card>
        </div>
      )}

      {/* Archived mode: Informational Card */}
      {statusMode === 'archived' && !hasNoTransactionsInMode && (
        <Card variant="flat" className="bg-surface-container border border-border/30 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-rounded text-2xl text-text-muted flex-shrink-0 mt-0.5">
              archive
            </span>
            <div>
              <h3 className="font-display text-body-md font-bold text-text-primary">
                Transaksi diarsipkan
              </h3>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Transaksi ini tidak memengaruhi saldo atau ringkasan aktif. Pulihkan transaksi untuk menerapkan kembali dampaknya.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Type Filters */}
      <div className="flex gap-1.5 overflow-x-auto -mx-safe px-safe pb-1 scrollbar-hide">
        {(
          [
            { id: 'all', label: 'Semua' },
            { id: 'expense', label: 'Pengeluaran' },
            { id: 'income', label: 'Pemasukan' },
            { id: 'transfer', label: 'Transfer' },
          ] as const
        ).map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 h-9 rounded-pill text-body-sm font-semibold transition-all whitespace-nowrap border flex-shrink-0 ${
                isActive
                  ? 'border-primary bg-primary-soft text-primary shadow-sm'
                  : 'border-border/30 bg-surface text-text-secondary hover:border-primary/20'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Empty states */}
      {hasNoTransactionsInMode && statusMode === 'archived' && (
        <Card variant="flat" className="py-12 px-6 text-center flex flex-col items-center gap-4">
          <span className="text-4xl" role="img" aria-label="No archived">
            📦
          </span>
          <div>
            <h3 className="font-display text-headline-sm text-text-primary">
              Belum ada transaksi diarsipkan.
            </h3>
            <p className="text-body-sm text-text-secondary mt-2 max-w-[280px] mx-auto">
              Transaksi yang kamu arsipkan akan muncul di sini.
            </p>
          </div>
          <Button onClick={() => setStatusMode('active')} variant="secondary" size="md">
            Kembali ke Transaksi Aktif
          </Button>
        </Card>
      )}

      {hasNoTransactionsInMode && statusMode === 'active' && (
        <Card variant="flat" className="py-12 px-6 text-center flex flex-col items-center gap-4">
          <span className="text-4xl" role="img" aria-label="No active transactions">
            📝
          </span>
          <div>
            <h3 className="font-display text-headline-sm text-text-primary">
              Tidak ada transaksi aktif.
            </h3>
            <p className="text-body-sm text-text-secondary mt-2 max-w-[280px] mx-auto">
              Semua transaksi telah diarsipkan. Buat transaksi baru atau pulihkan yang telah diarsipkan.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[200px] mt-2">
            <Button
              onClick={() => navigate('/transactions/add/expense')}
              variant="primary"
              size="md"
            >
              Catat Pengeluaran
            </Button>
            {hasAnyArchived && (
              <Button onClick={() => setStatusMode('archived')} variant="secondary" size="md">
                Lihat Arsip
              </Button>
            )}
          </div>
        </Card>
      )}

      {isFilterEmpty && !hasNoTransactionsInMode && (
        <Card variant="flat" className="py-12 px-6 text-center flex flex-col items-center gap-4">
          <span className="text-4xl" role="img" aria-label="No results">
            🔎
          </span>
          <div>
            <h3 className="font-display text-headline-sm text-text-primary">
              Tidak ada transaksi pada filter ini.
            </h3>
            <p className="text-body-sm text-text-secondary mt-2 max-w-[280px] mx-auto">
              Cobalah untuk mengubah filter atau reset pencarian kembali ke Semua.
            </p>
          </div>
          <Button onClick={() => setFilter('all')} variant="secondary" size="md">
            Kembali ke Semua
          </Button>
        </Card>
      )}

      {/* Grouped Transaction Lists */}
      {!isFilterEmpty && !hasNoTransactionsInMode && (
        <div className="flex flex-col gap-6">
          {sortedDates.map((dateStr) => {
            const txns = groupedTransactions[dateStr] || [];
            return (
              <div key={dateStr} className="flex flex-col gap-2.5">
                {/* Date Header Label */}
                <h3 className="text-label-caps text-text-secondary tracking-wider font-bold uppercase px-1">
                  {formatDateGroup(dateStr)}
                </h3>

                {/* Rows List */}
                <div className="flex flex-col gap-2.5">
                  {txns.map((t) => {
                    // Resolve Pocket Names
                    const pocket = t.pocketId ? getPocketById(t.pocketId) : undefined;
                    const fromPocket = t.fromPocketId ? getPocketById(t.fromPocketId) : undefined;
                    const toPocket = t.toPocketId ? getPocketById(t.toPocketId) : undefined;

                    // Resolve Category/Source Text Details
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

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleRowClick(t.id)}
                        className="w-full text-left cursor-pointer active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-card"
                      >
                        <Card
                          variant="flat"
                          className="flex items-center justify-between gap-3 border border-border/40 hover:border-primary/20 hover:shadow-card transition-all p-3"
                        >
                          {/* Left contents */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circular Icon */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${iconBg}`}>
                              <span className={`material-symbols-rounded ${iconColor} text-xl`}>
                                {iconName}
                              </span>
                            </div>

                            {/* Detail Labels */}
                            <div className="min-w-0">
                              <div className="font-display text-body-md font-bold text-text-primary truncate flex items-center gap-1.5">
                                {rowTitle}
                                {statusMode === 'archived' && (
                                  <Badge variant="neutral" className="text-[9px] px-1.5 py-0">
                                    Diarsipkan
                                  </Badge>
                                )}
                              </div>
                              {t.note && (
                                <div className="text-[11px] text-text-muted italic truncate max-w-[200px] mb-0.5">
                                  "{t.note}"
                                </div>
                              )}
                              <div className="text-[10px] text-text-secondary font-medium">
                                {sub}
                              </div>
                            </div>
                          </div>

                          {/* Right contents */}
                          <div className="text-right flex-shrink-0">
                            <span className={`font-display text-body-md font-bold ${amountColor} block`}>
                              {amountText}
                            </span>
                            <span className="text-[10px] text-text-muted font-body">
                              {t.time}
                            </span>
                          </div>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
