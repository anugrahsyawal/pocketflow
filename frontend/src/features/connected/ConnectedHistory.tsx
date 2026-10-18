import { useEffect,useId,useRef,useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError,SessionClient,sessionErrorMessage } from '@/lib/api/sessionClient';
import { transactionQuery,type TransactionQuery,type TransactionPage } from '@/lib/api/transactionRead';
import type { MasterData } from '@/lib/api/masterData';
import { formatRupiah } from '@/lib/currency';
import {useTransactionLifecycle} from './useTransactionLifecycle';
import {TransactionEditForm,EditChangesSummary} from './TransactionEditForm';
import {editAttemptRequest} from '@/lib/api/transactionAttempt';

const empty={type:'',pocketId:'',categoryId:'',startDate:'',endDate:'',search:'',includeArchived:false};
const labels={expense:'Pengeluaran',income:'Pemasukan',transfer:'Transfer'};

/** Server history. Never sums a partial page into a balance. */
export function ConnectedHistory({ownerId,client,data,onExpired,onResolved,onLock,blocked}:{ownerId:string;client:SessionClient;data:MasterData;onExpired:()=>void;onResolved:(message:string)=>void;onLock:(locked:boolean)=>void;blocked:boolean}) {
  const lifecycle=useTransactionLifecycle({ownerId,client,onExpired,onResolved,onLock});
  const recoveryPanel=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(lifecycle.selected||lifecycle.pending)recoveryPanel.current?.focus();},[lifecycle.selected,lifecycle.pending]);
  const id=useId(),[draft,setDraft]=useState(empty),[query,setQuery]=useState<TransactionQuery>({page:1,limit:50});
  const [refresh,setRefresh]=useState(0),[result,setResult]=useState<TransactionPage|null>(null);
  const [error,setError]=useState(''),[validation,setValidation]=useState('');
  const pockets=[...data.pockets,...data.archivedPockets];
  const categories=pockets.flatMap(p=>[...p.categories,...p.archivedCategories]);
  const pocketLabel=(key:string|null)=>key===null?'—':pockets.find(p=>p.id===key)?.name??`Pocket tidak tersedia (${key})`;
  const categoryLabel=(key:string|null)=>key===null?'Tanpa kategori':categories.find(c=>c.id===key)?.name??`Kategori tidak tersedia (${key})`;
  useEffect(()=>{
    let current=true;
    void client.listTransactions(query).then(value=>{if(current)setResult(value);}).catch(cause=>{
      if(!current)return;
      if(cause instanceof ApiError&&cause.status===401){onExpired();return;}
      setError(sessionErrorMessage(cause));
    });
    return()=>{current=false;};
  },[client,onExpired,query,refresh]);
  const load=(next:TransactionQuery)=>{setResult(null);setError('');setQuery(next);};
  const field=(key:Exclude<keyof typeof empty,'includeArchived'>,value:string)=>setDraft(d=>({...d,[key]:value,...(key==='pocketId'?{categoryId:''}:{})}));
  const selectClass='w-full min-w-0 rounded-input border border-border bg-surface p-3 text-body-sm';
  return <section aria-label="Riwayat transaksi server" className="space-y-4 rounded-card border border-border bg-surface p-5">
    <h2 className="font-display text-headline-md">Riwayat transaksi</h2>
    <p className="text-body-sm text-text-secondary">Data server · arsip dapat dipulihkan. Filter tanggal memakai tanggal transaksi Jakarta. Daftar ini bukan perhitungan saldo atau export seluruh riwayat.</p>
    <div ref={recoveryPanel} tabIndex={-1} aria-label="Pemulihan arsip dan pulihkan" role="region" className="space-y-3 text-body-sm break-words">
      {lifecycle.message&&<p role="alert" className="text-bahaya">{lifecycle.message}</p>}
      {!lifecycle.ready?<Button variant="secondary" disabled={lifecycle.busy} onClick={()=>void lifecycle.inspect()}>Periksa pemulihan riwayat</Button>:lifecycle.record?.operation==='create'?<>
        <p>Ada transaksi baru tertunda. Selesaikan pada bagian Tambah transaksi sebelum tindakan riwayat lainnya.</p>
        <Button variant="secondary" onClick={()=>void lifecycle.inspect()}>Periksa pemulihan riwayat</Button>
      </>:lifecycle.pending?.operation==='batch'?<div className="space-y-3 rounded-input bg-primary-soft p-3" aria-label="Pemulihan batch pengeluaran">
        <h3 className="font-semibold">Batch {lifecycle.pending.body.items.length} pengeluaran tertunda</h3>
        <p>Isi dan urutan dikunci. Tetap tersimpan setelah reload/logout; tidak dikirim otomatis.</p>
        <ol className="space-y-3 max-h-80 overflow-y-auto" aria-label="Item batch asli">
          {lifecycle.pending.body.items.map((item,index)=><li key={item.clientMutationId} className="rounded-input bg-surface p-3 space-y-1 break-words">
            <p className="font-semibold">{index+1}. {formatRupiah(item.amount)} · {pocketLabel(item.pocketId)}</p>
            <p>{item.occurredOn} · {item.occurredAtLocalTime} WIB · {categoryLabel(item.categoryId??null)}</p>
            {item.note&&<p className="whitespace-pre-wrap">{item.note}</p>}
          </li>)}
        </ol>
        <Button fullWidth disabled={blocked} loading={lifecycle.busy} className="h-auto min-h-11 py-2" onClick={()=>void lifecycle.execute()}>Coba lagi batch yang sama</Button>
        {!lifecycle.confirmStop?<Button fullWidth variant="secondary" disabled={blocked||lifecycle.busy} onClick={()=>lifecycle.setConfirmStop(true)}>Hentikan permintaan batch</Button>:<>
          <p>Item yang sudah tersimpan tetap dipertahankan. Server menghentikan item yang belum tersimpan; ini bukan menghapus pengeluaran yang berhasil. Hasil tiap item akan ditampilkan.</p>
          <Button fullWidth variant="secondary" disabled={blocked} loading={lifecycle.busy} className="h-auto min-h-11 py-2" onClick={()=>void lifecycle.execute(true)}>Konfirmasi penghentian batch</Button>
          <Button fullWidth variant="ghost" disabled={lifecycle.busy} onClick={()=>lifecycle.setConfirmStop(false)}>Kembali</Button>
        </>}
      </div>:lifecycle.pending?<div className="space-y-3 rounded-input bg-primary-soft p-3">
        <p className="font-semibold">Permintaan {lifecycle.pending.operation==='edit'?'edit':lifecycle.pending.operation==='delete'?'hapus permanen':lifecycle.pending.operation==='archive'?'arsip':'pulihkan'} tertunda</p>
        <p>ID transaksi: {lifecycle.pending.transactionId} · Revisi: {lifecycle.pending.body.expectedRevision}</p>
        {lifecycle.pending.operation==='edit'&&<EditChangesSummary changes={editAttemptRequest(lifecycle.pending).changes} data={data}/>}
        <p>Tetap tersimpan setelah reload. Tidak ada pengiriman otomatis atau penggantian revisi.</p>
        <Button fullWidth disabled={blocked} loading={lifecycle.busy} className="h-auto min-h-11 py-2" onClick={()=>void lifecycle.execute()}>Coba lagi permintaan yang sama</Button>
        {!lifecycle.confirmStop?<Button fullWidth variant="secondary" disabled={blocked||lifecycle.busy} onClick={()=>lifecycle.setConfirmStop(true)}>{lifecycle.pending.operation==='edit'?'Hentikan permintaan edit':lifecycle.pending.operation==='delete'?'Hentikan permintaan hapus':'Hentikan permintaan arsip/pulihkan'}</Button>:<>
          <p>{lifecycle.pending.operation==='edit'?'Jika perubahan sudah tersimpan, hasilnya tetap dipertahankan. Jika belum, server mencegah permintaan edit ini berjalan kemudian. Ini bukan membatalkan perubahan yang sudah berhasil.':lifecycle.pending.operation==='delete'?'Jika sudah dihapus, transaksi tetap terhapus dan tidak dapat dipulihkan. Jika belum, server mencegah permintaan hapus ini berjalan kemudian. Ini bukan membatalkan penghapusan yang sudah berhasil.':'Jika sudah berhasil, hasil tetap dipertahankan. Jika belum, server mencegah permintaan ini berjalan kemudian. Ini bukan membatalkan arsip yang sudah berhasil atau menghapus transaksi.'}</p>
          <Button fullWidth disabled={blocked} loading={lifecycle.busy} className="h-auto min-h-11 py-2" onClick={()=>void lifecycle.execute(true)}>Konfirmasi penghentian riwayat</Button>
          <Button fullWidth variant="ghost" disabled={lifecycle.busy} onClick={()=>lifecycle.setConfirmStop(false)}>Kembali</Button>
        </>}
      </div>:lifecycle.selected&&lifecycle.editing?<TransactionEditForm key={lifecycle.selected.id} transaction={lifecycle.selected} ownerId={ownerId} data={data} busy={lifecycle.busy} blocked={blocked} onCancel={()=>lifecycle.setSelected(null)} onConfirm={changes=>void lifecycle.execute(false,changes)}/>:lifecycle.selected?<div className={`space-y-3 rounded-input p-3 ${lifecycle.deleting?'bg-bahaya-soft':'bg-primary-soft'}`}>
        <h3 className="font-semibold">{lifecycle.deleting?'Hapus permanen':lifecycle.selected.isArchived?'Pulihkan':'Arsipkan'} transaksi ini?</h3>
        <p>{labels[lifecycle.selected.type]} · {formatRupiah(lifecycle.selected.amount)} · {lifecycle.selected.occurredOn}</p>
        <p>{lifecycle.selected.type==='transfer'?`${pocketLabel(lifecycle.selected.fromPocketId)} → ${pocketLabel(lifecycle.selected.toPocketId)}`:pocketLabel(lifecycle.selected.pocketId)} · {lifecycle.selected.occurredAtLocalTime} WIB</p>
        <p>{lifecycle.selected.note}</p>
        <p>{lifecycle.deleting?'Transaksi ini tidak dapat dipulihkan setelah dihapus. Dampaknya tidak lagi dihitung pada saldo dan laporan. Gunakan Arsipkan jika ingin penghapusan yang dapat dibatalkan.':lifecycle.selected.isArchived?'Dampak transaksi akan dihitung kembali pada saldo dan laporan.':'Dampak transaksi akan dikeluarkan dari saldo dan laporan aktif. Data tidak dihapus dan dapat dipulihkan.'} Server memeriksa aturan sebelum menyimpan.</p>
        <Button fullWidth variant={lifecycle.deleting?'danger':'primary'} className="h-auto min-h-11 py-2" disabled={blocked} loading={lifecycle.busy} onClick={()=>void lifecycle.execute()}>Konfirmasi {lifecycle.deleting?'hapus permanen':lifecycle.selected.isArchived?'pulihkan':'arsip'}</Button>
        <Button fullWidth variant="ghost" disabled={lifecycle.busy} onClick={()=>lifecycle.setSelected(null)}>Batal</Button>
      </div>:null}
    </div>
    <form aria-label="Filter riwayat server" className="space-y-3" onSubmit={e=>{
      e.preventDefault();
      const next:TransactionQuery={page:1,limit:50,type:draft.type?draft.type as TransactionQuery['type']:undefined,
        pocketId:draft.pocketId||undefined,categoryId:draft.categoryId||undefined,startDate:draft.startDate||undefined,
        endDate:draft.endDate||undefined,search:draft.search||undefined,includeArchived:draft.includeArchived};
      try{transactionQuery(next);setValidation('');load(next);}catch{setValidation('Periksa rentang tanggal dan pencarian maksimal 100 karakter.');}
    }}>
      <label htmlFor={`${id}-type`} className="block text-body-sm">Jenis transaksi</label>
      <select id={`${id}-type`} value={draft.type} onChange={e=>field('type',e.target.value)} className={selectClass}>
        <option value="">Semua jenis</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select>
      <label htmlFor={`${id}-pocket`} className="block text-body-sm">Filter pocket</label>
      <select id={`${id}-pocket`} value={draft.pocketId} onChange={e=>field('pocketId',e.target.value)} className={selectClass}>
        <option value="">Semua pocket</option>{pockets.map(p=><option key={p.id} value={p.id}>{p.name}{data.archivedPockets.some(a=>a.id===p.id)?' (diarsipkan)':''}</option>)}
      </select>
      <label htmlFor={`${id}-category`} className="block text-body-sm">Filter kategori</label>
      <select id={`${id}-category`} value={draft.categoryId} onChange={e=>field('categoryId',e.target.value)} className={selectClass}>
        <option value="">Semua kategori</option>{categories.filter(c=>!draft.pocketId||c.pocketId===draft.pocketId).map(c=><option key={c.id} value={c.id}>{c.name} · {pocketLabel(c.pocketId)}</option>)}
      </select>
      <Input label="Tanggal mulai" type="date" value={draft.startDate} onChange={e=>field('startDate',e.target.value)}/>
      <Input label="Tanggal akhir" type="date" value={draft.endDate} onChange={e=>field('endDate',e.target.value)}/>
      <Input label="Cari catatan" value={draft.search} maxLength={100} onChange={e=>field('search',e.target.value)}/>
      <label className="flex gap-2 text-body-sm"><input type="checkbox" checked={draft.includeArchived} onChange={e=>setDraft(d=>({...d,includeArchived:e.target.checked}))}/>Sertakan transaksi diarsipkan</label>
      {validation&&<p role="alert" className="text-body-sm text-bahaya">{validation}</p>}
      <Button fullWidth type="submit">Terapkan filter</Button>
      <Button fullWidth type="button" variant="ghost" onClick={()=>{setDraft(empty);setValidation('');load({page:1,limit:50});}}>Reset filter</Button>
    </form>
    <Button fullWidth variant="secondary" onClick={()=>{setResult(null);setError('');setRefresh(n=>n+1);}}>Muat ulang riwayat</Button>
    <div aria-live="polite" aria-busy={!result&&!error}>
      {error?<p role="alert" className="text-bahaya text-body-sm">{error} Riwayat belum ditampilkan. Gunakan Muat ulang riwayat.</p>:!result?<p role="status">Memuat riwayat…</p>:<>
        <p className="text-body-sm text-text-secondary">Halaman {result.pagination.page} dari {result.pagination.totalPages} · {result.pagination.total} transaksi sesuai filter</p>
        {!result.transactions.length&&<p className="py-4 text-body-sm">{result.pagination.total===0?'Tidak ada transaksi sesuai filter.':'Halaman ini kosong. Kembali ke halaman sebelumnya atau reset filter.'}</p>}
        <ul className="divide-y divide-border">
          {result.transactions.map(t=><li key={t.id} className="py-4 space-y-1 text-body-sm break-words">
            <p className="font-semibold">{labels[t.type]}{t.isArchived?' · Diarsipkan':''}</p>
            <p className="font-bold text-primary">{formatRupiah(t.amount)}</p>
            <p>{t.type==='transfer'?`${pocketLabel(t.fromPocketId)} → ${pocketLabel(t.toPocketId)}`:pocketLabel(t.pocketId)}</p>
            {t.type==='expense'&&<p>{categoryLabel(t.categoryId)} · Budget: {pocketLabel(t.budgetPocketId)}</p>}
            <p className="text-text-secondary">{t.occurredOn} · {t.occurredAtLocalTime} WIB</p>
            {t.note&&<p className="whitespace-pre-wrap">{t.note}</p>}
            <Button size="sm" variant="secondary" disabled={blocked||!lifecycle.ready||lifecycle.busy||!!lifecycle.record||!!lifecycle.selected} onClick={()=>lifecycle.setSelected(t,false,true)}>Edit transaksi</Button>
            <Button size="sm" variant="secondary" disabled={blocked||!lifecycle.ready||lifecycle.busy||!!lifecycle.record||!!lifecycle.selected} onClick={()=>lifecycle.setSelected(t)}>{t.isArchived?'Pulihkan transaksi':'Arsipkan transaksi'}</Button>
            <Button size="sm" variant="ghost" className="text-bahaya" disabled={blocked||!lifecycle.ready||lifecycle.busy||!!lifecycle.record||!!lifecycle.selected} onClick={()=>lifecycle.setSelected(t,true)}>Hapus permanen</Button>
          </li>)}
        </ul>
        <div className="flex flex-wrap gap-2 pt-3">
          <Button variant="secondary" disabled={result.pagination.page<=1} onClick={()=>load({...query,page:result.pagination.page-1})}>Sebelumnya</Button>
          <Button variant="secondary" disabled={!result.pagination.hasMore} onClick={()=>load({...query,page:result.pagination.page+1})}>Berikutnya</Button>
        </div>
      </>}
    </div>
  </section>;
}
