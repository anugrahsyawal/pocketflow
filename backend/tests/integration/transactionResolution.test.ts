import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {SessionClient} from '../../../frontend/src/lib/api/sessionClient.js';
import type {TransactionAttempt} from '../../../frontend/src/lib/api/transactionAttempt.js';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';
import {transactions,idempotencyRecords,pocketBudgetAllocations} from '../../src/db/schema.js';

describe('Terminal create attempt resolution',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient;
  const transport:typeof fetch=(path,init)=>fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  const attempt=():TransactionAttempt=>({version:1,operation:'create',ownerId:owner.userId,body:{
    clientMutationId:randomUUID(),type:'expense',pocketId:ids.nfc.id,amount:1000,occurredOn:'2026-09-30',occurredAtLocalTime:'11:30',note:'resolve'}});
  const post=(path:string,body:unknown,csrf=owner.csrfToken)=>app.inject({method:'POST',url:path,
    headers:{cookie:owner.cookieHeader,'x-csrf-token':csrf},payload:body as object});
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);client=new SessionClient(transport);});
  it('cancellation is durable, non-financial and fences single, changed-payload and batch reuse',async()=>{
    const input=attempt(),ledger=await db.select().from(transactions),allocations=await db.select().from(pocketBudgetAllocations);
    assert.equal(await client.resolveTransactionAttempt(input),'cancelled');
    assert.equal(await client.resolveTransactionAttempt(input),'cancelled');
    await assert.rejects(client.createTransaction(input),{code:'MUTATION_CANCELLED'});
    await assert.rejects(client.createTransaction({...input,body:{...input.body,amount:2000}}),{code:'IDEMPOTENCY_CONFLICT'});
    // SessionClient has rotated CSRF. Fetch the latest token for raw batch requests.
    const csrf=(await (await transport('/v1/auth/csrf')).json()).csrfToken;
    const batch=await post('/v1/transactions/batch',{clientMutationId:randomUUID(),items:[input.body]},csrf);
    assert.equal(batch.statusCode,409);assert.equal(batch.json().error.code,'MUTATION_CANCELLED');
    const otherRoute=await post('/v1/transactions/batch',{clientMutationId:input.body.clientMutationId,items:[attempt().body]},csrf);
    assert.equal(otherRoute.statusCode,409);
    assert.deepEqual(await db.select().from(transactions),ledger);
    assert.deepEqual(await db.select().from(pocketBudgetAllocations),allocations);
    const records=await db.select().from(idempotencyRecords);assert.equal(records.length,1);assert.equal(records[0].expiresAt,null);
  });
  it('already committed resolution returns original acknowledgement without cancelling its transaction',async()=>{
    const input=attempt(),created=await client.createTransaction(input);
    assert.equal(await client.resolveTransactionAttempt(input),'committed');
    assert.deepEqual(await client.createTransaction(input),created);
    assert.equal((await db.select().from(transactions)).length,3);
    await assert.rejects(client.resolveTransactionAttempt({...input,body:{...input.body,note:'changed'}}),{code:'IDEMPOTENCY_CONFLICT'});
  });
  it('concurrent create/resolve and batch/resolve have one terminal winner',async()=>{
    for(const batch of [false,true]){
      for(let i=0;i<5;i++){
        const input=attempt(),root=randomUUID();
        const [create,resolve]=await Promise.all([
          post(batch?'/v1/transactions/batch':'/v1/transactions',batch?{clientMutationId:root,items:[input.body]}:input.body),
          post('/v1/transactions/resolve-attempt',input.body),
        ]);
        assert.equal(resolve.statusCode,200);
        const result=resolve.json();
        assert.equal(create.statusCode,result.status==='committed'?201:409);
        const again=await post('/v1/transactions',input.body);
        assert.equal(again.statusCode,result.status==='committed'?201:409);
        assert.deepEqual((await post('/v1/transactions/resolve-attempt',input.body)).json(),result);
      }
    }
    const rows=await db.select().from(transactions),records=await db.select().from(idempotencyRecords);
    const committed=records.filter(r=>JSON.parse(r.responseReference!).statusCode===201&&JSON.parse(r.responseReference!).body.transaction);
    assert.equal(rows.length,2+committed.length);
  });
  it('lost resolution response and concurrent repeated resolution remain explicitly recoverable',async()=>{
    const input=attempt();let calls=0;
    const losing=new SessionClient(async(path,init)=>{const r=await transport(path,init);if(String(path).endsWith('/resolve-attempt')){calls++;throw new Error('lost');}return r;});
    await assert.rejects(losing.resolveTransactionAttempt(input),{code:'NETWORK_ERROR'});assert.equal(calls,1);
    assert.deepEqual(await Promise.all([client.resolveTransactionAttempt(input),client.resolveTransactionAttempt(input)]),['cancelled','cancelled']);
    assert.equal((await db.select().from(transactions)).length,2);
  });
  it('auth, CSRF, owner isolation and shape validation protect resolution',async()=>{
    const input=attempt();
    assert.equal((await app.inject({method:'POST',url:'/v1/transactions/resolve-attempt',payload:input.body})).statusCode,401);
    assert.equal((await post('/v1/transactions/resolve-attempt',input.body,'wrong')).statusCode,403);
    assert.equal((await post('/v1/transactions/resolve-attempt',{...input.body,userId:owner.userId})).statusCode,400);
    const original=owner;owner=await createTestOwner(db);
    await assert.rejects(client.resolveTransactionAttempt(input),{code:'OWNER_CHANGED'});
    // Raw resolution cannot read or fence another owner's namespace, even with the same ID.
    assert.equal((await post('/v1/transactions/resolve-attempt',input.body)).json().status,'cancelled');
    owner=original;await client.createTransaction(input);assert.equal(await client.resolveTransactionAttempt(input),'committed');
  });
  it('malformed or mismatched terminal responses never acknowledge an attempt',async()=>{
    const input=attempt();
    for(const response of [{status:'cancelled',clientMutationId:randomUUID()},
      {status:'pending',clientMutationId:input.body.clientMutationId},
      {status:'committed',clientMutationId:input.body.clientMutationId,acknowledgement:{}},
      {status:'cancelled',clientMutationId:input.body.clientMutationId,acknowledgement:{}}]){
      const fake=new SessionClient(async path=>String(path).endsWith('/me')?Response.json({user:{id:owner.userId,email:'a',displayName:'b'}}):
        String(path).endsWith('/csrf')?Response.json({csrfToken:'test'}):Response.json(response));
      await assert.rejects(fake.resolveTransactionAttempt(input),{code:'INVALID_RESPONSE'});
    }
  });
});
