import { useNavigate } from 'react-router-dom';
import type { Pocket } from '@/types/pocket';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRupiah } from '@/lib/currency';

interface PocketCardProps {
  pocket: Pocket;
}

export function PocketCard({ pocket }: PocketCardProps) {
  const navigate = useNavigate();
  const hasAllocation = pocket.monthlyAllocation !== null;

  // Since transactions are not implemented yet, used amount = 0, progress = 0
  const progressPercent = 0;
  const statusLabel = 'Aman';
  const statusVariant = 'aman'; // maps to green (Aman)

  const handleClick = () => {
    navigate(`/pockets/${pocket.id}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer active:scale-[0.99] transition-transform">
      <Card variant="flat" className="flex flex-col gap-3 border border-border/40 hover:border-primary/20 hover:shadow-card transition-shadow">
        {/* Main Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Emoji Container */}
            <div className="flex items-center justify-center w-11 h-11 rounded-pocket bg-surface-container-high text-2xl">
              {pocket.emoji}
            </div>
            
            {/* Name and Meta */}
            <div>
              <h4 className="font-display text-body-lg font-bold text-text-primary">
                {pocket.name}
              </h4>
              <p className="text-[11px] text-text-muted">
                {hasAllocation ? 'Anggaran Bulanan' : 'Saldo Wallet'}
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <span className="font-body text-body-lg font-bold text-text-primary block">
              {formatRupiah(pocket.currentBalance)}
            </span>
            {hasAllocation && (
              <span className="text-[11px] text-text-muted">
                Limit: {formatRupiah(pocket.monthlyAllocation!)}
              </span>
            )}
          </div>
        </div>

        {/* Budget Progress (Only for pockets with monthlyAllocation) */}
        {hasAllocation ? (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-text-secondary">
                Terpakai: <span className="font-semibold text-text-primary">Rp0 (0%)</span>
              </span>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <ProgressBar value={progressPercent} variant="aman" height="sm" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
