import {useState} from 'react';
import type {MasterData} from '@/lib/api/masterData';
import {homeSnapshot,jakartaDate} from '@/lib/api/homeSnapshot';
import {formatRupiah} from '@/lib/currency';

export function ConnectedHomeSnapshot({data}:{data:MasterData}) {
  const [hidden,setHidden]=useState(false);
  const snapshot=homeSnapshot(data,jakartaDate());
  const amount=(value:number|null)=>hidden?'••••••••':value===null?'Belum tersedia':formatRupiah(value);
  return <section aria-label="Ringkasan Beranda server" className="space-y-3">
    <h2 className="font-display text-headline-md">Beranda</h2>
    <p className="text-body-sm text-text-secondary">Periode {data.period?.startDate} — {data.period?.endDate}</p>
    <div className="rounded-card border border-border bg-surface p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label-caps font-semibold text-text-secondary">Total semua pocket</h3>
        <button type="button" aria-label={hidden?'Tampilkan nominal Beranda':'Sembunyikan nominal Beranda'} aria-pressed={hidden} onClick={()=>setHidden(v=>!v)} className="min-h-[44px] min-w-[44px] rounded-full focus-visible:outline focus-visible:outline-primary">
          <span aria-hidden="true" className="material-symbols-rounded">{hidden?'visibility_off':'visibility'}</span>
        </button>
      </div>
      <p className="font-display text-amount-lg font-bold break-words">{amount(snapshot.total)}</p>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-3">
        <div className="min-w-0"><dt className="text-body-sm text-text-secondary">Sisa spendable</dt><dd className="font-semibold break-words">{amount(snapshot.spendable)}</dd></div>
        <div className="min-w-0"><dt className="text-body-sm text-text-secondary">Aman per hari</dt><dd className="font-semibold break-words">{amount(snapshot.safePerDay)}</dd></div>
      </dl>
      <p className="text-body-sm text-text-secondary">{snapshot.remainingDays===null?'Periode perlu dimuat ulang untuk menghitung aman per hari.':`Perkiraan dari saldo spendable dibagi ${snapshot.remainingDays} hari tersisa, termasuk hari ini.`} Saldo Cash/NFC dihitung sekali, tidak digabung ulang dengan budget asal.</p>
    </div>
    <p className="text-xs text-text-secondary">Pratinjau ringkasan Beranda. Sembunyikan nominal hanya berlaku pada ringkasan ini; laporan dan detail di bawah tetap terlihat. Carousel pocket, perhatian dan transaksi terbaru belum terintegrasi di Beranda.</p>
  </section>;
}
