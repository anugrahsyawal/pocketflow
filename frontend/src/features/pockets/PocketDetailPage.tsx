import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { POCKET_GROUPS } from '@/data/constants';
import { formatRupiah } from '@/lib/currency';

export function PocketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const getPocketById = usePocketStore((s) => s.getPocketById);
  const pocket = useMemo(() => (id ? getPocketById(id) : undefined), [id, getPocketById]);

  // If pocket is missing, archived, inactive, show not-found view
  if (!pocket || !pocket.isActive || pocket.isArchived) {
    return (
      <AppShell showBottomNav={false}>
        <TopBar title="Pocket tidak ditemukan" showBack onBack={() => navigate('/pockets')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="Not found">🔎</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Pocket tidak ditemukan
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Pocket ini belum aktif atau tidak tersedia.
          </p>
          <Button onClick={() => navigate('/pockets')} variant="primary" size="md">
            Kembali ke Pocket Saya
          </Button>
        </div>
      </AppShell>
    );
  }

  const hasAllocation = pocket.monthlyAllocation !== null;
  const pocketGroup = POCKET_GROUPS.find((g) => g.id === pocket.groupId);

  const getCategoriesByPocketId = useCategoryStore((s) => s.getCategoriesByPocketId);
  const pocketCategories = useMemo(() => {
    return getCategoriesByPocketId(pocket.id);
  }, [pocket.id, getCategoriesByPocketId]);

  // Stepper/Progress variables for UI compliance (0% used, Aman)
  const progressPercent = 0;
  const statusLabel = 'Aman';
  const statusVariant = 'aman';

  return (
    <AppShell showBottomNav={false}>
      <TopBar title={pocket.name} showBack onBack={() => navigate('/pockets')} />

      <div className="flex flex-col gap-6 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)]">
        {/* Profile Card Header */}
        <Card variant="flat" className="flex flex-col items-center text-center py-6 gap-3">
          {/* Circular Emoji */}
          <div className="flex items-center justify-center w-16 h-16 rounded-pocket bg-surface-container-high text-4xl shadow-card">
            {pocket.emoji}
          </div>
          
          {/* Name & Group info */}
          <div>
            <h2 className="font-display text-headline-md text-text-primary">
              {pocket.name}
            </h2>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider mt-1 block">
              Group: {pocketGroup?.label ?? pocket.groupId}
            </span>
          </div>

          {/* Prominent Balance */}
          <div className="mt-2">
            <span className="text-[11px] text-text-muted uppercase tracking-wider block">
              Saldo Saat Ini
            </span>
            <span className="font-display text-amount-lg text-primary leading-none mt-1 block">
              {formatRupiah(pocket.currentBalance)}
            </span>
          </div>

          {/* Badge indicator */}
          {hasAllocation ? (
            <Badge variant={statusVariant} className="mt-1">
              {statusLabel}
            </Badge>
          ) : (
            <Badge variant="neutral" className="mt-1">
              Wallet
            </Badge>
          )}
        </Card>

        {/* Budget Progress Indicator (Only for allocation pockets) */}
        {hasAllocation && (
          <div className="flex flex-col gap-2">
            <span className="text-label-caps text-text-secondary font-bold px-1">Budget Limit</span>
            <Card variant="flat" className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Progress Anggaran</span>
                <span className="font-semibold text-text-primary">0% Terpakai</span>
              </div>
              <ProgressBar value={progressPercent} variant="aman" height="sm" />
              <div className="flex justify-between items-center text-[11px] text-text-muted mt-0.5">
                <span>Terpakai: Rp0</span>
                <span>Limit: {formatRupiah(pocket.monthlyAllocation!)}</span>
              </div>
            </Card>
          </div>
        )}

        {/* Section: Ringkasan Details */}
        <div className="flex flex-col gap-2">
          <span className="text-label-caps text-text-secondary font-bold px-1">Ringkasan</span>
          <Card variant="flat" className="flex flex-col gap-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-body-sm text-text-secondary">Saldo saat ini</span>
              <span className="font-display text-body-lg font-bold text-text-primary">
                {formatRupiah(pocket.currentBalance)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-border/40">
              <span className="text-body-sm text-text-secondary">
                {hasAllocation ? 'Alokasi bulanan' : 'Saldo wallet'}
              </span>
              <span className="font-body text-body-sm font-semibold text-text-primary">
                {hasAllocation ? formatRupiah(pocket.monthlyAllocation!) : formatRupiah(pocket.currentBalance)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-border/40">
              <span className="text-body-sm text-text-secondary">Terpakai periode ini</span>
              <span className="font-body text-body-sm font-semibold text-text-primary">Rp0</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-border/40">
              <span className="text-body-sm text-text-secondary">Sisa</span>
              <span className="font-display text-body-lg font-bold text-text-primary">
                {formatRupiah(pocket.currentBalance)}
              </span>
            </div>
          </Card>
        </div>

        {/* Section: Categories inside pocket */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-label-caps text-text-secondary font-bold">
              Kategori di Pocket Ini ({pocketCategories.length})
            </span>
            <button
              onClick={() => navigate(`/pockets/${pocket.id}/categories`)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Kelola kategori
            </button>
          </div>
          {pocketCategories.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {pocketCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col items-center justify-center p-3 rounded-card bg-surface border border-border/20 shadow-card text-center"
                >
                  <span className="text-2xl mb-1">{cat.emoji}</span>
                  <span className="text-[11px] font-semibold text-text-primary truncate w-full">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Card variant="flat" className="py-6 text-center text-text-muted text-body-sm">
              Tidak ada kategori khusus di pocket ini.
            </Card>
          )}
        </div>

        {/* Section: Transactions list */}
        <div className="flex flex-col gap-2">
          <span className="text-label-caps text-text-secondary font-bold px-1">Transaksi Terbaru</span>
          <Card variant="flat" className="py-8 text-center text-text-muted text-body-sm flex flex-col items-center gap-2">
            <span className="text-2xl" role="img" aria-label="No transactions">📝</span>
            <p>Belum ada transaksi di pocket ini.</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
