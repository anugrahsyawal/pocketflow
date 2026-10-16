import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { transactionQuery,parseTransactionPage } from '../../../frontend/src/lib/api/transactionRead.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { transactions } from '../../src/db/schema.js';

describe('Connected transaction read transport',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient;
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);
    client=new SessionClient((path,init)=>fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}}));});
  it('reads separate pages past 50 without treating a page as the whole ledger',async()=>{
    await db.insert(transactions).values(Array.from({length:55},(_,i)=>({userId:owner.userId,type:'income',amount:100+i,pocketId:ids.cash.id,
      incomeSource:'other',occurredOn:'2026-09-01',occurredAtLocalTime:'12:00:00',note:`entry ${i}`,createdAt:new Date(1700000000000+i)})));
    const first=await client.listTransactions(),second=await client.listTransactions({page:2});
    assert.equal(first.transactions.length,50);assert.equal(first.pagination.total,57);assert.equal(first.pagination.hasMore,true);
    assert.equal(second.transactions.length,7);assert.equal(second.pagination.hasMore,false);
    assert.equal(new Set([...first.transactions,...second.transactions].map(t=>t.id)).size,57);
    assert.equal((await client.listTransactions({page:3})).transactions.length,0);
  });
  it('filters type, pocket/category, dates and encoded note while preserving Jakarta strings',async()=>{
    const expense=(await client.listTransactions({type:'expense',pocketId:ids.nfc.id})).transactions[0];
    await db.update(transactions).set({note:'MRT & kopi + ? #'}).where(eq(transactions.id,expense.id));
    const result=await client.listTransactions({categoryId:expense.categoryId!,startDate:expense.occurredOn,endDate:expense.occurredOn,search:'& kopi + ? #'});
    assert.equal(result.transactions.length,1);assert.equal(result.transactions[0].occurredAtLocalTime,'10:00:00');
    assert.equal(result.transactions[0].budgetPocketId,ids.transport.id);
    assert.equal((await client.listTransactions({pocketId:ids.transport.id,type:'transfer'})).transactions.length,1);
  });
  it('separates archive inclusion, excludes tombstones and isolates owners',async()=>{
    const [expense,transfer]=(await client.listTransactions()).transactions;
    await db.update(transactions).set({archivedAt:new Date()}).where(eq(transactions.id,expense.id));
    await db.update(transactions).set({deletedAt:new Date()}).where(eq(transactions.id,transfer.id));
    assert.equal((await client.listTransactions()).transactions.length,0);
    const archived=await client.listTransactions({includeArchived:true});assert.equal(archived.transactions.length,1);assert.equal(archived.transactions[0].isArchived,true);
    owner=await createTestOwner(db);assert.equal((await client.listTransactions({includeArchived:true})).pagination.total,0);
  });
  it('fails closed on malformed rows, duplicate IDs and inconsistent pagination',async()=>{
    const result=await client.listTransactions(),query=transactionQuery().query;
    for(const patch of [{amount:0},{amount:9007199254740992},{occurredOn:'2026-02-30'},{occurredAtLocalTime:'24:00'},
      {revision:0},{pocketId:'wrong'},{isArchived:true},{createdAt:'not-a-date'}]){
      assert.throws(()=>parseTransactionPage({...result,transactions:[{...result.transactions[0],...patch}]},query),{code:'INVALID_RESPONSE'});
    }
    assert.throws(()=>parseTransactionPage({...result,transactions:[result.transactions[0],result.transactions[0]]},query),{code:'INVALID_RESPONSE'});
    assert.throws(()=>parseTransactionPage({...result,pagination:{...result.pagination,hasMore:true}},query),{code:'INVALID_RESPONSE'});
    const safe=parseTransactionPage({...result,transactions:result.transactions.map(t=>({...t,userId:'secret'}))},query);
    assert.equal('userId' in safe.transactions[0],false);
  });
  it('rejects invalid query before network and never retries failed reads silently',async()=>{
    let calls=0;const failed=new SessionClient(async()=>{calls++;throw new Error('offline');});
    for(const query of [{page:0},{limit:101},{startDate:'2026-02-30'},{startDate:'2026-09-20',endDate:'2026-09-01'},
      {pocketId:'../auth/logout'},{search:'a'.repeat(101)}])await assert.rejects(failed.listTransactions(query),{code:'INVALID_INPUT'});
    assert.equal(calls,0);await assert.rejects(failed.listTransactions(),{code:'NETWORK_ERROR'});assert.equal(calls,1);
    const expired=new SessionClient(async()=>Response.json({error:{code:'UNAUTHENTICATED'}},{status:401}));
    await assert.rejects(expired.listTransactions(),{status:401});
  });
});
