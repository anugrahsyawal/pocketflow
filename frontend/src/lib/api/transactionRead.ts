import { ApiError } from './sessionClient';

export interface TransactionQuery {
  page?:number;limit?:number;type?:'expense'|'income'|'transfer';
  pocketId?:string;categoryId?:string;startDate?:string;endDate?:string;
  search?:string;includeArchived?:boolean;
}
export interface ServerTransaction {
  id:string;type:'expense'|'income'|'transfer';amount:number;
  pocketId:string|null;fromPocketId:string|null;toPocketId:string|null;
  categoryId:string|null;budgetPocketId:string|null;transferType:string|null;incomeSource:string|null;
  occurredOn:string;occurredAtLocalTime:string;note:string|null;
  isArchived:boolean;archivedAt:string|null;revision:number;createdAt:string;updatedAt:string;
}
export interface TransactionPage {
  transactions:ServerTransaction[];
  pagination:{page:number;limit:number;total:number;totalPages:number;hasMore:boolean};
}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const integer=(v:unknown,min:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
const types=['expense','income','transfer'];
const invalid=():never=>{throw new ApiError(502,'INVALID_RESPONSE');};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:invalid();
const timestamp=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;

/** Explicit query allowlist. Snapshot primitives before transport awaits. */
export function transactionQuery(query:TransactionQuery={}) {
  const q={page:query.page??1,limit:query.limit??50,type:query.type,pocketId:query.pocketId,
    categoryId:query.categoryId,startDate:query.startDate,endDate:query.endDate,search:query.search,includeArchived:query.includeArchived??false};
  if(!integer(q.page,1)||!integer(q.limit,1)||q.limit>100||!Number.isSafeInteger((q.page-1)*q.limit)||
    (q.type!==undefined&&!types.includes(q.type))||
    [q.pocketId,q.categoryId].some(id=>id!==undefined&&!uuid(id))||
    [q.startDate,q.endDate].some(d=>d!==undefined&&!date(d))||
    (q.startDate!==undefined&&q.endDate!==undefined&&q.startDate>q.endDate)||
    (q.search!==undefined&&(typeof q.search!=='string'||[...q.search].length>100))||typeof q.includeArchived!=='boolean')throw new ApiError(400,'INVALID_INPUT');
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries(q))if(value!==undefined)params.set(key,String(value));
  return {query:q,path:`/transactions?${params.toString()}`};
}

/** One validated page, not a complete ledger or a balance source. */
export function parseTransactionPage(value:unknown,query:ReturnType<typeof transactionQuery>['query']):TransactionPage {
  const root=object(value),p=object(root.pagination);
  if(!Array.isArray(root.transactions)||!integer(p.page,1)||!integer(p.limit,1)||p.page!==query.page||p.limit!==query.limit||
    !integer(p.total,0)||!integer(p.totalPages,0)||p.totalPages!==Math.ceil(p.total/p.limit)||
    p.hasMore!==(p.page<p.totalPages)||root.transactions.length>p.limit)invalid();
  const transactions=(root.transactions as unknown[]).map(value=>{
    const t=object(value);
    if(!uuid(t.id)||!types.includes(t.type as string)||!integer(t.amount,1)||!integer(t.revision,1)||
      !date(t.occurredOn)||typeof t.occurredAtLocalTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t.occurredAtLocalTime)||
      (t.note!==null&&(typeof t.note!=='string'||[...t.note].length>500))||typeof t.isArchived!=='boolean'||
      !timestamp(t.createdAt)||!timestamp(t.updatedAt)||(t.archivedAt!==null&&!timestamp(t.archivedAt))||
      t.isArchived!==(t.archivedAt!==null)||(!query.includeArchived&&t.isArchived))invalid();
    for(const key of ['pocketId','fromPocketId','toPocketId','categoryId','budgetPocketId'])if(t[key]!==null&&!uuid(t[key]))invalid();
    if(t.transferType!==null&&!['normal','tarik-tunai','top-up-nfc','reimbursement','saving-allocation','budget-reallocation'].includes(t.transferType as string))invalid();
    if(t.incomeSource!==null&&!['gaji','bonus','cashback','reimbursement','other'].includes(t.incomeSource as string))invalid();
    if(t.type==='transfer'?(t.pocketId!==null||t.fromPocketId===null||t.toPocketId===null||t.fromPocketId===t.toPocketId):
      (t.pocketId===null||t.fromPocketId!==null||t.toPocketId!==null))invalid();
    // Publish only contract fields, never accidental owner/deletion metadata.
    return Object.fromEntries(['id','type','amount','pocketId','fromPocketId','toPocketId','categoryId','budgetPocketId',
      'transferType','incomeSource','occurredOn','occurredAtLocalTime','note','isArchived','archivedAt','revision','createdAt','updatedAt'].map(key=>[key,t[key]])) as unknown as ServerTransaction;
  });
  if(new Set(transactions.map(t=>t.id)).size!==transactions.length)invalid();
  return {transactions,pagination:{page:p.page as number,limit:p.limit as number,total:p.total as number,totalPages:p.totalPages as number,hasMore:p.hasMore as boolean}};
}
