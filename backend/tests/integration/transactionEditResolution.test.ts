import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {idempotencyRecords} from '../../src/db/schema.js';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';

describe('Edit terminal resolution (DEC-035)',()=>{
 let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>;
 let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>;
 const send=(method:'GET'|'POST'|'PATCH'|'DELETE',url:string,payload?:unknown)=>app.inject({method,url,headers:{cookie:owner.cookieHeader,'x-csrf-token':owner.csrfToken},payload});
 const list=async()=>(await send('GET','/v1/transactions?includeArchived=true')).json().transactions;
 const expense=async()=>(await list()).find((t:any)=>t.type==='expense');
 const resolve=(id:string,body:any)=>{const {clientMutationId,expectedRevision,...changes}=body;return send('POST',`/v1/transactions/${id}/resolve-attempt`,{operation:'edit',clientMutationId,expectedRevision,changes});};
 const patch=(id:string,body:unknown)=>send('PATCH',`/v1/transactions/${id}`,body);
 before(async()=>{db=await getTestDb();app=await createTestApp();});
 after(async()=>{await app?.close();await closeTestDb();});
 beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);});
 it('fences a rejected edit even after funds arrive, preserving financial state on resolution',async()=>{
  const original=await expense(),body={clientMutationId:randomUUID(),expectedRevision:1,amount:110000};
  assert.equal((await patch(original.id,body)).json().error.code,'INSUFFICIENT_FUNDS');
  const before=await list(),pockets=(await send('GET','/v1/pockets')).json();
  const stopped=await resolve(original.id,body);assert.equal(stopped.statusCode,200);assert.equal(stopped.json().status,'cancelled');
  assert.deepEqual((await resolve(original.id,body)).json(),stopped.json());assert.deepEqual(await list(),before);assert.deepEqual((await send('GET','/v1/pockets')).json(),pockets);
  assert.equal((await send('POST','/v1/transactions',{clientMutationId:randomUUID(),type:'income',pocketId:ids.nfc.id,amount:20000,occurredOn:original.occurredOn,occurredAtLocalTime:'12:00'})).statusCode,201);
  assert.equal((await patch(original.id,body)).json().error.code,'MUTATION_CANCELLED');assert.deepEqual(await expense(),original);
 });
 it('preserves no-op and committed original acknowledgements after later edits and deletion',async()=>{
  const t=await expense(),noop={clientMutationId:randomUUID(),expectedRevision:1,amount:t.amount};
  const first=(await patch(t.id,noop)).json();assert.equal(first.transaction.revision,1);
  const body={clientMutationId:randomUUID(),expectedRevision:1,note:' new note ',categoryId:null};
  const ack=(await patch(t.id,body)).json();assert.equal(ack.transaction.revision,2);assert.equal(ack.transaction.note,'new note');
  assert.deepEqual((await resolve(t.id,noop)).json().acknowledgement,first);
  assert.deepEqual((await resolve(t.id,body)).json().acknowledgement,ack);
  assert.equal((await send('DELETE',`/v1/transactions/${t.id}`,{clientMutationId:randomUUID(),expectedRevision:2,confirmPermanentDelete:true})).statusCode,200);
  assert.deepEqual((await resolve(t.id,body)).json().acknowledgement,ack);assert.equal(await expense(),undefined);
 });
 it('preserves original whitespace/null hash and rejects changes in target/revision/fields',async()=>{
  const t=await expense(),body={clientMutationId:randomUUID(),expectedRevision:1,note:'  retained  ',categoryId:null};
  assert.equal((await resolve(t.id,body)).statusCode,200);
  for(const variant of [{...body,note:'retained'},{...body,expectedRevision:2},{clientMutationId:body.clientMutationId,expectedRevision:1,note:body.note}])assert.equal((await resolve(t.id,variant)).json().error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await resolve(randomUUID(),body)).json().error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await send('POST',`/v1/transactions/${t.id}/archive`,{clientMutationId:body.clientMutationId,expectedRevision:1})).json().error.code,'IDEMPOTENCY_CONFLICT');
 });
 it('shares strict PATCH shape validation, including safe revision and optional nulls',async()=>{
  const t=await expense(),base={clientMutationId:randomUUID(),expectedRevision:1};
  for(const changes of [{},{type:'income'},{budgetPocketId:ids.food.id},{amount:null},{amount:1.5},{note:4},{pocketId:null},{transferType:null},{occurredOn:'2026-02-30'},{occurredAtLocalTime:'25:00'},{categoryId:'bad'},{incomeSource:'bad'}]){
   assert.equal((await patch(t.id,{...base,...changes})).statusCode,400);assert.equal((await resolve(t.id,{...base,...changes})).statusCode,400);
  }
  assert.equal((await resolve(t.id,{...base,expectedRevision:Number.MAX_SAFE_INTEGER+1,note:null})).statusCode,400);
  const valid={...base,note:null,categoryId:null};assert.equal((await resolve(t.id,valid)).statusCode,200);
  assert.equal((await send('POST',`/v1/transactions/${t.id}/resolve-attempt`,{operation:'edit',...base,changes:{expectedRevision:2,note:null}})).statusCode,400);
  assert.equal((await send('POST',`/v1/transactions/${t.id}/resolve-attempt`,{operation:'edit',...base,changes:{note:null},confirmPermanentDelete:true})).statusCode,400);
 });
 it('auth/CSRF and owner scoping prevent foreign cancellation or disclosure',async()=>{
  const t=await expense(),body={clientMutationId:randomUUID(),expectedRevision:1,note:'x'},url=`/v1/transactions/${t.id}/resolve-attempt`,payload={operation:'edit',clientMutationId:body.clientMutationId,expectedRevision:1,changes:{note:'x'}};
  assert.equal((await app.inject({method:'POST',url,payload})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url,payload,headers:{cookie:owner.cookieHeader}})).statusCode,403);
  const originalOwner=owner;owner=await createTestOwner(db);assert.equal((await resolve(t.id,body)).json().status,'cancelled');
  owner=originalOwner;assert.equal((await patch(t.id,body)).statusCode,200);
  assert.equal((await resolve(randomUUID(),{...body,clientMutationId:randomUUID()})).json().status,'cancelled');
 });
 it('concurrent execution and resolution have one durable winner',async()=>{
  for(let i=0;i<8;i++){
   const t=await expense(),body={clientMutationId:randomUUID(),expectedRevision:t.revision,note:`Race ${i}`};
   const [executed,resolved]=await Promise.all([patch(t.id,body),resolve(t.id,body)]);assert.equal(resolved.statusCode,200);
   if(resolved.json().status==='cancelled'){assert.equal(executed.json().error.code,'MUTATION_CANCELLED');assert.deepEqual(await expense(),t);}
   else {assert.equal(executed.statusCode,200);assert.deepEqual(resolved.json().acknowledgement,executed.json());}
   assert.deepEqual((await resolve(t.id,body)).json(),resolved.json());
  }
 });
 it('fails closed on corrupt stored acknowledgement instead of declaring completion',async()=>{
  const t=await expense(),body={clientMutationId:randomUUID(),expectedRevision:1,note:'x'};assert.equal((await patch(t.id,body)).statusCode,200);
  await db.update(idempotencyRecords).set({responseReference:JSON.stringify({version:1,statusCode:200,body:{transaction:{id:t.id,revision:2}}})}).where(eq(idempotencyRecords.clientMutationId,body.clientMutationId));
  assert.equal((await resolve(t.id,body)).statusCode,500);assert.equal((await expense()).note,'x');
 });
});
