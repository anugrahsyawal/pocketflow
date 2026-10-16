// Disposable preview fixture only. Transport regression, not UI orchestration.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try {
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp18.000',{exact:true}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Hapus permanen',exact:true}).count()>0);
  const result=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const reader=new SessionClient(),owner=await reader.me(),original=(await reader.listTransactions({type:'expense'})).transactions[0];
   const input={ownerId:owner.id,transactionId:original.id,clientMutationId:crypto.randomUUID(),expectedRevision:original.revision,confirmPermanentDelete:true};
   const writes=[];let lose=true;
   const client=new SessionClient(async(path,init)=>{if(init?.method==='DELETE')writes.push(JSON.parse(init.body));const response=await fetch(path,init);if(init?.method==='DELETE'&&lose){lose=false;throw new Error('lost');}return response;});
   let lostCode='';try{await client.deleteTransaction(input);}catch(e){lostCode=e.code;}
   const countAfterLoss=writes.length,ack=await client.deleteTransaction(input);
   let missing='';try{await client.deleteTransaction({...input,clientMutationId:crypto.randomUUID()});}catch(e){missing=e.code;}
   return {lostCode,countAfterLoss,ack,writes,missing,remaining:(await reader.listTransactions({type:'expense',includeArchived:true})).transactions};
  });
  assert.equal(result.lostCode,'NETWORK_ERROR');assert.equal(result.countAfterLoss,1);assert.equal(result.ack.success,true);
  assert.deepEqual(result.writes[0],result.writes[1]);assert.equal(result.missing,'NOT_FOUND');assert.equal(result.remaining.length,0);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})}).getByText('Rp100.000',{exact:true}).waitFor();
  assert.equal(await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp18.000',{exact:true}).count(),0);
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('404 (Not Found)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS delete transport in real browser; explicit retry after lost response; canonical balance/list reload; no local storage writes/page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
