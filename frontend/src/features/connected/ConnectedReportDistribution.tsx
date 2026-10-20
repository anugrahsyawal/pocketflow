import type {ServerReport} from '@/lib/api/reportRead';
import {reportDistribution} from '@/lib/api/reportDistribution';
import {CategoryDistributionChart} from '@/features/reports/components/CategoryDistributionChart';
import {TopPocketSpendingChart} from '@/features/reports/components/TopPocketSpendingChart';

export function ConnectedReportDistribution({report}:{report:ServerReport}) {
  const {categories,pockets}=reportDistribution(report);
  return <div className="space-y-4">
    <section aria-label="Distribusi kategori server" className="space-y-2">
      <CategoryDistributionChart items={categories} totalExpense={report.totals.totalExpense}/>
      <p className="text-body-sm text-text-secondary">Lima kategori terbesar; sisanya digabung sebagai Lainnya. Hanya pengeluaran periode terpilih, tidak termasuk transfer.</p>
    </section>
    <section aria-label="Distribusi pocket pembayaran server" className="space-y-2">
      <TopPocketSpendingChart items={pockets} totalExpense={report.totals.totalExpense}/>
      <p className="text-body-sm text-text-secondary">Maksimal lima pocket pembayaran terbesar, termasuk Cash/NFC. Persentase dihitung dari seluruh pengeluaran periode, bukan pemakaian budget.</p>
    </section>
  </div>;
}
