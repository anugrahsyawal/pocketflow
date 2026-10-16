import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';

describe('Transaction edit recovery audit (existing API only)',()=>{
 let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>;
 let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>;
 const send=async(method:'POST'|'PATCH',path:string,payload:unknown)=>{
  const token=(await app.inject({method:'GET',url:'/v1/auth/csrf',headers:{cookie:owner.cookieHeader}})).json().csrfToken;
  return app.inject({method,url:path,headers:{cookie:owner.cookieHeader,'x-csrf-token':token},payload});
 };
 const expense=async()=>(await app.inject({method:'GET',url:'/v1/transactions?type=expense',headers:{cookie:owner.cookieHeader}})).json().transactions[0];
 before(async()=>{db=await getTestDb();app=await createTestApp();});
 after(async()=>{await app?.close();await closeTestDb();});
 beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);});
 it('rejected amount edit can execute later with identical ID/revision after income arrives',async()=>{
  const original=await expense(),path=`/v1/transactions/${original.id}`;
  const body={clientMutationId:randomUUID(),expectedRevision:1,amount:110000};
  const rejected=await send('PATCH',path,body);assert.equal(rejected.statusCode,422);assert.equal(rejected.json().error.code,'INSUFFICIENT_FUNDS');assert.deepEqual(await expense(),original);
  const income=await send('POST','/v1/transactions',{clientMutationId:randomUUID(),type:'income',pocketId:ids.nfc.id,amount:20000,occurredOn:original.occurredOn,occurredAtLocalTime:'11:00'});assert.equal(income.statusCode,201);
  const accepted=await send('PATCH',path,body);assert.equal(accepted.statusCode,200);assert.equal(accepted.json().transaction.amount,110000);assert.equal(accepted.json().transaction.revision,2);
 });
 it('no-op keeps revision; replay after a later edit returns original acknowledgement',async()=>{
  const original=await expense(),path=`/v1/transactions/${original.id}`,noop={clientMutationId:randomUUID(),expectedRevision:1,amount:original.amount};
  const first=await send('PATCH',path,noop);assert.equal(first.statusCode,200);assert.equal(first.json().transaction.revision,1);
  const changed=await send('PATCH',path,{clientMutationId:randomUUID(),expectedRevision:1,note:'Later edit'});assert.equal(changed.statusCode,200);assert.equal(changed.json().transaction.revision,2);
  assert.deepEqual((await send('PATCH',path,noop)).json(),first.json());assert.equal((await expense()).note,'Later edit');
 });
 it('backend accepts explicit null category/source; omitted category and budget snapshot are preserved',async()=>{
  const original=await expense(),path=`/v1/transactions/${original.id}`;
  const noteOnly=await send('PATCH',path,{clientMutationId:randomUUID(),expectedRevision:1,note:'Keep attribution'});assert.equal(noteOnly.statusCode,200);
  assert.equal(noteOnly.json().transaction.categoryId,original.categoryId);assert.equal(noteOnly.json().transaction.budgetPocketId,original.budgetPocketId);
  const cleared=await send('PATCH',path,{clientMutationId:randomUUID(),expectedRevision:2,categoryId:null,note:null});assert.equal(cleared.statusCode,200);assert.equal(cleared.json().transaction.categoryId,null);assert.equal(cleared.json().transaction.budgetPocketId,original.budgetPocketId);
  const income=await send('POST','/v1/transactions',{clientMutationId:randomUUID(),type:'income',pocketId:ids.nfc.id,amount:1000,incomeSource:'gaji',occurredOn:original.occurredOn,occurredAtLocalTime:'11:00'});assert.equal(income.statusCode,201);
  const source=await send('PATCH',`/v1/transactions/${income.json().transaction.id}`,{clientMutationId:randomUUID(),expectedRevision:1,incomeSource:null});assert.equal(source.statusCode,200);assert.equal(source.json().transaction.incomeSource,null);
 });
});
