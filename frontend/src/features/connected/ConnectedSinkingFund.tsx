import type {ServerReport} from '@/lib/api/reportRead';
import {formatRupiah} from '@/lib/currency';

export function ConnectedSinkingFund({report,onIncluded,disabled}:{report:ServerReport;onIncluded:(id:string,included:boolean)=>void;disabled:boolean}) {
  const s=report.sinkingFund;
  return <section aria-label="Rekomendasi Sinking Fund server" className="rounded-card border border-primary/20 bg-primary-soft/30 p-4 space-y-3">
    <h3 className="text-label-caps font-bold text-primary">Rekomendasi Sinking Fund</h3>
    {s.daysRemaining!==null&&<p className="text-body-sm text-primary">{s.daysRemaining===0?'Hari terakhir periode':`Tersisa ${s.daysRemaining} hari`}</p>}
    {s.status==='historical-unavailable'?<p className="text-body-sm">Rekomendasi historis belum tersedia karena snapshot saldo belum disimpan.</p>:
      s.status==='not-near-period-end'?<p className="text-body-sm">Rekomendasi tersedia mulai 5 hari sebelum periode berakhir.</p>:
      s.status==='no-eligible-pockets'?<p className="text-body-sm">Belum ada pocket spendable aktif yang memenuhi syarat.</p>:
      s.status==='no-positive-balance'?<p className="text-body-sm">Belum ada saldo positif pada pocket yang memenuhi syarat.</p>:
      <div><p className="text-body-sm">Dana yang dapat dipertimbangkan</p><p className="font-display text-amount-lg font-bold text-primary break-words">{s.suggestedAmount===null?'Belum tersedia':formatRupiah(s.suggestedAmount)}</p>
        {s.suggestedAmount===0&&<p className="text-body-sm text-text-secondary">Tidak ada saldo positif yang disertakan dalam rekomendasi ini.</p>}</div>}
    <p className="text-body-sm text-text-secondary">Informasi saja, bukan transfer otomatis. Berdasarkan saldo positif pocket yang disertakan; saldo Cash/NFC tetap terpisah dari budget asal.</p>
    {report.period.isCurrent&&s.candidates.length>0&&<fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-primary/10 pt-3">
      <legend className="text-body-sm font-semibold">Pocket yang disertakan</legend>
      {s.candidates.map(c=><label key={c.pocketId} className="flex items-start gap-2 text-body-sm">
        <input type="checkbox" className="mt-1 shrink-0" checked={!c.isExcluded} aria-label={`Sertakan ${c.label} dalam rekomendasi Sinking Fund`} onChange={e=>onIncluded(c.pocketId,e.target.checked)}/>
        <span className="flex min-w-0 flex-1 flex-wrap justify-between gap-2"><span className="break-words">{c.emoji} {c.label}</span><span>{formatRupiah(c.eligibleAmount)}</span></span>
      </label>)}
    </fieldset>}
    {report.period.isCurrent&&<p className="text-xs text-text-secondary">Pilihan disimpan hanya di browser ini untuk akun ini, tidak disinkronkan. Perubahan pilihan memuat ulang laporan.</p>}
  </section>;
}
