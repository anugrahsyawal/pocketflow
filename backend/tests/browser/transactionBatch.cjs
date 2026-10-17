// Isolated preview fixture, transport checkpoint only; no batch form enabled.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp18.000',{exact:true}).waitFor();
  const result=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const reader=new SessionClient(),owner=await reader.me(),original=(await reader.listTransactions({type:'expense'})).transactions[0];
   const make=()=>({ownerId:owner.id,body:{clientMutationId:crypto.randomUUID(),items:[1000,2000].map(amount=>({clientMutationId:crypto.randomUUID(),type:'expense',amount,pocketId:original.pocketId,occurredOn:original.occurredOn,occurredAtLocalTime:'11:00',note:' browser batch ',categoryId:null}))}});
   const input=make(),writes=[];let lose=true;
   const client=new SessionClient(async(path,init)=>{
    if(path==='/v1/transactions/batch')writes.push(JSON.parse(init.body));
    const response=await fetch(path,init);
    if(path==='/v1/transactions/batch'&&lose){lose=false;throw new Error('lost response');}
    return response;
   });
   let lost;try{await client.createTransactionBatch(input);}catch(e){lost=e.code;}
   const countAfterLoss=writes.length,ack=await client.createTransactionBatch(input),committed=await client.resolveTransactionBatch(input);
   const next=make(),stopped=await client.resolveTransactionBatch(next);let fenced;
   try{await client.createTransactionBatch(next);}catch(e){fenced=e.code;}
   return {lost,countAfterLoss,writes,ack,committed,stopped,fenced};
  });
  assert.equal(result.lost,'NETWORK_ERROR');assert.equal(result.countAfterLoss,1);
  assert.deepEqual(result.writes[0],result.writes[1]);assert.deepEqual(result.ack.map(t=>t.amount),[1000,2000]);
  assert.equal(result.committed.status,'committed');assert.deepEqual(result.committed.acknowledgement.transactions,result.ack);
  assert.equal(result.stopped.status,'stopped');assert.ok(result.stopped.items.every(i=>i.status==='cancelled'));assert.equal(result.fenced,'MUTATION_CANCELLED');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp1.000',{exact:true}).waitFor();
  await page.getByRole('region',{name:'Riwayat transaksi server',exact:true}).getByText('Rp2.000',{exact:true}).waitFor();
  await page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})}).getByText('Rp79.000',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('409 (Conflict)')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS batch browser transport: response loss, explicit identical retry, ordered ack, stopped fences, canonical history/NFC refresh; no page errors/localStorage writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
