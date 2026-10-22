import {Modal} from '@/components/ui/Modal';
import type {MasterData,ServerPocket} from '@/lib/api/masterData';
import type {SessionClient} from '@/lib/api/sessionClient';
import {formatRupiah} from '@/lib/currency';
import {ConnectedHomeRecent} from './ConnectedHomeRecent';

export function ConnectedPocketDetail({pocket,data,client,hidden,onExpired,onClose}:{pocket:ServerPocket;data:MasterData;client:SessionClient;hidden:boolean;onExpired:()=>void;onClose:()=>void}) {
  const money=(value:number|null|undefined)=>hidden?'••••••••':value==null?'Belum tersedia':formatRupiah(value);
  const owner=[...data.pockets,...data.archivedPockets].find(p=>p.id===pocket.budgetOwnerPocketId);
  const budget=pocket.budget,known=budget?.availability==='available';
  return <Modal isOpen onClose={onClose} title={`Detail ${pocket.name}`}>
    <div className="space-y-4 text-body-sm break-words">
      <p className="text-text-secondary">Data server · periode {data.period?.startDate} — {data.period?.endDate}</p>
      <dl className="rounded-card bg-surface-container-low p-3 space-y-2">
        <div><dt>Saldo saat ini</dt><dd className="font-display text-headline-sm text-primary break-all">{money(pocket.currentBalance)}</dd></div>
        <div><dt>Pengeluaran dibebankan ke budget ini</dt><dd>{money(budget?.expense)}</dd></div>
        <div><dt>Alokasi periode</dt><dd>{money(known?budget.revisedAllocation:null)}</dd></div>
        <div><dt>Sisa budget</dt><dd>{money(known?budget.remaining:null)}</dd></div>
      </dl>
      {!known&&<p>Alokasi belum tersedia; jangan disamakan dengan nol.</p>}
      <p>Saldo adalah uang di pocket ini. Pengeluaran budget mengikuti sumber budget transaksi, bukan selalu pocket pembayaran.</p>
      {(pocket.templateKey==='cash'||pocket.templateKey==='nfc-card')&&<p>Budget pengeluaran baru: <strong>{pocket.budgetOwnerPocketId?owner?.name??'Pocket tidak tersedia':pocket.name}</strong>. Pengaturan ini tidak mengubah atribusi transaksi lama.</p>}
      <section aria-label="Kategori pocket"><h3 className="font-semibold">Kategori aktif</h3>{pocket.categories.length?<ul className="flex flex-wrap gap-2 mt-2">{pocket.categories.map(c=><li key={c.id} className="rounded-pill bg-surface-container-low px-3 py-2">{c.emoji} {c.name}</li>)}</ul>:<p>Belum ada kategori aktif.</p>}</section>
      <ConnectedHomeRecent key={pocket.id} pocketId={pocket.id} client={client} data={data} hidden={hidden} onExpired={onExpired}/>
      <p className="text-xs text-text-secondary">Detail baca-saja. Pengaturan dan tindakan transaksi tetap tersedia di bagian pocket/riwayat server setelah dialog ditutup.</p>
    </div>
  </Modal>;
}
