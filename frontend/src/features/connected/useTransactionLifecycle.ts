import {useEffect,useRef,useState} from 'react';
import {ApiError,SessionClient} from '@/lib/api/sessionClient';
import {TransactionAttemptStore,TransactionStorageError,editAttemptRequest,type TransactionLifecycleAttempt,type TransactionDeleteAttempt,type TransactionRecoveryRecord} from '@/lib/api/transactionAttempt';
import type {ServerTransaction} from '@/lib/api/transactionRead';
import {snapshotEditRequest,type TransactionEditChanges} from '@/lib/api/transactionEdit';
import type {TransactionEditAttempt} from '@/lib/api/transactionAttempt';
import {formatRupiah} from '@/lib/currency';

/** A shared durable slot, never a second lifecycle queue or automatic sender. */
export function useTransactionLifecycle({ownerId,client,onExpired,onResolved,onLock}:{
  ownerId:string;client:SessionClient;onExpired:()=>void;
  onResolved:(message:string)=>void;onLock:(locked:boolean)=>void;
}) {
  const [store]=useState(()=>new TransactionAttemptStore());
  const [record,setRecord]=useState<TransactionRecoveryRecord|null>(null);
  const [selected,setSelected]=useState<ServerTransaction|null>(null);
  const [deleting,setDeleting]=useState(false);
  const [editing,setEditing]=useState(false);
  const select=(transaction:ServerTransaction|null,permanent=false,edit=false)=>{setDeleting(permanent);setEditing(edit);setSelected(transaction);};
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [confirmStop,setConfirmStop]=useState(false);
  const running=useRef(false),active=useRef(true);
  const pending=record&&record.operation!=='create'?record:null;
  const inspect=async()=>{
    if(running.current)return;
    try {const saved=await store.read(ownerId);if(active.current){setRecord(saved);setReady(true);setMessage('');setSelected(null);setConfirmStop(false);}}
    catch {if(active.current){setReady(false);setMessage('Penyimpanan pemulihan tidak tersedia atau rusak. Tindakan diblokir; jangan hapus data situs.');}}
  };
  useEffect(()=>{active.current=true;void inspect();return()=>{active.current=false;};},[ownerId,store]);
  useEffect(()=>{onLock(!ready||busy||!!selected||!!pending);return()=>onLock(false);},[ready,busy,selected,pending,onLock]);
  const execute=async(resolving=false,changes?:TransactionEditChanges)=>{
    if(running.current||!ready||record?.operation==='create'||(!pending&&!selected)||(resolving&&(!pending||!confirmStop)))return;
    if(!pending&&editing&&!changes)return;
    running.current=true;setBusy(true);setMessage('');
    try {
      let attempt:Exclude<TransactionRecoveryRecord,{operation:'create'}>;
      if(pending)attempt=pending;
      else {
        const identity={version:1 as const,ownerId,transactionId:selected!.id};
        const body={clientMutationId:crypto.randomUUID(),expectedRevision:selected!.revision};
        const safeEdit=editing?snapshotEditRequest({ownerId,transactionId:selected!.id,transactionType:selected!.type,...body,changes:changes!}):null;
        const candidate:TransactionLifecycleAttempt|TransactionDeleteAttempt|TransactionEditAttempt=safeEdit?
          {...identity,operation:'edit',transactionType:safeEdit.transactionType,body:{...body,...safeEdit.changes}}:deleting?
          {...identity,operation:'delete',body:{...body,confirmPermanentDelete:true}}:
          {...identity,operation:selected!.isArchived?'restore':'archive',body};
        const saved=await store.prepare(candidate);
        if(active.current){setRecord(saved.record);setSelected(null);}
        // Another tab may have won. Never dispatch an attempt the user did not confirm.
        if(!saved.created){if(active.current)setMessage('Ada permintaan lain tersimpan. Periksa pemulihan sebelum melanjutkan.');return;}
        attempt=candidate;
      }
      let status:'cancelled'|'committed';
      if(attempt.operation==='batch'){
        const request={ownerId:attempt.ownerId,body:attempt.body};
        const result=resolving?await client.resolveTransactionBatch(request):
          {status:'committed' as const,clientMutationId:attempt.body.clientMutationId,acknowledgement:{transactions:await client.createTransactionBatch(request)}};
        const outcomes=result.status==='stopped'?result.items:result.acknowledgement.transactions.map((transaction,index)=>({
          status:'committed' as const,clientMutationId:attempt.body.items[index]!.clientMutationId,acknowledgement:{transaction}}));
        const summary=outcomes.map((item,index)=>`${index+1}. ${formatRupiah(attempt.body.items[index]!.amount)} — ${item.status==='committed'?`tersimpan (ID ${item.acknowledgement.transaction.id})`:'dihentikan, tidak disimpan'}`).join('\n');
        await store.acknowledge(attempt);
        if(active.current)onResolved(`${result.status==='stopped'?'Batch dihentikan. Item yang sudah berhasil tetap dipertahankan.':'Batch sudah diproses.'}\n${summary}\nIni hasil permintaan asli, bukan status transaksi saat ini. Data terbaru dimuat terpisah dari server.`);
        return;
      }
      if(attempt.operation==='edit'){
        const request=editAttemptRequest(attempt);
        status=resolving?await client.resolveTransactionEdit(request):(await client.editTransaction(request),'committed');
      }else if(attempt.operation==='delete'){
        const request={ownerId,transactionId:attempt.transactionId,...attempt.body};
        status=resolving?await client.resolveTransactionDelete(request):(await client.deleteTransaction(request),'committed');
      }else{
        const request={ownerId,transactionId:attempt.transactionId,operation:attempt.operation,...attempt.body};
        status=resolving?await client.resolveTransactionLifecycle(request):(await client.setTransactionArchived(request),'committed');
      }
      await store.acknowledge(attempt);
      if(active.current)onResolved(status==='cancelled'?'Permintaan dihentikan oleh server tanpa mengubah transaksi.':
        attempt.operation==='edit'?'Perubahan transaksi sudah diproses. Data terbaru dimuat dari server; hasil yang sudah berhasil tidak dibatalkan.':
        attempt.operation==='delete'?'Transaksi sudah dihapus permanen dan tidak dapat dipulihkan. Data terbaru dimuat dari server.':
        'Permintaan arsip/pulihkan sudah diproses. Data terbaru dimuat dari server; hasil yang sudah berhasil tidak dibatalkan.');
    }catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof TransactionStorageError){setReady(false);setMessage('Catatan pemulihan belum dapat dibaca atau dibersihkan. Jangan hapus data situs; periksa penyimpanan lalu ulangi dengan ID yang sama.');}
      else if(error instanceof ApiError&&error.code==='REVISION_CONFLICT')setMessage('Transaksi sudah berubah. Permintaan tetap disimpan tanpa mengganti revisi. Hentikan permintaan ini melalui konfirmasi server sebelum memilih tindakan baru.');
      else if(error instanceof ApiError&&error.status===422)setMessage('Server menolak tindakan karena saldo, alokasi, atau referensi tidak memenuhi aturan. Permintaan tetap disimpan; coba lagi setelah kondisi diperiksa atau hentikan melalui server.');
      else setMessage('Hasil belum terkonfirmasi. Permintaan tetap disimpan. Coba lagi dengan ID yang sama atau konfirmasi penghentian; jangan buat pengganti.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return {record,pending,selected,setSelected:select,deleting,editing,ready,busy,message,confirmStop,setConfirmStop,inspect,execute};
}
