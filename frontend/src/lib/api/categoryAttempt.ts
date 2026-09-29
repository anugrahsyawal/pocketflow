import { categoryEditFields, type CategoryCreateRequest } from './sessionClient';

export interface CategoryAttempt { version:1; ownerId:string; body:CategoryCreateRequest }
export class CategoryStorageError extends Error {}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function parseCategoryAttempt(value:unknown,ownerId:string):CategoryAttempt {
  const r=value as CategoryAttempt|null;
  if(!uuid(ownerId)||!r||r.version!==1||r.ownerId!==ownerId||!r.body||
    !uuid(r.body.clientMutationId)||!uuid(r.body.pocketId)||typeof r.body.name!=='string'||typeof r.body.emoji!=='string') throw new CategoryStorageError('Invalid recovery record');
  let fields;
  try {fields=categoryEditFields(r.body.name,r.body.emoji);}catch{throw new CategoryStorageError('Invalid recovery fields');}
  if(fields.name!==r.body.name||fields.emoji!==r.body.emoji)throw new CategoryStorageError('Noncanonical recovery fields');
  return {version:1,ownerId,body:{clientMutationId:r.body.clientMutationId,pocketId:r.body.pocketId,...fields}};
}

/** Atomic per-owner journal. No credentials, legacy-store access or background sends. */
export class CategoryAttemptStore {
  private open():Promise<IDBDatabase> {
    return new Promise((resolve,reject)=>{
      let settled=false;
      const request=indexedDB.open('pocketflow-connected-category-attempts',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('attempts',{keyPath:'ownerId'});};
      request.onerror=request.onblocked=()=>{settled=true;reject(new CategoryStorageError('Storage unavailable'));};
      request.onsuccess=()=>{if(settled)request.result.close();else resolve(request.result);};
    });
  }
  private async transact<T>(ownerId:string,write:boolean,operation:(record:CategoryAttempt|null,store:IDBObjectStore)=>T):Promise<T> {
    if(!uuid(ownerId))throw new CategoryStorageError('Invalid owner');
    let db:IDBDatabase;
    try {db=await this.open();}catch{throw new CategoryStorageError('Storage unavailable');}
    try {
      return await new Promise<T>((resolve,reject)=>{
        const tx=db.transaction('attempts',write?'readwrite':'readonly'),store=tx.objectStore('attempts');
        let result:T;
        tx.oncomplete=()=>resolve(result);
        tx.onerror=tx.onabort=()=>reject(new CategoryStorageError('Storage transaction failed'));
        const get=store.get(ownerId);
        get.onsuccess=()=>{
          try {result=operation(get.result===undefined?null:parseCategoryAttempt(get.result,ownerId),store);}
          catch{tx.abort();}
        };
      });
    }catch{throw new CategoryStorageError('Storage unavailable or damaged');}finally{db.close();}
  }
  read(ownerId:string):Promise<CategoryAttempt|null>{return this.transact(ownerId,false,record=>record);}
  prepare(record:CategoryAttempt):Promise<{record:CategoryAttempt;created:boolean}> {
    const safe=parseCategoryAttempt(record,record.ownerId);
    return this.transact(safe.ownerId,true,(current,store)=>{
      if(current)return {record:current,created:false};
      store.add(safe);return {record:safe,created:true};
    });
  }
  acknowledge(record:CategoryAttempt):Promise<void> {
    return this.transact(record.ownerId,true,(current,store)=>{
      if(current&&JSON.stringify(current)!==JSON.stringify(record))throw new CategoryStorageError('Attempt changed');
      if(current)store.delete(record.ownerId);
    });
  }
}
