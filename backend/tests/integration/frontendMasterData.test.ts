import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { loadMasterData,mapMasterData } from '../../../frontend/src/lib/api/masterData.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { users,pockets,transactions } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

describe('Connected master data read boundary',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,client:SessionClient;
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{
    await resetTestDatabase(db);owner=await createTestOwner(db);
    client=new SessionClient((path,init)=>fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}}));
  });
  it('does not seed a pre-setup account or invent an empty configured budget',async()=>{
    const result=await loadMasterData(client);
    assert.deepEqual(result,{isSetupCompleted:false,period:null,pockets:[],archivedPockets:[]});
    assert.equal((await db.select().from(pockets)).length,0);
  });
  it('uses independent real balances, nullable allocations, UUIDs and pocket categories',async()=>{
    const ids=await seedMasterData(db,owner.userId);
    const result=await loadMasterData(client);
    const transport=result.pockets.find(p=>p.id===ids.transport.id)!;
    const nfc=result.pockets.find(p=>p.id===ids.nfc.id)!;
    const cash=result.pockets.find(p=>p.id===ids.cash.id)!;
    assert.equal(transport.currentBalance,100000);assert.equal(nfc.currentBalance,82000);
    assert.equal(transport.budget?.expense,18000);assert.equal(transport.budget?.remaining,182000);
    assert.equal(nfc.budget?.expense,0);assert.equal(nfc.budget?.remaining,0);
    assert.equal(cash.budget?.availability,'missing-allocation');
    assert.equal(transport.allocation,200000);assert.equal(nfc.allocation,0);assert.equal(cash.allocation,null);
    assert.equal(transport.budgetStatus,'aman');assert.equal(nfc.budgetStatus,'tanpa-alokasi');assert.equal(cash.budgetStatus,null);
    assert.equal(nfc.budgetOwnerPocketId,transport.id);assert.equal(nfc.categories[0].name,'MRT');
    assert.equal(transport.categories.length,0);assert.equal(nfc.revision,1);
    assert.equal((await db.select().from(transactions)).length,2);
  });
  it('never loads another owner financial records',async()=>{
    await seedMasterData(db,owner.userId);
    const other=await createTestOwner(db);
    await db.insert(pockets).values({userId:other.userId,name:'PRIVATE',emoji:'🔒',groupId:'daily',openingBalance:999999});
    assert.ok(!JSON.stringify(await loadMasterData(client)).includes('PRIVATE'));
  });
  it('cleared mapping remains null; no name-based default is recreated',async()=>{
    const ids=await seedMasterData(db,owner.userId);
    await db.update(pockets).set({budgetOwnerPocketId:null}).where(eq(pockets.id,ids.nfc.id));
    assert.equal((await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.budgetOwnerPocketId,null);
  });
  it('a setup-complete account with no active pockets has a real empty state',async()=>{
    await db.update(users).set({setupCompletedAt:new Date()}).where(eq(users.id,owner.userId));
    assert.equal((await loadMasterData(client)).pockets.length,0);
  });
  it('separates archived pockets while retaining categories and budget-owner identity',async()=>{
    const ids=await seedMasterData(db,owner.userId);
    await db.update(pockets).set({isArchived:true,isActive:false}).where(eq(pockets.id,ids.nfc.id));
    const result=await loadMasterData(client);
    assert.ok(!result.pockets.some(p=>p.id===ids.nfc.id));
    assert.equal(result.archivedPockets.length,1);
    assert.equal(result.archivedPockets[0].id,ids.nfc.id);
    assert.equal(result.archivedPockets[0].categories[0].name,'MRT');
    assert.equal(result.archivedPockets[0].budgetOwnerPocketId,ids.transport.id);
    assert.equal((await db.select().from(transactions)).length,2);
  });
  it('does not drop archives when every pocket is archived',async()=>{
    await seedMasterData(db,owner.userId);
    await db.update(pockets).set({isArchived:true,isActive:false}).where(eq(pockets.userId,owner.userId));
    const result=await loadMasterData(client);
    assert.equal(result.pockets.length,0);assert.equal(result.archivedPockets.length,4);
    assert.equal(result.isSetupCompleted,true);
  });
});

describe('Master data validation failures',()=>{
  it('fails closed on malformed payloads and unsafe monetary values',()=>{
    assert.throws(()=>mapMasterData({pockets:null},{categories:[]},{}));
    const id='10000000-0000-4000-8000-000000000001';
    const p={id,templateKey:'cash',name:'Cash',emoji:'💵',budgetOwnerPocketId:null,revision:1,isActive:true,isArchived:false,groupId:'daily',isSpendable:true,openingBalance:0};
    const report={schemaVersion:1,period:{isCurrent:true,startDate:'2026-08-26',endDate:'2026-09-25'},
      pocketBudgetActuals:[{id,currentBalance:9007199254740992,budget:{availability:'missing-allocation',status:null}}]};
    assert.throws(()=>mapMasterData({pockets:[p]},{categories:[]},report),{code:'INVALID_RESPONSE'});
    report.pocketBudgetActuals[0]!.currentBalance=0;
    for(const status of ['safe',undefined,'aman']){
      const malformed={...report,pocketBudgetActuals:[{id,currentBalance:0,budget:{availability:'missing-allocation',status}}]};
      assert.throws(()=>mapMasterData({pockets:[p]},{categories:[]},malformed),{code:'INVALID_RESPONSE'});
    }
  });
  it('does not present partial results when one request fails',async()=>{
    const client=new SessionClient(async path=>{
      if(String(path).endsWith('/setup')) return Response.json({isSetupCompleted:true,completedAt:'2026-09-01'});
      if(String(path).endsWith('/pockets')) return Response.json({pockets:[]});
      throw new Error('offline');
    });
    await assert.rejects(loadMasterData(client),{status:0});
  });
  it('short-circuits reads when setup is incomplete',async()=>{
    let calls=0;
    const client=new SessionClient(async()=>{calls++;return Response.json({isSetupCompleted:false,completedAt:null});});
    assert.equal((await loadMasterData(client)).isSetupCompleted,false);assert.equal(calls,1);
  });
});
