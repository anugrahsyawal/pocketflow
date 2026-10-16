import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {SessionClient} from '../../../frontend/src/lib/api/sessionClient.js';
import {type TransactionEditRequest} from '../../../frontend/src/lib/api/transactionEdit.js';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';

describe('Connected edit transport',()=>{
 let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
 let owner:Awaited<ReturnType<typeof createTestOwner>>,client:SessionClient,writes:{path:string;body:any}[];
 const transport:typeof fetch=(path,init)=>{
  if(init?.method==='PATCH')writes.push({path:String(path),body:JSON.parse(String(init.body))});
  return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
 };
 const expense=async()=>(await client.listTransactions({type:'expense',includeArchived:true})).transactions[0];
 const request=(id:string,changes:TransactionEditRequest['changes'],type:TransactionEditRequest['transactionType']='expense',revision=1):TransactionEditRequest=>({ownerId:owner.userId,transactionId:id,transactionType:type,expectedRevision:revision,clientMutationId:randomUUID(),changes});
 before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
 after(async()=>{await app?.close();await closeTestDb();});
 beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);await seedMasterData(db,owner.userId);writes=[];client=new SessionClient(transport);});
 it('validates all types, nullable clearing, normalized note/time and original replay',async()=>{
  const original=await expense();
  const input=request(original.id,{note:' trimmed ',categoryId:null,occurredAtLocalTime:'09:42'});
  const ack=await client.editTransaction(input);assert.equal(ack.note,'trimmed');assert.equal(ack.categoryId,null);assert.equal(ack.budgetPocketId,original.budgetPocketId);
  const noop=request(ack.id,{amount:ack.amount},'expense',ack.revision);assert.equal((await client.editTransaction(noop)).revision,ack.revision);
  await client.editTransaction(request(ack.id,{note:null},'expense',ack.revision));
  assert.deepEqual(await client.editTransaction(input),ack);assert.equal(await client.resolveTransactionEdit(input),'committed');
  const income=await client.createTransaction({version:1,ownerId:owner.userId,operation:'create',body:{clientMutationId:randomUUID(),type:'income',amount:1000,pocketId:original.pocketId!,incomeSource:'gaji',occurredOn:original.occurredOn,occurredAtLocalTime:'10:00'}});
  assert.equal((await client.editTransaction(request(income.id,{incomeSource:null},'income'))).incomeSource,null);
  const transfer=(await client.listTransactions({type:'transfer'})).transactions[0];
  assert.equal((await client.editTransaction(request(transfer.id,{note:'transfer'},'transfer'))).note,'transfer');
 });
 it('snapshots nested changes before preflight and keeps identical explicit retries after response loss',async()=>{
  const input=request((await expense()).id,{note:' original ',categoryId:null}),copy=structuredClone(input);let lose=true;
  client=new SessionClient(async(path,init)=>{if(String(path)==='/v1/me'){input.changes.note='changed';input.expectedRevision=999;}
   const response=await transport(path,init);if(init?.method==='PATCH'&&lose){lose=false;throw new Error('lost');}return response;});
  await assert.rejects(client.editTransaction(input),{code:'NETWORK_ERROR'});assert.equal(writes.length,1);
  await transport('/v1/auth/csrf');const ack=await client.editTransaction(copy);assert.equal(ack.note,'original');
  assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
  assert.deepEqual(writes[0].body,{clientMutationId:copy.clientMutationId,expectedRevision:1,...copy.changes});
 });
 it('rejects forbidden/invalid fields before dispatch and foreign session before mutation',async()=>{
  const input=request((await expense()).id,{note:'x'});
  for(const changes of [{},{type:'income'},{budgetPocketId:randomUUID()},{amount:null},{amount:1.5},{note:undefined},{note:'x'.repeat(501)},{occurredOn:'2026-02-30'},{occurredAtLocalTime:'24:00'},{incomeSource:null},{pocketId:null},{categoryId:4}]){
   await assert.rejects(client.editTransaction({...input,changes} as any),{code:'INVALID_INPUT'});
  }
  await assert.rejects(client.editTransaction({...input,expectedRevision:Number.MAX_SAFE_INTEGER+1}),{code:'INVALID_INPUT'});
  owner=await createTestOwner(db);await assert.rejects(client.editTransaction(input),{code:'OWNER_CHANGED'});assert.equal(writes.length,0);
 });
 it('stops rejected edits permanently without changing canonical state or auto-merging revisions',async()=>{
  const original=await expense(),input=request(original.id,{amount:110000});
  await assert.rejects(client.editTransaction(input),{code:'INSUFFICIENT_FUNDS'});
  assert.equal(await client.resolveTransactionEdit(input),'cancelled');assert.equal(await client.resolveTransactionEdit(input),'cancelled');
  await assert.rejects(client.editTransaction(input),{code:'MUTATION_CANCELLED'});assert.deepEqual(await expense(),original);
  await client.editTransaction(request(original.id,{note:'new'}));
  await assert.rejects(client.editTransaction(request(original.id,{note:'stale'})),{code:'REVISION_CONFLICT'});
 });
 it('rejects incorrect acknowledgements and malformed terminal envelopes',async()=>{
  const original=await expense(),input=request(original.id,{note:'expected'}),valid={...original,note:'expected',revision:2};
  const invalids=[{transaction:{...valid,id:randomUUID()}},{transaction:{...valid,revision:7}},{transaction:{...valid,note:'wrong'}},{transaction:{...valid,type:'income'}},{transaction:{...valid,ownerId:owner.userId}},{transaction:valid,extra:true},{transaction:{id:original.id}}];
  for(const fake of invalids){client=new SessionClient((path,init)=>init?.method==='PATCH'?Promise.resolve(new Response(JSON.stringify(fake),{status:200})):transport(path,init));await assert.rejects(client.editTransaction(input),{code:'INVALID_RESPONSE'});}
  for(const fake of [{status:'cancelled',clientMutationId:randomUUID()},{status:'cancelled',clientMutationId:input.clientMutationId,acknowledgement:null},{status:'committed',clientMutationId:input.clientMutationId,acknowledgement:{transaction:{...valid,note:'wrong'}}},{status:'cancelled',clientMutationId:input.clientMutationId,extra:true}]){
   client=new SessionClient((path,init)=>String(path).endsWith('/resolve-attempt')?Promise.resolve(new Response(JSON.stringify(fake),{status:200})):transport(path,init));await assert.rejects(client.resolveTransactionEdit(input),{code:'INVALID_RESPONSE'});
  }
  assert.equal(writes.length,0);
 });
});
