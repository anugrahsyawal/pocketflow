// Transport + journal orchestration in disposable browser/database, no production form.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage(),errors=[],consoleErrors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),url:m.location().url});});
  try{
    await page.goto('http://127.0.0.1:5174');await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    await page.getByRole('heading',{name:'NFC Card',exact:true}).waitFor();
    let lose=true;await page.route('**/v1/transactions',async route=>{
      if(route.request().method()!=='POST')return route.continue();writes.push(route.request().postDataJSON());
      if(lose){lose=false;assert.equal((await route.fetch()).status(),201);return route.abort('failed');}return route.continue();
    });
    const prepared=await page.evaluate(async()=>{
      const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
      const client=new SessionClient(),store=new TransactionAttemptStore(),user=await client.me();
      const {pockets}=await client.read('/pockets'),nfc=pockets.find(p=>p.templateKey==='nfc-card');
      const attempt={version:1,operation:'create',ownerId:user.id,body:{clientMutationId:crypto.randomUUID(),type:'expense',amount:1000,pocketId:nfc.id,occurredOn:'2026-09-29',occurredAtLocalTime:'11:30',note:'Recovery browser'}};
      await store.prepare(attempt);let code;try{await client.createTransaction(attempt);}catch(e){code=e.code;}
      return {attempt,code,pending:await store.read(user.id)};
    });
    assert.equal(prepared.code,'NETWORK_ERROR');assert.deepEqual(prepared.pending,prepared.attempt);assert.equal(writes.length,1);
    await page.reload();await page.getByRole('heading',{name:'NFC Card',exact:true}).waitFor();assert.equal(writes.length,1);
    const recovered=await page.evaluate(async ownerId=>{
      const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
      const client=new SessionClient(),store=new TransactionAttemptStore(),attempt=await store.read(ownerId);
      const before=await client.listTransactions();const ack=await client.createTransaction(attempt);
      await store.acknowledge(attempt);const after=await client.listTransactions();
      return {before:before.pagination.total,after:after.pagination.total,ack,pending:await store.read(ownerId),rows:after.transactions,storage:Object.keys(localStorage)};
    },prepared.attempt.ownerId);
    assert.equal(recovered.before,3);assert.equal(recovered.after,3);assert.equal(recovered.pending,null);
    assert.equal(recovered.rows.filter(t=>t.id===recovered.ack.id).length,1);assert.deepEqual(writes[0],writes[1]);assert.deepEqual(recovered.storage,[]);
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('net::ERR_FAILED')&&
      !(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
    console.log('PASS persisted before POST; committed response loss; reload without resend; explicit identical replay; validated acknowledgement cleanup; no duplicate; storage/console');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
