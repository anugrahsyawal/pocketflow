import {useEffect,useState} from 'react';
import {ApiError,type SessionClient,sessionErrorMessage} from '@/lib/api/sessionClient';
import type {ServerTransaction} from '@/lib/api/transactionRead';
import type {MasterData} from '@/lib/api/masterData';
import {formatRupiah} from '@/lib/currency';
import {TRANSFER_TYPE_LABELS,INCOME_SOURCE_LABELS} from '@/data/constants';

/** A bounded server-ordered preview, never a balance or complete ledger. */
export function ConnectedHomeRecent({client,data,hidden,onExpired}:{client:SessionClient;data:MasterData;hidden:boolean;onExpired:()=>void}) {
  const [rows,setRows]=useState<ServerTransaction[]|null>(null);
  const [error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setRows(null);setError('');
    void client.listTransactions({page:1,limit:3,includeArchived:false}).then(page=>{if(active)setRows(page.transactions);}).catch(cause=>{
      if(!active)return;
      if(cause instanceof ApiError&&cause.status===401){onExpired();return;}
      setError(sessionErrorMessage(cause));
    });
    return()=>{active=false;};
  },[client,onExpired,retry]);
  const pockets=[...data.pockets,...data.archivedPockets];
  const categories=pockets.flatMap(p=>[...p.categories,...p.archivedCategories]);
  const pocketName=(id:string|null)=>pockets.find(p=>p.id===id)?.name??'Pocket tidak tersedia';
  return <section aria-label="Transaksi terbaru Beranda" className="rounded-card border border-border bg-surface p-4 space-y-3">
    <div className="flex flex-wrap justify-between items-center gap-2"><h3 className="font-display text-headline-sm">Transaksi terbaru</h3><a href="#server-history" className="inline-flex min-h-[44px] items-center text-primary font-semibold">Lihat riwayat</a></div>
    <p className="text-xs text-text-secondary">Maksimal 3 transaksi aktif terbaru, lintas periode. Filter riwayat tidak mengubah ringkasan ini.</p>
    {error?<div role="alert" className="text-body-sm space-y-2"><p>{error} Transaksi terbaru belum ditampilkan.</p><button type="button" className="min-h-[44px] text-primary underline" onClick={()=>setRetry(n=>n+1)}>Coba lagi transaksi terbaru</button></div>:rows===null?<p role="status">Memuat transaksi terbaru…</p>:!rows.length?<p className="text-body-sm">Belum ada transaksi aktif. Gunakan form Tambah transaksi di halaman ini untuk mencatat transaksi pertama.</p>:<ul className="divide-y divide-border">
      {rows.map(t=>{
        const category=categories.find(c=>c.id===t.categoryId);
        const label=t.type==='expense'?(t.categoryId===null?'Tanpa kategori':category?.name??'Kategori tidak tersedia'):t.type==='income'?(INCOME_SOURCE_LABELS[t.incomeSource??'']??'Pemasukan'):(TRANSFER_TYPE_LABELS[t.transferType??'']??'Transfer');
        return <li key={t.id} className="py-3 space-y-1 text-body-sm">
          <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold min-w-0 break-words"><span aria-hidden="true">{t.type==='transfer'?'↔':t.type==='income'?'↓':category?.emoji??'🧾'} </span>{label}</span><span className={`font-bold whitespace-nowrap ${t.type==='expense'?'text-bahaya':t.type==='income'?'text-aman':'text-primary'}`}>{hidden?'••••••••':`${t.type==='expense'?'-':t.type==='income'?'+':''}${formatRupiah(t.amount)}`}</span></div>
          <p className="break-words text-text-secondary">{t.type==='transfer'?`${pocketName(t.fromPocketId)} → ${pocketName(t.toPocketId)}`:pocketName(t.pocketId)}</p>
          <p className="text-xs text-text-secondary">{t.occurredOn} · {t.occurredAtLocalTime} WIB</p>
        </li>;
      })}
    </ul>}
  </section>;
}
