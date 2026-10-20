import type {ServerReport} from '@/lib/api/reportRead';
import {formatRupiah} from '@/lib/currency';
import {TRANSFER_TYPE_LABELS} from '@/data/constants';
import {ProgressBar} from '@/components/ui/ProgressBar';

const statusLabels={aman:'Aman',waspada:'Waspada',bahaya:'Bahaya',overbudget:'Overbudget','tanpa-alokasi':'Tanpa alokasi'};
const money=(value:number|null)=>value===null?'Belum tersedia':formatRupiah(value);

/** Budget attribution is independent of the payment pocket balance. */
export function ConnectedPocketBudgetActuals({report}:{report:ServerReport}) {
  return <section aria-label="Budget vs Aktual Pocket server" className="rounded-card border border-border bg-surface p-4 space-y-3">
    <h3 className="font-display text-headline-sm">Budget vs Aktual Pocket</h3>
    <p className="text-body-sm text-text-secondary">Pemakaian budget mengikuti sumber budget transaksi. Saldo menunjukkan uang di masing-masing pocket, termasuk Cash dan NFC.</p>
    {report.pocketBudgetActuals.length===0&&<p className="text-body-sm">Belum ada pocket pada laporan ini.</p>}
    {report.pocketBudgetActuals.map(p=>{
      const b=p.budget,known=b.availability==='available';
      const badge=b.availability==='historical-unavailable'?'Budget historis tidak tersedia':!known?'Belum diatur':b.status?statusLabels[b.status]:'Belum tersedia';
      return <details key={`${report.period.startDate}:${p.id}`} className="border-t border-border pt-3 text-body-sm" aria-label={`Rincian ${p.label}`}>
        <summary className="cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <span className="inline-flex max-w-full flex-wrap items-center gap-2 align-middle">
            <span aria-hidden="true">{p.emoji??'👛'}</span><span className="font-semibold break-words">{p.label}</span>
            <span className={`text-xs font-semibold ${b.status==='overbudget'||b.status==='bahaya'?'text-bahaya':b.status==='aman'?'text-aman':'text-text-secondary'}`}>{badge}</span>
          </span>
          <div className="mt-3 space-y-2">
            {b.usageRatio!==null&&<ProgressBar value={b.usageRatio} variant={b.status&&b.status!=='tanpa-alokasi'?b.status:'neutral'}/>}
            <div className="flex flex-wrap justify-between gap-2"><span>Pengeluaran budget</span><span className="font-semibold">{money(b.expense)}{known&&<> / {money(b.revisedAllocation)}</>}</span></div>
            {known?<div className="flex flex-wrap justify-between gap-2 text-text-secondary">
              <span>{b.usageRatio===null?'Persentase tidak tersedia':`${Math.round(b.usageRatio*100)}% terpakai`}</span>
              <span>Sisa budget {money(b.remaining)}</span>
            </div>:<p className="text-text-secondary">{b.availability==='historical-unavailable'?'Alokasi dan sisa budget periode lama belum tersedia.':'Alokasi periode ini belum diatur.'}</p>}
          </div>
        </summary>
        <div className="mt-3 rounded-xl bg-surface-container-low p-3 space-y-3">
          {(p.isMetadataMissing||!p.isCurrentlyActive)&&<p className="text-text-secondary">{p.isMetadataMissing?'Metadata pocket tidak tersedia.':'Pocket tidak aktif saat ini.'} Transaksi periode tetap ditampilkan.</p>}
          <dl className="space-y-2">
            {([
              ['Saldo saat ini',report.period.isCurrent?money(p.currentBalance):'Tidak ditampilkan untuk periode historis'],
              ['Pengeluaran dari pocket ini',money(p.paymentExpense)],
              ['Pengeluaran dibebankan ke budget ini',money(b.expense)],
              ['Alokasi setelah pindah budget',money(b.revisedAllocation)],
              ['Transfer biasa masuk',money(p.transfers.inAmount)],
              ['Transfer biasa keluar',money(p.transfers.outAmount)],
              ['Pindah alokasi masuk',money(p.reallocations.inAmount)],
              ['Pindah alokasi keluar',money(p.reallocations.outAmount)],
            ]).map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">{label}</dt><dd className="font-medium break-words">{value}</dd></div>)}
          </dl>
          {p.attributedBudgets.length>0&&<div><h4 className="font-semibold">Sumber budget pengeluaran pocket ini</h4><ul className="mt-2 space-y-1">{p.attributedBudgets.map(a=><li key={a.pocketId} className="flex flex-wrap justify-between gap-2"><span>{a.emoji} {a.label}</span><span>{money(a.amount)}</span></li>)}</ul></div>}
          {p.transferBreakdown.length>0&&<div><h4 className="font-semibold">Rincian jenis transfer</h4><ul className="mt-2 space-y-2">{p.transferBreakdown.map(t=><li key={t.type}><p className="font-medium">{TRANSFER_TYPE_LABELS[t.type]}</p><p className="text-text-secondary">Masuk {money(t.inAmount)} · Keluar {money(t.outAmount)} · {t.count} transaksi</p></li>)}</ul></div>}
          <p className="text-text-secondary">{p.paymentExpenseCount} pembayaran · {p.attributedExpenseCount} pengeluaran budget · {p.transfers.count} transfer biasa · {p.reallocations.count} pindah alokasi.</p>
        </div>
      </details>;
    })}
  </section>;
}
