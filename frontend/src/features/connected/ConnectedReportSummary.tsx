import type {ServerReport} from '@/lib/api/reportRead';
import {formatRupiah} from '@/lib/currency';
import {CashFlowTimelineChart} from '@/features/reports/components/CashFlowTimelineChart';
import {ConnectedPocketBudgetActuals} from './ConnectedPocketBudgetActuals';
import {ConnectedReportDistribution} from './ConnectedReportDistribution';

/** Presentation only: all financial values come from the validated server report. */
export function ConnectedReportSummary({report}:{report:ServerReport}) {
  const {totals,budget}=report;
  return <div className="space-y-4" aria-label="Ringkasan laporan server">
    <section aria-label="Arus kas bersih" className="rounded-card bg-primary p-5 text-white shadow-card space-y-2">
      <h3 className="text-label-caps">Arus Kas Bersih</h3>
      <p className="font-display text-amount-lg font-bold break-words">{formatRupiah(totals.netCashFlow)}</p>
      <p className="inline-block rounded-pill bg-white/20 px-3 py-1 text-body-sm">{totals.netCashFlow>0?'Surplus Periode Ini':totals.netCashFlow<0?'Defisit Periode Ini':'Seimbang pada Periode Ini'}</p>
    </section>
    <dl className="grid grid-cols-2 gap-3">
      <div className="min-w-0 rounded-card border border-border p-3"><dt className="text-body-sm text-text-secondary">Pemasukan</dt><dd className="font-semibold text-aman break-words">{formatRupiah(totals.totalIncome)}</dd></div>
      <div className="min-w-0 rounded-card border border-border p-3"><dt className="text-body-sm text-text-secondary">Pengeluaran</dt><dd className="font-semibold text-bahaya break-words">{formatRupiah(totals.totalExpense)}</dd></div>
    </dl>
    {totals.transactionCount===0&&<p role="status" className="text-body-sm text-text-secondary">Belum ada transaksi aktif pada periode ini.</p>}
    <CashFlowTimelineChart points={report.daily.map(point=>({...point,dayLabel:new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(point.date+'T00:00:00Z'))}))}/>
    <section aria-label="Anggaran periode server" className="rounded-card border border-border p-4 space-y-2">
      <h3 className="font-display text-headline-sm">Anggaran Periode</h3>
      {budget.availability==='historical-unavailable'?<p className="text-body-sm text-text-secondary">Anggaran historis belum tersedia karena snapshot alokasi belum disimpan.</p>:
        budget.availability==='missing-allocation'?<p className="text-body-sm text-text-secondary">Belum diatur. Alokasi periode ini belum tersedia.</p>:
        <dl className="space-y-2 text-body-sm">
          {[['Total anggaran',budget.revisedAllocation],['Pengeluaran aktual',budget.expense],['Sisa anggaran',budget.remaining]].map(([label,value])=><div key={String(label)} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-semibold">{typeof value==='number'?formatRupiah(value):'Belum tersedia'}</dd></div>)}
        </dl>}
    </section>
    <ConnectedPocketBudgetActuals report={report}/>
    <ConnectedReportDistribution report={report}/>
    <p className="text-body-sm text-text-secondary">{totals.transactionCount} transaksi · {totals.expenseCount} pengeluaran · {totals.incomeCount} pemasukan · {totals.transferCount} transfer. Transfer tidak dihitung sebagai pemasukan atau pengeluaran.</p>
  </div>;
}
