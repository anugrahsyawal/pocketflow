import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {SessionClient,type TransactionLifecycleRequest} from '../../../frontend/src/lib/api/sessionClient.js';
import {loadMasterData} from '../../../frontend/src/lib/api/masterData.js';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb} from '../helpers/testDb.js';
import {seedMasterData} from '../helpers/masterDataFixture.js';

describe('Connected transaction archive/restore transport',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>,app:Awaited<ReturnType<typeof createTestApp>>,address:string;
  let owner:Awaited<ReturnType<typeof createTestOwner>>,ids:Awaited<ReturnType<typeof seedMasterData>>,client:SessionClient;
  let writes:{path:string;body:unknown}[];
  const transport:typeof fetch=(path,init)=>{
    if(init?.method==='POST')writes.push({path:String(path),body:JSON.parse(String(init.body))});
    return fetch(address+String(path),{...init,headers:{...init?.headers,cookie:owner.cookieHeader}});
  };
  const request=(id:string,revision:number,operation:'archive'|'restore'):TransactionLifecycleRequest=>({
    ownerId:owner.userId,transactionId:id,expectedRevision:revision,operation,clientMutationId:randomUUID()});
  const expense=async()=>(await client.listTransactions({type:'expense'})).transactions[0];
  const balance=async()=>(await loadMasterData(client)).pockets.find(p=>p.id===ids.nfc.id)!.currentBalance;
  before(async()=>{db=await getTestDb();app=await createTestApp();address=await app.listen({host:'127.0.0.1',port:0});});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);ids=await seedMasterData(db,owner.userId);writes=[];client=new SessionClient(transport);});
  it('archives/restores and validates no-op revision; replay is not current state',async()=>{
    const original=await expense(),archive=request(original.id,1,'archive');
    const archived=await client.setTransactionArchived(archive);assert.equal(archived.revision,2);assert.equal(await balance(),100000);
    assert.equal((await client.listTransactions({type:'expense'})).transactions.length,0);
    assert.equal((await client.listTransactions({includeArchived:true,type:'expense'})).transactions[0].isArchived,true);
    assert.equal((await client.setTransactionArchived(request(original.id,2,'archive'))).revision,2);
    assert.equal((await client.setTransactionArchived(request(original.id,2,'restore'))).revision,3);assert.equal(await balance(),82000);
    assert.deepEqual(await client.setTransactionArchived(archive),archived);assert.equal(await balance(),82000);
    assert.equal((await client.setTransactionArchived(request(original.id,3,'restore'))).revision,3);
    assert.deepEqual(writes[0].body,{clientMutationId:archive.clientMutationId,expectedRevision:1});
  });
  it('lost response and CSRF rotation retry the identical immutable request only',async()=>{
    const original=await expense(),input=request(original.id,1,'archive');let lose=true;
    client=new SessionClient(async(path,init)=>{const response=await transport(path,init);if(init?.method==='POST'&&lose){lose=false;throw new Error('lost');}return response;});
    await assert.rejects(client.setTransactionArchived(input),{code:'NETWORK_ERROR'});assert.equal(writes.length,1);
    await transport('/v1/auth/csrf');const ack=await client.setTransactionArchived(input);assert.equal(ack.revision,2);
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);assert.equal(await balance(),100000);
  });
  it('preserves revision/idempotency conflicts, missing entity and business rejection without retries',async()=>{
    const t=await expense(),input=request(t.id,1,'archive');await client.setTransactionArchived(input);
    await assert.rejects(client.setTransactionArchived(request(t.id,1,'restore')),{code:'REVISION_CONFLICT'});
    await assert.rejects(client.setTransactionArchived({...input,operation:'restore',expectedRevision:2}),{code:'IDEMPOTENCY_CONFLICT'});
    await assert.rejects(client.setTransactionArchived(request(randomUUID(),1,'archive')),{code:'NOT_FOUND'});
    await client.createTransaction({version:1,operation:'create',ownerId:owner.userId,body:{clientMutationId:randomUUID(),type:'expense',pocketId:ids.nfc.id,amount:90000,occurredOn:'2026-09-30',occurredAtLocalTime:'12:00'}});
    const count=writes.length;await assert.rejects(client.setTransactionArchived(request(t.id,2,'restore')),{code:'INSUFFICIENT_FUNDS'});assert.equal(writes.length,count+1);assert.equal(await balance(),10000);
  });
  it('business rejection is not terminal: the identical restore can succeed after balance changes',async()=>{
    const t=await expense();await client.setTransactionArchived(request(t.id,1,'archive'));
    const create=async(type:'expense'|'income',amount:number)=>client.createTransaction({version:1,operation:'create',ownerId:owner.userId,
      body:{clientMutationId:randomUUID(),type,pocketId:ids.nfc.id,amount,occurredOn:'2026-09-30',occurredAtLocalTime:'12:00'}});
    await create('expense',90000); // Archived original stays at revision 2; available balance is 10000.
    const pending=request(t.id,2,'restore');
    await assert.rejects(client.setTransactionArchived(pending),{code:'INSUFFICIENT_FUNDS'});
    const first=writes[writes.length-1];assert.equal(await balance(),10000);
    await create('income',20000); // A separate tab/request could legitimately change balance.
    const restored=await client.setTransactionArchived(pending);
    assert.deepEqual(writes[writes.length-1],first);assert.equal(restored.revision,3);
    assert.equal(restored.isArchived,false);assert.equal(await balance(),12000);
  });
  it('rejects invalid attempts and foreign sessions before financial dispatch',async()=>{
    const input=request((await expense()).id,1,'archive');
    for(const patch of [{expectedRevision:0},{expectedRevision:1.5},{operation:'delete'},{transactionId:'bad'},{confirmPermanentDelete:true}]){
      await assert.rejects(client.setTransactionArchived({...input,...patch} as TransactionLifecycleRequest),{code:'INVALID_INPUT'});
    }
    owner=await createTestOwner(db);await assert.rejects(client.setTransactionArchived(input),{code:'OWNER_CHANGED'});assert.equal(writes.length,0);
  });
  it('terminal cancellation fences both lifecycle routes without changing balances or revisions',async()=>{
    const t=await expense(),input=request(t.id,1,'archive'),before=await loadMasterData(client);
    assert.equal(await client.resolveTransactionLifecycle(input),'cancelled');
    assert.equal(await client.resolveTransactionLifecycle(input),'cancelled');
    await assert.rejects(client.setTransactionArchived(input),{code:'MUTATION_CANCELLED'});
    await assert.rejects(client.resolveTransactionLifecycle({...input,operation:'restore'}),{code:'IDEMPOTENCY_CONFLICT'});
    await assert.rejects(client.resolveTransactionLifecycle({...input,expectedRevision:2}),{code:'IDEMPOTENCY_CONFLICT'});
    await assert.rejects(client.resolveTransactionLifecycle({...input,transactionId:randomUUID()}),{code:'IDEMPOTENCY_CONFLICT'});
    assert.deepEqual(await expense(),t);assert.deepEqual(await loadMasterData(client),before);
  });
  it('already committed and no-op results are preserved; resolution replay is not current state',async()=>{
    const t=await expense(),archive=request(t.id,1,'archive');await client.setTransactionArchived(archive);
    assert.equal(await client.resolveTransactionLifecycle(archive),'committed');
    const noop=request(t.id,2,'archive');await client.setTransactionArchived(noop);assert.equal(await client.resolveTransactionLifecycle(noop),'committed');
    const restore=request(t.id,2,'restore');await client.setTransactionArchived(restore);
    assert.equal(await client.resolveTransactionLifecycle(restore),'committed');
    assert.equal(await client.resolveTransactionLifecycle(archive),'committed');assert.equal((await expense()).revision,3);assert.equal(await balance(),82000);
  });
  it('cancelled rejected restore cannot execute after sufficient funds arrive',async()=>{
    const t=await expense();await client.setTransactionArchived(request(t.id,1,'archive'));
    const create=async(type:'expense'|'income',amount:number)=>client.createTransaction({version:1,operation:'create',ownerId:owner.userId,
      body:{clientMutationId:randomUUID(),type,pocketId:ids.nfc.id,amount,occurredOn:'2026-09-30',occurredAtLocalTime:'12:00'}});
    await create('expense',90000);const restore=request(t.id,2,'restore');await assert.rejects(client.setTransactionArchived(restore),{code:'INSUFFICIENT_FUNDS'});
    assert.equal(await client.resolveTransactionLifecycle(restore),'cancelled');await create('income',20000);
    await assert.rejects(client.setTransactionArchived(restore),{code:'MUTATION_CANCELLED'});assert.equal(await balance(),30000);
  });
  it('concurrent execution/resolution has a terminal winner for archive and restore',async()=>{
    const t=await expense();let revision=1;
    for(let i=0;i<8;i++){
      let current=(await client.listTransactions({includeArchived:true,type:'expense'})).transactions.find(row=>row.id===t.id)!;
      const operation=i%2===0?'archive':'restore';
      if(current.isArchived!==(operation==='restore'))current=await client.setTransactionArchived(request(t.id,current.revision,operation==='restore'?'archive':'restore'));
      revision=current.revision;const input=request(t.id,revision,operation);
      const [execution,resolution]=await Promise.allSettled([client.setTransactionArchived(input),client.resolveTransactionLifecycle(input)]);
      assert.equal(resolution.status,'fulfilled');if(resolution.status!=='fulfilled')throw new Error('Resolution failed');
      if(resolution.value==='cancelled'){
        assert.equal(execution.status,'rejected');if(execution.status==='rejected')assert.equal(execution.reason.code,'MUTATION_CANCELLED');
      }else{assert.equal(execution.status,'fulfilled');}
      assert.equal(await client.resolveTransactionLifecycle(input),resolution.value);
      const final=(await client.listTransactions({includeArchived:true,type:'expense'})).transactions.find(row=>row.id===t.id)!;
      assert.equal(final.revision,revision+(resolution.value==='committed'?1:0));
    }
  });
  it('lost resolution response has no network retry and remains recoverable after CSRF rotation',async()=>{
    const input=request((await expense()).id,1,'archive');let lose=true;
    const losing=new SessionClient(async(path,init)=>{const r=await transport(path,init);if(String(path).endsWith('/resolve-attempt')&&lose){lose=false;throw new Error('lost');}return r;});
    await assert.rejects(losing.resolveTransactionLifecycle(input),{code:'NETWORK_ERROR'});assert.equal(writes.length,1);
    await transport('/v1/auth/csrf');assert.equal(await losing.resolveTransactionLifecycle(input),'cancelled');
    assert.equal(writes.length,3);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(writes[1],writes[2]);
  });
  it('resolution rejects unauthenticated, CSRF, unknown fields and foreign sessions',async()=>{
    const input=request((await expense()).id,1,'archive'),path=`/v1/transactions/${input.transactionId}/resolve-attempt`;
    const body={operation:input.operation,clientMutationId:input.clientMutationId,expectedRevision:1};
    assert.equal((await app.inject({method:'POST',url:path,payload:body})).statusCode,401);
    assert.equal((await app.inject({method:'POST',url:path,headers:{cookie:owner.cookieHeader},payload:body})).statusCode,403);
    for(const patch of [{operation:'delete'},{operation:'create'},{expectedRevision:0},{expectedRevision:9007199254740992},{ownerId:owner.userId}]){
      assert.equal((await app.inject({method:'POST',url:path,headers:{cookie:owner.cookieHeader,'x-csrf-token':owner.csrfToken},payload:{...body,...patch}})).statusCode,400);
    }
    const original=owner;owner=await createTestOwner(db);
    await assert.rejects(client.resolveTransactionLifecycle(input),{code:'OWNER_CHANGED'});
    assert.equal((await app.inject({method:'POST',url:path,headers:{cookie:owner.cookieHeader,'x-csrf-token':owner.csrfToken},payload:body})).json().status,'cancelled');
    owner=original;assert.equal((await client.setTransactionArchived(input)).isArchived,true);
  });
  it('resolution rejects malformed status, ID and original acknowledgements',async()=>{
    const input=request((await expense()).id,1,'archive');
    for(const result of [{status:'cancelled',clientMutationId:randomUUID()},
      {status:'pending',clientMutationId:input.clientMutationId},{status:'committed',clientMutationId:input.clientMutationId,acknowledgement:{}},
      {status:'cancelled',clientMutationId:input.clientMutationId,acknowledgement:{}}]){
      const fake=new SessionClient(async path=>String(path).endsWith('/me')?Response.json({user:{id:owner.userId,email:'a',displayName:'b'}}):
        String(path).endsWith('/csrf')?Response.json({csrfToken:'test'}):Response.json(result));
      await assert.rejects(fake.resolveTransactionLifecycle(input),{code:'INVALID_RESPONSE'});
    }
  });
  it('rejects malformed acknowledgements and snapshots caller data before awaiting',async()=>{
    const t=await expense(),input=request(t.id,1,'archive'),valid=await client.setTransactionArchived(input);
    for(const patch of [{id:randomUUID()},{isArchived:false,archivedAt:null},{revision:5},{amount:-1},{archivedAt:'bad'}]){
      let posts=0;const fake=new SessionClient(async(path,init)=>{
        if(String(path).endsWith('/me'))return Response.json({user:{id:owner.userId,email:'a',displayName:'b'}});
        if(String(path).endsWith('/csrf'))return Response.json({csrfToken:'test'});
        if(init?.method==='POST')posts++;return Response.json({transaction:{...valid,...patch}});
      });
      await assert.rejects(fake.setTransactionArchived(input),{code:'INVALID_RESPONSE'});assert.equal(posts,1);
    }
    const mutable={...input},expected=JSON.stringify(input);let sent='';
    const fake=new SessionClient(async(path,init)=>{
      if(String(path).endsWith('/me')){mutable.transactionId=randomUUID();mutable.operation='restore';mutable.expectedRevision=99;return Response.json({user:{id:owner.userId,email:'a',displayName:'b'}});}
      if(String(path).endsWith('/csrf'))return Response.json({csrfToken:'test'});
      sent=String(path);assert.deepEqual(JSON.parse(String(init?.body)),{clientMutationId:input.clientMutationId,expectedRevision:1});return Response.json({transaction:valid});
    });
    await fake.setTransactionArchived(mutable);assert.equal(sent,`/v1/transactions/${input.transactionId}/archive`);assert.equal(JSON.stringify(input),expected);
  });
  it('reallocation archive/restore refreshes canonical allocation and balance without local arithmetic',async()=>{
    const before=await loadMasterData(client);
    const created=await client.createTransaction({version:1,operation:'create',ownerId:owner.userId,body:{clientMutationId:randomUUID(),type:'transfer',fromPocketId:ids.food.id,toPocketId:ids.transport.id,transferType:'budget-reallocation',amount:30000,occurredOn:before.period!.startDate,occurredAtLocalTime:'12:00'}});
    const moved=await loadMasterData(client);
    assert.equal(await client.resolveTransactionLifecycle(request(created.id,1,'archive')),'cancelled');
    assert.deepEqual(await loadMasterData(client),moved);
    await client.setTransactionArchived(request(created.id,1,'archive'));
    const restored=await loadMasterData(client);
    for(const id of [ids.food.id,ids.transport.id])assert.deepEqual(restored.pockets.find(p=>p.id===id),before.pockets.find(p=>p.id===id));
    await client.setTransactionArchived(request(created.id,2,'restore'));
    const final=await loadMasterData(client);for(const id of [ids.food.id,ids.transport.id])assert.deepEqual(final.pockets.find(p=>p.id===id),moved.pockets.find(p=>p.id===id));
  });
});
