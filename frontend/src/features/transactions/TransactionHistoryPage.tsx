import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { formatRupiah } from '@/lib/currency';
import { INCOME_SOURCE_LABELS, TRANSFER_TYPE_LABELS } from '@/data/constants';
import { formatDateGroup, sortTransactions } from '@/lib/transactionDisplay';
import type { Transaction } from '@/types/transaction';

type FilterType = 'all' | 'expense' | 'income' | 'transfer';

export function TransactionHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');

  // Store access
  const transactions = useTransactionStore((s) => s.transactions);
  const getPocketById = usePocketStore((s) => s.getPocketById);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  // Active, non-archived transactions
  const activeTransactions = useMemo(() => {
    return transactions.filter((t) => !t.isArchived);
  }, [transactions]);

  // Sorted active transactions
  const sortedTransactions = useMemo(() => {
    return sortTransactions(activeTransactions);
  }, [activeTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((t) => {
      if (filter === 'all') return true;
      return t.type === filter;
    });
  }, [sortedTransactions, filter]);

  // Grouped by date: Map<dateStr, Transaction[]>
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

  // Distinct sorted dates list
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));
  }, [groupedTransactions]);

  // Totals for current filter (excluding transfers)
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

  // Navigation handlers
  const handleRowClick = (id: string) => {
    navigate(`/transactions/${id}`, { state: { from: location.pathname } });
  };

  // State checks
  const hasNoTransactionsAtAll = activeTransactions.length === 0;
  const isFilterEmpty = filteredTransactions.length === 0;

  if (hasNoTransactionsAtAll) {
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

      {/* Summary Cards */}
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

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto -mx-safe px-safe pb-1 scrollbar-none">
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

      {/* Grouped Lists */}
      {isFilterEmpty ? (
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
      ) : (
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
                    let title = '';
                    let sub = '';
                    let iconName = '';
                    let iconBg = '';
                    let iconColor = '';
                    let amountText = '';
                    let amountColor = '';

                    if (t.type === 'expense') {
                      const category = t.categoryId ? getCategoryById(t.categoryId) : undefined;
                      title = category ? `${category.emoji} ${category.name}` : 'Tanpa kategori';
                      sub = pocket ? pocket.name : 'Pocket tidak tersedia';
                      iconName = 'remove_circle';
                      iconBg = 'bg-bahaya-soft';
                      iconColor = 'text-bahaya';
                      amountText = `-${formatRupiah(t.amount)}`;
                      amountColor = 'text-bahaya';
                    } else if (t.type === 'income') {
                      const sourceLabel = t.incomeSource ? (INCOME_SOURCE_LABELS[t.incomeSource] || 'Pemasukan') : 'Pemasukan';
                      title = sourceLabel;
                      sub = pocket ? pocket.name : 'Pocket tidak tersedia';
                      iconName = 'add_circle';
                      iconBg = 'bg-aman-soft';
                      iconColor = 'text-aman';
                      amountText = `+${formatRupiah(t.amount)}`;
                      amountColor = 'text-aman';
                    } else if (t.type === 'transfer') {
                      const transferLabel = t.transferType ? (TRANSFER_TYPE_LABELS[t.transferType] || 'Transfer') : 'Transfer';
                      title = transferLabel;
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
                      <div
                        key={t.id}
                        onClick={() => handleRowClick(t.id)}
                        className="cursor-pointer active:scale-[0.99] transition-transform"
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
                              <div className="font-display text-body-md font-bold text-text-primary truncate">
                                {title}
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
                      </div>
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
