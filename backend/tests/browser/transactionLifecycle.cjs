// Transport QA only, in an isolated browser and disposable preview database.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  await page.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  const result=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const client=new SessionClient(),owner=await client.me(),t=(await client.listTransactions({type:'expense'})).transactions[0];
   const input={ownerId:owner.id,transactionId:t.id,clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,operation:'archive'};
   let writes=0,lose=true;
   const losing=new SessionClient(async(path,init)=>{const response=await fetch(path,init);if(init?.method==='POST'){writes++;if(lose){lose=false;throw new Error('lost');}}return response;});
   let failure='';try{await losing.setTransactionArchived(input);}catch(e){failure=e.code;}
   const beforeRetry=writes,ack=await losing.setTransactionArchived(input);
   const hidden=(await client.listTransactions({type:'expense'})).transactions.length;
   const restored=await client.setTransactionArchived({...input,clientMutationId:crypto.randomUUID(),expectedRevision:ack.revision,operation:'restore'});
   const current=(await client.listTransactions({type:'expense'})).transactions.find(row=>row.id===t.id);
   return {failure,beforeRetry,writes,archived:ack.isArchived,hidden,restored:restored.isArchived,current:current.isArchived,revision:current.revision,localKeys:Object.keys(localStorage)};
  });
  assert.equal(result.failure,'NETWORK_ERROR');assert.equal(result.beforeRetry,1);assert.equal(result.writes,2);assert.equal(result.archived,true);assert.equal(result.hidden,0);assert.equal(result.restored,false);assert.equal(result.current,false);assert.equal(result.revision,3);assert.deepEqual(result.localKeys,[]);
  assert.deepEqual(errors,[]);assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('403 (Forbidden)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS browser lifecycle transport: real cookies/CSRF; lost-response explicit retry; archive/filter/restore; no local financial storage; console clean');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
