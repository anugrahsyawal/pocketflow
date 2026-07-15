import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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

interface ExpenseDraft {
  draftId: string;
  amountStr: string;
  pocketId: string;
  categoryId: string;
  date: string;
  time: string;
  note: string;
}

interface AddTransactionLocationState {
  from?: string;
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/\D/g, '');
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? 0 : val;
}

function formatNumberWithDots(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function AddExpensePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedPocketId = searchParams.get('pocketId') || '';

  // Store access
  const pockets = usePocketStore((s) => s.pockets);
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransactions = useTransactionStore((s) => s.addTransactions);
  const getCategoriesByPocketId = useCategoryStore((s) => s.getCategoriesByPocketId);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  // Derived pocket list
  const activePockets = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  // Form drafts state
  const [drafts, setDrafts] = useState<ExpenseDraft[]>(() => {
    const defaultPocket = activePockets.find((p) => p.id === preselectedPocketId) || activePockets[0];
    return [
      {
        draftId: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amountStr: '',
        pocketId: defaultPocket ? defaultPocket.id : '',
        categoryId: '',
        date: getLocalDate(),
        time: getLocalTime(),
        note: '',
      },
    ];
  });

  const [activeDraftId, setActiveDraftId] = useState<string>(() => drafts[0]?.draftId || '');
  const [draftErrors, setDraftErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive pocket maps for display and helpers
  const pocketMap = useMemo(() => {
    const map = new Map<string, Pocket>();
    for (const p of pockets) {
      map.set(p.id, p);
    }
    return map;
  }, [pockets]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    const addLocationState = location.state as AddTransactionLocationState | null;
    const fromPath = addLocationState?.from;
    const activeDraft = drafts.find((d) => d.draftId === activeDraftId);
    const activePocketId = activeDraft?.pocketId;

    const safeBackPath =
      fromPath === '/' ||
      fromPath === '/pockets' ||
      fromPath?.startsWith('/pockets/') ||
      fromPath === '/transactions' ||
      fromPath === '/transactions?status=archived' ||
      fromPath === '/reports'
        ? fromPath
        : (activePocketId ? `/pockets/${activePocketId}` : '/pockets');

    navigate(safeBackPath);
  }, [navigate, drafts, activeDraftId, location.state]);

  // Calculate cumulative projected balances
  const cumulativeBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    const pocketUsage: Record<string, number> = {};

    return drafts.map((draft) => {
      const pocketId = draft.pocketId;
      const pocketObj = pocketMap.get(pocketId);
      const parsed = parseAmount(draft.amountStr);

      if (!pocketId || !pocketObj) {
        return {
          projectedBefore: 0,
          projectedAfter: 0,
          effectiveBalance: 0,
        };
      }

      if (balances[pocketId] === undefined) {
        balances[pocketId] = getPocketEffectiveBalance(pocketObj, transactions);
        pocketUsage[pocketId] = 0;
      }

      const initialEffective = getPocketEffectiveBalance(pocketObj, transactions);
      const projectedBefore = initialEffective - (pocketUsage[pocketId] || 0);
      const projectedAfter = projectedBefore - parsed;

      pocketUsage[pocketId] = (pocketUsage[pocketId] || 0) + parsed;

      return {
        projectedBefore,
        projectedAfter,
        effectiveBalance: initialEffective,
      };
    });
  }, [drafts, transactions, pocketMap]);

  // Add draft
  const handleAddDraft = useCallback(() => {
    if (drafts.length >= 20) return;

    const lastDraft = drafts.find((d) => d.draftId === activeDraftId) || drafts[drafts.length - 1];

    const newDraft: ExpenseDraft = {
      draftId: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amountStr: '',
      pocketId: lastDraft ? lastDraft.pocketId : (activePockets[0]?.id || ''),
      categoryId: '',
      date: lastDraft ? lastDraft.date : getLocalDate(),
      time: lastDraft ? lastDraft.time : getLocalTime(),
      note: '',
    };

    setDrafts((prev) => [...prev, newDraft]);
    setActiveDraftId(newDraft.draftId);
    
    setTimeout(() => {
      const el = document.getElementById(`draft-card-${newDraft.draftId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }, [drafts, activeDraftId, activePockets]);

  // Remove draft
  const handleRemoveDraft = useCallback((draftIdToRemove: string) => {
    if (drafts.length <= 1) return;

    const indexToRemove = drafts.findIndex((d) => d.draftId === draftIdToRemove);
    if (indexToRemove === -1) return;

    const remainingDrafts = drafts.filter((d) => d.draftId !== draftIdToRemove);
    setDrafts(remainingDrafts);

    setDraftErrors((prev) => {
      const copy = { ...prev };
      delete copy[draftIdToRemove];
      return copy;
    });

    if (activeDraftId === draftIdToRemove) {
      const nextActiveIndex = indexToRemove === 0 ? 0 : indexToRemove - 1;
      const nextActiveDraft = remainingDrafts[nextActiveIndex];
      if (nextActiveDraft) {
        setActiveDraftId(nextActiveDraft.draftId);
      }
    }
  }, [drafts, activeDraftId]);

  // Update specific draft fields
  const updateDraft = useCallback((draftId: string, updates: Partial<ExpenseDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.draftId !== draftId) return d;
        const result = { ...d, ...updates };
        if (updates.pocketId !== undefined && updates.pocketId !== d.pocketId) {
          result.categoryId = ''; 
        }
        return result;
      })
    );

    setDraftErrors((prev) => {
      const copy = { ...prev };
      delete copy[draftId];
      return copy;
    });
  }, []);

  // Form Submit validation and action
  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;

    const errorsMap: Record<string, string[]> = {};
    let firstInvalidDraftId = '';
    const pocketExpenses: Record<string, number> = {};

    drafts.forEach((draft, index) => {
      const errorsList: string[] = [];
      const parsedAmt = parseAmount(draft.amountStr);
      const pocketObj = pocketMap.get(draft.pocketId);

      if (parsedAmt <= 0) {
        errorsList.push('Jumlah transaksi harus lebih dari 0.');
      }
      if (!draft.pocketId) {
        errorsList.push('Pilih pocket tujuan pengeluaran.');
      }
      if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
        errorsList.push('Tanggal transaksi tidak valid.');
      }
      if (!draft.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) {
        errorsList.push('Format waktu tidak valid (HH:mm).');
      }

      if (draft.categoryId && draft.pocketId) {
        const pocketCategories = getCategoriesByPocketId(draft.pocketId);
        const categoryValid = pocketCategories.some((c) => c.id === draft.categoryId);
        if (!categoryValid) {
          errorsList.push('Kategori terpilih tidak valid untuk pocket ini.');
        }
      }

      if (draft.pocketId && pocketObj) {
        const currentEffective = getPocketEffectiveBalance(pocketObj, transactions);
        const priorExpenses = pocketExpenses[draft.pocketId] || 0;
        const projectedAfter = currentEffective - priorExpenses - parsedAmt;

        if (projectedAfter < 0) {
          const samePocketPriorIndexes = drafts
            .slice(0, index)
            .map((d, i) => ({ d, i }))
            .filter((item) => item.d.pocketId === draft.pocketId && parseAmount(item.d.amountStr) > 0);

          if (samePocketPriorIndexes.length > 0) {
            const noteNames = samePocketPriorIndexes.map((item) => `Catatan ${item.i + 1}`).join(', ');
            errorsList.push(`Saldo pocket tidak mencukupi setelah ${noteNames}.`);
          } else {
            errorsList.push('Saldo pocket tidak mencukupi untuk transaksi ini.');
          }
        }

        pocketExpenses[draft.pocketId] = priorExpenses + parsedAmt;
      }

      if (errorsList.length > 0) {
        errorsMap[draft.draftId] = errorsList;
        if (!firstInvalidDraftId) {
          firstInvalidDraftId = draft.draftId;
        }
      }
    });

    if (Object.keys(errorsMap).length > 0) {
      setDraftErrors(errorsMap);
      if (firstInvalidDraftId) {
        setActiveDraftId(firstInvalidDraftId);
        setTimeout(() => {
          const el = document.getElementById(`draft-card-${firstInvalidDraftId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
      return;
    }

    setIsSubmitting(true);

    const inputs = drafts.map((d) => ({
      type: 'expense' as const,
      amount: parseAmount(d.amountStr),
      pocketId: d.pocketId,
      categoryId: d.categoryId || undefined,
      date: d.date,
      time: d.time,
      note: d.note.trim(),
    }));

    const result = addTransactions(inputs);

    if (result.success) {
      if (drafts.length === 1 && drafts[0]) {
        navigate(`/pockets/${drafts[0].pocketId}`);
      } else {
        navigate('/transactions');
      }
    } else {
      const mappedErrors: Record<string, string[]> = {};
      result.errors.forEach((err) => {
        const draft = drafts[err.index];
        if (draft) {
          mappedErrors[draft.draftId] = err.errors;
        }
      });
      setDraftErrors(mappedErrors);
      setIsSubmitting(false);
    }
  }, [isSubmitting, drafts, pocketMap, getCategoriesByPocketId, transactions, addTransactions, navigate]);

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

      <div className="flex flex-col gap-4 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)] pb-12">
        <p className="text-body-sm text-text-secondary -mt-1">
          Catat uang yang keluar dari pocket.
        </p>

        {/* Drafts List */}
        <div className="flex flex-col gap-3">
          {drafts.map((draft, index) => {
            const isExpanded = draft.draftId === activeDraftId;
            const errors = draftErrors[draft.draftId] || [];
            const isFirst = index === 0;

            const selectedPocket = pocketMap.get(draft.pocketId);
            const pocketCategories = selectedPocket ? getCategoriesByPocketId(selectedPocket.id) : [];
            const parsedAmountValue = parseAmount(draft.amountStr);
            const displayValue = parsedAmountValue > 0 ? formatNumberWithDots(parsedAmountValue) : '';

            const balanceInfo = cumulativeBalances[index] || {
              projectedBefore: 0,
              projectedAfter: 0,
              effectiveBalance: 0,
            };

            return (
              <div
                key={draft.draftId}
                id={`draft-card-${draft.draftId}`}
                className={`transition-all duration-300 ${!isFirst ? 'animate-scale-in' : ''}`}
              >
                {isExpanded ? (
                  <Card variant="flat" className="flex flex-col gap-4 border border-primary/20 relative p-4 bg-surface shadow-card">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-display text-headline-sm text-primary">
                        Catatan {index + 1}
                      </span>
                      {drafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraft(draft.draftId)}
                          aria-label={`Hapus Catatan ${index + 1}`}
                          className="flex items-center justify-center p-1.5 text-bahaya hover:bg-bahaya-soft/50 rounded-full transition-colors"
                        >
                          <span className="material-symbols-rounded text-lg">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Per-draft error list */}
                    {errors.length > 0 && (
                      <div className="bg-bahaya-soft/40 border border-bahaya/20 p-3 rounded-card">
                        <div className="flex flex-col gap-1">
                          {errors.map((err, i) => (
                            <p key={i} className="text-[11px] text-bahaya font-semibold flex items-start gap-1.5">
                              <span className="material-symbols-rounded text-sm leading-4 flex-shrink-0">error</span>
                              {err}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nominal */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-caps text-text-secondary font-bold uppercase tracking-wider px-1">
                        Nominal
                      </label>
                      <div className="flex items-center justify-center min-h-[88px] py-4 px-4 border border-primary/20 rounded-card bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                        <div className="flex items-baseline justify-center gap-1 w-full max-w-[280px]">
                          <span className="font-display text-[21px] min-[400px]:text-[23px] leading-none font-semibold text-text-secondary select-none">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={displayValue}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              const parsed = parseInt(digits, 10);
                              updateDraft(draft.draftId, { amountStr: isNaN(parsed) ? '' : String(parsed) });
                            }}
                            placeholder="0"
                            className="font-display text-[30px] min-[400px]:text-[34px] leading-none font-bold tracking-tight tabular-nums text-text-primary bg-transparent outline-none text-left w-full placeholder:text-text-disabled"
                            autoFocus={drafts.length > 1}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pocket Selector */}
                    <PocketPickerField
                      label="Dari Pocket"
                      title="Pilih Pocket Pengeluaran"
                      placeholder="Pilih pocket pengeluaran"
                      pockets={activePockets}
                      transactions={transactions}
                      selectedPocketId={draft.pocketId}
                      onSelect={(pId) => updateDraft(draft.draftId, { pocketId: pId })}
                    />

                    {/* Category Selector */}
                    {draft.pocketId && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 px-0.5">
                          <label className="text-[10px] text-text-secondary font-bold tracking-wider uppercase">
                            Kategori
                          </label>
                          <span className="text-[9px] text-text-muted italic">Opsional</span>
                        </div>
                        {pocketCategories.length > 0 ? (
                          <div className="flex w-full flex-wrap gap-2">
                            {pocketCategories.map((cat) => {
                              const isSelected = cat.id === draft.categoryId;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => updateDraft(draft.draftId, { categoryId: isSelected ? '' : cat.id })}
                                  className={`inline-flex flex-[1_1_auto] min-w-fit max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-body-sm font-semibold transition-colors ${
                                    isSelected
                                      ? 'border-primary bg-primary-soft text-primary ring-1 ring-primary/10'
                                      : 'border-border bg-background text-text-secondary hover:border-primary/40'
                                  }`}
                                >
                                  <span className="text-sm">{cat.emoji}</span>
                                  {cat.name}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <Card variant="flat" className="py-3 text-center text-text-muted text-xs bg-surface-container/20">
                            Pocket ini belum memiliki kategori.
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-text-secondary font-bold px-0.5 tracking-wider uppercase">
                          Tanggal
                        </label>
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) => updateDraft(draft.draftId, { date: e.target.value })}
                          className="h-11 px-3 rounded-card border border-border bg-background text-text-primary text-xs font-body focus:outline-none focus:border-primary hover:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-text-secondary font-bold px-0.5 tracking-wider uppercase">
                          Waktu
                        </label>
                        <input
                          type="time"
                          value={draft.time}
                          onChange={(e) => updateDraft(draft.draftId, { time: e.target.value })}
                          className="h-11 px-3 rounded-card border border-border bg-background text-text-primary text-xs font-body focus:outline-none focus:border-primary hover:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* Note */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-text-secondary font-bold px-0.5 tracking-wider uppercase">
                        Catatan
                      </label>
                      <textarea
                        value={draft.note}
                        onChange={(e) => updateDraft(draft.draftId, { note: e.target.value })}
                        placeholder="Contoh: Makan siang bersama tim"
                        rows={2}
                        className="px-3 py-2.5 rounded-card border border-border bg-background text-text-primary text-xs font-body resize-none focus:outline-none focus:border-primary hover:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-disabled"
                      />
                    </div>

                    {/* Balance Preview */}
                    {selectedPocket && parsedAmountValue > 0 && (
                      <Card variant="flat" className="flex items-center justify-between text-[11px] p-2.5 border border-border bg-surface-container/20">
                        <span className="text-text-secondary">Saldo setelah transaksi:</span>
                        <span className={`font-display font-bold ${
                          balanceInfo.projectedAfter < 0 ? 'text-bahaya' : 'text-aman'
                        }`}>
                          {formatRupiah(balanceInfo.projectedAfter)}
                        </span>
                      </Card>
                    )}
                  </Card>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveDraftId(draft.draftId)}
                      aria-expanded="false"
                      className="flex-1 text-left focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-card block min-w-0"
                    >
                      <Card
                        variant="flat"
                        className={`flex items-center justify-between border ${
                          errors.length > 0
                            ? 'border-bahaya bg-bahaya-soft/10 hover:bg-bahaya-soft/20'
                            : 'border-border hover:border-primary/20 bg-surface'
                        } p-3 transition-all`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-body-sm font-bold text-text-primary">
                              Catatan {index + 1}
                            </span>
                            {errors.length > 0 && (
                              <span className="material-symbols-rounded text-bahaya text-sm leading-none">error</span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-secondary flex items-center gap-1 min-w-0 truncate">
                            <span className="truncate">{selectedPocket ? `${selectedPocket.emoji} ${selectedPocket.name}` : 'Pocket tidak tersedia'}</span>
                            <span className="text-text-muted">•</span>
                            <span className="truncate">
                              {(() => {
                                const cat = draft.categoryId ? getCategoryById(draft.categoryId) : undefined;
                                return cat ? `${cat.emoji} ${cat.name}` : 'Tanpa kategori';
                              })()}
                            </span>
                            <span className="text-text-muted">•</span>
                            <span className="flex-shrink-0">{draft.date}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 flex items-center gap-1.5 pl-2">
                          <span className="font-display text-body-sm font-bold text-bahaya">
                            {parsedAmountValue > 0 ? `-${formatRupiah(parsedAmountValue)}` : 'Rp0'}
                          </span>
                          <span className="material-symbols-rounded text-text-muted text-lg">unfold_more</span>
                        </div>
                      </Card>
                    </button>
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDraft(draft.draftId)}
                        aria-label={`Hapus Catatan ${index + 1}`}
                        className="flex items-center justify-center p-2 text-bahaya hover:bg-bahaya-soft/50 rounded-full transition-colors flex-shrink-0"
                      >
                        <span className="material-symbols-rounded text-lg">delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-5 flex flex-col gap-3.5 pb-6">
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              onClick={handleAddDraft}
              variant="secondary"
              size="md"
              fullWidth
              disabled={drafts.length >= 20 || isSubmitting}
              icon={<span className="material-symbols-rounded text-lg">note_add</span>}
            >
              Tambah catatan transaksi
            </Button>

            {drafts.length >= 20 && (
              <p className="text-[10px] text-text-secondary text-center italic">
                Maksimal 20 catatan dalam sekali simpan.
              </p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
            icon={<span className="material-symbols-rounded text-xl">save</span>}
          >
            {drafts.length <= 1
              ? 'Simpan Pengeluaran'
              : `Simpan ${drafts.length} Pengeluaran`}
          </Button>
        </div>
      </div>
    </>
  );
}
