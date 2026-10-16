import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {SessionClient,type TransactionDeleteRequest} from '../../../frontend/src/lib/api/sessionClient.js';
import {loadMasterData} from '../../../frontend/src/lib/api/masterData.js';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';
import {purgeDeletedTransactions} from '../../src/lib/purge.js';
import {parseTransactionRecoveryRecord} from '../../../frontend/src/lib/api/transactionAttempt.js';

describe('Connected permanent-delete transport (no UI)',()=>{
 let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
 let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient;
 let writes:{path:string;body:unknown}[];
 const transport:typeof fetch=(path,init)=>{
  if(init?.method==='DELETE')writes.push({path:String(path),body:JSON.parse(String(init.body))});
  return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
 };
 const request=(transactionId:string,expectedRevision=1):TransactionDeleteRequest=>({ownerId:owner.userId,transactionId,expectedRevision,clientMutationId:randomUUID(),confirmPermanentDelete:true});
 const expense=async()=>(await client.listTransactions({type:'expense',includeArchived:true})).transactions[0];
 const balance=async()=>(await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.currentBalance;
 before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
 after(async()=>{await app?.close();await closeTestDb();});
 beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);writes=[];client=new SessionClient(transport);});
 it('deletes active expense, returns stable acknowledgement and cannot restore tombstone',async()=>{
  const input=request((await expense()).id),ack=await client.deleteTransaction(input);
  assert.equal(ack.deletedTransactionId,input.transactionId);assert.equal(ack.success,true);assert.equal(await balance(),100000);
  assert.equal(await expense(),undefined);assert.deepEqual(await client.deleteTransaction(input),ack);
  assert.deepEqual(writes[0].body,{clientMutationId:input.clientMutationId,expectedRevision:1,confirmPermanentDelete:true});
  await assert.rejects(client.setTransactionArchived({ownerId:owner.userId,transactionId:input.transactionId,clientMutationId:randomUUID(),expectedRevision:2,operation:'restore'}),{code:'NOT_FOUND'});
  await assert.rejects(client.deleteTransaction({...input,clientMutationId:randomUUID()}),{code:'NOT_FOUND'});
 });
 it('deletes archived expense without reversing its financial effect twice',async()=>{
  const t=await expense();await client.setTransactionArchived({ownerId:owner.userId,transactionId:t.id,clientMutationId:randomUUID(),expectedRevision:1,operation:'archive'});
  const before=await loadMasterData(client);await client.deleteTransaction(request(t.id,2));assert.deepEqual(await loadMasterData(client),before);assert.equal(await expense(),undefined);
 });
 it('replays original delete acknowledgement after tombstone purge, without recreating data',async()=>{
  const input=request((await expense()).id),ack=await client.deleteTransaction(input);
  const result=await purgeDeletedTransactions({db,userId:owner.userId,now:new Date(Date.parse(ack.deletedAt)+31*24*60*60*1000)});
  assert.deepEqual(result.purgedTransactionIds,[input.transactionId]);
  assert.deepEqual(await client.deleteTransaction(input),ack);
  await assert.rejects(client.deleteTransaction({...input,clientMutationId:randomUUID()}),{code:'NOT_FOUND'});
  assert.equal(await expense(),undefined);assert.equal(await balance(),100000);
 });
 it('lost response is not automatically retried; explicit identical retry survives CSRF rotation',async()=>{
  const input=request((await expense()).id);let lose=true;
  client=new SessionClient(async(path,init)=>{const result=await transport(path,init);if(init?.method==='DELETE'&&lose){lose=false;throw new Error('lost response');}return result;});
  await assert.rejects(client.deleteTransaction(input),{code:'NETWORK_ERROR'});assert.equal(writes.length,1);
  await transport('/v1/auth/csrf');const ack=await client.deleteTransaction(input);assert.equal(ack.success,true);
  assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);assert.equal(await balance(),100000);
 });
 it('snapshots the exact request before awaiting session preflight',async()=>{
  const input=request((await expense()).id),original={...input};
  client=new SessionClient(async(path,init)=>{if(String(path)==='/v1/me'){input.transactionId=randomUUID();input.expectedRevision=99;input.clientMutationId=randomUUID();}return transport(path,init);});
  const ack=await client.deleteTransaction(input);assert.equal(ack.deletedTransactionId,original.transactionId);
  assert.deepEqual(writes[0].body,{clientMutationId:original.clientMutationId,expectedRevision:1,confirmPermanentDelete:true});
 });
 it('rejects missing confirmation, unknown fields, unsafe revisions and foreign session before DELETE',async()=>{
  const input=request((await expense()).id);
  for(const patch of [{confirmPermanentDelete:false},{confirmPermanentDelete:undefined},{confirmPermanentDelete:'true'},{operation:'delete'},{expectedRevision:0},{expectedRevision:1.5},{expectedRevision:Number.MAX_SAFE_INTEGER+1},{transactionId:'bad'},{clientMutationId:'bad'}]){
   await assert.rejects(client.deleteTransaction({...input,...patch} as TransactionDeleteRequest),{code:'INVALID_INPUT'});
  }
  owner=await createTestOwner(db);await assert.rejects(client.deleteTransaction(input),{code:'OWNER_CHANGED'});assert.equal(writes.length,0);
  await assert.rejects(client.deleteTransaction({...input,ownerId:owner.userId}),{code:'NOT_FOUND'});assert.equal(writes.length,1);
 });
 it('preserves revision, idempotency and missing-record errors without retry',async()=>{
  const input=request((await expense()).id);await assert.rejects(client.deleteTransaction({...input,expectedRevision:2}),{code:'REVISION_CONFLICT'});assert.equal(writes.length,1);
  await client.deleteTransaction(input);await assert.rejects(client.deleteTransaction({...input,expectedRevision:2}),{code:'IDEMPOTENCY_CONFLICT'});
  await assert.rejects(client.deleteTransaction(request(randomUUID())),{code:'NOT_FOUND'});assert.equal(writes.length,4);
 });
 it('rejects malformed and wrong-target success; never accepts missing row as acknowledgement',async()=>{
  const input=request((await expense()).id),valid={success:true,deletedTransactionId:input.transactionId,deletedAt:'2026-10-01T00:00:00.000Z'};
  const responses=[null,[],{}, {...valid,success:false},{...valid,deletedTransactionId:randomUUID()},{...valid,deletedAt:'2026-02-30T00:00:00.000Z'},{...valid,deletedAt:'bad'},{...valid,extra:true}];
  for(const response of responses){
   client=new SessionClient((path,init)=>init?.method==='DELETE'?Promise.resolve(new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}})):transport(path,init));
   await assert.rejects(client.deleteTransaction(input),{code:'INVALID_RESPONSE'});
  }
  assert.equal(await balance(),82000);assert.equal(writes.length,0);
 });
 it('retains business rejection: same delete can later succeed after allocation conditions change',async()=>{
  const occurredOn=(await expense()).occurredOn;
  const moved=await client.createTransaction({version:1,ownerId:owner.userId,operation:'create',body:{clientMutationId:randomUUID(),type:'transfer',fromPocketId:ids.food.id,toPocketId:ids.transport.id,transferType:'budget-reallocation',amount:30000,occurredOn,occurredAtLocalTime:'11:00'}});
  // Existing NFC top-up already removed 100k from bank balance; income restores
  // spendable funds without raising the budget allocation being tested.
  await client.createTransaction({version:1,ownerId:owner.userId,operation:'create',body:{clientMutationId:randomUUID(),type:'income',pocketId:ids.transport.id,amount:100000,occurredOn,occurredAtLocalTime:'11:30'}});
  const spent=await client.createTransaction({version:1,ownerId:owner.userId,operation:'create',body:{clientMutationId:randomUUID(),type:'expense',pocketId:ids.transport.id,amount:210000,occurredOn,occurredAtLocalTime:'12:00'}});
  const input=request(moved.id),before=await loadMasterData(client);
  await assert.rejects(client.deleteTransaction(input),{code:'INSUFFICIENT_ALLOCATION'});assert.equal(writes.length,1);assert.deepEqual(await loadMasterData(client),before);
  const stopped=request(moved.id);assert.equal(await client.resolveTransactionDelete(stopped),'cancelled');
  await client.setTransactionArchived({ownerId:owner.userId,transactionId:spent.id,clientMutationId:randomUUID(),expectedRevision:1,operation:'archive'});
  await assert.rejects(client.deleteTransaction(stopped),{code:'MUTATION_CANCELLED'});
  assert.equal((await client.deleteTransaction(input)).success,true);assert.deepEqual(writes[0],writes[2]);
  assert.equal((await loadMasterData(client)).pockets.find(p=>p.id===ids.transport.id)!.allocation,200000);
 });
 it('cancellation is permanent and non-financial; identity conflicts are not terminal success',async()=>{
  const original=await expense(),input=request(original.id),before=await loadMasterData(client);
  assert.equal(await client.resolveTransactionDelete(input),'cancelled');assert.equal(await client.resolveTransactionDelete(input),'cancelled');
  await assert.rejects(client.deleteTransaction(input),{code:'MUTATION_CANCELLED'});
  await assert.rejects(client.resolveTransactionDelete({...input,expectedRevision:2}),{code:'IDEMPOTENCY_CONFLICT'});
  await assert.rejects(client.resolveTransactionDelete({...input,transactionId:randomUUID()}),{code:'IDEMPOTENCY_CONFLICT'});
  await assert.rejects(client.setTransactionArchived({ownerId:input.ownerId,transactionId:input.transactionId,clientMutationId:input.clientMutationId,expectedRevision:1,operation:'archive'}),{code:'IDEMPOTENCY_CONFLICT'});
  assert.deepEqual(await expense(),original);assert.deepEqual(await loadMasterData(client),before);
 });
 it('committed delete resolution survives purge and never recreates the target',async()=>{
  const input=request((await expense()).id),ack=await client.deleteTransaction(input);
  assert.equal(await client.resolveTransactionDelete(input),'committed');
  await purgeDeletedTransactions({db,userId:owner.userId,now:new Date(Date.parse(ack.deletedAt)+31*86400000)});
  assert.equal(await client.resolveTransactionDelete(input),'committed');assert.equal(await expense(),undefined);
  assert.equal(await client.resolveTransactionDelete({...input,clientMutationId:randomUUID()}),'cancelled');assert.equal(await balance(),100000);
 });
 it('execution versus cancellation race has a single terminal winner',async()=>{
  for(let i=0;i<6;i++){
   const t=await client.createTransaction({version:1,operation:'create',ownerId:owner.userId,body:{clientMutationId:randomUUID(),type:'income',pocketId:ids.nfc.id,amount:1000,occurredOn:'2026-10-04',occurredAtLocalTime:'12:00'}});
   const input=request(t.id),before=await balance();
   const [execution,resolution]=await Promise.allSettled([client.deleteTransaction(input),client.resolveTransactionDelete(input)]);
   assert.equal(resolution.status,'fulfilled');if(resolution.status!=='fulfilled')throw Error('resolution failed');
   assert.equal(await client.resolveTransactionDelete(input),resolution.value);
   if(resolution.value==='cancelled'){assert.equal(execution.status,'rejected');if(execution.status==='rejected')assert.equal(execution.reason.code,'MUTATION_CANCELLED');assert.equal(await balance(),before);}
   else {assert.equal(execution.status,'fulfilled');assert.equal(await balance(),before!-1000);}
  }
 });
 it('lost resolution response requires explicit retry and validates returned identity',async()=>{
  const input=request((await expense()).id);let lose=true;
  const losing=new SessionClient(async(path,init)=>{const r=await transport(path,init);if(String(path).endsWith('/resolve-attempt')&&lose){lose=false;throw Error('lost');}return r;});
  await assert.rejects(losing.resolveTransactionDelete(input),{code:'NETWORK_ERROR'});
  await transport('/v1/auth/csrf');assert.equal(await losing.resolveTransactionDelete(input),'cancelled');
  for(const response of [{status:'cancelled',clientMutationId:randomUUID()},{status:'cancelled',clientMutationId:input.clientMutationId,acknowledgement:null},{status:'committed',clientMutationId:input.clientMutationId,acknowledgement:{transaction:{}}}]){
   const bad=new SessionClient((path,init)=>String(path).endsWith('/resolve-attempt')?Promise.resolve(new Response(JSON.stringify(response),{status:200})):transport(path,init));
   await assert.rejects(bad.resolveTransactionDelete(input),{code:'INVALID_RESPONSE'});
  }
 });
 it('resolution validates auth, CSRF and delete-only confirmation; foreign owner cannot fence another owner',async()=>{
  const input=request((await expense()).id),path=`/v1/transactions/${input.transactionId}/resolve-attempt`;
  const body={operation:'delete',clientMutationId:input.clientMutationId,expectedRevision:1,confirmPermanentDelete:true};
  assert.equal((await fetch(address+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,401);
  assert.equal((await transport(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,403);
  const token=await (await transport('/v1/auth/csrf')).json() as {csrfToken:string};
  for(const patch of [{confirmPermanentDelete:false},{confirmPermanentDelete:undefined},{operation:'archive'},{expectedRevision:0},{unexpected:true}]){
   const r=await transport(path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token.csrfToken},body:JSON.stringify({...body,...patch})});assert.equal(r.status,400);
  }
  const originalOwner=owner;owner=await createTestOwner(db);
  await assert.rejects(client.resolveTransactionDelete(input),{code:'OWNER_CHANGED'});
  assert.equal(await new SessionClient(transport).resolveTransactionDelete({...input,ownerId:owner.userId}),'cancelled');
  owner=originalOwner;assert.equal((await new SessionClient(transport).deleteTransaction(input)).success,true);
 });
 it('delete journal requires explicit confirmation; legacy records stay unchanged',()=>{
  const ownerId=randomUUID(),body={clientMutationId:randomUUID(),expectedRevision:1,confirmPermanentDelete:true},record={version:1,ownerId,operation:'delete',transactionId:randomUUID(),body};
  assert.deepEqual(parseTransactionRecoveryRecord(record,ownerId),record);
  for(const patch of [{confirmPermanentDelete:false},{confirmPermanentDelete:undefined},{expectedRevision:0},{extra:true}])assert.throws(()=>parseTransactionRecoveryRecord({...record,body:{...body,...patch}},ownerId));
  assert.throws(()=>parseTransactionRecoveryRecord(record,randomUUID()));
  assert.throws(()=>parseTransactionRecoveryRecord({...record,operation:'restore'},ownerId));
  const legacy={...record,operation:'archive',body:{clientMutationId:body.clientMutationId,expectedRevision:1}};
  assert.deepEqual(parseTransactionRecoveryRecord(legacy,ownerId),legacy);
 });
});
