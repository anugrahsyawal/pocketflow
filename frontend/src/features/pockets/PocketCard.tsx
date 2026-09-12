import { Link } from 'react-router-dom';
import type { Pocket } from '@/types/pocket';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRupiah } from '@/lib/currency';

import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import {
  getPocketEffectiveBalance,
  getPocketUsedAmount,
  getPocketBudgetStatus,
} from '@/lib/balanceCalculations';

interface PocketCardProps {
  pocket: Pocket;
}

export function PocketCard({ pocket }: PocketCardProps) {
  const transactions = useTransactionStore((s) => s.transactions);

  const hasAllocation = pocket.monthlyAllocation !== null;
  const effectiveBalance = getPocketEffectiveBalance(pocket, transactions);
  const usedAmount = getPocketUsedAmount(pocket.id, transactions);
  
  const { progress, status, label: statusLabel } = getPocketBudgetStatus(
    usedAmount,
    pocket.monthlyAllocation
  );

  return (
    <Link to={`/pockets/${pocket.id}`} className="block rounded-card active:scale-[0.99] transition-transform">
      <Card className="flex flex-col gap-3 border border-border/60 hover:border-primary/30 hover:shadow-card-hover transition-all">
        {/* Main Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1 basis-[160px]">
            {/* Emoji Container */}
            <div className="flex shrink-0 items-center justify-center w-11 h-11 rounded-2xl bg-surface-container-low text-2xl">
              {pocket.emoji}
            </div>
            
            {/* Name and Meta */}
            <div>
              <h4 className="font-display text-body-lg font-bold text-text-primary">
                {pocket.name}
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {hasAllocation ? 'Anggaran Bulanan' : 'Saldo Wallet'}
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right ml-auto financial-amount">
            <span className="font-body text-body-lg font-bold text-text-primary block">
              {formatRupiah(effectiveBalance)}
            </span>
            {hasAllocation && (
              <span className="text-xs text-text-secondary">
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
                Terpakai: <span className="font-semibold text-text-primary">{formatRupiah(usedAmount)} ({Math.round(progress)}%)</span>
              </span>
              <Badge variant={status}>{statusLabel}</Badge>
            </div>
            <ProgressBar value={progress / 100} variant={status} height="sm" />
          </div>
        ) : null}
      </Card>
    </Link>
  );
}
