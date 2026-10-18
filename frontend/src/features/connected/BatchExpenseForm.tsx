import {useEffect,useId,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {ApiError,SessionClient} from '@/lib/api/sessionClient';
import {TransactionAttemptStore,type TransactionBatchAttempt} from '@/lib/api/transactionAttempt';
import {snapshotBatchRequest} from '@/lib/api/transactionBatch';
import type {ServerPocket} from '@/lib/api/masterData';
import {formatRupiah} from '@/lib/currency';

interface Draft {key:string;pocketId:string;categoryId:string;amount:string;date:string;time:string;note:string}
const fresh=(pocketId:string):Draft=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const value=(key:string)=>parts.find(p=>p.type===key)!.value;
  return {key:crypto.randomUUID(),pocketId,categoryId:'',amount:'',date:`${value('year')}-${value('month')}-${value('day')}`,time:`${value('hour')}:${value('minute')}`,note:''};
};

/** Drafts are ephemeral; only explicit confirmation prepares the shared durable slot. */
export function BatchExpenseForm({ownerId,pockets,client,onCancel,onFinished,onExpired}:{
  ownerId:string;pockets:ServerPocket[];client:SessionClient;onCancel:()=>void;onFinished:()=>void;onExpired:()=>void;
}){
  const id=useId(),[drafts,setDrafts]=useState<Draft[]>(()=>[fresh(pockets[0]?.id??'')]);
  const [candidate,setCandidate]=useState<TransactionBatchAttempt|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [store]=useState(()=>new TransactionAttemptStore());
  const running=useRef(false),active=useRef(true),panel=useRef<HTMLDivElement>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{if(candidate)panel.current?.focus();},[candidate]);
  const name=(key:string)=>pockets.find(p=>p.id===key)?.name??key;
  const update=(key:string,change:Partial<Draft>)=>{setDrafts(rows=>rows.map(row=>row.key===key?{...row,...change}:row));setMessage('');};
  const review=()=>{
    try{
      const totals=new Map<string,bigint>();
      const items=drafts.map((row,index)=>{
        const pocket=pockets.find(p=>p.id===row.pocketId);
        if(!pocket||!/^\d+$/.test(row.amount)||!Number.isSafeInteger(Number(row.amount))||Number(row.amount)<1||
          row.categoryId&&!pocket.categories.some(c=>c.id===row.categoryId))throw new Error(`Periksa pocket, kategori dan nominal item ${index+1}.`);
        totals.set(row.pocketId,(totals.get(row.pocketId)??0n)+BigInt(row.amount));
        return {clientMutationId:crypto.randomUUID(),type:'expense' as const,amount:Number(row.amount),pocketId:row.pocketId,
          occurredOn:row.date,occurredAtLocalTime:row.time,...(row.categoryId?{categoryId:row.categoryId}:{}),...(row.note?{note:row.note}:{})};
      });
      for(const [key,total] of totals){const balance=pockets.find(p=>p.id===key)?.currentBalance;
        if(balance!=null&&total>BigInt(balance))throw new Error(`Total pengeluaran ${name(key)} melebihi saldo yang ditampilkan. Periksa semua item atau batalkan untuk memuat data terbaru.`);
      }
      const safe=snapshotBatchRequest({ownerId,body:{clientMutationId:crypto.randomUUID(),items}});
      setCandidate({version:1,ownerId,operation:'batch',body:safe.body});setMessage('');
    }catch(error){setMessage(error instanceof ApiError?'Periksa tanggal, waktu dan catatan maksimal 500 karakter pada semua item.':error instanceof Error?error.message:'Periksa semua item.');}
  };
  const send=async()=>{
    if(running.current||!candidate)return;
    running.current=true;setBusy(true);setMessage('');let persisted=false;
    try{
      const saved=await store.prepare(candidate);persisted=true;
      if(!active.current)return;
      // A competing tab wins the same slot: recover that request, never overwrite/send ours.
      if(!saved.created){onFinished();return;}
      await client.createTransactionBatch({ownerId,body:candidate.body});
      await store.acknowledge(candidate);
      if(active.current)onFinished();
    }catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(persisted){onFinished();return;}
      setMessage('Penyimpanan pemulihan gagal. Tidak ada pengiriman. Periksa penyimpanan perangkat; jangan hapus data situs.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <div className="space-y-4" aria-label="Tambah beberapa pengeluaran">
    <h3 className="font-display text-headline-md">Beberapa pengeluaran</h3>
    <p className="text-body-sm text-text-secondary">1–50 item, disimpan bersama. Budget mengikuti pengaturan pocket Cash/NFC. Draft belum disimpan sampai konfirmasi.</p>
    {message&&<p role="alert" className="text-body-sm text-bahaya break-words">{message}</p>}
    {candidate?<div ref={panel} tabIndex={-1} role="region" aria-label="Konfirmasi batch" className="space-y-3 rounded-input bg-primary-soft p-3 break-words">
      <h4 className="font-semibold">Periksa {candidate.body.items.length} pengeluaran</h4>
      <ol className="space-y-3 max-h-96 overflow-y-auto">{candidate.body.items.map((item,index)=><li key={item.clientMutationId} className="rounded-input bg-surface p-3 space-y-1">
        <p className="font-semibold">{index+1}. {formatRupiah(item.amount)} · {name(item.pocketId)}</p>
        <p className="text-body-sm">{item.occurredOn} · {item.occurredAtLocalTime} WIB</p>
        <p className="text-body-sm">{pockets.find(p=>p.id===item.pocketId)?.categories.find(c=>c.id===item.categoryId)?.name??'Tanpa kategori'}</p>
        {item.note&&<p className="text-body-sm whitespace-pre-wrap">{item.note}</p>}
      </li>)}</ol>
      <p className="text-body-sm">Total: Rp{candidate.body.items.reduce((sum,item)=>sum+BigInt(item.amount),0n).toLocaleString('id-ID')}</p>
      <p className="text-body-sm">Server memeriksa saldo gabungan. Jika hasil belum pasti, pulihkan batch yang sama di Riwayat transaksi; jangan buat pengganti.</p>
      <Button fullWidth loading={busy} className="h-auto min-h-11 py-2" onClick={()=>void send()}>Konfirmasi simpan batch</Button>
      <Button fullWidth variant="ghost" disabled={busy} onClick={()=>setCandidate(null)}>Kembali ke draft</Button>
      <Button fullWidth variant="ghost" disabled={busy} onClick={onCancel}>Batal batch</Button>
    </div>:<form aria-label="Form batch pengeluaran" className="space-y-4" onSubmit={e=>{e.preventDefault();review();}}>
      {drafts.map((row,index)=>{
        const pocket=pockets.find(p=>p.id===row.pocketId),key=`${id}-${row.key}`;
        return <fieldset key={row.key} className="min-w-0 space-y-3 rounded-card border border-border p-3">
          <legend className="px-1 font-semibold">Pengeluaran {index+1}</legend>
          <Input label={`Nominal item ${index+1} (rupiah)`} inputMode="numeric" required value={row.amount} onChange={e=>update(row.key,{amount:e.target.value})}/>
          <label htmlFor={`${key}-pocket`} className="block text-body-sm">Pocket item {index+1}</label>
          <select id={`${key}-pocket`} value={row.pocketId} onChange={e=>update(row.key,{pocketId:e.target.value,categoryId:''})} className="w-full min-w-0 rounded-input border border-border bg-surface p-3">
            {pockets.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
          <p className="text-body-sm text-text-secondary">Saldo: {pocket?.currentBalance==null?'Belum tersedia':formatRupiah(pocket.currentBalance)}</p>
          <fieldset className="min-w-0 space-y-2"><legend className="text-body-sm">Kategori item {index+1}</legend>
            <div className="flex flex-wrap gap-2">{[{id:'',name:'Tanpa kategori',emoji:'📝'},...(pocket?.categories??[])].map(category=><button key={category.id} type="button" aria-pressed={row.categoryId===category.id} onClick={()=>update(row.key,{categoryId:category.id})} className={`flex-[1_1_auto] max-w-full rounded-full border px-3 py-2 text-body-sm break-words ${row.categoryId===category.id?'bg-primary-soft border-primary text-primary':'border-border bg-background'}`}>{category.emoji} {category.name}</button>)}</div>
          </fieldset>
          <Input label={`Tanggal item ${index+1} (WIB)`} type="date" required value={row.date} onChange={e=>update(row.key,{date:e.target.value})}/>
          <Input label={`Waktu item ${index+1} (WIB)`} type="time" required value={row.time} onChange={e=>update(row.key,{time:e.target.value})}/>
          <Input label={`Catatan item ${index+1}`} maxLength={500} value={row.note} onChange={e=>update(row.key,{note:e.target.value})}/>
          <Button type="button" size="sm" variant="ghost" disabled={drafts.length===1} onClick={()=>setDrafts(rows=>rows.filter(r=>r.key!==row.key))}>Hapus item {index+1}</Button>
        </fieldset>;
      })}
      <Button type="button" fullWidth variant="secondary" disabled={drafts.length>=50} onClick={()=>setDrafts(rows=>[...rows,fresh(rows[rows.length-1]?.pocketId??pockets[0]?.id??'')])}>Tambah item pengeluaran</Button>
      <Button type="submit" fullWidth>Periksa batch</Button>
      <Button type="button" fullWidth variant="ghost" onClick={onCancel}>Batal batch</Button>
    </form>}
  </div>;
}
