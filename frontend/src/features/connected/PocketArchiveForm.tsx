import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, PocketArchiveRequest, SessionClient } from '@/lib/api/sessionClient';
import type { ServerPocket } from '@/lib/api/masterData';

export function PocketArchiveForm({pocket,archive,pockets,client,onReload,onCancel,onExpired}:{
  pocket:ServerPocket;archive:boolean;pockets:ServerPocket[];client:SessionClient;
  onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  const selectId=useId();
  const wallet=pocket.templateKey==='cash'||pocket.templateKey==='nfc-card';
  const owner=pockets.find(p=>p.id===pocket.budgetOwnerPocketId && p.id!==pocket.id);
  const invalidOwner=pocket.budgetOwnerPocketId!==null && !owner;
  const dependents=pockets.filter(p=>p.budgetOwnerPocketId===pocket.id && (p.templateKey==='cash'||p.templateKey==='nfc-card'));
  const [selected,setSelected]=useState('keep');
  const [attempt,setAttempt]=useState<PocketArchiveRequest|null>(null);
  const [busy,setBusy]=useState(false),[reloadOnly,setReloadOnly]=useState(false),[message,setMessage]=useState('');
  const active=useRef(true),running=useRef(false);
  const blocked=archive?dependents.length>0:wallet && selected==='keep' && invalidOwner;
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if(!attempt)return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[attempt]);
  const send=async()=>{
    if(running.current||reloadOnly||(!attempt&&blocked))return;
    const payload=attempt??{clientMutationId:crypto.randomUUID(),expectedRevision:pocket.revision,isArchived:archive,
      ...(!archive&&wallet&&selected!=='keep'?{budgetOwnerPocketId:selected==='self'?null:selected}:{})};
    running.current=true;setBusy(true);setAttempt(payload);setMessage('');
    try {await client.setPocketArchived(pocket.id,payload);if(active.current)onReload();}
    catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof ApiError&&[400,404,409,422].includes(error.status)){
        setReloadOnly(true);setMessage(error.status===409?'Pocket berubah di server. Muat data terbaru sebelum mencoba kembali.':
          'Permintaan ditolak. Pocket atau hubungan budget mungkin sudah berubah. Muat data terbaru untuk memeriksanya.');
      }else setMessage('Hasil belum pasti. Coba ulang permintaan yang sama atau muat data server. Pilihan dikunci sementara.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <form aria-label={`${archive?'Arsipkan':'Pulihkan'} pocket ${pocket.name}`} aria-busy={busy}
    className="space-y-3 rounded-input bg-surface-container-low p-4" onSubmit={e=>{e.preventDefault();void send();}}>
    <p className="font-semibold break-words">{archive?'Arsipkan':'Pulihkan'} {pocket.emoji} {pocket.name}?</p>
    <p className="text-body-sm text-text-secondary">{archive?'Pocket keluar dari daftar aktif dan dapat dipulihkan.':'Pocket kembali ke daftar aktif.'} Saldo tidak dipindahkan; riwayat transaksi dan kategori tidak dihapus.</p>
    {archive&&dependents.length>0&&<p className="text-body-sm text-bahaya">Masih menjadi budget untuk: {dependents.map(p=>p.name).join(', ')}. Ubah pengaturan budget atau arsipkan wallet tersebut terlebih dahulu.</p>}
    {!archive&&wallet&&<>
      <label htmlFor={selectId} className="block text-body-sm font-semibold">Budget setelah dipulihkan</label>
      <select id={selectId} value={selected} disabled={!!attempt} onChange={e=>setSelected(e.target.value)}
        className="w-full min-w-0 rounded-input border border-border bg-surface p-3 text-body-sm focus:outline-primary disabled:opacity-60">
        <option value="keep" disabled={invalidOwner}>{invalidOwner?'Budget lama tidak aktif — pilih pengganti':`Pertahankan: ${owner?.name??'pocket sendiri'}`}</option>
        <option value="self">Pocket ini sendiri</option>
        {pockets.filter(p=>p.id!==pocket.id).map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
      </select>
      <p className="text-body-sm text-text-secondary">Pilihan budget hanya berlaku untuk pengeluaran baru. Atribusi transaksi lama tetap sama.</p>
    </>}
    {message&&<p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!reloadOnly&&<Button fullWidth type="submit" loading={busy} disabled={!attempt&&blocked} className="h-auto min-h-11 py-2">
      {attempt?'Coba ulang permintaan yang sama':archive?'Ya, arsipkan pocket':'Ya, pulihkan pocket'}
    </Button>}
    {attempt?<>
      <p className="text-body-sm text-text-secondary">Muat ulang membaca data terbaru tanpa mengirim perubahan baru.</p>
      <Button fullWidth type="button" variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button>
    </>:<Button fullWidth type="button" variant="ghost" onClick={onCancel}>Batal</Button>}
  </form>;
}
