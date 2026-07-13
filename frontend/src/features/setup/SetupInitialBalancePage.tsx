import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function SetupInitialBalancePage() {
  const navigate = useNavigate();

  return (
    <AppShell showBottomNav={false}>
      <TopBar
        title="Saldo Awal"
        showBack
        onBack={() => navigate('/setup/pockets')}
      />

      <div className="flex flex-col flex-1 px-safe py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-8 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="text-center mb-6">
            <span className="text-4xl mb-3 block">💰</span>
            <h2 className="font-display text-headline-md text-text-primary mb-2">
              Saldo awal kantong
            </h2>
            <p className="text-body-sm text-text-secondary max-w-[300px] mx-auto">
              Masukkan saldo awal untuk kantong Cash dan NFC Transportation Card.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Card variant="flat">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💵</span>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-text-primary">Cash</p>
                  <p className="text-body-sm text-text-muted">Saldo tunai saat ini</p>
                </div>
                <p className="text-amount-md text-text-muted">Rp0</p>
              </div>
            </Card>

            <Card variant="flat">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-text-primary">NFC Transportation Card</p>
                  <p className="text-body-sm text-text-muted">Saldo kartu saat ini</p>
                </div>
                <p className="text-amount-md text-text-muted">Rp0</p>
              </div>
            </Card>
          </div>

          <p className="text-[11px] text-text-muted text-center mt-4">
            Input form akan tersedia di fase selanjutnya.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate('/setup/pockets')}
          >
            Kembali
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/setup/review')}
          >
            Lanjut
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
