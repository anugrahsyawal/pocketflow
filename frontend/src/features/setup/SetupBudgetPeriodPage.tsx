import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSetupStore } from '@/features/setup/useSetupStore';

export function SetupBudgetPeriodPage() {
  const navigate = useNavigate();
  const budgetPeriodStartDay = useSetupStore((s) => s.budgetPeriodStartDay);

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
          <div className="text-center mb-8">
            <span className="text-4xl mb-3 block">📅</span>
            <h2 className="font-display text-headline-md text-text-primary mb-2">
              Kapan gajimu masuk?
            </h2>
            <p className="text-body-sm text-text-secondary max-w-[300px] mx-auto">
              Periode anggaran dimulai dari tanggal gajian hingga sehari sebelum gajian berikutnya.
            </p>
          </div>

          <Card variant="flat" className="text-center py-8">
            <p className="text-body-sm text-text-secondary mb-2">Tanggal mulai periode</p>
            <p className="font-display text-amount-lg text-primary">
              {budgetPeriodStartDay}
            </p>
            <p className="text-body-sm text-text-muted mt-2">
              Periode: tanggal {budgetPeriodStartDay} – {budgetPeriodStartDay - 1} bulan berikutnya
            </p>
          </Card>

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
