import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { formatRupiah } from '@/lib/currency';
import { getPocketEffectiveBalance } from '@/lib/balanceCalculations';
import { PocketPickerField } from '@/features/transactions/components/PocketPickerField';
import { INCOME_SOURCE_LABELS, TRANSFER_TYPE_LABELS } from '@/data/constants';
import type { IncomeSource, TransferType } from '@/types/transaction';

const INCOME_SOURCES = Object.keys(INCOME_SOURCE_LABELS) as IncomeSource[];
const TRANSFER_TYPES = Object.keys(TRANSFER_TYPE_LABELS) as TransferType[];

export function TransactionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Stores
  const pockets = usePocketStore((s) => s.pockets);
  const transactions = useTransactionStore((s) => s.transactions);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const getTransactionById = useTransactionStore((s) => s.getTransactionById);
  const getCategoriesByPocketId = useCategoryStore((s) => s.getCategoriesByPocketId);

  // Load transaction safely
  const transaction = useMemo(() => {
    return id ? getTransactionById(id) : undefined;
  }, [id, getTransactionById]);

  // Derived arrays
  const activePockets = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  const transactionsExcludingCurrent = useMemo(() => {
    if (!transaction) return transactions;
    return transactions.filter((t) => t.id !== transaction.id);
  }, [transactions, transaction]);

  // Form states
  const [amountStr, setAmountStr] = useState(() => transaction?.amount.toString() || '');
  const [pocketId, setPocketId] = useState(() => transaction?.pocketId || '');
  const [categoryId, setCategoryId] = useState(() => transaction?.categoryId || '');
  const [incomeSource, setIncomeSource] = useState<IncomeSource>(() => transaction?.incomeSource || 'other');
  
  const [fromPocketId, setFromPocketId] = useState(() => transaction?.fromPocketId || '');
  const [toPocketId, setToPocketId] = useState(() => transaction?.toPocketId || '');
  const [transferType, setTransferType] = useState<TransferType>(() => transaction?.transferType || 'normal');

  const [date, setDate] = useState(() => transaction?.date || '');
  const [time, setTime] = useState(() => transaction?.time || '');
  const [note, setNote] = useState(() => transaction?.note || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Computed values
  const parsedAmount = useMemo(() => {
    const cleaned = amountStr.replace(/\D/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? 0 : val;
  }, [amountStr]);

  // Exclude logic balance calculations
  const selectedPocket = useMemo(() => {
    return activePockets.find((p) => p.id === pocketId);
  }, [activePockets, pocketId]);

  const pocketBalanceExcludingCurrent = useMemo(() => {
    if (!selectedPocket) return 0;
    return getPocketEffectiveBalance(selectedPocket, transactionsExcludingCurrent);
  }, [selectedPocket, transactionsExcludingCurrent]);

  const fromPocket = useMemo(() => {
    return activePockets.find((p) => p.id === fromPocketId);
  }, [activePockets, fromPocketId]);

  const fromPocketBalanceExcludingCurrent = useMemo(() => {
    if (!fromPocket) return 0;
    return getPocketEffectiveBalance(fromPocket, transactionsExcludingCurrent);
  }, [fromPocket, transactionsExcludingCurrent]);

  const toPocket = useMemo(() => {
    return activePockets.find((p) => p.id === toPocketId);
  }, [activePockets, toPocketId]);

  const toPocketBalanceExcludingCurrent = useMemo(() => {
    if (!toPocket) return 0;
    return getPocketEffectiveBalance(toPocket, transactionsExcludingCurrent);
  }, [toPocket, transactionsExcludingCurrent]);

  // Pocket categories filter
  const pocketCategories = useMemo(() => {
    if (!pocketId) return [];
    return getCategoriesByPocketId(pocketId);
  }, [pocketId, getCategoriesByPocketId]);

  // Pocket changes category reset handler
  const handlePocketChange = useCallback((newPocketId: string) => {
    setPocketId(newPocketId);
    setErrors([]);
    // Clear category if it does not belong to the new pocket
    const categoriesForNewPocket = getCategoriesByPocketId(newPocketId);
    if (!categoriesForNewPocket.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [categoryId, getCategoriesByPocketId]);

  const handleFromPocketChange = useCallback((newPocketId: string) => {
    setFromPocketId(newPocketId);
    setErrors([]);
    if (toPocketId === newPocketId) {
      setToPocketId('');
    }
  }, [toPocketId]);

  // Back navigation handler
  const handleBack = () => {
    if (!transaction) {
      navigate('/transactions');
      return;
    }

    const editLocationState = location.state as { from?: string; returnTo?: string } | null;
    const detailPath = `/transactions/${transaction.id}`;
    
    // Safe edit Back destination: only accept editLocationState.from when it exactly equals detailPath, otherwise use detailPath
    const safeBackPath = editLocationState?.from === detailPath ? editLocationState.from : detailPath;

    // Safe post-save return destination: accept exactly /, /transactions, or paths starting with /pockets/
    const safeReturnTo =
      editLocationState?.returnTo === '/' ||
      editLocationState?.returnTo === '/transactions' ||
      editLocationState?.returnTo?.startsWith('/pockets/')
        ? editLocationState.returnTo
        : '/transactions';

    navigate(safeBackPath, {
      replace: true,
      state: {
        from: safeReturnTo,
      },
    });
  };

  // Submit edits
  const handleSubmit = () => {
    if (isSubmitting || !transaction) return;

    const validationErrors: string[] = [];

    if (parsedAmount <= 0) {
      validationErrors.push('Jumlah transaksi harus lebih dari 0.');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      validationErrors.push('Tanggal transaksi tidak valid.');
    }
    if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      validationErrors.push('Waktu transaksi tidak valid.');
    }

    if (transaction.type === 'expense') {
      if (!pocketId) {
        validationErrors.push('Pilih pocket tujuan pengeluaran.');
      }
      if (selectedPocket && parsedAmount > pocketBalanceExcludingCurrent) {
        validationErrors.push('Saldo pocket tidak mencukupi untuk transaksi ini.');
      }
    } else if (transaction.type === 'income') {
      if (!pocketId) {
        validationErrors.push('Pilih pocket tujuan pemasukan.');
      }
      if (!INCOME_SOURCES.includes(incomeSource)) {
        validationErrors.push('Sumber pemasukan tidak valid.');
      }
    } else if (transaction.type === 'transfer') {
      if (!fromPocketId) {
        validationErrors.push('Pilih pocket sumber.');
      }
      if (!toPocketId) {
        validationErrors.push('Pilih pocket tujuan.');
      }
      if (fromPocketId && toPocketId && fromPocketId === toPocketId) {
        validationErrors.push('Pocket sumber dan tujuan tidak boleh sama.');
      }
      if (fromPocket && parsedAmount > fromPocketBalanceExcludingCurrent) {
        validationErrors.push('Saldo pocket sumber tidak mencukupi.');
      }
      if (!TRANSFER_TYPES.includes(transferType)) {
        validationErrors.push('Jenis transfer tidak valid.');
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    let updates: any = {};

    if (transaction.type === 'expense') {
      updates = {
        amount: parsedAmount,
        pocketId,
        categoryId: categoryId || undefined,
        date,
        time,
        note: note.trim(),
        fromPocketId: undefined,
        toPocketId: undefined,
        transferType: undefined,
        incomeSource: undefined,
      };
    } else if (transaction.type === 'income') {
      updates = {
        amount: parsedAmount,
        pocketId,
        incomeSource,
        date,
        time,
        note: note.trim(),
        categoryId: undefined,
        fromPocketId: undefined,
        toPocketId: undefined,
        transferType: undefined,
      };
    } else if (transaction.type === 'transfer') {
      updates = {
        amount: parsedAmount,
        fromPocketId,
        toPocketId,
        transferType,
        date,
        time,
        note: note.trim(),
        pocketId: undefined,
        categoryId: undefined,
        incomeSource: undefined,
      };
    }

    updateTransaction(transaction.id, updates);

    const editLocationState = location.state as { from?: string; returnTo?: string } | null;
    const detailPath = `/transactions/${transaction.id}`;
    
    const safeReturnTo =
      editLocationState?.returnTo === '/' ||
      editLocationState?.returnTo === '/transactions' ||
      editLocationState?.returnTo?.startsWith('/pockets/')
        ? editLocationState.returnTo
        : '/transactions';

    navigate(detailPath, {
      replace: true,
      state: {
        from: safeReturnTo,
      },
    });
  };

  // Transaction not found view
  if (!transaction) {
    return (
      <>
        <TopBar title="Transaksi tidak ditemukan" showBack onBack={() => navigate('/transactions')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="Not found">🔎</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Transaksi tidak ditemukan.
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Transaksi mungkin telah dihapus atau alamat yang dibuka tidak valid.
          </p>
          <Button onClick={() => navigate('/transactions')} variant="primary" size="md">
            Kembali ke Riwayat
          </Button>
        </div>
      </>
    );
  }

  // Archived transaction read-only block
  if (transaction.isArchived) {
    return (
      <>
        <TopBar title="Transaksi telah diarsipkan" showBack onBack={handleBack} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="Archived">📦</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Transaksi telah diarsipkan.
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Transaksi yang diarsipkan tidak dapat diedit.
          </p>
          <Button onClick={handleBack} variant="primary" size="md">
            Kembali ke Detail
          </Button>
        </div>
      </>
    );
  }

  const title =
    transaction.type === 'expense'
      ? 'Edit Pengeluaran'
      : transaction.type === 'income'
      ? 'Edit Pemasukan'
      : 'Edit Transfer';

  const amountColor =
    transaction.type === 'expense'
      ? 'text-bahaya'
      : transaction.type === 'income'
      ? 'text-aman'
      : 'text-text-primary';

  return (
    <>
      <TopBar title={title} showBack onBack={handleBack} />

      <div className="flex flex-col gap-5 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)] pb-12">
        {/* Error messages */}
        {errors.length > 0 && (
          <Card variant="flat" className="bg-bahaya-soft/40 border border-bahaya/20 p-3">
            <div className="flex flex-col gap-1">
              {errors.map((err, i) => (
                <p key={i} className="text-body-sm text-bahaya font-semibold flex items-start gap-2">
                  <span className="material-symbols-rounded text-base leading-5 flex-shrink-0">error</span>
                  {err}
                </p>
              ))}
            </div>
          </Card>
        )}

        {/* Amount Card */}
        <Card variant="flat" className="flex flex-col items-center py-6 gap-2">
          <label className="text-label-caps text-text-secondary font-bold tracking-wider">
            Nominal
          </label>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-headline-md text-text-muted">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value.replace(/\D/g, ''));
                setErrors([]);
              }}
              placeholder="0"
              className={`font-display text-amount-lg bg-transparent outline-none text-center w-full max-w-[240px] placeholder:text-text-disabled ${amountColor}`}
              autoFocus
            />
          </div>
          {parsedAmount > 0 && (
            <span className="text-xs text-text-muted mt-1">
              {formatRupiah(parsedAmount)}
            </span>
          )}
        </Card>

        {/* Expense form fields */}
        {transaction.type === 'expense' && (
          <>
            <PocketPickerField
              label="Dari Pocket"
              title="Pilih Pocket Pengeluaran"
              placeholder="Pilih pocket pengeluaran"
              pockets={activePockets}
              transactions={transactionsExcludingCurrent}
              selectedPocketId={pocketId}
              onSelect={handlePocketChange}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <label className="text-label-caps text-text-secondary font-bold tracking-wider">
                  Kategori
                </label>
                <span className="text-[10px] text-text-muted italic">Opsional</span>
              </div>
              {pocketCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pocketCategories.map((cat) => {
                    const isSelected = cat.id === categoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(isSelected ? '' : cat.id);
                          setErrors([]);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-pill text-sm font-semibold border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-soft/40 text-primary'
                            : 'border-border/40 bg-surface-container text-text-secondary hover:border-primary/30'
                        }`}
                      >
                        <span className="text-base">{cat.emoji}</span>
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Card variant="flat" className="py-4 text-center text-text-muted text-body-sm">
                  Pocket ini belum memiliki kategori.
                </Card>
              )}
            </div>

            {selectedPocket && parsedAmount > 0 && (
              <Card variant="flat" className="flex flex-col gap-2 p-3 border border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Saldo Pocket (sebelum transaksi ini):</span>
                  <span className="font-display font-bold text-text-primary">
                    {formatRupiah(pocketBalanceExcludingCurrent)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2">
                  <span className="text-text-secondary">Saldo Setelah Perubahan:</span>
                  <span className={`font-display font-bold ${
                    pocketBalanceExcludingCurrent - parsedAmount < 0 ? 'text-bahaya' : 'text-aman'
                  }`}>
                    {formatRupiah(pocketBalanceExcludingCurrent - parsedAmount)}
                  </span>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Income form fields */}
        {transaction.type === 'income' && (
          <>
            <PocketPickerField
              label="Masuk ke Pocket"
              title="Pilih Pocket Pemasukan"
              placeholder="Pilih pocket tujuan pemasukan"
              pockets={activePockets}
              transactions={transactionsExcludingCurrent}
              selectedPocketId={pocketId}
              onSelect={(p) => {
                setPocketId(p);
                setErrors([]);
              }}
            />

            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
                Sumber Pemasukan
              </label>
              <div className="flex flex-wrap gap-2">
                {INCOME_SOURCES.map((src) => {
                  const isSelected = src === incomeSource;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setIncomeSource(src);
                        setErrors([]);
                      }}
                      className={`px-4 py-2 rounded-pill text-sm font-semibold border transition-all ${
                        isSelected
                          ? 'border-aman bg-aman-soft/40 text-aman'
                          : 'border-border/40 bg-surface-container text-text-secondary hover:border-aman/30'
                      }`}
                    >
                      {INCOME_SOURCE_LABELS[src]}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPocket && parsedAmount > 0 && (
              <Card variant="flat" className="flex flex-col gap-2 p-3 border border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Saldo Pocket (sebelum transaksi ini):</span>
                  <span className="font-display font-bold text-text-primary">
                    {formatRupiah(pocketBalanceExcludingCurrent)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2">
                  <span className="text-text-secondary">Saldo Setelah Perubahan:</span>
                  <span className="font-display font-bold text-aman">
                    {formatRupiah(pocketBalanceExcludingCurrent + parsedAmount)}
                  </span>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Transfer form fields */}
        {transaction.type === 'transfer' && (
          <>
            <PocketPickerField
              label="Dari Pocket"
              title="Pilih Pocket Sumber"
              placeholder="Pilih pocket sumber"
              pockets={activePockets}
              transactions={transactionsExcludingCurrent}
              selectedPocketId={fromPocketId}
              onSelect={handleFromPocketChange}
            />

            <div className="flex justify-center items-center py-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high border border-border/40 shadow-sm text-text-secondary">
                <span className="material-symbols-rounded text-lg">arrow_downward</span>
              </div>
            </div>

            <PocketPickerField
              label="Ke Pocket"
              title="Pilih Pocket Tujuan"
              placeholder="Pilih pocket tujuan"
              pockets={activePockets}
              transactions={transactionsExcludingCurrent}
              selectedPocketId={toPocketId}
              onSelect={(p) => {
                setToPocketId(p);
                setErrors([]);
              }}
              excludedPocketIds={fromPocketId ? [fromPocketId] : []}
            />

            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
                Jenis Transfer
              </label>
              <div className="flex flex-wrap gap-2">
                {TRANSFER_TYPES.map((type) => {
                  const isSelected = type === transferType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTransferType(type);
                        setErrors([]);
                      }}
                      className={`px-4 py-2 rounded-pill text-sm font-semibold border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-soft/40 text-primary'
                          : 'border-border/40 bg-surface-container text-text-secondary hover:border-primary/30'
                      }`}
                    >
                      {TRANSFER_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {fromPocket && toPocket && parsedAmount > 0 && (
              <Card variant="flat" className="flex flex-col gap-3 p-3 border border-border/30">
                <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block">
                  Proyeksi Perubahan Saldo
                </span>

                {/* Source projected */}
                <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                  <span className="text-[11px] font-semibold text-text-secondary block">
                    {fromPocket.emoji} {fromPocket.name} (Sumber)
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Sebelum Transfer:</span>
                    <span className="font-body font-semibold text-text-primary">
                      {formatRupiah(fromPocketBalanceExcludingCurrent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Setelah Transfer:</span>
                    <span className={`font-display font-bold ${
                      fromPocketBalanceExcludingCurrent - parsedAmount < 0 ? 'text-bahaya' : 'text-text-primary'
                    }`}>
                      {formatRupiah(fromPocketBalanceExcludingCurrent - parsedAmount)}
                    </span>
                  </div>
                </div>

                {/* Destination projected */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[11px] font-semibold text-text-secondary block">
                    {toPocket.emoji} {toPocket.name} (Tujuan)
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Sebelum Transfer:</span>
                    <span className="font-body font-semibold text-text-primary">
                      {formatRupiah(toPocketBalanceExcludingCurrent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Setelah Transfer:</span>
                    <span className="font-display font-bold text-aman">
                      {formatRupiah(toPocketBalanceExcludingCurrent + parsedAmount)}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors([]);
              }}
              className="h-11 px-3 rounded-card border border-border/40 bg-surface-container text-text-primary text-body-sm font-body focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
              Waktu
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setErrors([]);
              }}
              className="h-11 px-3 rounded-card border border-border/40 bg-surface-container text-text-primary text-body-sm font-body focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-1.5">
          <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
            Catatan
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={transaction.type === 'transfer' ? 'Contoh: Top up kartu MRT' : 'Contoh: Makan siang bersama tim'}
            rows={2}
            className="px-3 py-2.5 rounded-card border border-border/40 bg-surface-container text-text-primary text-body-sm font-body resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-text-disabled"
          />
        </div>

        {/* Save button */}
        <div className="pt-2 pb-6">
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
            icon={<span className="material-symbols-rounded text-xl">save</span>}
          >
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </>
  );
}
