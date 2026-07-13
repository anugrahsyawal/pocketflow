import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { APP_NAME } from '@/data/constants';

export function SetupWelcomePage() {
  const navigate = useNavigate();

  return (
    <AppShell showBottomNav={false}>
      <div className="flex flex-col min-h-[80dvh] px-safe py-8">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-pocket bg-primary shadow-elevated mb-8">
            <span className="material-symbols-rounded text-on-primary text-5xl filled">
              rocket_launch
            </span>
          </div>

          <h1 className="font-display text-headline-lg-mobile text-text-primary mb-3">
            Selamat datang di {APP_NAME}!
          </h1>

          <p className="text-body-lg text-text-secondary max-w-[320px] mb-2">
            Mari atur kantongmu dalam beberapa langkah mudah.
          </p>

          <p className="text-body-sm text-text-muted max-w-[280px]">
            Kamu bisa mengubah semua pengaturan ini nanti.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <div className="w-8 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
        </div>

        {/* Action */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/setup/period')}
        >
          Mulai Setup
        </Button>
      </div>
    </AppShell>
  );
}
