import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, CategoryArchiveRequest, SessionClient } from '@/lib/api/sessionClient';
import type { ServerCategory } from '@/lib/api/masterData';

export function CategoryArchiveForm({category,archive,client,onReload,onCancel,onExpired}:{
  category:ServerCategory;archive:boolean;client:SessionClient;onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  const [attempt,setAttempt]=useState<CategoryArchiveRequest|null>(null);
  const [busy,setBusy]=useState(false),[reloadOnly,setReloadOnly]=useState(false),[message,setMessage]=useState('');
  const running=useRef(false),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if(!attempt)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[attempt]);
  const send=async()=>{
    if(running.current || reloadOnly)return;
    const payload=attempt??{clientMutationId:crypto.randomUUID(),expectedRevision:category.revision,isArchived:archive};
    running.current=true;setBusy(true);setAttempt(payload);setMessage('');
    try {await client.setCategoryArchived(category.id,payload);if(active.current)onReload();}
    catch(error){
      if(!active.current)return;
      if(error instanceof ApiError && error.status===401){onExpired();return;}
      if(error instanceof ApiError && [400,404,409,422].includes(error.status)) {
        setReloadOnly(true);setMessage(error.status===409
          ?'Kategori berubah di server. Muat data terbaru sebelum mencoba kembali.'
          :'Permintaan ditolak. Muat data terbaru; pemulihan memerlukan pocket yang aktif.');
      } else setMessage('Hasil belum pasti. Coba ulang permintaan yang sama atau muat data server.');
    } finally {running.current=false;if(active.current)setBusy(false);}
  };
  return <form aria-label={`${archive?'Arsipkan':'Pulihkan'} kategori ${category.name}`} className="space-y-3 rounded-input bg-surface-container-low p-4"
    onSubmit={event=>{event.preventDefault();void send();}} aria-busy={busy}>
    <p className="font-semibold break-words">{archive?'Arsipkan':'Pulihkan'} {category.emoji} {category.name}?</p>
    <p className="text-body-sm text-text-secondary">{archive?'Kategori tidak lagi tampil dalam daftar aktif dan dapat dipulihkan.':'Kategori kembali tersedia dalam daftar aktif.'} Riwayat transaksi tidak dihapus atau diubah.</p>
    {message && <p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!reloadOnly && <Button type="submit" fullWidth loading={busy} className="h-auto min-h-11 py-2">
      {attempt?'Coba ulang permintaan yang sama':archive?'Ya, arsipkan':'Ya, pulihkan'}
    </Button>}
    {attempt ? <>
      <p className="text-body-sm text-text-secondary">Muat ulang membaca data server tanpa mengirim perubahan baru.</p>
      <Button type="button" fullWidth variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button>
    </> : <Button type="button" fullWidth variant="ghost" onClick={onCancel}>Batal</Button>}
  </form>;
}
