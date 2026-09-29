import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, categoryEditFields, SessionClient } from '@/lib/api/sessionClient';
import { CategoryAttempt, CategoryAttemptStore, CategoryStorageError } from '@/lib/api/categoryAttempt';
import type { ServerPocket } from '@/lib/api/masterData';

export function CategoryCreateForm({ownerId,pockets,client,onReload,onExpired,onLock}:{
  ownerId:string;pockets:ServerPocket[];client:SessionClient;onReload:()=>void;onExpired:()=>void;onLock:(locked:boolean)=>void;
}) {
  const [store]=useState(()=>new CategoryAttemptStore());
  const [pending,setPending]=useState<CategoryAttempt|null>(null),[ready,setReady]=useState(false),[opened,setOpened]=useState(false);
  const [name,setName]=useState(''),[emoji,setEmoji]=useState('🏷️'),[pocketId,setPocketId]=useState(pockets[0]?.id??'');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const selectId=useId(),active=useRef(true),running=useRef(false);
  const inspect=async()=>{
    try {const record=await store.read(ownerId);if(active.current){setPending(record);setReady(true);setMessage('');}}
    catch{if(active.current){setReady(false);setMessage('Penyimpanan pemulihan tidak tersedia atau rusak. Pengiriman kategori diblokir; jangan hapus data situs untuk mencoba ulang.');}}
  };
  useEffect(()=>{active.current=true;void inspect();return()=>{active.current=false;};},[ownerId,store]);
  useEffect(()=>{onLock(busy||(opened&&!pending));return()=>onLock(false);},[busy,opened,pending,onLock]);
  const send=async()=>{
    if(running.current||!ready)return;
    let candidate:CategoryAttempt;
    try {
      if(!pending&&!pockets.some(p=>p.id===pocketId))throw new Error();
      candidate=pending??{version:1,ownerId,body:{clientMutationId:crypto.randomUUID(),pocketId,...categoryEditFields(name,emoji)}};
    }catch{setMessage('Pilih pocket aktif, isi nama maksimal 100 karakter dan emoji maksimal 32 karakter.');return;}
    running.current=true;setBusy(true);setMessage('');
    let acknowledged=false;
    try {
      const prepared=await store.prepare(candidate);
      if(!active.current)return;
      setPending(prepared.record);
      if(!prepared.created && (!pending||JSON.stringify(prepared.record)!==JSON.stringify(pending))){
        setMessage('Ada permintaan tertunda dari tab lain. Periksa detail lalu lanjutkan permintaan tersebut.');return;
      }
      const user=await client.me();
      if(!active.current)return;
      if(user.id!==ownerId){onExpired();return;}
      await client.createCategory(prepared.record.body);acknowledged=true;
      await store.acknowledge(prepared.record);
      if(active.current){setPending(null);setOpened(false);setName('');setEmoji('🏷️');onReload();}
    }catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof CategoryStorageError){setReady(false);setMessage(acknowledged?
        'Kategori tersimpan, tetapi catatan pemulihan belum dapat dibersihkan. Periksa penyimpanan; jangan buat permintaan baru.':
        'Penyimpanan pemulihan gagal. Pengiriman diblokir. Periksa penyimpanan sebelum melanjutkan.');}
      else setMessage(error instanceof ApiError&&error.status===422?
        'Pocket tujuan tidak aktif atau tidak tersedia. Pulihkan pocket dahulu, lalu lanjutkan permintaan yang sama.':
        error instanceof ApiError&&error.status===409?
        'Identitas permintaan konflik. Jangan buat permintaan baru; catatan dipertahankan untuk pemeriksaan.':
        'Hasil belum dapat dipastikan. Permintaan disimpan; lanjutkan dengan ID yang sama setelah koneksi atau sesi pulih.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <section aria-label="Tambah kategori server" className="space-y-3 rounded-card border border-border bg-surface p-5">
    <h2 className="font-display text-headline-sm">{pending?'Kategori tertunda':'Tambah kategori'}</h2>
    {message&&<p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!ready?<Button variant="secondary" disabled={busy} onClick={()=>void inspect()}>Periksa penyimpanan</Button>:
      pending?<>
        <p className="break-words font-semibold">{pending.body.emoji} {pending.body.name}</p>
        <p className="text-body-sm text-text-secondary break-words">Pocket: {pockets.find(p=>p.id===pending.body.pocketId)?.name??'Tidak aktif / belum tersedia'}</p>
        <p className="text-body-sm text-text-secondary">Permintaan tetap tersimpan setelah reload atau keluar. Melanjutkan memakai ID yang sama; tidak membuat kiriman baru.</p>
        <Button fullWidth loading={busy} onClick={()=>void send()} className="h-auto min-h-11 py-2">Lanjutkan permintaan yang sama</Button>
        <Button fullWidth variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button>
      </>:opened?<form aria-label="Tambah kategori" className="space-y-3" onSubmit={e=>{e.preventDefault();void send();}}>
        <label htmlFor={selectId} className="block text-body-sm font-semibold">Pocket kategori</label>
        <select id={selectId} value={pocketId} onChange={e=>setPocketId(e.target.value)} disabled={busy} className="w-full min-w-0 rounded-input border border-border bg-surface p-3">
          {pockets.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <Input label="Nama kategori baru" value={name} onChange={e=>setName(e.target.value)} disabled={busy} required />
        <Input label="Emoji kategori baru" value={emoji} onChange={e=>setEmoji(e.target.value)} disabled={busy} required />
        <p className="text-body-sm text-text-secondary">Nama, emoji, pocket dan ID permintaan disimpan di perangkat sampai hasil server diterima. Tidak ada pengiriman otomatis.</p>
        <Button fullWidth type="submit" loading={busy}>Simpan kategori baru</Button>
        <Button fullWidth type="button" variant="ghost" disabled={busy} onClick={()=>{setOpened(false);setName('');setMessage('');}}>Batal</Button>
      </form>:<Button fullWidth variant="secondary" disabled={!pockets.length||busy} onClick={()=>setOpened(true)}>Tambah kategori baru</Button>}
  </section>;
}
