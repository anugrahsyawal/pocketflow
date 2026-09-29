import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, BudgetOwnerRequest, SessionClient } from '@/lib/api/sessionClient';
import type { ServerPocket } from '@/lib/api/masterData';

export function BudgetOwnerForm({pocket,pockets,client,onReload,onCancel,onExpired}:{
  pocket:ServerPocket;pockets:ServerPocket[];client:SessionClient;
  onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  const selectId=useId();
  const [selected,setSelected]=useState(pocket.budgetOwnerPocketId??'');
  const [attempt,setAttempt]=useState<BudgetOwnerRequest|null>(null);
  const [busy,setBusy]=useState(false);
  const [reloadOnly,setReloadOnly]=useState(false);
  const [message,setMessage]=useState('');
  const active=useRef(true), running=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if(!attempt)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[attempt]);
  const send=async()=>{
    if(running.current || reloadOnly)return;
    const payload=attempt??{clientMutationId:crypto.randomUUID(),expectedRevision:pocket.revision,budgetOwnerPocketId:selected||null};
    running.current=true;setBusy(true);setAttempt(payload);setMessage('');
    try {
      await client.updateBudgetOwner(pocket.id,payload);
      if(active.current)onReload();
    } catch(error) {
      if(!active.current)return;
      if(error instanceof ApiError && error.status===401){onExpired();return;}
      if(error instanceof ApiError && [400,404,409,422].includes(error.status)) {
        setReloadOnly(true);
        setMessage(error.status===409
          ? 'Data berubah di server. Muat data terbaru sebelum memilih ulang. Perubahan Anda tidak ditimpa ke server.'
          : 'Perubahan ditolak server. Pocket atau pilihan budget mungkin sudah berubah. Muat data terbaru sebelum mencoba lagi.');
      } else setMessage('Hasil penyimpanan belum pasti. Coba ulang permintaan yang sama atau muat data server. Pilihan dikunci untuk mencegah perubahan ganda.');
    } finally {running.current=false;if(active.current)setBusy(false);}
  };
  return <form aria-label={`Atur budget ${pocket.name}`} className="space-y-3 rounded-input bg-surface-container-low p-4"
    onSubmit={event=>{event.preventDefault();void send();}} aria-busy={busy}>
    <label htmlFor={selectId} className="block text-body-sm font-semibold">Budget untuk pengeluaran baru</label>
    <select id={selectId} value={selected} disabled={!!attempt || busy} onChange={event=>setSelected(event.target.value)}
      className="w-full min-w-0 rounded-input border border-border bg-surface px-3 py-3 text-body-sm focus:outline-primary disabled:opacity-60">
      <option value="">Pocket ini sendiri</option>
      {pocket.budgetOwnerPocketId && !pockets.some(p=>p.id===pocket.budgetOwnerPocketId) && <option value={pocket.budgetOwnerPocketId} disabled>Pemilik budget tidak tersedia</option>}
      {pockets.filter(p=>p.id!==pocket.id).map(p=><option value={p.id} key={p.id}>{p.emoji} {p.name}</option>)}
    </select>
    <p className="text-body-sm text-text-secondary">Hanya berlaku untuk pengeluaran baru. Saldo dan atribusi transaksi lama tidak berubah.</p>
    {message && <p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!reloadOnly && <Button type="submit" fullWidth loading={busy} className="h-auto min-h-11 py-2"
      disabled={!attempt && selected===(pocket.budgetOwnerPocketId??'')}>
      {attempt?'Coba ulang permintaan yang sama':'Simpan pengaturan'}
    </Button>}
    {attempt ? <>
      <p className="text-body-sm text-text-secondary">Muat ulang akan menutup isian ini dan membaca kondisi terbaru, bukan mengirim perubahan baru.</p>
      <Button type="button" fullWidth variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button>
    </> : <Button type="button" fullWidth variant="ghost" onClick={onCancel}>Batal</Button>}
  </form>;
}
