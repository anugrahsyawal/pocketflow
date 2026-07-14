import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { formatRupiah } from '@/lib/currency';
import { getPocketEffectiveBalance } from '@/lib/balanceCalculations';
import { PocketPickerField } from '@/features/transactions/components/PocketPickerField';
import type { Pocket } from '@/types/pocket';
import type { Category } from '@/types/category';

function getLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function AddExpensePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPocketId = searchParams.get('pocketId') || '';

  // Store access
  const pockets = usePocketStore((s) => s.pockets);
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const getCategoriesByPocketId = useCategoryStore((s) => s.getCategoriesByPocketId);

  // Derived pocket list
  const activePockets = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  // Form state
  const [amountStr, setAmountStr] = useState('');
  const [selectedPocketId, setSelectedPocketId] = useState(() => {
    const match = activePockets.find((p) => p.id === preselectedPocketId);
    return match ? match.id : '';
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [date, setDate] = useState(getLocalDate);
  const [time, setTime] = useState(getLocalTime);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Derived values
  const selectedPocket: Pocket | undefined = useMemo(() => {
    return activePockets.find((p) => p.id === selectedPocketId);
  }, [activePockets, selectedPocketId]);

  const pocketCategories: Category[] = useMemo(() => {
    if (!selectedPocketId) return [];
    return getCategoriesByPocketId(selectedPocketId);
  }, [selectedPocketId, getCategoriesByPocketId]);

  const effectiveBalance = useMemo(() => {
    if (!selectedPocket) return 0;
    return getPocketEffectiveBalance(selectedPocket, transactions);
  }, [selectedPocket, transactions]);

  const parsedAmount = useMemo(() => {
    const cleaned = amountStr.replace(/\D/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? 0 : val;
  }, [amountStr]);

  // Handle pocket change — clear category
  const handlePocketChange = useCallback((pocketId: string) => {
    setSelectedPocketId(pocketId);
    setSelectedCategoryId('');
    setErrors([]);
  }, []);

  // Handle amount input — digits only, formatted preview
  const handleAmountChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    setAmountStr(digits);
    setErrors([]);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (selectedPocketId) {
      navigate(`/pockets/${selectedPocketId}`);
    } else {
      navigate('/pockets');
    }
  }, [navigate, selectedPocketId]);

  // Submit
  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;

    const validationErrors: string[] = [];

    if (parsedAmount <= 0) {
      validationErrors.push('Jumlah transaksi harus lebih dari 0.');
    }
    if (!selectedPocketId) {
      validationErrors.push('Pilih pocket tujuan pengeluaran.');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      validationErrors.push('Tanggal transaksi tidak valid.');
    }
    if (selectedPocket && parsedAmount > effectiveBalance) {
      validationErrors.push('Saldo pocket tidak mencukupi untuk transaksi ini.');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    const result = addTransaction({
      type: 'expense',
      amount: parsedAmount,
      pocketId: selectedPocketId,
      categoryId: selectedCategoryId || undefined,
      date,
      time: time || getLocalTime(),
      note: note.trim(),
    });

    if (result.success) {
      navigate(`/pockets/${selectedPocketId}`);
    } else {
      setErrors(result.errors);
      setIsSubmitting(false);
    }
  }, [isSubmitting, parsedAmount, selectedPocketId, selectedCategoryId, date, time, note, effectiveBalance, selectedPocket, addTransaction, navigate]);

  // No active pockets state
  if (activePockets.length === 0) {
    return (
      <>
        <TopBar title="Tambah Pengeluaran" showBack onBack={() => navigate('/pockets')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="No pockets">👛</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Belum ada pocket aktif.
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Selesaikan setup terlebih dahulu untuk membuat pocket dan mulai mencatat pengeluaran.
          </p>
          <Button onClick={() => navigate('/setup')} variant="primary" size="md">
            Mulai Setup
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Tambah Pengeluaran" showBack onBack={handleBack} />

      <div className="flex flex-col gap-5 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)]">
        {/* Page subtitle */}
        <p className="text-body-sm text-text-secondary -mt-1">
          Catat uang yang keluar dari pocket.
        </p>

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

        {/* Amount Input Card */}
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
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="font-display text-amount-lg text-text-primary bg-transparent outline-none text-center w-full max-w-[240px] placeholder:text-text-disabled"
              autoFocus
            />
          </div>
          {parsedAmount > 0 && (
            <span className="text-xs text-text-muted mt-1">
              {formatRupiah(parsedAmount)}
            </span>
          )}
        </Card>

        {/* Pocket Selector */}
        <PocketPickerField
          label="Dari Pocket"
          title="Pilih Pocket Pengeluaran"
          placeholder="Pilih pocket pengeluaran"
          pockets={activePockets}
          transactions={transactions}
          selectedPocketId={selectedPocketId}
          onSelect={handlePocketChange}
        />

        {/* Category Selector */}
        {selectedPocketId && (
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
                  const isSelected = cat.id === selectedCategoryId;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(isSelected ? '' : cat.id)}
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
              onChange={(e) => { setDate(e.target.value); setErrors([]); }}
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
              onChange={(e) => setTime(e.target.value)}
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
            placeholder="Contoh: Makan siang bersama tim"
            rows={2}
            className="px-3 py-2.5 rounded-card border border-border/40 bg-surface-container text-text-primary text-body-sm font-body resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-text-disabled"
          />
        </div>

        {/* Balance preview before save */}
        {selectedPocket && parsedAmount > 0 && (
          <Card variant="flat" className="flex items-center justify-between text-xs p-3 border border-border/30">
            <span className="text-text-secondary">Saldo setelah transaksi:</span>
            <span className={`font-display font-bold ${
              effectiveBalance - parsedAmount < 0 ? 'text-bahaya' : 'text-aman'
            }`}>
              {formatRupiah(effectiveBalance - parsedAmount)}
            </span>
          </Card>
        )}

        {/* Submit Button */}
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
            Simpan Pengeluaran
          </Button>
        </div>
      </div>
    </>
  );
}
