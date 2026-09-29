import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError,SessionClient } from '@/lib/api/sessionClient';
import { formatRupiah } from '@/lib/currency';
import type { ServerPocket } from '@/lib/api/masterData';

export function OpeningBalanceForm({pocket,client,onReload,onCancel,onExpired}:{
  pocket:ServerPocket;client:SessionClient;onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  const [value,setValue]=useState(String(pocket.openingBalance)),[confirmed,setConfirmed]=useState(false);
  const [attempt,setAttempt]=useState<{clientMutationId:string;expectedRevision:number;openingBalance:number}|null>(null);
  const [busy,setBusy]=useState(false),[reloadOnly,setReloadOnly]=useState(false),[message,setMessage]=useState('');
  const active=useRef(true),running=useRef(false);
  const amount=Number(value),valid=/^\d+$/.test(value)&&Number.isSafeInteger(amount)&&amount>=0;
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{if(!attempt)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[attempt]);
  const send=async()=>{
    if(running.current||reloadOnly||(!attempt&&(!valid||!confirmed||amount===pocket.openingBalance)))return;
    const payload=attempt??{clientMutationId:crypto.randomUUID(),expectedRevision:pocket.revision,openingBalance:amount};
    running.current=true;setBusy(true);setAttempt(payload);setMessage('');
    try{await client.correctOpeningBalance(pocket.id,payload);if(active.current)onReload();}
    catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof ApiError&&[400,404,409,422].includes(error.status)){
        setReloadOnly(true);setMessage(error.status===409?'Pocket berubah di server. Muat data terbaru sebelum mengoreksi ulang.':'Koreksi ditolak. Muat data terbaru sebelum mencoba kembali.');
      }else setMessage('Hasil belum pasti. Coba ulang permintaan yang sama atau muat data server. Nominal dikunci sementara.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <form aria-label={`Koreksi saldo awal ${pocket.name}`} aria-busy={busy} className="space-y-3 rounded-input bg-surface-container-low p-4" onSubmit={e=>{e.preventDefault();void send();}}>
    <p className="text-body-sm">Saldo awal tersimpan: <strong>{formatRupiah(pocket.openingBalance)}</strong></p>
    <p className="text-body-sm text-text-secondary">Ini mengganti saldo dasar pocket, bukan mengisi saldo saat ini. Saldo saat ini akan dihitung ulang dari saldo awal dan transaksi yang ada.</p>
    <Input label="Saldo awal baru (rupiah)" inputMode="numeric" value={value} disabled={!!attempt} onChange={e=>{setValue(e.target.value);setConfirmed(false);}}
      error={!valid?'Masukkan rupiah bulat tanpa pemisah, minimal 0 dan dalam batas angka aman.':undefined}/>
    <p className="text-body-sm text-text-secondary">Tidak membuat pemasukan/pengeluaran baru dan tidak mengubah alokasi budget atau isi transaksi lama. Ini bukan rekonsiliasi saldo fisik maupun snapshot saldo historis.</p>
    <label className="flex items-start gap-3 text-body-sm"><input type="checkbox" className="mt-1 accent-primary" checked={confirmed} disabled={!!attempt} onChange={e=>setConfirmed(e.target.checked)}/>Saya memahami koreksi ini mengubah dasar perhitungan saldo.</label>
    {message&&<p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!reloadOnly&&<Button fullWidth type="submit" loading={busy} disabled={!attempt&&(!valid||!confirmed||amount===pocket.openingBalance)} className="h-auto min-h-11 py-2">{attempt?'Coba ulang permintaan yang sama':'Simpan koreksi saldo awal'}</Button>}
    {attempt?<><p className="text-body-sm text-text-secondary">Muat ulang hanya membaca data server, tanpa mengirim koreksi baru.</p><Button fullWidth type="button" variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button></>:
      <Button fullWidth type="button" variant="ghost" onClick={onCancel}>Batal</Button>}
  </form>;
}
