import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { loadMasterData } from '../../../frontend/src/lib/api/masterData.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { pockets,transactions } from '../../src/db/schema.js';

describe('Connected pocket label edits',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient;
  let writes:unknown[];
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='PATCH')writes.push(JSON.parse(String(init.body)));
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{
    await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);
    writes=[];client=new SessionClient(transport);
  });
  it('corrects only the opening balance and reconciles derived balance without ledger/allocation changes',async()=>{
    const ledger=await db.select().from(transactions);
    const body={clientMutationId:randomUUID(),expectedRevision:1,openingBalance:10000,name:'IGNORED'};
    await client.correctOpeningBalance(ids.nfc.id,body);await client.correctOpeningBalance(ids.nfc.id,body);
    const result=(await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!;
    assert.equal(result.openingBalance,10000);assert.equal(result.currentBalance,92000);assert.equal(result.allocation,0);
    assert.equal(result.revision,2);assert.equal(result.name,'NFC Card');assert.equal(result.budgetOwnerPocketId,ids.transport.id);
    assert.deepEqual(await db.select().from(transactions),ledger);
    assert.deepEqual(Object.keys(writes[0] as object).sort(),['clientMutationId','expectedRevision','openingBalance']);
    await assert.rejects(client.correctOpeningBalance(ids.nfc.id,{...body,clientMutationId:randomUUID(),openingBalance:0}),{code:'REVISION_CONFLICT'});
    await client.correctOpeningBalance(ids.nfc.id,{...body,clientMutationId:randomUUID(),expectedRevision:2,openingBalance:0});
    assert.equal((await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.currentBalance,82000);
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.correctOpeningBalance(ids.nfc.id,{...body,clientMutationId:randomUUID(),expectedRevision:3}),{status:404});
  });
  it('replays uncertain opening correction with identical body and bounded CSRF retry',async()=>{
    let lose=true;client=new SessionClient(async(path,init)=>{const response=await transport(path,init);
      if(init?.method==='PATCH'&&lose){lose=false;throw new Error('lost');}return response;});
    const body={clientMutationId:randomUUID(),expectedRevision:1,openingBalance:10000};
    await assert.rejects(client.correctOpeningBalance(ids.nfc.id,body),{status:0});assert.equal(writes.length,1);
    await transport('/v1/auth/csrf');await client.correctOpeningBalance(ids.nfc.id,body);
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
    assert.equal((await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.revision,2);
  });
  it('rejects invalid opening correction amounts and malformed acknowledgements',async()=>{
    let calls=0;const invalid=new SessionClient(async path=>{calls++;return Response.json(String(path).endsWith('/csrf')?{csrfToken:'test'}:{pocket:{id:ids.cash.id}});});
    const body={clientMutationId:randomUUID(),expectedRevision:1,openingBalance:0};
    for(const openingBalance of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(invalid.correctOpeningBalance(ids.cash.id,{...body,openingBalance}),{status:400});
    await assert.rejects(invalid.correctOpeningBalance('../auth/logout',body),{status:400});assert.equal(calls,0);
    await assert.rejects(invalid.correctOpeningBalance(ids.cash.id,body),{code:'INVALID_RESPONSE'});
  });
  it('trims and replays labels without changing role, balance, owner or ledger',async()=>{
    const ledger=await db.select().from(transactions);
    const [before]=await db.select().from(pockets).where(eq(pockets.id,ids.nfc.id));
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'  Kartu Saya  ',emoji:'  🚆  ',openingBalance:999999};
    await client.editPocketLabel(ids.nfc.id,body);await client.editPocketLabel(ids.nfc.id,body);
    const [after]=await db.select().from(pockets).where(eq(pockets.id,ids.nfc.id));
    assert.equal(after.name,'Kartu Saya');assert.equal(after.emoji,'🚆');assert.equal(after.revision,2);
    for(const key of ['templateKey','openingBalance','budgetOwnerPocketId','groupId','isSpendable','isArchived'] as const)assert.equal(after[key],before[key]);
    assert.deepEqual(await db.select().from(transactions),ledger);
    assert.equal((await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.currentBalance,82000);
    assert.deepEqual(Object.keys(writes[0] as object).sort(),['clientMutationId','emoji','expectedRevision','name']);
  });
  it('rejects stale and foreign edits without automatic retry',async()=>{
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'Wallet',emoji:'👛'};
    await client.editPocketLabel(ids.cash.id,body);
    await assert.rejects(client.editPocketLabel(ids.cash.id,{...body,clientMutationId:randomUUID()}),{code:'REVISION_CONFLICT'});
    assert.equal(writes.length,2);
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.editPocketLabel(ids.cash.id,{...body,clientMutationId:randomUUID(),expectedRevision:2}),{status:404});
  });
  it('retries one CSRF rejection and explicitly replays lost acknowledgements',async()=>{
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'Dompet',emoji:'👛'};
    let lose=true;
    client=new SessionClient(async(path,init)=>{
      const response=await transport(path,init);
      if(init?.method==='PATCH' && lose){lose=false;throw new Error('lost response');}return response;
    });
    await assert.rejects(client.editPocketLabel(ids.cash.id,body),{status:0});
    await transport('/v1/auth/csrf');
    await client.editPocketLabel(ids.cash.id,body);
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
    assert.equal((await db.select().from(pockets).where(eq(pockets.id,ids.cash.id)))[0].revision,2);
  });
  it('fails closed on invalid paths, fields and server acknowledgement',async()=>{
    let calls=0;
    const invalid=new SessionClient(async path=>{calls++;return Response.json(String(path).endsWith('/csrf')?{csrfToken:'test'}:{pocket:{id:'wrong'}});});
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'Name',emoji:'👛'};
    await assert.rejects(invalid.editPocketLabel('../auth/logout',body),{status:400});
    await assert.rejects(invalid.editPocketLabel(ids.cash.id,{...body,name:' '}),{status:400});assert.equal(calls,0);
    await assert.rejects(invalid.editPocketLabel(ids.cash.id,body),{code:'INVALID_RESPONSE'});
  });
  it('updates classification only, preserves ledger/wallet mapping and replays safely',async()=>{
    const ledger=await db.select().from(transactions),before=await db.select().from(pockets).where(eq(pockets.id,ids.nfc.id));
    const body={clientMutationId:randomUUID(),expectedRevision:1,groupId:'savings' as const,isSpendable:false,openingBalance:999999};
    await client.updatePocketClassification(ids.nfc.id,body);await client.updatePocketClassification(ids.nfc.id,body);
    const result=(await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!;
    assert.equal(result.groupId,'savings');assert.equal(result.isSpendable,false);assert.equal(result.revision,2);
    assert.equal(result.currentBalance,82000);assert.equal(result.budgetOwnerPocketId,ids.transport.id);assert.equal(result.templateKey,'nfc-card');
    assert.equal((await db.select().from(pockets).where(eq(pockets.id,ids.nfc.id)))[0].openingBalance,before[0].openingBalance);
    assert.deepEqual(await db.select().from(transactions),ledger);
    assert.deepEqual(Object.keys(writes[0] as object).sort(),['clientMutationId','expectedRevision','groupId','isSpendable']);
    await assert.rejects(client.updatePocketClassification(ids.nfc.id,{...body,clientMutationId:randomUUID(),groupId:'bills'}),{code:'REVISION_CONFLICT'});
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.updatePocketClassification(ids.nfc.id,{...body,clientMutationId:randomUUID(),expectedRevision:2}),{status:404});
  });
  it('recovers classification acknowledgement loss and bounded CSRF rotation without changing body',async()=>{
    let lose=true;client=new SessionClient(async(path,init)=>{const response=await transport(path,init);
      if(init?.method==='PATCH'&&lose){lose=false;throw new Error('lost');}return response;});
    const body={clientMutationId:randomUUID(),expectedRevision:1,groupId:'bills' as const,isSpendable:false};
    await assert.rejects(client.updatePocketClassification(ids.cash.id,body),{status:0});assert.equal(writes.length,1);
    await transport('/v1/auth/csrf');await client.updatePocketClassification(ids.cash.id,body);
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
  });
  it('rejects invalid classification and malformed acknowledgement before UI publication',async()=>{
    let calls=0;
    const invalid=new SessionClient(async path=>{calls++;return Response.json(String(path).endsWith('/csrf')?{csrfToken:'test'}:{pocket:{id:ids.cash.id}});});
    const body={clientMutationId:randomUUID(),expectedRevision:1,groupId:'daily' as const,isSpendable:false};
    await assert.rejects(invalid.updatePocketClassification('../auth/logout',body),{status:400});
    await assert.rejects(invalid.updatePocketClassification(ids.cash.id,{...body,groupId:'unknown'} as typeof body),{status:400});assert.equal(calls,0);
    await assert.rejects(invalid.updatePocketClassification(ids.cash.id,body),{code:'INVALID_RESPONSE'});
  });
});
