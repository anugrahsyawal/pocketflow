import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, CategoryEditRequest, SessionClient, categoryEditFields } from '@/lib/api/sessionClient';
import type { ServerCategory } from '@/lib/api/masterData';

export function CategoryEditForm({category,client,onReload,onCancel,onExpired}:{
  category:ServerCategory;client:SessionClient;onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  return <LabelEditForm entity={category} kind="kategori" save={(id,payload)=>client.editCategory(id,payload)} onReload={onReload} onCancel={onCancel} onExpired={onExpired} />;
}

/** Shared revision-aware label editor; callers supply narrow allowlisted transports. */
export function LabelEditForm({entity:category,kind,save,onReload,onCancel,onExpired}:{
  entity:{id:string;name:string;emoji:string;revision:number};kind:'kategori'|'pocket';
  save:(id:string,payload:CategoryEditRequest)=>Promise<void>;
  onReload:()=>void;onCancel:()=>void;onExpired:()=>void;
}) {
  const [name,setName]=useState(category.name),[emoji,setEmoji]=useState(category.emoji);
  const [attempt,setAttempt]=useState<CategoryEditRequest|null>(null);
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
    let payload:CategoryEditRequest;
    try {payload=attempt??{clientMutationId:crypto.randomUUID(),expectedRevision:category.revision,...categoryEditFields(name,emoji)};}
    catch {setMessage('Isi nama (maksimal 100 karakter) dan emoji (maksimal 32 karakter). Isian tidak boleh hanya spasi.');return;}
    running.current=true;setBusy(true);setAttempt(payload);setMessage('');
    try {await save(category.id,payload);if(active.current)onReload();}
    catch(error){
      if(!active.current)return;
      if(error instanceof ApiError && error.status===401){onExpired();return;}
      if(error instanceof ApiError && [400,404,409,422].includes(error.status)) {
        setReloadOnly(true);setMessage(error.status===409
          ?`${kind==='kategori'?'Kategori':'Pocket'} berubah di server. Muat data terbaru sebelum mengedit ulang. Perubahan Anda tidak ditimpa ke server.`
          :`Perubahan ditolak server. Muat data terbaru untuk memeriksa ${kind} sebelum mengedit ulang.`);
      } else setMessage('Hasil penyimpanan belum pasti. Coba ulang permintaan yang sama atau muat data server. Isian dikunci sementara.');
    } finally {running.current=false;if(active.current)setBusy(false);}
  };
  return <form aria-label={`Edit ${kind} ${category.name}`} className="space-y-3 rounded-input bg-surface-container-low p-4"
    onSubmit={event=>{event.preventDefault();void send();}} aria-busy={busy}>
    <Input label={`Nama ${kind}`} value={name} onChange={event=>{setName(event.target.value);setMessage('');}} disabled={!!attempt} required />
    <Input label={`Emoji ${kind}`} value={emoji} onChange={event=>{setEmoji(event.target.value);setMessage('');}} disabled={!!attempt} required />
    <p className="text-body-sm text-text-secondary">{kind==='kategori'?'Mengubah label kategori, bukan pocket, nominal, atau referensi transaksi.':'Hanya mengubah nama dan emoji. Saldo, alokasi, budget pengeluaran, dan riwayat transaksi tetap sama.'}</p>
    {message && <p role="alert" className="text-body-sm text-bahaya">{message}</p>}
    {!reloadOnly && <Button type="submit" fullWidth loading={busy} className="h-auto min-h-11 py-2"
      disabled={!attempt && name.trim()===category.name && emoji.trim()===category.emoji}>
      {attempt?'Coba ulang permintaan yang sama':`Simpan ${kind}`}
    </Button>}
    {attempt ? <>
      <p className="text-body-sm text-text-secondary">Muat ulang menutup isian dan membaca data server, tanpa mengirim perubahan baru.</p>
      <Button type="button" fullWidth variant="secondary" disabled={busy} onClick={onReload}>Muat data server</Button>
    </> : <Button type="button" fullWidth variant="ghost" onClick={onCancel}>Batal</Button>}
  </form>;
}
