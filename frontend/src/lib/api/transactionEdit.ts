import { ApiError } from './sessionClient';
import { parseTransactionPage,transactionQuery,type ServerTransaction } from './transactionRead';

export interface TransactionEditChanges {
  amount?:number;pocketId?:string;fromPocketId?:string;toPocketId?:string;
  categoryId?:string|null;incomeSource?:string|null;transferType?:string;
  occurredOn?:string;occurredAtLocalTime?:string;note?:string|null;
}
export interface TransactionEditRequest {
  ownerId:string;transactionId:string;transactionType:ServerTransaction['type'];
  clientMutationId:string;expectedRevision:number;changes:TransactionEditChanges;
}
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const sources=['gaji','bonus','cashback','reimbursement','other'];
const transfers=['normal','tarik-tunai','top-up-nfc','reimbursement','saving-allocation','budget-reallocation'];
const common=['amount','occurredOn','occurredAtLocalTime','note'];
const fields={expense:[...common,'pocketId','categoryId'],income:[...common,'pocketId','incomeSource'],transfer:[...common,'fromPocketId','toPocketId','transferType']};
const invalid=():never=>{throw new ApiError(400,'INVALID_INPUT');};

/** Copy only validated primitives before any await; preserve nulls and whitespace. */
export function snapshotEditRequest(input:TransactionEditRequest):TransactionEditRequest {
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(k=>!['ownerId','transactionId','transactionType','clientMutationId','expectedRevision','changes'].includes(k))||
    !uuid(input.ownerId)||!uuid(input.transactionId)||!uuid(input.clientMutationId)||
    !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||
    !['expense','income','transfer'].includes(input.transactionType))invalid();
  const c=input.changes;
  if(!c||typeof c!=='object'||Array.isArray(c)||!Object.keys(c).length)invalid();
  const changes:Record<string,unknown>={};
  for(const [key,value] of Object.entries(c)){
    if(!fields[input.transactionType].includes(key)||value===undefined)invalid();
    if(key==='amount'&&(typeof value!=='number'||!Number.isSafeInteger(value)||value<1))invalid();
    if(['pocketId','fromPocketId','toPocketId'].includes(key)&&!uuid(value))invalid();
    if(key==='categoryId'&&value!==null&&!uuid(value))invalid();
    if(key==='incomeSource'&&value!==null&&!sources.includes(value as string))invalid();
    if(key==='transferType'&&!transfers.includes(value as string))invalid();
    if(key==='note'&&value!==null&&(typeof value!=='string'||value.length>500))invalid();
    if(key==='occurredOn'&&(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||
      !Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))invalid();
    if(key==='occurredAtLocalTime'&&(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)))invalid();
    changes[key]=value;
  }
  return {ownerId:input.ownerId,transactionId:input.transactionId,transactionType:input.transactionType,
    clientMutationId:input.clientMutationId,expectedRevision:input.expectedRevision,changes};
}

/** Historical acknowledgement only; caller must reload current canonical state. */
export function validateEditAcknowledgement(input:TransactionEditRequest,result:unknown):ServerTransaction {
  const fail=():never=>{throw new ApiError(502,'INVALID_RESPONSE');};
  if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).some(k=>k!=='transaction'))fail();
  const raw=(result as {transaction:unknown}).transaction;
  const t=parseTransactionPage({transactions:[raw],pagination:{page:1,limit:1,total:1,totalPages:1,hasMore:false}},
    transactionQuery({limit:1,includeArchived:true}).query).transactions[0];
  if(!t||!raw||typeof raw!=='object'||Object.keys(raw).length!==Object.keys(t).length||
    t.id!==input.transactionId||t.type!==input.transactionType||
    (t.revision!==input.expectedRevision&&t.revision!==input.expectedRevision+1))return fail();
  if(t.type==='expense'?(t.budgetPocketId===null||t.incomeSource!==null||t.transferType!==null):
    t.type==='income'?(t.budgetPocketId!==null||t.categoryId!==null||t.transferType!==null):
    (t.budgetPocketId!==null||t.categoryId!==null||t.incomeSource!==null||t.transferType===null))fail();
  for(const [key,value] of Object.entries(input.changes)){
    const actual=t[key as keyof ServerTransaction];
    const expected=key==='note'&&typeof value==='string'?(value.trim()||null):value;
    if(key==='occurredAtLocalTime'){
      const seconds=(v:string)=>v.length===5?v+':00':v;
      if(seconds(String(actual))!==seconds(String(expected)))fail();
    }else if(['pocketId','fromPocketId','toPocketId','categoryId'].includes(key)&&typeof expected==='string'){
      if(typeof actual!=='string'||actual.toLowerCase()!==expected.toLowerCase())fail();
    }else if(actual!==expected)fail();
  }
  return t;
}
