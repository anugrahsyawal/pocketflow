import {useState} from 'react';
import type {MasterData} from '@/lib/api/masterData';
import {homeSnapshot,homePocketCards,homeAttention,jakartaDate} from '@/lib/api/homeSnapshot';
import {formatRupiah} from '@/lib/currency';
import type {SessionClient} from '@/lib/api/sessionClient';
import {ConnectedHomeRecent} from './ConnectedHomeRecent';
const labels={aman:'Aman',waspada:'Waspada',bahaya:'Bahaya',overbudget:'Overbudget','tanpa-alokasi':'Tanpa alokasi'};

export function ConnectedHomeSnapshot({data,client,onExpired}:{data:MasterData;client:SessionClient;onExpired:()=>void}) {
  const [hidden,setHidden]=useState(false);
  const snapshot=homeSnapshot(data,jakartaDate());
  const attention=homeAttention(data.pockets);
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
    <section aria-label="Ringkasan Pocket" className="space-y-3 pt-3">
      <h3 className="font-display text-headline-sm">Ringkasan Pocket</h3>
      {data.pockets.length===0?<p className="text-body-sm text-text-secondary">Belum ada pocket aktif.</p>:<>
        <p className="text-body-sm text-text-secondary">Geser untuk melihat semua pocket. Pengelompokan kartu tidak mengubah budget pengeluaran.</p>
        <div className="pocket-carousel" tabIndex={0} role="group" aria-label="Carousel saldo pocket">
          {homePocketCards(data.pockets).map(card=><article key={card.id} className="w-[90%] max-w-[360px] min-w-0 flex-shrink-0 snap-start rounded-card border border-border bg-surface p-4 shadow-card space-y-3">
            <h4 className="font-display font-bold break-words"><span aria-hidden="true">{card.members[0]!.emoji} </span>{card.members.map(p=>p.name).join(' + ')}</h4>
            <p className="text-xs text-text-secondary">Budget {card.members[0]!.name}: {card.members[0]!.budgetStatus?labels[card.members[0]!.budgetStatus!]:'Belum tersedia'}</p>
            <dl className="space-y-2 text-body-sm">{card.members.map(p=><div key={p.id} className="flex flex-wrap justify-between gap-2"><dt className="min-w-0 break-words text-text-secondary">{p.name}</dt><dd className="font-semibold break-all">{amount(p.currentBalance)}</dd></div>)}</dl>
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-body-sm"><span>Total tersedia</span><span className="font-bold text-primary break-all">{amount(card.total)}</span></div>
          </article>)}
        </div>
      </>}
    </section>
    <section aria-label="Butuh perhatian" className="space-y-3 pt-3">
      <h3 className="font-display text-headline-sm">Butuh perhatian</h3>
      {attention.alerts.length?<div className="pocket-carousel" tabIndex={0} role="group" aria-label="Carousel perhatian pocket">
        {attention.alerts.map(p=><article key={p.id} className={`w-[90%] max-w-[360px] min-w-0 flex-shrink-0 snap-start rounded-card border border-border p-4 space-y-3 ${p.budgetStatus==='waspada'?'bg-waspada-soft':'bg-bahaya-soft'}`}>
          <h4 className="font-bold break-words"><span aria-hidden="true">{p.emoji} </span>{p.name}</h4>
          <p className="font-semibold">{labels[p.budgetStatus!]}</p>
          <p className="text-body-sm">{p.budgetStatus==='overbudget'?'Pemakaian budget sudah mencapai atau melewati alokasi.':'Pemakaian budget perlu diperhatikan.'}</p>
          <a className="inline-flex items-center min-h-[44px] font-semibold text-primary underline" href={`#server-pocket-${p.id}`}>Lihat pocket {p.name}</a>
        </article>)}
      </div>:<p className="rounded-card border border-border bg-surface-container-low p-4 text-body-sm">{attention.allSafe?'Semua pocket yang dipantau masih aman.':data.pockets.length===0?'Belum ada pocket aktif untuk dipantau.':'Belum ada peringatan terdeteksi. Sebagian budget belum tersedia atau tanpa alokasi; kondisi aman belum dapat dipastikan.'}</p>}
    </section>
    <ConnectedHomeRecent client={client} data={data} hidden={hidden} onExpired={onExpired}/>
    <p className="text-xs text-text-secondary">Pratinjau ringkasan Beranda. Sembunyikan nominal mencakup carousel dan transaksi terbaru; laporan dan detail di bawah tetap terlihat. Tautan menuju pocket dan riwayat server di halaman ini. Navigasi detail lengkap belum terintegrasi di Beranda.</p>
  </section>;
}
