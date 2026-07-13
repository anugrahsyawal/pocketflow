import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { POCKET_GROUPS } from '@/data/constants';
import { DEFAULT_POCKETS } from '@/data/defaultPockets';
import { formatRupiah } from '@/lib/currency';
import { useSetupStore } from '@/features/setup/useSetupStore';

/** All default pocket IDs for "select all" / first-visit initialization. */
const ALL_POCKET_IDS = DEFAULT_POCKETS.map((p) => p.id);

export function SetupPocketTemplatePage() {
  const navigate = useNavigate();
  const selectedPocketIds = useSetupStore((s) => s.selectedPocketIds);
  const setSelectedPocketIds = useSetupStore((s) => s.setSelectedPocketIds);

  const hasInitializedPocketSelection = useSetupStore((s) => s.hasInitializedPocketSelection);
  const setHasInitializedPocketSelection = useSetupStore((s) => s.setHasInitializedPocketSelection);

  // Auto-select all pockets on first visit only
  useEffect(() => {
    if (!hasInitializedPocketSelection) {
      setSelectedPocketIds([...ALL_POCKET_IDS]);
      setHasInitializedPocketSelection(true);
    }
  }, [hasInitializedPocketSelection, setSelectedPocketIds, setHasInitializedPocketSelection]);

  const selectedCount = selectedPocketIds.length;
  const allSelected = selectedCount === ALL_POCKET_IDS.length;

  const togglePocket = (pocketId: string) => {
    if (selectedPocketIds.includes(pocketId)) {
      setSelectedPocketIds(selectedPocketIds.filter((id) => id !== pocketId));
    } else {
      setSelectedPocketIds([...selectedPocketIds, pocketId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPocketIds([...ALL_POCKET_IDS]);
  };

  const handleReset = () => {
    setSelectedPocketIds([...ALL_POCKET_IDS]);
  };

  return (
    <AppShell showBottomNav={false}>
      <TopBar
        title="Pilih Kantong"
        showBack
        onBack={() => navigate('/setup/period')}
      />

      <div className="flex flex-col flex-1 px-safe py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-8 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <span className="text-4xl mb-3 block">👛</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Kantong yang kamu gunakan
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[300px] mx-auto">
            Pilih kantong yang sesuai dengan kebutuhanmu. Kamu bisa menambah atau menghapus nanti.
          </p>
        </div>

        {/* Selected count + actions */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-body-sm font-semibold text-text-primary">
            {selectedCount} kantong dipilih
          </p>
          <div className="flex gap-2">
            {!allSelected && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-body-sm font-semibold text-primary hover:text-primary-container transition-colors"
              >
                Pilih semua
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="text-body-sm font-semibold text-text-muted hover:text-text-secondary transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Pocket groups */}
        <div className="flex-1">
          <div className="flex flex-col gap-4">
            {POCKET_GROUPS.map((group) => {
              const pockets = DEFAULT_POCKETS.filter((p) => p.groupId === group.id);
              return (
                <Card key={group.id} variant="flat" padding={false}>
                  {/* Group header */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-label-caps text-text-secondary">{group.label}</p>
                  </div>

                  {/* Pocket rows */}
                  <div className="px-2 pb-2">
                    {pockets.map((pocket) => {
                      const isSelected = selectedPocketIds.includes(pocket.id);
                      const hasAllocation = pocket.monthlyAllocation !== null;

                      return (
                        <button
                          key={pocket.id}
                          type="button"
                          onClick={() => togglePocket(pocket.id)}
                          className={`
                            flex items-center gap-3 w-full px-3 py-3 rounded-input
                            transition-all duration-200 text-left
                            ${isSelected
                              ? 'bg-primary-soft/50'
                              : 'hover:bg-surface-container opacity-60'
                            }
                          `}
                          aria-pressed={isSelected}
                        >
                          {/* Emoji */}
                          <span className="text-2xl flex-shrink-0 w-8 text-center">
                            {pocket.emoji}
                          </span>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-body-sm font-medium truncate ${
                              isSelected ? 'text-text-primary' : 'text-text-muted'
                            }`}>
                              {pocket.name}
                            </p>
                            <p className="text-[11px] text-text-muted truncate">
                              {hasAllocation
                                ? `${formatRupiah(pocket.monthlyAllocation!)}/bulan`
                                : 'Saldo awal diatur nanti'
                              }
                            </p>
                          </div>

                          {/* Checkbox indicator */}
                          <div className={`
                            flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0
                            transition-all duration-200
                            ${isSelected
                              ? 'bg-primary'
                              : 'border-2 border-outline-variant'
                            }
                          `}>
                            {isSelected && (
                              <span className="material-symbols-rounded text-on-primary text-base">
                                check
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] text-text-muted text-center mt-4">
            Kamu bisa menambah atau menghapus kantong kapan saja.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate('/setup/period')}
          >
            Kembali
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={selectedCount === 0}
            onClick={() => navigate('/setup/balances')}
          >
            Lanjut
          </Button>
        </div>

        {selectedCount === 0 && (
          <p className="text-[11px] text-bahaya text-center mt-2 animate-fade-in">
            Pilih minimal 1 kantong untuk melanjutkan.
          </p>
        )}
      </div>
    </AppShell>
  );
}
