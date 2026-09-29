import { describe,it,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { SessionClient,categoryEditFields } from '../../../frontend/src/lib/api/sessionClient.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb,resetTestDatabase,createTestOwner,closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';
import { categories,transactions } from '../../src/db/schema.js';
import { loadMasterData } from '../../../frontend/src/lib/api/masterData.js';

describe('Connected category edit',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,category:typeof categories.$inferSelect,client:SessionClient,writes:number;
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='PATCH')writes++;
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{
    await resetTestDatabase(db);owner=await createTestOwner(db);await seedMasterData(db,owner.userId);
    [category]=await db.select().from(categories);writes=0;client=new SessionClient(transport);
  });
  it('trims labels, preserves parent/default status and transactions, replays safely',async()=>{
    const ledger=await db.select().from(transactions);
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'  Kereta  ',emoji:'  🚆  '};
    await client.editCategory(category.id,body);await client.editCategory(category.id,body);
    const [row]=await db.select().from(categories).where(eq(categories.id,category.id));
    assert.equal(row.name,'Kereta');assert.equal(row.emoji,'🚆');assert.equal(row.revision,2);
    assert.equal(row.pocketId,category.pocketId);assert.equal(row.isDefault,category.isDefault);
    assert.deepEqual(await db.select().from(transactions),ledger);
  });
  it('archives and restores with identical retry, canonical lists and preserved ledger',async()=>{
    const ledger=await db.select().from(transactions);
    const body={clientMutationId:randomUUID(),expectedRevision:1,isArchived:true};
    await client.setCategoryArchived(category.id,body);await client.setCategoryArchived(category.id,body);
    const archived=(await loadMasterData(client)).pockets.find(p=>p.id===category.pocketId)!;
    assert.equal(archived.categories.length,0);assert.equal(archived.archivedCategories[0].id,category.id);
    assert.equal(archived.archivedCategories[0].revision,2);
    await assert.rejects(client.setCategoryArchived(category.id,{...body,clientMutationId:randomUUID(),isArchived:false}),{code:'REVISION_CONFLICT'});
    await client.setCategoryArchived(category.id,{clientMutationId:randomUUID(),expectedRevision:2,isArchived:false});
    const restored=(await loadMasterData(client)).pockets.find(p=>p.id===category.pocketId)!;
    assert.equal(restored.categories[0].id,category.id);assert.equal(restored.archivedCategories.length,0);
    assert.deepEqual(await db.select().from(transactions),ledger);
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.setCategoryArchived(category.id,{clientMutationId:randomUUID(),expectedRevision:3,isArchived:true}),{status:404});
  });
  it('never retries conflicts or edits another owner category',async()=>{
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'Kereta',emoji:'🚆'};
    await client.editCategory(category.id,body);
    await assert.rejects(client.editCategory(category.id,{...body,clientMutationId:randomUUID(),name:'Stale'}),{code:'REVISION_CONFLICT'});
    assert.equal(writes,2);
    owner=await createTestOwner(db);client=new SessionClient(transport);
    await assert.rejects(client.editCategory(category.id,{...body,clientMutationId:randomUUID(),expectedRevision:2}),{status:404});
  });
  it('explicit retry after response loss reuses revision and mutation; CSRF rotation is bounded',async()=>{
    await client.editCategory(category.id,{clientMutationId:randomUUID(),expectedRevision:1,name:category.name,emoji:category.emoji});
    await transport('/v1/auth/csrf');
    await client.editCategory(category.id,{clientMutationId:randomUUID(),expectedRevision:1,name:'Kereta',emoji:'🚆'});
    assert.equal(writes,3);
    let lose=true;client=new SessionClient(async(path,init)=>{
      const response=await transport(path,init);
      if(init?.method==='PATCH'&&lose){lose=false;throw new Error('lost after commit');}return response;
    });
    const body={clientMutationId:randomUUID(),expectedRevision:2,name:'MRT baru',emoji:'🚇'};
    await assert.rejects(client.editCategory(category.id,body),{status:0});assert.equal(writes,4);
    await client.editCategory(category.id,body);assert.equal(writes,5);
    assert.equal((await db.select().from(categories).where(eq(categories.id,category.id)))[0].revision,3);
  });
});
describe('Category field/response validation',()=>{
  it('uses Unicode code points and rejects blank/over-limit values',()=>{
    assert.equal(categoryEditFields(' 🚆 '.repeat(1),'🚆'.repeat(32)).emoji.length,64);
    assert.throws(()=>categoryEditFields(' ','🚆'));
    assert.throws(()=>categoryEditFields('Name',' '));
    assert.throws(()=>categoryEditFields('a'.repeat(101),'🚆'));
    assert.throws(()=>categoryEditFields('Name','🚆'.repeat(33)));
  });
  it('rejects unsafe request paths and malformed acknowledgement',async()=>{
    let calls=0;
    const client=new SessionClient(async path=>{calls++;return Response.json(String(path).endsWith('/csrf')?{csrfToken:'token'}:{category:{id:'wrong'}});});
    const body={clientMutationId:randomUUID(),expectedRevision:1,name:'Name',emoji:'🚆'};
    await assert.rejects(client.editCategory('../auth/logout',body),{status:400});assert.equal(calls,0);
    await assert.rejects(client.editCategory(randomUUID(),body),{code:'INVALID_RESPONSE'});
  });
});
