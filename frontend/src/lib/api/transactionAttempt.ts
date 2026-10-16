import {snapshotEditRequest,type TransactionEditRequest,type TransactionEditChanges} from './transactionEdit';
/** Durable owner-scoped recovery. No network or legacy-store access. */
export type TransactionCreateBody={clientMutationId:string;amount:number;occurredOn:string;occurredAtLocalTime:string;note?:string}&(
  {type:'expense';pocketId:string;categoryId?:string}|
  {type:'income';pocketId:string;incomeSource?:'gaji'|'bonus'|'cashback'|'reimbursement'|'other'}|
  {type:'transfer';fromPocketId:string;toPocketId:string;transferType:'normal'|'tarik-tunai'|'top-up-nfc'|'reimbursement'|'saving-allocation'|'budget-reallocation'}
);
export interface TransactionAttempt {version:1;ownerId:string;operation:'create';body:TransactionCreateBody}
export interface TransactionLifecycleAttempt {
  version:1;ownerId:string;operation:'archive'|'restore';transactionId:string;
  body:{clientMutationId:string;expectedRevision:number};
}
export interface TransactionDeleteAttempt {
  version:1;ownerId:string;operation:'delete';transactionId:string;
  body:{clientMutationId:string;expectedRevision:number;confirmPermanentDelete:true};
}
export interface TransactionEditAttempt {
  version:1;ownerId:string;operation:'edit';transactionId:string;
  transactionType:TransactionEditRequest['transactionType'];
  body:TransactionEditChanges&{clientMutationId:string;expectedRevision:number};
}
export type TransactionRecoveryRecord=TransactionAttempt|TransactionLifecycleAttempt|TransactionDeleteAttempt|TransactionEditAttempt;
export function editAttemptRequest(record:TransactionEditAttempt):TransactionEditRequest {
  const {clientMutationId,expectedRevision,...changes}=record.body;
  return snapshotEditRequest({ownerId:record.ownerId,transactionId:record.transactionId,
    transactionType:record.transactionType,clientMutationId,expectedRevision,changes});
}
export class TransactionStorageError extends Error {}
const fail=():never=>{throw new TransactionStorageError('Invalid transaction recovery record');};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const exactKeys=(v:Record<string,unknown>,keys:string[])=>{if(Object.keys(v).some(k=>!keys.includes(k)))fail();};

/** Strict canonical copy: never trim/normalize an already prepared request. */
export function parseTransactionAttempt(value:unknown,ownerId:string):TransactionAttempt {
  const r=object(value),b=object(r.body);
  exactKeys(r,['version','ownerId','operation','body']);
  if(!uuid(ownerId)||r.ownerId!==ownerId||r.version!==1||r.operation!=='create'||!uuid(b.clientMutationId)||
    typeof b.amount!=='number'||!Number.isSafeInteger(b.amount)||b.amount<1||
    typeof b.occurredOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.occurredOn)||
    !Number.isFinite(Date.parse(b.occurredOn+'T00:00:00Z'))||new Date(b.occurredOn+'T00:00:00Z').toISOString().slice(0,10)!==b.occurredOn||
    typeof b.occurredAtLocalTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(b.occurredAtLocalTime)||
    ('note' in b&&(typeof b.note!=='string'||b.note.length>500)))fail();
  const common={clientMutationId:b.clientMutationId as string,amount:b.amount as number,occurredOn:b.occurredOn as string,occurredAtLocalTime:b.occurredAtLocalTime as string,
    ...('note' in b?{note:b.note as string}:{})};
  const base=['clientMutationId','type','amount','occurredOn','occurredAtLocalTime','note'];
  let body:TransactionCreateBody;
  if(b.type==='expense'){
    exactKeys(b,[...base,'pocketId','categoryId']);
    if(!uuid(b.pocketId)||('categoryId' in b&&!uuid(b.categoryId)))fail();
    body={...common,type:'expense',pocketId:b.pocketId as string,...('categoryId' in b?{categoryId:b.categoryId as string}:{})};
  }else if(b.type==='income'){
    exactKeys(b,[...base,'pocketId','incomeSource']);
    if(!uuid(b.pocketId)||('incomeSource' in b&&!['gaji','bonus','cashback','reimbursement','other'].includes(b.incomeSource as string)))fail();
    body={...common,type:'income',pocketId:b.pocketId as string,...('incomeSource' in b?{incomeSource:b.incomeSource as Extract<TransactionCreateBody,{type:'income'}>['incomeSource']}:{})};
  }else if(b.type==='transfer'){
    exactKeys(b,[...base,'fromPocketId','toPocketId','transferType']);
    if(!uuid(b.fromPocketId)||!uuid(b.toPocketId)||b.fromPocketId===b.toPocketId||
      !['normal','tarik-tunai','top-up-nfc','reimbursement','saving-allocation','budget-reallocation'].includes(b.transferType as string))fail();
    body={...common,type:'transfer',fromPocketId:b.fromPocketId as string,toPocketId:b.toPocketId as string,transferType:b.transferType as Extract<TransactionCreateBody,{type:'transfer'}>['transferType']};
  }else return fail();
  return {version:1,ownerId,operation:'create',body};
}

/** Legacy create records remain unchanged; no DB upgrade or destructive migration. */
export function parseTransactionRecoveryRecord(value:unknown,ownerId:string):TransactionRecoveryRecord {
  const r=object(value);
  if(r.operation==='create')return parseTransactionAttempt(value,ownerId);
  if(r.operation==='edit'){
    exactKeys(r,['version','ownerId','operation','transactionId','transactionType','body']);
    if(r.version!==1||r.ownerId!==ownerId||!uuid(ownerId))return fail();
    const b=object(r.body);
    try{
      const request=editAttemptRequest({...r,body:b} as unknown as TransactionEditAttempt);
      return {version:1,ownerId,operation:'edit',transactionId:request.transactionId,transactionType:request.transactionType,
        body:{clientMutationId:request.clientMutationId,expectedRevision:request.expectedRevision,...request.changes}};
    }catch{return fail();}
  }
  exactKeys(r,['version','ownerId','operation','transactionId','body']);
  const b=object(r.body);exactKeys(b,r.operation==='delete'?['clientMutationId','expectedRevision','confirmPermanentDelete']:['clientMutationId','expectedRevision']);
  if(!uuid(ownerId)||r.ownerId!==ownerId||r.version!==1||
    (r.operation!=='archive'&&r.operation!=='restore'&&r.operation!=='delete')||!uuid(r.transactionId)||!uuid(b.clientMutationId)||
    typeof b.expectedRevision!=='number'||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<1)fail();
  if(r.operation==='delete'){
    if(b.confirmPermanentDelete!==true)fail();
    return {version:1,ownerId,operation:'delete',transactionId:r.transactionId as string,
      body:{clientMutationId:b.clientMutationId as string,expectedRevision:b.expectedRevision as number,confirmPermanentDelete:true}};
  }
  return {version:1,ownerId,operation:r.operation as 'archive'|'restore',transactionId:r.transactionId as string,
    body:{clientMutationId:b.clientMutationId as string,expectedRevision:b.expectedRevision as number}};
}

export class TransactionAttemptStore {
  private open():Promise<IDBDatabase>{
    return new Promise((resolve,reject)=>{
      let settled=false;
      const request=indexedDB.open('pocketflow-connected-transaction-attempts',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('attempts',{keyPath:'ownerId'});
      request.onerror=request.onblocked=()=>{settled=true;reject(new TransactionStorageError('Storage unavailable'));};
      request.onsuccess=()=>{if(settled)request.result.close();else resolve(request.result);};
    });
  }
  private async transact<T>(ownerId:string,write:boolean,operation:(record:TransactionRecoveryRecord|null,store:IDBObjectStore)=>T):Promise<T>{
    if(!uuid(ownerId))return fail();
    let db:IDBDatabase;
    try{db=await this.open();}catch{throw new TransactionStorageError('Storage unavailable');}
    try{
      return await new Promise<T>((resolve,reject)=>{
        const tx=db.transaction('attempts',write?'readwrite':'readonly'),store=tx.objectStore('attempts');let result:T;
        tx.oncomplete=()=>resolve(result);
        tx.onerror=tx.onabort=()=>reject(new TransactionStorageError('Storage transaction failed'));
        const get=store.get(ownerId);
        get.onsuccess=()=>{try{result=operation(get.result===undefined?null:parseTransactionRecoveryRecord(get.result,ownerId),store);}catch{tx.abort();}};
      });
    }catch{throw new TransactionStorageError('Storage unavailable or damaged');}finally{db.close();}
  }
  read(ownerId:string):Promise<TransactionRecoveryRecord|null>{return this.transact(ownerId,false,record=>record);}
  prepare(record:TransactionRecoveryRecord):Promise<{record:TransactionRecoveryRecord;created:boolean}>{
    const safe=parseTransactionRecoveryRecord(record,record.ownerId);
    return this.transact(safe.ownerId,true,(current,store)=>{
      if(current)return {record:current,created:false};
      store.add(safe);return {record:safe,created:true};
    });
  }
  /** Caller must first validate the server acknowledgement of this exact attempt. */
  acknowledge(record:TransactionRecoveryRecord):Promise<void>{
    const safe=parseTransactionRecoveryRecord(record,record.ownerId);
    return this.transact(safe.ownerId,true,(current,store)=>{
      if(current&&JSON.stringify(current)!==JSON.stringify(safe))throw new TransactionStorageError('Attempt changed');
      if(current)store.delete(safe.ownerId);
    });
  }
}
