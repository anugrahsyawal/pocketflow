import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {SessionClient} from '../../../frontend/src/lib/api/sessionClient.js';
import type {TransactionAttempt,TransactionCreateBody} from '../../../frontend/src/lib/api/transactionAttempt.js';
import {loadMasterData} from '../../../frontend/src/lib/api/masterData.js';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';
import {transactions} from '../../src/db/schema.js';

describe('Connected single transaction create transport',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient,writes:unknown[];
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='POST')writes.push(JSON.parse(String(init.body)));
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  const attempt=(body?:TransactionCreateBody):TransactionAttempt=>({version:1,operation:'create',ownerId:owner.userId,body:body??{
    clientMutationId:randomUUID(),type:'expense',pocketId:ids.nfc.id,amount:1000,occurredOn:'2026-09-29',occurredAtLocalTime:'11:30',note:' exact '}});
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);writes=[];client=new SessionClient(transport);});
  it('creates expense with server budget snapshot; replay is original acknowledgement, not current state',async()=>{
    const input=attempt(),first=await client.createTransaction(input);
    assert.equal(first.budgetPocketId,ids.transport.id);assert.equal(first.note,' exact ');assert.equal(first.occurredAtLocalTime,'11:30:00');
    assert.equal('budgetPocketId' in (writes[0] as object),false);
    await db.update(transactions).set({note:'later edit',revision:2}).where(eq(transactions.id,first.id));
    assert.deepEqual(await client.createTransaction(input),first);
    assert.equal((await db.select().from(transactions)).length,3);
    assert.equal((await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.currentBalance,81000);
    assert.equal((await client.listTransactions()).transactions.find(t=>t.id===first.id)!.note,'later edit');
  });
  it('validates income, standard transfer and reallocation acknowledgements',async()=>{
    const base={clientMutationId:randomUUID(),amount:1000,occurredOn:'2026-09-29',occurredAtLocalTime:'12:00:00'};
    const income=await client.createTransaction(attempt({...base,type:'income',pocketId:ids.cash.id,incomeSource:'gaji'}));
    assert.equal(income.incomeSource,'gaji');assert.equal(income.budgetPocketId,null);
    for(const transferType of ['normal','budget-reallocation'] as const){
      const transfer=await client.createTransaction(attempt({...base,clientMutationId:randomUUID(),type:'transfer',fromPocketId:ids.food.id,toPocketId:ids.transport.id,transferType}));
      assert.equal(transfer.transferType,transferType);assert.equal(transfer.budgetPocketId,null);
    }
  });
  it('retains exact immutable body on lost response, explicit retry and CSRF rotation',async()=>{
    const input=attempt();let lose=true;
    client=new SessionClient(async(path,init)=>{const response=await transport(path,init);if(init?.method==='POST'&&lose){lose=false;throw new Error('lost');}return response;});
    await assert.rejects(client.createTransaction(input),{code:'NETWORK_ERROR'});assert.equal(writes.length,1);
    await transport('/v1/auth/csrf');await client.createTransaction(input);
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
    assert.equal((await db.select().from(transactions)).length,3);
  });
  it('preserves 422 and 409 errors without silently retrying or changing the ID',async()=>{
    const input=attempt();await client.createTransaction(input);
    await assert.rejects(client.createTransaction({...input,body:{...input.body,amount:2000}}),{code:'IDEMPOTENCY_CONFLICT'});
    await assert.rejects(client.createTransaction({...input,body:{...input.body,clientMutationId:randomUUID(),amount:99999999}}),{code:'INSUFFICIENT_FUNDS'});
    assert.equal(writes.length,3);assert.equal((await db.select().from(transactions)).length,3);
  });
  it('blocks foreign-session dispatch and invalid client fields before POST',async()=>{
    const input=attempt();owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.createTransaction(input),{code:'OWNER_CHANGED'});assert.equal(writes.length,0);
    await assert.rejects(client.createTransaction({...input,body:{...input.body,budgetPocketId:ids.food.id}} as TransactionAttempt),{code:'INVALID_INPUT'});
    assert.equal(writes.length,0);
  });
  it('rejects malformed or mismatched acknowledgements without a second POST',async()=>{
    const input=attempt(),valid=await client.createTransaction(input);
    for(const patch of [{amount:2000},{budgetPocketId:null},{note:'different'},{revision:2},{pocketId:ids.cash.id},{occurredAtLocalTime:'12:00:00'}]){
      let calls=0;const fake=new SessionClient(async(path,init)=>{
        if(String(path).endsWith('/me'))return Response.json({user:{id:owner.userId,email:'test@example.com',displayName:'test'}});
        if(String(path).endsWith('/csrf'))return Response.json({csrfToken:'test'});
        if(init?.method==='POST')calls++;return Response.json({transaction:{...valid,...patch}},{status:201});
      });
      await assert.rejects(fake.createTransaction(input),{code:'INVALID_RESPONSE'});assert.equal(calls,1);
    }
  });
});
