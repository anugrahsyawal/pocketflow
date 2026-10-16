// Disposable fixture; edit transport only, not a user-facing edit form.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp18.000',{exact:true}).waitFor();
  const result=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const reader=new SessionClient(),owner=await reader.me(),original=(await reader.listTransactions({type:'expense'})).transactions[0];
   const input={ownerId:owner.id,transactionId:original.id,transactionType:'expense',clientMutationId:crypto.randomUUID(),expectedRevision:original.revision,changes:{amount:20000,note:' browser edit ',categoryId:null}};
   let lose=true;const writes=[];
   const client=new SessionClient(async(path,init)=>{if(init?.method==='PATCH')writes.push(JSON.parse(init.body));const response=await fetch(path,init);if(init?.method==='PATCH'&&lose){lose=false;throw new Error('lost');}return response;});
   let code;try{await client.editTransaction(input);}catch(e){code=e.code;}
   const afterLoss=writes.length,ack=await client.editTransaction(input),committed=await client.resolveTransactionEdit(input);
   const stopped={...input,clientMutationId:crypto.randomUUID(),expectedRevision:ack.revision,changes:{amount:30000}};
   const cancelled=await client.resolveTransactionEdit(stopped);let fenced;try{await client.editTransaction(stopped);}catch(e){fenced=e.code;}
   return {code,afterLoss,writes,ack,committed,cancelled,fenced,canonical:(await reader.listTransactions({type:'expense'})).transactions[0]};
  });
  assert.equal(result.code,'NETWORK_ERROR');assert.equal(result.afterLoss,1);assert.deepEqual(result.writes[0],result.writes[1]);
  assert.equal(result.ack.note,'browser edit');assert.equal(result.ack.amount,20000);assert.equal(result.committed,'committed');assert.equal(result.cancelled,'cancelled');assert.equal(result.fenced,'MUTATION_CANCELLED');assert.deepEqual(result.canonical,result.ack);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp20.000',{exact:true}).waitFor();
  await page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})}).getByText('Rp80.000',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('409 (Conflict)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS edit transport browser: explicit lost-response retry, terminal resolution, canonical history/balance reload, no page errors/localStorage writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
