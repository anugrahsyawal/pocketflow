import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/currency';
import type { SinkingFundRecommendation } from '@/lib/reportCalculations';
import { useReportPreferencesStore } from '@/features/reports/useReportPreferencesStore';

interface SinkingFundRecommendationCardProps {
  recommendation: SinkingFundRecommendation;
  isCurrentPeriod: boolean;
}

export function SinkingFundRecommendationCard({
  recommendation,
  isCurrentPeriod,
}: SinkingFundRecommendationCardProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const setSinkingFundPocketIncluded = useReportPreferencesStore(
    (state) => state.setSinkingFundPocketIncluded
  );

  const { status, daysRemaining, suggestedAmount, candidates } = recommendation;

  // Fix 5: Correct final-day and negative-day badge text
  const badgeText =
    isCurrentPeriod && daysRemaining !== null && daysRemaining >= 0
      ? daysRemaining === 0
        ? 'Hari terakhir periode'
        : `Tersisa ${daysRemaining} hari`
      : null;

  return (
    <Card
      variant="flat"
      className="p-4 bg-primary-soft/30 border border-primary/20 shadow-sm flex flex-col gap-3"
    >
      {/* Heading Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="material-symbols-rounded text-lg" aria-hidden="true">
            savings
          </span>
          <h3 className="text-label-caps font-bold uppercase tracking-wider text-text-primary">
            Rekomendasi Sinking Fund
          </h3>
        </div>
        {badgeText && (
          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
            {badgeText}
          </span>
        )}
      </div>

      {/* State Renderings */}
      {!isCurrentPeriod || status === 'historical-unavailable' ? (
        <div className="flex flex-col gap-1 py-1">
          <p className="text-body-sm font-semibold text-text-primary">
            Rekomendasi Sinking Fund historis belum tersedia.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            PocketFlow belum menyimpan snapshot saldo pocket untuk periode ini.
          </p>
        </div>
      ) : status === 'not-near-period-end' ? (
        <div className="flex flex-col gap-1 py-1">
          <p className="text-body-sm font-semibold text-text-primary">
            Rekomendasi saldo tersisa akan tersedia 5 hari sebelum periode berakhir.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            PocketFlow akan menghitung saldo tersisa dari pocket harian yang kamu sertakan saat mendekati akhir periode.
          </p>
        </div>
      ) : status === 'no-eligible-pockets' ? (
        <div className="flex flex-col gap-1 py-1">
          <p className="text-body-sm font-semibold text-text-primary">
            Belum ada pocket harian yang memenuhi syarat.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Aktifkan pocket spendable atau periksa pengaturan pocket yang disertakan.
          </p>
        </div>
      ) : status === 'no-positive-balance' ? (
        <div className="flex flex-col gap-1 py-1">
          <p className="text-body-sm font-semibold text-text-primary">
            Belum ada saldo positif yang direkomendasikan.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Rekomendasi akan muncul ketika pocket harian yang disertakan memiliki saldo positif mendekati akhir periode.
          </p>
        </div>
      ) : (
        /* Status === 'available' */
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-text-muted font-medium">
            Dana yang dapat dipertimbangkan
          </span>
          <span className="font-display text-amount-lg font-black text-primary block tracking-tight">
            {formatRupiah(suggestedAmount)}
          </span>
          <p className="text-xs text-text-secondary leading-relaxed">
            Berasal dari saldo positif pocket harian yang kamu sertakan.
          </p>
        </div>
      )}

      {/* Candidate Exclusions Configuration Disclosure (Current Period Only) */}
      {isCurrentPeriod && candidates.length > 0 && (
        <div className="pt-2 border-t border-primary/10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsConfigOpen((prev) => !prev)}
            aria-expanded={isConfigOpen}
            aria-controls="sinking-fund-config"
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80 transition-opacity w-max focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded"
          >
            <span
              className="material-symbols-rounded text-sm transition-transform duration-200"
              style={{ transform: isConfigOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            >
              chevron_right
            </span>
            <span>Atur pocket yang disertakan</span>
          </button>

          {isConfigOpen && (
            <div
              id="sinking-fund-config"
              className="flex flex-col gap-2 bg-surface/80 p-3 rounded-xl border border-border/30 mt-1"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Pocket spendable harian
              </span>
              <div className="flex flex-col gap-2">
                {candidates.map((c) => (
                  <label
                    key={c.pocketId}
                    htmlFor={`sinking-pocket-${c.pocketId}`}
                    className="flex items-center justify-between text-[11px] cursor-pointer select-none hover:bg-black/5 p-1 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        id={`sinking-pocket-${c.pocketId}`}
                        checked={!c.isExcluded}
                        onChange={(e) =>
                          setSinkingFundPocketIncluded(c.pocketId, e.target.checked)
                        }
                        aria-label={`Sertakan ${c.label} dalam rekomendasi Sinking Fund`}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      {c.emoji ? (
                        <span className="text-sm" aria-hidden="true">
                          {c.emoji}
                        </span>
                      ) : (
                        <span className="material-symbols-rounded text-sm text-text-muted" aria-hidden="true">
                          account_balance_wallet
                        </span>
                      )}
                      <span className="font-medium text-text-primary truncate">
                        {c.label}
                      </span>
                    </div>
                    <span className="font-display font-semibold text-text-secondary tabular-nums ml-2 flex-shrink-0">
                      {c.eligibleAmount > 0
                        ? formatRupiah(c.eligibleAmount)
                        : 'Rp0'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
