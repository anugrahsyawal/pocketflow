import type {ServerReport} from '@/lib/api/reportRead';
import {reportInsights} from '@/lib/api/reportInsights';
import {RuleBasedInsightsCard} from '@/features/reports/components/RuleBasedInsightsCard';

export function ConnectedReportInsights({report}:{report:ServerReport}) {
  const insights=reportInsights(report);
  return <section aria-label="Insight periode server">
    {/* Income-only surplus is a valid server insight, even without expense data. */}
    <RuleBasedInsightsCard insights={insights} hasExpenseData={report.totals.totalExpense>0||insights.length>0}/>
  </section>;
}
