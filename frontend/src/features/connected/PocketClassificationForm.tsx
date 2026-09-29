import { useEffect,useId,useRef,useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError,POCKET_GROUP_LABELS,SessionClient,type PocketGroup,type PocketClassificationRequest } from '@/lib/api/sessionClient';
import type { ServerPocket } from '@/lib/api/masterData';

export function PocketClassificationForm({pocket,client,onReload,onCancel,onExpired}:{
  pocket:ServerPocket;client:SessionClient;onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  const id=useId(),[group,setGroup]=useState(pocket.groupId),[spendable,setSpendable]=useState(pocket.isSpendable);
  const [attempt,setAttempt]=useState<PocketClassificationRequest|null>(null),[busy,setBusy]=useState(false),[reloadOnly,setReloadOnly]=useState(false),[message,setMessage]=useState('');
  const active=useRef(true),running=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{if(!attempt)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[attempt]);
  const send=async()=>{
    if(running.current||reloadOnly)return;
    const payload=attempt??{clientMutationId:crypto.randomUUID(),expectedRevision:pocket.revision,groupId:group,isSpendable:spendable};
    running.current=true;setBusy(true);setAttempt(payload);setMessage('');
    try{await client.updatePocketClassification(pocket.id,payload);if(active.current)onReload();}
    catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof ApiError&&[400,404,409,422].includes(error.status)){
        setReloadOnly(true);setMessage(error.status===409?'Pocket berubah di server. Muat data terbaru sebelum memilih ulang.':'Perubahan ditolak. Muat data terbaru sebelum mencoba kembali.');
      }else setMessage('Hasil belum pasti. Coba ulang permintaan yang sama atau muat data server. Pilihan dikunci sementara.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <form aria-label={`Klasifikasi pocket ${pocket.name}`} className="space-y-3 rounded-input bg-surface-container-low p-4" aria-busy={busy} onSubmit={e=>{e.preventDefault();void send();}}>
    <label htmlFor={id} className="block text-body-sm font-semibold">Kelompok pocket</label>
    <select id={id} value={group} disabled={!!attempt} onChange={e=>setGroup(e.target.value as PocketGroup)} className="w-full min-w-0 rounded-input border border-border bg-surface p-3">
      {(Object.keys(POCKET_GROUP_LABELS) as PocketGroup[]).map(key=><option key={key} value={key}>{POCKET_GROUP_LABELS[key]}</option>)}
    </select>
    <label className="flex items-start gap-3 text-body-sm"><input type="checkbox" checked={spendable} disabled={!!attempt} onChange={e=>setSpendable(e.target.checked)} className="mt-1 accent-primary"/>Tandai sebagai dana belanja (spendable)</label>
    <p className="text-body-sm text-text-secondary">Penanda dana belanja dipakai dalam analisis, bukan izin atau larangan mencatat pengeluaran. Saldo, alokasi, peran Cash/NFC dan transaksi lama tidak berubah.</p>
    {message&&<p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!reloadOnly&&<Button fullWidth type="submit" loading={busy} disabled={!attempt&&group===pocket.groupId&&spendable===pocket.isSpendable} className="h-auto min-h-11 py-2">
      {attempt?'Coba ulang permintaan yang sama':'Simpan klasifikasi'}
    </Button>}
    {attempt?<><p className="text-body-sm text-text-secondary">Muat ulang membaca data server tanpa mengirim perubahan baru.</p><Button fullWidth type="button" variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button></>:
      <Button fullWidth type="button" variant="ghost" onClick={onCancel}>Batal</Button>}
  </form>;
}
