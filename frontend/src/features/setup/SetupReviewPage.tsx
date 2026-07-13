import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSetupStore } from '@/features/setup/useSetupStore';
import { DEFAULT_POCKETS } from '@/data/defaultPockets';
import { POCKET_GROUPS } from '@/data/constants';
import { formatRupiah } from '@/lib/currency';

function getPeriodPreview(day: number): string {
  if (day === 1) {
    return 'Tanggal 1 – akhir bulan';
  }
  return `Tanggal ${day} – ${day - 1} bulan berikutnya`;
}

export function SetupReviewPage() {
  const navigate = useNavigate();
  const budgetPeriodStartDay = useSetupStore((s) => s.budgetPeriodStartDay);
  const selectedPocketIds = useSetupStore((s) => s.selectedPocketIds);
  const initialBalances = useSetupStore((s) => s.initialBalances);
  const markSetupComplete = useSetupStore((s) => s.markSetupComplete);

  // Filter selected pockets
  const selectedPockets = DEFAULT_POCKETS.filter((p) => selectedPocketIds.includes(p.id));

  // Calculations
  const totalAllocation = selectedPockets.reduce(
    (sum, p) => sum + (p.monthlyAllocation ?? 0),
    0
  );
  const hasCashSelected = selectedPocketIds.includes('cash');
  const hasNfcSelected = selectedPocketIds.includes('nfc-card');
  const cashBalance = hasCashSelected ? (initialBalances['cash'] ?? 0) : 0;
  const nfcBalance = hasNfcSelected ? (initialBalances['nfc-card'] ?? 0) : 0;
  const totalStartingBalance = totalAllocation + cashBalance + nfcBalance;

  const isWarningVisible = selectedPocketIds.length === 0;

  const handleComplete = () => {
    if (isWarningVisible) return;
    markSetupComplete();
    navigate('/', { replace: true });
  };

  return (
    <AppShell showBottomNav={false}>
      <TopBar
        title="Ringkasan Setup"
        showBack
        onBack={() => navigate('/setup/balances')}
      />

      <div className="flex flex-col flex-1 px-safe py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-8 h-1.5 rounded-full bg-primary" />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-4xl mb-3 block">📋</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Periksa kembali setup-mu
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[300px] mx-auto">
            Pastikan periode anggaran, kantong, dan saldo awal sudah sesuai sebelum memulai.
          </p>
        </div>

        {/* Warning Alert */}
        {isWarningVisible && (
          <div className="mb-6 p-4 rounded-card bg-bahaya-soft flex items-start gap-3 animate-scale-in">
            <span className="material-symbols-rounded text-bahaya text-xl flex-shrink-0">
              warning
            </span>
            <div>
              <p className="text-body-sm font-semibold text-bahaya">Kantong Belum Dipilih</p>
              <p className="text-[11px] text-bahaya/90 leading-normal mt-0.5">
                Pilih minimal 1 kantong sebelum memulai.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 flex-1">
          {/* Section: Period */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-label-caps text-text-secondary font-bold">Periode Anggaran</span>
              <button
                onClick={() => navigate('/setup/period')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Ubah periode
              </button>
            </div>
            <Card variant="flat">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-primary text-2xl">calendar_month</span>
                <div>
                  <p className="text-body-sm font-semibold text-text-primary">
                    Mulai tanggal {budgetPeriodStartDay}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {getPeriodPreview(budgetPeriodStartDay)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Section: Pockets list */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-label-caps text-text-secondary font-bold">
                Kantong Terpilih ({selectedPocketIds.length})
              </span>
              <button
                onClick={() => navigate('/setup/pockets')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Ubah kantong
              </button>
            </div>

            {selectedPocketIds.length > 0 ? (
              <div className="flex flex-col gap-3">
                {POCKET_GROUPS.map((group) => {
                  const pocketsInGroup = selectedPockets.filter((p) => p.groupId === group.id);
                  if (pocketsInGroup.length === 0) return null;

                  return (
                    <Card key={group.id} variant="flat" padding={false}>
                      <div className="px-4 pt-3 pb-1 border-b border-border bg-surface-container-high/40 rounded-t-card">
                        <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">
                          {group.label}
                        </span>
                      </div>
                      <div className="px-4 py-2 divide-y divide-border/60">
                        {pocketsInGroup.map((pocket) => {
                          const isCashOrNfc = pocket.id === 'cash' || pocket.id === 'nfc-card';
                          const displayBalance = isCashOrNfc
                            ? initialBalances[pocket.id] ?? 0
                            : pocket.monthlyAllocation ?? 0;

                          return (
                            <div key={pocket.id} className="flex items-center justify-between py-2 gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-lg flex-shrink-0">{pocket.emoji}</span>
                                <span className="text-body-sm font-medium text-text-primary truncate">
                                  {pocket.name}
                                </span>
                              </div>
                              <span className="text-body-sm font-semibold text-text-secondary flex-shrink-0">
                                {isCashOrNfc
                                  ? `Saldo: ${formatRupiah(displayBalance)}`
                                  : formatRupiah(displayBalance)
                                }
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card variant="flat" className="py-6 text-center text-text-muted text-body-sm">
                Tidak ada kantong yang dipilih
              </Card>
            )}
          </div>

          {/* Section: Balances */}
          {(hasCashSelected || hasNfcSelected) && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-label-caps text-text-secondary font-bold">Saldo Awal Teratur</span>
                <button
                  onClick={() => navigate('/setup/balances')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Ubah saldo awal
                </button>
              </div>
              <Card variant="flat" className="divide-y divide-border/60" padding={false}>
                {hasCashSelected && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💵</span>
                      <span className="text-body-sm font-medium text-text-primary">Cash</span>
                    </div>
                    <span className="text-body-sm font-semibold text-text-primary">
                      {formatRupiah(cashBalance)}
                    </span>
                  </div>
                )}
                {hasNfcSelected && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💳</span>
                      <span className="text-body-sm font-medium text-text-primary">NFC Transportation Card</span>
                    </div>
                    <span className="text-body-sm font-semibold text-text-primary">
                      {formatRupiah(nfcBalance)}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Section: Total allocation summary */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-label-caps text-text-secondary font-bold px-1">Total Alokasi Awal</span>
            <Card variant="flat" className="bg-primary-soft/30 border border-primary-soft">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Alokasi Pockets Bulanan:</span>
                  <span>{formatRupiah(totalAllocation)}</span>
                </div>
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Saldo Awal Cash & NFC:</span>
                  <span>{formatRupiah(cashBalance + nfcBalance)}</span>
                </div>
                <div className="flex justify-between text-body-sm font-bold text-primary pt-2 border-t border-primary-soft/50">
                  <span>Total Kesiapan Dana:</span>
                  <span>{formatRupiah(totalStartingBalance)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate('/setup/balances')}
          >
            Kembali
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isWarningVisible}
            onClick={handleComplete}
          >
            Mulai Sekarang
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
