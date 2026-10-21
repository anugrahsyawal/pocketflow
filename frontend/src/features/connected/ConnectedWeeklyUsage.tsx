import type {ServerReport} from '@/lib/api/reportRead';
import {formatWeeklyAmount} from '@/lib/api/weeklyDisplay';
import {formatRupiah} from '@/lib/currency';
import {ProgressBar} from '@/components/ui/ProgressBar';

const temporal={selesai:'Selesai',berjalan:'Berjalan','akan-datang':'Akan datang'};
const statuses={aman:'Aman',waspada:'Waspada',bahaya:'Bahaya',overbudget:'Overbudget','tanpa-alokasi':'Tanpa alokasi'};
const date=(value:string)=>new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(value+'T00:00:00Z'));

export function ConnectedWeeklyUsage({report}:{report:ServerReport}) {
  return <section aria-label="Pemakaian mingguan server" className="rounded-card border border-border bg-surface p-4 space-y-4">
    <h3 className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">Pemakaian Mingguan</h3>
    <p className="text-body-sm text-text-secondary">Target setiap minggu adalah ¼ alokasi periode. Pembagian hari: 7–7–7–sisa hari, bukan per pocket.</p>
    {report.weeklyUsage.map(w=><section key={w.weekNumber} aria-label={`Minggu ${w.weekNumber}`} className={`space-y-2 rounded-xl p-2 ${w.temporalState==='berjalan'?'bg-primary/[0.04] border border-primary/10':'border border-transparent'}`}>
      <div className="flex flex-wrap justify-between gap-2">
        <h4 className="font-semibold text-body-sm">Minggu {w.weekNumber}</h4>
        <span className={`text-body-sm ${w.temporalState==='berjalan'?'text-primary':'text-text-secondary'}`}>{temporal[w.temporalState]}</span>
      </div>
      <p className="text-body-sm text-text-secondary">{date(w.startDate)} – {date(w.endDate)}</p>
      <div className="flex flex-wrap justify-between gap-2 text-body-sm"><span>Pengeluaran</span><span className="font-semibold">{formatRupiah(w.expense)}</span></div>
      {w.availability==='available'?<>
        <dl className="text-body-sm space-y-2">
          <div className="flex flex-wrap justify-between gap-2"><dt>Target mingguan</dt><dd>{w.allowance?formatWeeklyAmount(w.allowance):'Belum tersedia'}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Sisa target</dt><dd className={w.remaining&&w.remaining.numerator<0?'text-bahaya':'text-text-secondary'}>{w.remaining?formatWeeklyAmount(w.remaining):'Belum tersedia'}</dd></div>
        </dl>
        {w.usageRatio!==null&&<ProgressBar value={w.usageRatio} height="sm" variant={w.status&&w.status!=='tanpa-alokasi'?w.status:'neutral'}/>}
        <div className="flex flex-wrap justify-between gap-2 text-body-sm">
          <span>{w.usageRatio===null?'Persentase tidak tersedia':`${Math.round(w.usageRatio*100)}% terpakai`}</span>
          <span className={`font-semibold ${w.status==='overbudget'||w.status==='bahaya'?'text-bahaya':w.status==='aman'?'text-aman':'text-text-secondary'}`}>{w.status?statuses[w.status]:'Belum tersedia'}</span>
        </div>
      </>:<p className="text-body-sm text-text-secondary">{w.availability==='historical-unavailable'?'Target historis belum tersedia karena snapshot alokasi belum disimpan.':'Belum diatur. Alokasi periode belum lengkap; target mingguan belum tersedia.'}</p>}
    </section>)}
  </section>;
}
