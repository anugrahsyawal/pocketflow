// Disposable preview database and isolated browser only. No user-owned records.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];let writes=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/v1/transactions/'))writes++;});
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const region=page.getByRole('region',{name:'Tambah transaksi server',exact:true});await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  const prepared=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient(),store=new TransactionAttemptStore(),owner=await client.me(),t=(await client.listTransactions({type:'expense'})).transactions[0];
   const record={version:1,ownerId:owner.id,operation:'archive',transactionId:t.id,body:{clientMutationId:crypto.randomUUID(),expectedRevision:t.revision}};
   await store.prepare(record);
   const losing=new SessionClient(async(path,init)=>{const response=await fetch(path,init);if(init?.method==='POST')throw new Error('lost response');return response;});
   let code='';try{await losing.setTransactionArchived({ownerId:record.ownerId,transactionId:record.transactionId,operation:record.operation,...record.body});}catch(e){code=e.code;}
   return {record,code};
  });
  assert.equal(prepared.code,'NETWORK_ERROR');assert.equal(writes,1);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('alert').filter({hasText:'arsip tertunda'}).waitFor();assert.equal(writes,1);
  assert.equal(await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).count(),0);
  assert.ok(await region.getByRole('button',{name:'Periksa pemulihan transaksi',exact:true}).isDisabled());assert.equal(writes,1);
  await fs.mkdir('dist/qa-lifecycle-recovery',{recursive:true});await region.screenshot({path:'dist/qa-lifecycle-recovery/blocked-375.png'});
  const recovered=await page.evaluate(async ownerId=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const store=new TransactionAttemptStore(),client=new SessionClient(),record=await store.read(ownerId);
   const ack=await client.setTransactionArchived({ownerId,transactionId:record.transactionId,operation:record.operation,...record.body});
   await store.acknowledge(record);return {revision:ack.revision,archived:ack.isArchived,remaining:await store.read(ownerId)};
  },prepared.record.ownerId);
  assert.equal(recovered.revision,2);assert.equal(recovered.archived,true);assert.equal(recovered.remaining,null);assert.equal(writes,2);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  const conflict=await page.evaluate(async old=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const record={...old,operation:'restore',body:{clientMutationId:crypto.randomUUID(),expectedRevision:1}},store=new TransactionAttemptStore(),client=new SessionClient();await store.prepare(record);
   let code='';try{await client.setTransactionArchived({ownerId:record.ownerId,transactionId:record.transactionId,operation:record.operation,...record.body});}catch(e){code=e.code;}
   return {code,record,saved:await store.read(record.ownerId)};
  },prepared.record);
  assert.equal(conflict.code,'REVISION_CONFLICT');assert.deepEqual(conflict.saved,conflict.record);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('alert').filter({hasText:'pulihkan tertunda'}).waitFor();assert.equal(writes,3);
  const lostResolution=await page.evaluate(async ownerId=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const store=new TransactionAttemptStore(),record=await store.read(ownerId);
   const client=new SessionClient(async(path,init)=>{const response=await fetch(path,init);if(String(path).endsWith('/resolve-attempt'))throw new Error('lost resolution');return response;});
   let code='';try{await client.resolveTransactionLifecycle({ownerId,transactionId:record.transactionId,operation:record.operation,...record.body});}catch(e){code=e.code;}
   return {code,saved:await store.read(ownerId)};
  },prepared.record.ownerId);
  assert.equal(lostResolution.code,'NETWORK_ERROR');assert.deepEqual(lostResolution.saved,conflict.record);assert.equal(writes,4);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('alert').filter({hasText:'pulihkan tertunda'}).waitFor();assert.equal(writes,4);
  const resolved=await page.evaluate(async ownerId=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const store=new TransactionAttemptStore(),client=new SessionClient(),record=await store.read(ownerId);
   const status=await client.resolveTransactionLifecycle({ownerId,transactionId:record.transactionId,operation:record.operation,...record.body});
   await store.acknowledge(record);return {status,saved:await store.read(ownerId)};
  },prepared.record.ownerId);
  assert.equal(resolved.status,'cancelled');assert.equal(resolved.saved,null);assert.equal(writes,5);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('409 (Conflict)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS lifecycle lost response/reload; explicit retry; conflict retained; terminal resolution lost response/reload/retry/validated cleanup; create unblocked; console/storage');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
