import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { POCKET_GROUPS } from '@/data/constants';
import { formatRupiah } from '@/lib/currency';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PocketCard } from './PocketCard';

export function PocketListPage() {
  const navigate = useNavigate();
  const pockets = usePocketStore((s) => s.pockets);

  const activePockets = useMemo(() => {
    return pockets.filter((p) => p.isActive && !p.isArchived);
  }, [pockets]);

  const totalBalance = useMemo(() => {
    return activePockets.reduce((sum, p) => sum + p.currentBalance, 0);
  }, [activePockets]);

  const spendableBalance = useMemo(() => {
    return activePockets
      .filter((p) => p.groupId === 'daily' && p.isSpendable)
      .reduce((sum, p) => sum + p.currentBalance, 0);
  }, [activePockets]);

  const isEmpty = activePockets.length === 0;

  return (
    <div className="flex flex-col gap-6 px-safe py-6 min-h-screen bg-background">
      {/* Header */}
      <div>
        <h1 className="font-display text-headline-lg-mobile text-text-primary">
          Pocket Saya
        </h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Kelola semua kantong uangmu di sini.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card variant="flat" className="bg-primary-soft/40 border border-primary-soft/30 p-4">
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase block">
            Total Semua Pocket
          </span>
          <span className="font-display text-amount-md text-primary mt-1 block">
            {formatRupiah(totalBalance)}
          </span>
        </Card>

        <Card variant="flat" className="bg-accent/10 border border-accent/20 p-4">
          <span className="text-[10px] font-bold text-accent-dark tracking-wider uppercase block">
            Sisa Spendable
          </span>
          <span className="font-display text-amount-md text-accent-dark mt-1 block">
            {formatRupiah(spendableBalance)}
          </span>
        </Card>
      </div>

      {/* Main Content / List */}
      {isEmpty ? (
        <Card variant="flat" className="py-12 px-6 text-center flex flex-col items-center gap-4">
          <span className="text-4xl" role="img" aria-hidden="true">
            👛
          </span>
          <div>
            <h3 className="font-display text-headline-sm text-text-primary">
              Belum ada pocket aktif
            </h3>
            <p className="text-body-sm text-text-secondary mt-2 max-w-[280px] mx-auto">
              Selesaikan setup terlebih dahulu atau reset setup jika perlu.
            </p>
          </div>
          <Button onClick={() => navigate('/setup')} variant="primary" size="md">
            Mulai Setup
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {POCKET_GROUPS.map((group) => {
            const groupPockets = activePockets.filter((p) => p.groupId === group.id);
            if (groupPockets.length === 0) return null;

            return (
              <div key={group.id} className="flex flex-col gap-3">
                {/* Group Header Label */}
                <h3 className="text-label-caps text-text-secondary tracking-wider font-bold uppercase px-1">
                  {group.label}
                </h3>

                {/* Pocket items inside group */}
                <div className="flex flex-col gap-3">
                  {groupPockets.map((pocket) => (
                    <PocketCard key={pocket.id} pocket={pocket} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
