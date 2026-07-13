import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useSetupStore } from '@/features/setup/useSetupStore';
import { formatRupiah } from '@/lib/currency';

interface BalanceConfig {
  id: string;
  name: string;
  emoji: string;
  helperText: string;
}

const BALANCE_POCKETS: BalanceConfig[] = [
  {
    id: 'cash',
    name: 'Cash',
    emoji: '💵',
    helperText: 'Saldo tunai saat ini',
  },
  {
    id: 'nfc-card',
    name: 'NFC Transportation Card',
    emoji: '💳',
    helperText: 'Saldo kartu saat ini',
  },
];

const QUICK_CHIPS = [
  { label: 'Rp0', value: 0 },
  { label: 'Rp25.000', value: 25000 },
  { label: 'Rp50.000', value: 50000 },
  { label: 'Rp100.000', value: 100000 },
];

export function SetupInitialBalancePage() {
  const navigate = useNavigate();
  const initialBalances = useSetupStore((s) => s.initialBalances);
  const setInitialBalance = useSetupStore((s) => s.setInitialBalance);

  const handleInputChange = (pocketId: string, rawValue: string) => {
    // Keep only digits to prevent negative values, decimals, and special characters
    const digitsOnly = rawValue.replace(/\D/g, '');
    const amount = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
    setInitialBalance(pocketId, amount);
  };

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

          <div className="flex flex-col gap-6">
            {BALANCE_POCKETS.map((pocket) => {
              const currentBalance = initialBalances[pocket.id] ?? 0;

              return (
                <Card key={pocket.id} variant="flat" className="flex flex-col gap-4">
                  {/* Pocket info header */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl flex-shrink-0" role="img" aria-hidden="true">
                      {pocket.emoji}
                    </span>
                    <div>
                      <h3 className="text-body-sm font-semibold text-text-primary">
                        {pocket.name}
                      </h3>
                      <p className="text-body-sm text-text-secondary">
                        {pocket.helperText}
                      </p>
                    </div>
                  </div>

                  {/* Input container */}
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={currentBalance === 0 ? '' : currentBalance.toString()}
                        onChange={(e) => handleInputChange(pocket.id, e.target.value)}
                        className="pr-20 text-right font-semibold"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-body-lg font-semibold text-text-secondary">
                        Rp
                      </span>
                    </div>

                    {/* Preview formatted amount */}
                    <div className="flex justify-between items-center text-[11px] text-text-muted px-1">
                      <span>Preview:</span>
                      <span className="font-semibold text-text-primary text-body-sm">
                        {formatRupiah(currentBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Quick amount chips */}
                  <div className="flex flex-wrap gap-2">
                    {QUICK_CHIPS.map((chip) => {
                      const isSelected = currentBalance === chip.value;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => setInitialBalance(pocket.id, chip.value)}
                          className={`
                            inline-flex items-center justify-center h-8 px-3
                            rounded-pill text-body-sm font-semibold
                            transition-all duration-200 active:scale-95
                            ${isSelected
                              ? 'bg-primary text-on-primary shadow-card'
                              : 'bg-surface text-text-primary border border-outline-variant hover:bg-surface-container-low'
                            }
                          `}
                          aria-pressed={isSelected}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
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
