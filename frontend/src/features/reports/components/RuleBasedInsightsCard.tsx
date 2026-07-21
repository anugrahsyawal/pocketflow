import { Card } from '@/components/ui/Card';
import type { ReportInsight, ReportInsightSeverity } from '@/lib/reportCalculations';

interface RuleBasedInsightsCardProps {
  insights: ReportInsight[];
  hasExpenseData: boolean;
}

const severityIconMap: Record<ReportInsightSeverity, string> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
  positive: 'check_circle',
};

const severityColorMap: Record<ReportInsightSeverity, { icon: string; border: string; bg: string }> = {
  critical: {
    icon: 'text-bahaya',
    border: 'border-bahaya/20',
    bg: 'bg-bahaya/[0.04]',
  },
  warning: {
    icon: 'text-waspada',
    border: 'border-waspada/20',
    bg: 'bg-waspada/[0.04]',
  },
  info: {
    icon: 'text-primary',
    border: 'border-primary/20',
    bg: 'bg-primary/[0.04]',
  },
  positive: {
    icon: 'text-aman',
    border: 'border-aman/20',
    bg: 'bg-aman/[0.04]',
  },
};

const MAX_VISIBLE_INSIGHTS = 3;

export function RuleBasedInsightsCard({
  insights,
  hasExpenseData,
}: RuleBasedInsightsCardProps) {
  const visibleInsights = insights.slice(0, MAX_VISIBLE_INSIGHTS);

  return (
    <Card
      variant="flat"
      className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
          Insight Periode
        </h3>
        <span className="text-[10px] text-text-muted bg-surface-container-high px-2 py-0.5 rounded-full font-medium tracking-wider uppercase">
          Berbasis aturan
        </span>
      </div>

      {!hasExpenseData ? (
        <div className="flex flex-col gap-1 py-2">
          <p className="text-body-sm font-semibold text-text-primary">
            Belum cukup data untuk membuat insight.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Insight pengeluaran akan muncul setelah ada transaksi pengeluaran pada periode ini.
          </p>
        </div>
      ) : visibleInsights.length === 0 ? (
        <div className="flex flex-col gap-1 py-2">
          <p className="text-body-sm font-semibold text-text-primary">
            Belum ada kondisi menonjol pada periode ini.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Data pengeluaran belum memicu aturan peringatan atau insight tertentu.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleInsights.map((insight) => {
            const styles = severityColorMap[insight.severity] || severityColorMap.info;
            const iconName = severityIconMap[insight.severity] || 'info';

            return (
              <div
                key={insight.id}
                className={`p-3 rounded-xl border ${styles.border} ${styles.bg} flex items-start gap-2.5`}
              >
                <span
                  className={`material-symbols-rounded text-lg flex-shrink-0 mt-0.5 ${styles.icon}`}
                  aria-hidden="true"
                >
                  {iconName}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h4 className="text-body-sm font-bold text-text-primary">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
