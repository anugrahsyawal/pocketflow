import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { formatRupiah } from '@/lib/currency';
import { getPocketEffectiveBalance } from '@/lib/balanceCalculations';
import { TRANSFER_TYPE_LABELS } from '@/data/constants';
import type { TransferType } from '@/types/transaction';

const TRANSFER_TYPES = Object.keys(TRANSFER_TYPE_LABELS) as TransferType[];

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

export function AddTransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const queryFromPocketId = searchParams.get('fromPocketId') || '';
  const queryToPocketId = searchParams.get('toPocketId') || '';

  // Store access
  const pockets = usePocketStore((s) => s.pockets);
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransaction = useTransactionStore((s) => s.addTransaction);

  // Derived pocket list
  const activePockets = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  // Form state
  const [amountStr, setAmountStr] = useState('');
  
  const [fromPocketId, setFromPocketId] = useState(() => {
    const match = activePockets.find((p) => p.id === queryFromPocketId);
    return match ? match.id : '';
  });

  const [toPocketId, setToPocketId] = useState(() => {
    // Cannot be the same as fromPocketId
    const resolvedFrom = activePockets.find((p) => p.id === queryFromPocketId)?.id || '';
    const match = activePockets.find((p) => p.id === queryToPocketId);
    if (match && match.id !== resolvedFrom) {
      return match.id;
    }
    return '';
  });

  const [transferType, setTransferType] = useState<TransferType>('normal');
  const [date, setDate] = useState(getLocalDate);
  const [time, setTime] = useState(getLocalTime);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Derived pocket objects
  const fromPocket = useMemo(() => {
    return activePockets.find((p) => p.id === fromPocketId);
  }, [activePockets, fromPocketId]);

  const toPocket = useMemo(() => {
    return activePockets.find((p) => p.id === toPocketId);
  }, [activePockets, toPocketId]);

  // Effective Balances
  const fromPocketBalance = useMemo(() => {
    if (!fromPocket) return 0;
    return getPocketEffectiveBalance(fromPocket, transactions);
  }, [fromPocket, transactions]);

  const toPocketBalance = useMemo(() => {
    if (!toPocket) return 0;
    return getPocketEffectiveBalance(toPocket, transactions);
  }, [toPocket, transactions]);

  const parsedAmount = useMemo(() => {
    const cleaned = amountStr.replace(/\D/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? 0 : val;
  }, [amountStr]);

  // Handlers
  const handleFromPocketChange = useCallback((pocketId: string) => {
    setFromPocketId(pocketId);
    setErrors([]);
    // If destination is now the same as source, clear destination
    if (toPocketId === pocketId) {
      setToPocketId('');
    }
  }, [toPocketId]);

  const handleToPocketChange = useCallback((pocketId: string) => {
    setToPocketId(pocketId);
    setErrors([]);
  }, []);

  const handleAmountChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    setAmountStr(digits);
    setErrors([]);
  }, []);

  const handleBack = useCallback(() => {
    if (fromPocketId) {
      navigate(`/pockets/${fromPocketId}`);
    } else {
      navigate('/pockets');
    }
  }, [navigate, fromPocketId]);

  // Submit
  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;

    const validationErrors: string[] = [];

    if (parsedAmount <= 0) {
      validationErrors.push('Jumlah transaksi harus lebih dari 0.');
    }
    if (!fromPocketId) {
      validationErrors.push('Pilih pocket sumber.');
    }
    if (!toPocketId) {
      validationErrors.push('Pilih pocket tujuan.');
    }
    if (fromPocketId && toPocketId && fromPocketId === toPocketId) {
      validationErrors.push('Pocket sumber dan tujuan tidak boleh sama.');
    }
    if (fromPocket && parsedAmount > fromPocketBalance) {
      validationErrors.push('Saldo pocket sumber tidak mencukupi.');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      validationErrors.push('Tanggal transaksi tidak valid.');
    }
    if (!TRANSFER_TYPES.includes(transferType)) {
      validationErrors.push('Jenis transfer tidak valid.');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    const result = addTransaction({
      type: 'transfer',
      amount: parsedAmount,
      fromPocketId,
      toPocketId,
      transferType,
      date,
      time: time || getLocalTime(),
      note: note.trim(),
    });

    if (result.success) {
      navigate(`/pockets/${fromPocketId}`);
    } else {
      setErrors(result.errors);
      setIsSubmitting(false);
    }
  }, [isSubmitting, parsedAmount, fromPocketId, toPocketId, fromPocket, fromPocketBalance, date, time, transferType, note, addTransaction, navigate]);

  // Empty state check: needs at least 2 active pockets
  if (activePockets.length < 2) {
    return (
      <>
        <TopBar title="Transfer Antar Pocket" showBack onBack={() => navigate('/pockets')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="Warning">⚠️</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Transfer membutuhkan minimal dua pocket aktif.
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Aktifkan minimal satu pocket tambahan melalui menu setup agar dapat melakukan transfer antar pocket.
          </p>
          <Button onClick={() => navigate('/pockets')} variant="primary" size="md">
            Ke Pocket Saya
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Transfer Antar Pocket" showBack onBack={handleBack} />

      <div className="flex flex-col gap-5 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)]">
        {/* Page subtitle */}
        <p className="text-body-sm text-text-secondary -mt-1">
          Pindahkan saldo dari satu pocket ke pocket lain.
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

        {/* Source Pocket Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
            Dari Pocket
          </label>
          <div className="flex flex-col gap-2">
            {activePockets.map((p) => {
              const isSelected = p.id === fromPocketId;
              const pocketBal = getPocketEffectiveBalance(p, transactions);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleFromPocketChange(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-card border transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary-soft/30 shadow-card'
                      : 'border-border/40 bg-surface-container hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-pocket bg-surface-container-high text-xl">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-body-lg font-bold text-text-primary truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Saldo: {formatRupiah(pocketBal)}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-rounded text-primary text-xl flex-shrink-0">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Swap Directional Indicator */}
        <div className="flex justify-center items-center py-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high border border-border/40 shadow-sm text-text-secondary">
            <span className="material-symbols-rounded text-lg">arrow_downward</span>
          </div>
        </div>

        {/* Destination Pocket Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-text-secondary font-bold px-1 tracking-wider">
            Ke Pocket
          </label>
          <div className="flex flex-col gap-2">
            {activePockets.map((p) => {
              const isSelected = p.id === toPocketId;
              const isSource = p.id === fromPocketId;
              const pocketBal = getPocketEffectiveBalance(p, transactions);

              // Disable selection of the selected source pocket
              if (isSource) return null;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleToPocketChange(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-card border transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary-soft/30 shadow-card'
                      : 'border-border/40 bg-surface-container hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-pocket bg-surface-container-high text-xl">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-body-lg font-bold text-text-primary truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Saldo: {formatRupiah(pocketBal)}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-rounded text-primary text-xl flex-shrink-0">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transfer Type Chips */}
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
                  onClick={() => { setTransferType(type); setErrors([]); }}
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

        {/* Balance Preview Card */}
        {fromPocket && toPocket && parsedAmount > 0 && (
          <Card variant="flat" className="flex flex-col gap-3 p-3 border border-border/30">
            <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block">
              Proyeksi Perubahan Saldo
            </span>

            {/* Source preview */}
            <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
              <span className="text-[11px] font-semibold text-text-secondary block">
                {fromPocket.emoji} {fromPocket.name} (Sumber)
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Saldo Saat Ini:</span>
                <span className="font-body font-semibold text-text-primary">{formatRupiah(fromPocketBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Saldo Setelah Transfer:</span>
                <span className={`font-display font-bold ${fromPocketBalance - parsedAmount < 0 ? 'text-bahaya' : 'text-text-primary'}`}>
                  {formatRupiah(fromPocketBalance - parsedAmount)}
                </span>
              </div>
            </div>

            {/* Destination preview */}
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-[11px] font-semibold text-text-secondary block">
                {toPocket.emoji} {toPocket.name} (Tujuan)
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Saldo Saat Ini:</span>
                <span className="font-body font-semibold text-text-primary">{formatRupiah(toPocketBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Saldo Setelah Transfer:</span>
                <span className="font-display font-bold text-aman">{formatRupiah(toPocketBalance + parsedAmount)}</span>
              </div>
            </div>
          </Card>
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
            placeholder="Contoh: Top up kartu MRT"
            rows={2}
            className="px-3 py-2.5 rounded-card border border-border/40 bg-surface-container text-text-primary text-body-sm font-body resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-text-disabled"
          />
        </div>

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
            Simpan Transfer
          </Button>
        </div>
      </div>
    </>
  );
}
