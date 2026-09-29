import { useEffect, useRef, useState } from 'react';
import { DEFAULT_POCKETS } from '@/data/defaultPockets';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatRupiah } from '@/lib/currency';
import { ApiError, SessionClient, SetupRequest } from '@/lib/api/sessionClient';
import { buildSetupRequest } from '@/lib/api/setupDraft';

export function ConnectedSetup({client,onComplete,onExpired}:{client:SessionClient;onComplete:()=>void;onExpired:()=>void}) {
  const [keys,setKeys] = useState(DEFAULT_POCKETS.map(p=>p.id));
  const [cash,setCash] = useState('0');
  const [nfc,setNfc] = useState('0');
  const [review,setReview] = useState<SetupRequest | null>(null);
  const [pending,setPending] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const running = useRef(false);
  const active = useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if (!pending) return;
    const warn = (event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[pending]);
  const send = async()=>{
    if (!review || running.current) return;
    running.current=true;setBusy(true);setPending(true);setError('');
    try {await client.setup(review);if(active.current) onComplete();}
    catch(cause) {
      if(!active.current) return;
      if(cause instanceof ApiError && cause.status===401) {onExpired();return;}
      if(cause instanceof ApiError && cause.code==='SETUP_ALREADY_COMPLETED') {onComplete();return;}
      if(cause instanceof ApiError && (cause.status===400 || cause.status===422)) {
        setPending(false);setReview(null);setError('Server menolak isian setup. Periksa pilihan pocket dan saldo, lalu tinjau kembali.');
      } else {
        setError('Hasil penyimpanan belum dapat dipastikan. Isian dikunci agar tidak terkirim sebagai setup berbeda. Coba ulang dengan permintaan yang sama, atau periksa status server.');
      }
    } finally {running.current=false;if(active.current)setBusy(false);}
  };
  const check = async()=>{
    if(running.current)return;
    running.current=true;setBusy(true);
    try {
      const status=await client.read('/setup');
      if(!active.current)return;
      if((status as {isSetupCompleted?:unknown})?.isSetupCompleted===true) onComplete();
      else setError('Setup belum terkonfirmasi. Gunakan Coba ulang untuk mengirim permintaan yang sama.');
    } catch(cause) {
      if(!active.current)return;
      if(cause instanceof ApiError && cause.status===401) onExpired();
      else setError('Status belum dapat diperiksa. Isian tetap tersimpan selama halaman ini terbuka.');
    } finally {running.current=false;if(active.current)setBusy(false);}
  };
  const selected=DEFAULT_POCKETS.filter(p=>keys.includes(p.id));
  return <section aria-label="Setup server" className="rounded-card bg-surface p-5 shadow-card space-y-5">
    <h3 className="font-display text-headline-sm">Siapkan pocket server</h3>
    <p className="text-body-sm text-text-secondary">Data lokal tidak dipindahkan. Periode budget tetap tanggal 26–25. Saldo dan alokasi awal pocket bank mengikuti template, bukan saldo yang diambil dari bank.</p>
    {error && <p role="alert" className="rounded-input bg-bahaya-soft p-3 text-body-sm text-bahaya">{error}</p>}
    {!review ? <form className="space-y-5" onSubmit={event=>{
      event.preventDefault();setError('');
      try {setReview(buildSetupRequest(keys,cash,nfc,crypto.randomUUID()));}
      catch(cause) {setError(cause instanceof Error ? cause.message : 'Periksa isian setup.');}
    }}>
      <fieldset className="space-y-2"><legend className="font-semibold mb-2">Pilih pocket</legend>
        {DEFAULT_POCKETS.map(p=><label key={p.id} className="flex items-center gap-3 rounded-input border border-border p-3 cursor-pointer">
          <input type="checkbox" checked={keys.includes(p.id)} onChange={e=>setKeys(current=>e.target.checked?[...current,p.id]:current.filter(key=>key!==p.id))} className="h-5 w-5 accent-primary shrink-0" />
          <span className="min-w-0 text-body-sm">{p.emoji} {p.name}<span className="block text-text-secondary">{p.monthlyAllocation===null?'Saldo diisi terpisah':formatRupiah(p.monthlyAllocation)}</span></span>
        </label>)}
      </fieldset>
      {keys.includes('cash') && <Input label="Saldo awal Cash (Rp)" inputMode="numeric" value={cash} onChange={e=>setCash(e.target.value)} required />}
      {keys.includes('nfc-card') && <Input label="Saldo awal NFC (Rp)" inputMode="numeric" value={nfc} onChange={e=>setNfc(e.target.value)} required />}
      <p className="text-body-sm text-text-secondary">Masukkan rupiah tanpa titik/koma. Cash memakai budget Food & Groceries; NFC memakai Transportation. Pilih pocket pasangannya juga.</p>
      <Button type="submit" fullWidth>Tinjau setup</Button>
    </form> : <div className="space-y-4" aria-busy={busy}>
      <h4 className="font-semibold">Konfirmasi {selected.length} pocket</h4>
      <ul className="space-y-2 text-body-sm">{selected.map(p=><li key={p.id}>{p.emoji} {p.name} — {formatRupiah(p.id==='cash'?review.cashOpeningBalance!:p.id==='nfc-card'?review.nfcOpeningBalance!:p.initialBalance)}</li>)}</ul>
      <p className="text-body-sm">Total alokasi template: <strong>{formatRupiah(selected.reduce((sum,p)=>sum+(p.monthlyAllocation??0),0))}</strong></p>
      <p className="text-body-sm text-text-secondary">Setup hanya sekali untuk akun ini. Cash/NFC adalah saldo terpisah, bukan pengeluaran atau transfer baru. Data server yang sudah ada tidak akan ditimpa.</p>
      <Button fullWidth loading={busy} onClick={()=>void send()}>{pending?'Coba ulang permintaan yang sama':'Buat pocket di server'}</Button>
      {pending ? <Button fullWidth variant="secondary" disabled={busy} onClick={()=>void check()}>Periksa status server</Button>
        : <Button fullWidth variant="secondary" onClick={()=>setReview(null)}>Ubah isian</Button>}
    </div>}
  </section>;
}
