// Real IndexedDB in an isolated browser context. No API writes or user data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext();let posts=0;
  await context.route('**/v1/**',route=>{if(route.request().method()!=='GET')posts++;return route.fulfill({status:401,json:{error:{code:'UNAUTHENTICATED'}}});});
  const a=await context.newPage(),b=await context.newPage(),errors=[],consoleErrors=[];
  for(const p of [a,b]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),url:m.location().url});});}
  const ownerId=randomUUID(),otherOwner=randomUUID();
  const first={version:1,ownerId,operation:'create',body:{clientMutationId:randomUUID(),type:'expense',pocketId:randomUUID(),amount:10000,occurredOn:'2026-09-29',occurredAtLocalTime:'10:15',note:' exact '}},
    second={...first,body:{...first.body,clientMutationId:randomUUID(),amount:20000}};
  const prepare=(page,record)=>page.evaluate(async r=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');return new TransactionAttemptStore().prepare(r);},record);
  const read=(page,id)=>page.evaluate(async id=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');return new TransactionAttemptStore().read(id);},id);
  try{
    await Promise.all([a.goto('http://127.0.0.1:5174'),b.goto('http://127.0.0.1:5174')]);
    const both=await Promise.all([prepare(a,first),prepare(b,second)]);
    assert.equal(both.filter(r=>r.created).length,1);assert.deepEqual(both[0].record,both[1].record);
    const winner=both[0].record;
    await a.reload();assert.deepEqual(await read(a,ownerId),winner);assert.equal(await read(a,otherOwner),null);
    const other={...first,ownerId:otherOwner};await prepare(b,other);assert.deepEqual(await read(b,ownerId),winner);
    const wrong={...winner,body:{...winner.body,amount:99}};
    assert.equal(await a.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');try{await new TransactionAttemptStore().acknowledge(record);return false;}catch{return true;}},wrong),true);
    assert.deepEqual(await read(a,ownerId),winner);
    await a.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');await new TransactionAttemptStore().acknowledge(record);},winner);
    assert.equal(await read(a,ownerId),null);const next={...winner,body:{...winner.body,clientMutationId:randomUUID()}};await prepare(b,next);
    assert.equal(await a.evaluate(async old=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');try{await new TransactionAttemptStore().acknowledge(old);return false;}catch{return true;}},winner),true);
    assert.deepEqual(await read(a,ownerId),next);
    await a.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');await new TransactionAttemptStore().acknowledge(record);},next);
    const lifecycle={version:1,ownerId,operation:'archive',transactionId:randomUUID(),body:{clientMutationId:randomUUID(),expectedRevision:2}};
    const mixed=await Promise.all([prepare(a,lifecycle),prepare(b,next)]);
    assert.equal(mixed.filter(r=>r.created).length,1);assert.deepEqual(mixed[0].record,mixed[1].record);
    await a.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');await new TransactionAttemptStore().acknowledge(record);},mixed[0].record);
    await prepare(a,lifecycle);await b.reload();assert.deepEqual(await read(b,ownerId),lifecycle);
    assert.deepEqual((await prepare(b,next)).record,lifecycle); // Create cannot overwrite lifecycle.
    assert.equal(await b.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');try{await new TransactionAttemptStore().acknowledge(record);return false;}catch{return true;}},{...lifecycle,operation:'restore'}),true);
    assert.equal(await b.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');try{await new TransactionAttemptStore().acknowledge(record);return false;}catch{return true;}},{...lifecycle,body:{...lifecycle.body,expectedRevision:3}}),true);
    assert.deepEqual(await read(a,ownerId),lifecycle);
    const corruptId=randomUUID();
    await a.evaluate(async ownerId=>{await new Promise((resolve,reject)=>{const r=indexedDB.open('pocketflow-connected-transaction-attempts',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('attempts','readwrite');tx.objectStore('attempts').put({ownerId,version:99});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});},corruptId);
    assert.equal(await a.evaluate(async record=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');try{await new TransactionAttemptStore().prepare(record);return false;}catch{return true;}},{...first,ownerId:corruptId}),true);
    assert.equal(await b.evaluate(async id=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');const original=indexedDB.open;indexedDB.open=()=>{throw new Error('blocked storage');};try{await new TransactionAttemptStore().read(id);return false;}catch{return true;}finally{indexedDB.open=original;}},ownerId),true);
    assert.deepEqual(await a.evaluate(()=>Object.keys(localStorage)),[]);assert.equal(posts,0);assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors.filter(e=>!e.text.includes('401 (Unauthorized)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
    console.log('PASS create/lifecycle shared atomic two-tab prepare; legacy records; reload; owner isolation; immutable payload; guarded/stale/wrong-operation cleanup; corrupt/unavailable storage; zero network writes');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
