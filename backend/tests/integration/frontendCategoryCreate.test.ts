import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { categories,pockets,transactions } from '../../src/db/schema.js';

describe('Connected category creation transport',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient,writes:unknown[];
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='POST')writes.push(JSON.parse(String(init.body)));
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  const request=()=>({clientMutationId:randomUUID(),pocketId:ids.nfc.id,name:'  Bus Kota  ',emoji:' 🚌 '});
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);writes=[];client=new SessionClient(transport);});
  it('creates a custom category, trims labels and allows only creation fields',async()=>{
    const ledger=await db.select().from(transactions),before=await db.select().from(pockets);
    const result=await client.createCategory({...request(),isDefault:true} as ReturnType<typeof request>);
    assert.equal(result.name,'Bus Kota');assert.equal(result.emoji,'🚌');assert.equal(result.pocketId,ids.nfc.id);
    const [row]=await db.select().from(categories).where(eq(categories.id,result.id));
    assert.equal(row.isDefault,false);assert.equal(row.revision,1);assert.equal(row.isActive,true);
    assert.deepEqual(Object.keys(writes[0] as object).sort(),['clientMutationId','emoji','name','pocketId']);
    assert.deepEqual(await db.select().from(transactions),ledger);assert.deepEqual(await db.select().from(pockets),before);
  });
  it('concurrent identical attempts create only one category and replay original acknowledgement',async()=>{
    const attempt=request();const [first,second]=await Promise.all([client.createCategory(attempt),client.createCategory(attempt)]);
    assert.deepEqual(first,second);assert.equal((await db.select().from(categories)).length,2);
    await client.editCategory(first.id,{clientMutationId:randomUUID(),expectedRevision:1,name:'Updated',emoji:'🚆'});
    assert.deepEqual(await client.createCategory(attempt),first);
    assert.equal((await db.select().from(categories).where(eq(categories.id,first.id)))[0].name,'Updated');
  });
  it('new client recovers a lost response only when supplied the original attempt',async()=>{
    let lose=true;client=new SessionClient(async(path,init)=>{
      const response=await transport(path,init);if(init?.method==='POST'&&lose){lose=false;throw new Error('lost after commit');}return response;
    });
    const attempt=request();await assert.rejects(client.createCategory(attempt),{status:0});assert.equal(writes.length,1);
    client=new SessionClient(transport);await client.createCategory(attempt);
    assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal((await db.select().from(categories)).length,2);
  });
  it('never retries changed-payload conflicts or archived/foreign parent rejections',async()=>{
    const attempt=request();await client.createCategory(attempt);
    await assert.rejects(client.createCategory({...attempt,name:'Different'}),{code:'IDEMPOTENCY_CONFLICT'});assert.equal(writes.length,2);
    await db.update(pockets).set({isArchived:true,isActive:false}).where(eq(pockets.id,ids.nfc.id));
    await assert.rejects(client.createCategory(request()),{code:'INVALID_REFERENCE'});assert.equal(writes.length,3);
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.createCategory(request()),{code:'INVALID_REFERENCE'});assert.equal(writes.length,4);
  });
  it('refreshes rejected CSRF once using an identical immutable body',async()=>{
    await client.createCategory(request());await transport('/v1/auth/csrf');
    const attempt=request();const pending=client.createCategory(attempt);attempt.name='Caller changed input';
    await pending;assert.equal(writes.length,3);assert.deepEqual(writes[1],writes[2]);
    assert.equal((writes[2] as {name:string}).name,'Bus Kota');
  });
  it('rejects invalid inputs before HTTP and malformed creation acknowledgements',async()=>{
    let calls=0;
    const invalid=new SessionClient(async path=>{calls++;return Response.json(String(path).endsWith('/csrf')?{csrfToken:'test'}:{category:{id:randomUUID()}});});
    await assert.rejects(invalid.createCategory({...request(),pocketId:'../auth/logout'}),{status:400});
    await assert.rejects(invalid.createCategory({...request(),name:' '}),{status:400});
    await assert.rejects(invalid.createCategory({...request(),emoji:'🚌'.repeat(33)}),{status:400});assert.equal(calls,0);
    await assert.rejects(invalid.createCategory(request()),{code:'INVALID_RESPONSE'});
  });
});
