import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { pockets,transactions,categories } from '../../src/db/schema.js';

describe('Connected pocket lifecycle transport',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient,writes:unknown[];
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='PATCH')writes.push(JSON.parse(String(init.body)));
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  const body=(isArchived:boolean,expectedRevision=1)=>({clientMutationId:randomUUID(),expectedRevision,isArchived});
  const row=async(id:string)=>(await db.select().from(pockets).where(eq(pockets.id,id)))[0];
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);writes=[];client=new SessionClient(transport);});
  it('archives/replays/restores without changing mapping, categories or transaction ledger',async()=>{
    const ledger=await db.select().from(transactions),cats=await db.select().from(categories),attempt=body(true);
    await client.setPocketArchived(ids.nfc.id,attempt);await client.setPocketArchived(ids.nfc.id,attempt);
    assert.equal((await row(ids.nfc.id)).revision,2);assert.equal((await row(ids.nfc.id)).budgetOwnerPocketId,ids.transport.id);
    const active=await client.read('/pockets') as {pockets:{id:string}[]};
    assert.ok(!active.pockets.some(p=>p.id===ids.nfc.id));
    const all=await client.read('/pockets?includeArchived=true') as {pockets:{id:string}[]};
    assert.ok(all.pockets.some(p=>p.id===ids.nfc.id));
    await client.setPocketArchived(ids.nfc.id,body(false,2));
    assert.equal((await row(ids.nfc.id)).isActive,true);
    assert.deepEqual(await db.select().from(transactions),ledger);assert.deepEqual(await db.select().from(categories),cats);
  });
  it('blocks dependent owner archive and requires explicit recovery of invalid retained mapping',async()=>{
    await assert.rejects(client.setPocketArchived(ids.transport.id,body(true)),{code:'INVALID_REFERENCE'});assert.equal(writes.length,1);
    await client.setPocketArchived(ids.nfc.id,body(true));await client.setPocketArchived(ids.transport.id,body(true));
    await assert.rejects(client.setPocketArchived(ids.nfc.id,body(false,2)),{code:'INVALID_REFERENCE'});
    assert.equal((await row(ids.nfc.id)).isArchived,true);assert.equal((await row(ids.nfc.id)).revision,2);
    await client.setPocketArchived(ids.nfc.id,{...body(false,2),budgetOwnerPocketId:null});
    assert.equal((await row(ids.nfc.id)).budgetOwnerPocketId,null);
  });
  it('atomically restores with active replacement, rejects conflicts and foreign targets',async()=>{
    await client.setPocketArchived(ids.cash.id,body(true));
    await client.setPocketArchived(ids.cash.id,{...body(false,2),budgetOwnerPocketId:ids.transport.id});
    assert.equal((await row(ids.cash.id)).budgetOwnerPocketId,ids.transport.id);
    await assert.rejects(client.setPocketArchived(ids.cash.id,body(true,2)),{code:'REVISION_CONFLICT'});
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.setPocketArchived(ids.cash.id,body(true,3)),{status:404});
    assert.equal((await row(ids.cash.id)).isArchived,false);
  });
  it('explicit lost-response retry and bounded CSRF refresh keep identical payload',async()=>{
    let lose=true;client=new SessionClient(async(path,init)=>{const response=await transport(path,init);
      if(init?.method==='PATCH'&&lose){lose=false;throw new Error('lost');}return response;});
    const attempt=body(true);
    await assert.rejects(client.setPocketArchived(ids.nfc.id,attempt),{status:0});
    await transport('/v1/auth/csrf');await client.setPocketArchived(ids.nfc.id,attempt);
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
    assert.equal((await row(ids.nfc.id)).revision,2);
  });
  it('validates paths, restore-only mapping, allowlist and acknowledgement',async()=>{
    let calls=0;const sent:unknown[]=[];
    const invalid=new SessionClient(async(path,init)=>{calls++;if(init?.body)sent.push(JSON.parse(String(init.body)));
      return Response.json(String(path).endsWith('/csrf')?{csrfToken:'test'}:{pocket:{id:'wrong'}});});
    await assert.rejects(invalid.setPocketArchived('../auth/logout',body(true)),{status:400});
    await assert.rejects(invalid.setPocketArchived(ids.cash.id,{...body(true),budgetOwnerPocketId:null}),{status:400});assert.equal(calls,0);
    await assert.rejects(invalid.setPocketArchived(ids.cash.id,{...body(false),openingBalance:999} as ReturnType<typeof body>),{code:'INVALID_RESPONSE'});
    assert.deepEqual(Object.keys(sent[0] as object).sort(),['clientMutationId','expectedRevision','isArchived']);
  });
});
