import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { buildSetupRequest } from '../../../frontend/src/lib/api/setupDraft.js';
import { loadMasterData } from '../../../frontend/src/lib/api/masterData.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { pockets } from '../../src/db/schema.js';

describe('Connected setup submission',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,client:SessionClient;
  const transport:typeof fetch=(path,init)=>fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);client=new SessionClient(transport);});
  it('creates selected pockets once and reads canonical UUIDs, balances and mappings',async()=>{
    await client.setup(buildSetupRequest(['food-groceries','cash','transportation','nfc-card'],'30000','40000',randomUUID()));
    const data=await loadMasterData(client);
    assert.equal(data.pockets.length,4);
    const food=data.pockets.find(p=>p.templateKey==='food-groceries')!;
    const cash=data.pockets.find(p=>p.templateKey==='cash')!;
    assert.equal(cash.currentBalance,30000);assert.equal(cash.budgetOwnerPocketId,food.id);
    assert.notEqual(food.id,'food-groceries');assert.equal(food.allocation,1300000);
  });
  it('does not automatically retry a lost response; explicit same-ID retry is safe',async()=>{
    let writes=0;
    client=new SessionClient(async(path,init)=>{
      const result=await transport(path,init);
      if(init?.method==='PUT' && ++writes===1) throw new Error('response lost after commit');
      return result;
    });
    const payload=buildSetupRequest(['transportation'],'0','0',randomUUID());
    await assert.rejects(client.setup(payload),{status:0});assert.equal(writes,1);
    await client.setup(payload);assert.equal(writes,2);
    assert.equal((await db.select().from(pockets)).length,1);
    await assert.rejects(client.setup({...payload,clientMutationId:randomUUID()}),{code:'SETUP_ALREADY_COMPLETED'});
  });
  it('accepts wallets before their owners, including reselected companion pockets',async()=>{
    const payload=buildSetupRequest(['cash','nfc-card','transportation','food-groceries'],'30000','40000',randomUUID());
    await client.setup(payload);
    await client.setup(payload);
    const data=await loadMasterData(client);
    assert.equal(data.pockets.length,4);
    for(const [wallet,key] of [['cash','food-groceries'],['nfc-card','transportation']]) {
      assert.equal(data.pockets.find(p=>p.templateKey===wallet)!.budgetOwnerPocketId,
        data.pockets.find(p=>p.templateKey===key)!.id);
    }
  });
  it('handles CSRF rotation without changing mutation identity',async()=>{
    // Prime token via a rejected setup (no database effects), then rotate from another tab.
    await assert.rejects(client.setup({clientMutationId:randomUUID(),selectedPocketKeys:['cash'],cashOpeningBalance:0}),{status:422});
    await transport('/v1/auth/csrf');
    await client.setup(buildSetupRequest(['transportation'],'0','0',randomUUID()));
    assert.equal((await db.select().from(pockets)).length,1);
  });
});

describe('Setup draft safety',()=>{
  it('requires explicit companion selection; never adds pockets silently',()=>{
    assert.throws(()=>buildSetupRequest(['cash'],'0','0',randomUUID()),/Food/);
    assert.throws(()=>buildSetupRequest(['nfc-card'],'0','0',randomUUID()),/Transportation/);
    assert.throws(()=>buildSetupRequest([],'0','0',randomUUID()));
  });
  it('validates whole rupiah and omits unselected wallet balances',()=>{
    for(const value of ['','-1','1.5','1e3','1,000','9007199254740992']) {
      assert.throws(()=>buildSetupRequest(['food-groceries','cash'],value,'0',randomUUID()));
    }
    assert.equal(buildSetupRequest(['food-groceries','cash'],'0','0',randomUUID()).cashOpeningBalance,0);
    assert.equal('cashOpeningBalance' in buildSetupRequest(['transportation'],'invalid','invalid',randomUUID()),false);
  });
  it('bounds repeated CSRF rejection and rejects malformed success',async()=>{
    let writes=0;
    const client=new SessionClient(async(path)=>{
      if(String(path).endsWith('/csrf'))return Response.json({csrfToken:'token'});
      writes++;return Response.json({error:{code:'INVALID_CSRF_TOKEN'}},{status:403});
    });
    await assert.rejects(client.setup(buildSetupRequest(['transportation'],'0','0',randomUUID())),{status:403});
    assert.equal(writes,2);
    const malformed=new SessionClient(async(path)=>Response.json(String(path).endsWith('/csrf')?{csrfToken:'token'}:{}));
    await assert.rejects(malformed.setup(buildSetupRequest(['transportation'],'0','0',randomUUID())),{code:'INVALID_RESPONSE'});
  });
});
