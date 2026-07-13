import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { POCKET_GROUPS } from '@/data/constants';
import { DEFAULT_POCKETS } from '@/data/defaultPockets';

export function SetupPocketTemplatePage() {
  const navigate = useNavigate();

  return (
    <AppShell showBottomNav={false}>
      <TopBar
        title="Pilih Kantong"
        showBack
        onBack={() => navigate('/setup/period')}
      />

      <div className="flex flex-col flex-1 px-safe py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-primary" />
          <div className="w-8 h-1.5 rounded-full bg-primary" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
          <div className="w-2 h-1.5 rounded-full bg-outline-variant" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="text-center mb-6">
            <span className="text-4xl mb-3 block">👛</span>
            <h2 className="font-display text-headline-md text-text-primary mb-2">
              Kantong yang kamu gunakan
            </h2>
            <p className="text-body-sm text-text-secondary max-w-[300px] mx-auto">
              Pilih kantong yang sesuai dengan kebutuhanmu. Kamu bisa menambah atau menghapus nanti.
            </p>
          </div>

          {/* Pocket groups preview */}
          <div className="flex flex-col gap-4">
            {POCKET_GROUPS.map((group) => {
              const pockets = DEFAULT_POCKETS.filter((p) => p.groupId === group.id);
              return (
                <Card key={group.id} variant="flat" padding={false}>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-label-caps text-text-secondary">{group.label}</p>
                  </div>
                  <div className="px-4 pb-3">
                    {pockets.map((pocket) => (
                      <div
                        key={pocket.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <span className="text-xl">{pocket.emoji}</span>
                        <span className="text-body-sm text-text-primary">{pocket.name}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] text-text-muted text-center mt-4">
            Template kantong bisa disesuaikan di langkah selanjutnya.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
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
            onClick={() => navigate('/setup/balances')}
          >
            Lanjut
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
