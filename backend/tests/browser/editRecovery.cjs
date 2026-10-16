// Disposable preview only: real IndexedDB and existing recovery controls, no edit form.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 const login=async()=>{await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).waitFor();};
 try{
  await page.goto('http://127.0.0.1:5174');await login();
  const record=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient(),owner=await client.me(),t=(await client.listTransactions({type:'expense'})).transactions[0],store=new TransactionAttemptStore();
   const record={version:1,ownerId:owner.id,operation:'edit',transactionType:'expense',transactionId:t.id,body:{clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,amount:20000,note:' recovery ',categoryId:null}};
   const saved=await store.prepare(record);if(!saved.created)throw new Error('Fixture slot not empty');
   for(const operation of ['archive','restore','delete','create']){
    const candidate=operation==='create'?{version:1,ownerId:owner.id,operation,body:{clientMutationId:crypto.randomUUID(),type:'expense',pocketId:t.pocketId,amount:1000,occurredOn:t.occurredOn,occurredAtLocalTime:'10:00'}}:{version:1,ownerId:owner.id,operation,transactionId:t.id,body:{clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,...(operation==='delete'?{confirmPermanentDelete:true}:{})}};
    if((await store.prepare(candidate)).created)throw new Error('Competing operation replaced edit');
   }
   let rejected=false;try{await store.acknowledge({...record,body:{...record.body,note:'changed'}});}catch{rejected=true;}
   if(!rejected)throw new Error('Stale cleanup accepted');return record;
  });
  let patches=0;page.on('request',r=>{if(r.method()==='PATCH')patches++;});
  await page.reload();const recovery=page.getByRole('region',{name:'Pemulihan arsip dan pulihkan',exact:true});
  await recovery.getByText('Permintaan edit tertunda',{exact:true}).waitFor();assert.equal(patches,0);
  await page.getByRole('region',{name:'Tambah transaksi server'}).getByText(/Ada permintaan edit tertunda/).waitFor();
  await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await login();await recovery.getByText('Permintaan edit tertunda',{exact:true}).waitFor();assert.equal(patches,0);
  await recovery.getByRole('button',{name:'Coba lagi permintaan yang sama'}).click();
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp20.000',{exact:true}).waitFor();assert.equal(patches,1);
  const next=await page.evaluate(async old=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient(),store=new TransactionAttemptStore();if(await store.read(old.ownerId))throw new Error('Acknowledged record retained');
   const t=(await client.listTransactions({type:'expense'})).transactions[0],next={...old,body:{clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,note:null}};await store.prepare(next);return next;
  },record);
  await page.reload();await recovery.getByText('Permintaan edit tertunda',{exact:true}).waitFor();
  await recovery.getByRole('button',{name:'Hentikan permintaan edit'}).click();await recovery.getByRole('button',{name:'Konfirmasi penghentian riwayat'}).click();
  await page.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  const result=await page.evaluate(async r=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore,editAttemptRequest}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient();let code;try{await client.editTransaction(editAttemptRequest(r));}catch(e){code=e.code;}
   return {code,saved:await new TransactionAttemptStore().read(r.ownerId),t:(await client.listTransactions({type:'expense'})).transactions[0],local:Object.keys(localStorage)};
  },next);
  assert.equal(result.code,'MUTATION_CANCELLED');assert.equal(result.saved,null);assert.equal(result.t.note,'recovery');assert.equal(result.t.amount,20000);assert.deepEqual(result.local,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('409 (Conflict)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS IndexedDB edit collisions/stale cleanup, reload/logout without resend, explicit UI retry, terminal stop and canonical refresh');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
