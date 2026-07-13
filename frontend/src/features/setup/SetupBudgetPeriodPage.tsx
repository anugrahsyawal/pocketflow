import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSetupStore } from '@/features/setup/useSetupStore';

/** Common salary days shown as quick-select chips. */
const COMMON_DAYS = [1, 5, 10, 15, 20, 25, 26, 28];

/**
 * Compute the end day of the budget period.
 * For day 1, end = 28 (previous month's 28th as a safe display).
 * For day N>1, end = N-1 of the next month.
 */
function getEndDay(startDay: number): string {
  if (startDay === 1) {
    return 'akhir bulan';
  }
  return `${startDay - 1} bulan berikutnya`;
}

export function SetupBudgetPeriodPage() {
  const navigate = useNavigate();
  const budgetPeriodStartDay = useSetupStore((s) => s.budgetPeriodStartDay);
  const setBudgetPeriodStartDay = useSetupStore((s) => s.setBudgetPeriodStartDay);

  const handleDecrement = () => {
    if (budgetPeriodStartDay > 1) {
      setBudgetPeriodStartDay(budgetPeriodStartDay - 1);
    }
  };

  const handleIncrement = () => {
    if (budgetPeriodStartDay < 28) {
      setBudgetPeriodStartDay(budgetPeriodStartDay + 1);
    }
  };

  return (
    <AppShell showBottomNav={false}>
      <TopBar
        title="Periode Anggaran"
        showBack
        onBack={() => navigate('/setup/welcome')}
      />

      <div className="flex flex-col flex-1 px-safe py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-8 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-4xl mb-3 block">📅</span>
            <h2 className="font-display text-headline-md text-text-primary mb-2">
              Kapan gajimu masuk?
            </h2>
            <p className="text-body-sm text-text-secondary max-w-[300px] mx-auto">
              Periode anggaran dimulai dari tanggal gajian sampai sehari sebelum gajian berikutnya.
            </p>
          </div>

          {/* Selected day display with +/- stepper */}
          <Card variant="flat" className="text-center py-6 mb-6">
            <p className="text-body-sm text-text-secondary mb-3">Tanggal mulai periode</p>

            <div className="flex items-center justify-center gap-5">
              {/* Decrement */}
              <button
                type="button"
                onClick={handleDecrement}
                disabled={budgetPeriodStartDay <= 1}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container hover:bg-surface-container-high active:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                aria-label="Kurangi tanggal"
              >
                <span className="material-symbols-rounded text-text-primary text-2xl">remove</span>
              </button>

              {/* Day value */}
              <div className="min-w-[80px]">
                <p className="font-display text-amount-lg text-primary leading-none">
                  {budgetPeriodStartDay}
                </p>
              </div>

              {/* Increment */}
              <button
                type="button"
                onClick={handleIncrement}
                disabled={budgetPeriodStartDay >= 28}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container hover:bg-surface-container-high active:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                aria-label="Tambah tanggal"
              >
                <span className="material-symbols-rounded text-text-primary text-2xl">add</span>
              </button>
            </div>

            {/* Period preview */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-body-sm text-text-muted">
                Periode: tanggal <span className="font-semibold text-text-primary">{budgetPeriodStartDay}</span> – <span className="font-semibold text-text-primary">{getEndDay(budgetPeriodStartDay)}</span>
              </p>
            </div>
          </Card>

          {/* Quick select chips */}
          <div className="mb-4">
            <p className="text-label-caps text-text-secondary mb-3 text-center">
              Tanggal gajian umum
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {COMMON_DAYS.map((day) => {
                const isSelected = day === budgetPeriodStartDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setBudgetPeriodStartDay(day)}
                    className={`
                      inline-flex items-center justify-center min-w-[44px] h-10 px-3
                      rounded-pill text-body-sm font-semibold
                      transition-all duration-200 active:scale-95
                      ${isSelected
                        ? 'bg-primary text-on-primary shadow-card'
                        : 'bg-surface text-text-primary border border-outline-variant hover:bg-surface-container-low hover:border-primary/30'
                      }
                    `}
                    aria-pressed={isSelected}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-text-muted text-center mt-4">
            Pengaturan ini bisa diubah nanti di halaman Pengaturan.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate('/setup/welcome')}
          >
            Kembali
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/setup/pockets')}
          >
            Lanjut
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
