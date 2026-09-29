import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { pockets,transactions } from '../../src/db/schema.js';

describe('Connected Cash/NFC budget-owner transport',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient;
  let patches:number;
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='PATCH')patches++;
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{
    await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);
    patches=0;client=new SessionClient(transport);
  });
  it('changes mapping without moving funds or rewriting historical attribution',async()=>{
    const before=await db.select().from(transactions);
    const result=await client.updateBudgetOwner(ids.nfc.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:ids.food.id});
    assert.equal(result.revision,2);assert.equal(result.budgetOwnerPocketId,ids.food.id);
    assert.deepEqual(await db.select().from(transactions),before);
    assert.equal((await db.select().from(pockets).where(eq(pockets.id,ids.nfc.id)))[0].openingBalance,0);
  });
  it('preserves explicit null fallback and replays identical no-op without revision increase',async()=>{
    const cleared=await client.updateBudgetOwner(ids.cash.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null});
    assert.equal(cleared.budgetOwnerPocketId,null);
    const request={clientMutationId:randomUUID(),expectedRevision:2,budgetOwnerPocketId:null};
    assert.equal((await client.updateBudgetOwner(ids.cash.id,request)).revision,2);
    assert.equal((await client.updateBudgetOwner(ids.cash.id,request)).revision,2);
  });
  it('does not retry revision conflicts or silently overwrite newer state',async()=>{
    await client.updateBudgetOwner(ids.cash.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null});
    await assert.rejects(client.updateBudgetOwner(ids.cash.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:ids.transport.id}),{code:'REVISION_CONFLICT'});
    assert.equal(patches,2);
    assert.equal((await db.select().from(pockets).where(eq(pockets.id,ids.cash.id)))[0].budgetOwnerPocketId,null);
  });
  it('keeps same mutation identity after a lost response and explicit retry',async()=>{
    let lose=true;
    client=new SessionClient(async(path,init)=>{
      const response=await transport(path,init);
      if(init?.method==='PATCH' && lose){lose=false;throw new Error('lost after commit');}
      return response;
    });
    const request={clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null};
    await assert.rejects(client.updateBudgetOwner(ids.cash.id,request),{status:0});
    assert.equal(patches,1);
    assert.equal((await client.updateBudgetOwner(ids.cash.id,request)).revision,2);
    assert.equal(patches,2);
  });
  it('recovers once from CSRF rotation and rejects invalid/cross-owner references',async()=>{
    await client.updateBudgetOwner(ids.cash.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:ids.food.id});
    await transport('/v1/auth/csrf');
    await client.updateBudgetOwner(ids.cash.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null});
    assert.equal(patches,3);
    await assert.rejects(client.updateBudgetOwner(ids.food.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null}),{status:422});
    const other=await createTestOwner(db);
    const [foreign]=await db.insert(pockets).values({userId:other.userId,name:'Private',emoji:'X',groupId:'daily',openingBalance:0}).returning();
    await assert.rejects(client.updateBudgetOwner(ids.cash.id,{clientMutationId:randomUUID(),expectedRevision:2,budgetOwnerPocketId:foreign.id}),{status:422});
    await assert.rejects(client.updateBudgetOwner(foreign.id,{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null}),{status:404});
  });
});

describe('Budget-owner transport validation',()=>{
  it('rejects invalid local arguments without any request',async()=>{
    let calls=0;const client=new SessionClient(async()=>{calls++;throw new Error('unexpected');});
    await assert.rejects(client.updateBudgetOwner('../auth/logout',{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null}),{status:400});
    await assert.rejects(client.updateBudgetOwner(randomUUID(),{clientMutationId:randomUUID(),expectedRevision:0,budgetOwnerPocketId:null}),{status:400});
    assert.equal(calls,0);
  });
  it('rejects malformed success instead of reporting saved state',async()=>{
    const client=new SessionClient(async path=>Response.json(String(path).endsWith('/csrf')?{csrfToken:'test'}:{pocket:{id:'wrong'}}));
    await assert.rejects(client.updateBudgetOwner(randomUUID(),{clientMutationId:randomUUID(),expectedRevision:1,budgetOwnerPocketId:null}),{code:'INVALID_RESPONSE'});
  });
});
