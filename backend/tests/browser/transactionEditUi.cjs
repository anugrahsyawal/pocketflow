// Disposable preview fixture only. UI confirmation, recovery and canonical balances.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[],csrfResponses=[];
 page.on('response',r=>{if(r.status()===403)csrfResponses.push(r.json());});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(r.method()==='PATCH')writes.push(r.postDataJSON());});
 const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true}),form=page.getByRole('form',{name:'Form edit transaksi'}),review=page.getByRole('region',{name:'Konfirmasi edit transaksi'});
 const row=note=>history.locator('li').filter({has:page.getByText(note,{exact:true})});
 const save=async()=>{await form.getByRole('button',{name:'Tinjau perubahan'}).click();const request=page.waitForRequest(r=>r.method()==='PATCH');await review.getByRole('button',{name:'Konfirmasi simpan perubahan'}).click();await request;};
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  await history.getByText('Rp18.000',{exact:true}).waitFor();
  await history.locator('li').filter({has:page.getByText('Rp18.000',{exact:true})}).getByRole('button',{name:'Edit transaksi',exact:true}).click();
  assert.equal(await form.getByLabel('Nominal edit',{exact:true}).inputValue(),'18000');
  await form.getByRole('button',{name:'Tinjau perubahan'}).click();await form.getByRole('alert').waitFor();assert.equal(writes.length,0);
  await page.getByRole('button',{name:'Batal edit',exact:true}).click();assert.equal(writes.length,0);
  await history.locator('li').filter({has:page.getByText('Rp18.000',{exact:true})}).getByRole('button',{name:'Edit transaksi',exact:true}).click();
  await form.getByLabel('Nominal edit',{exact:true}).fill('20000');await form.getByLabel('Catatan edit',{exact:true}).fill('Expense edited');
  await form.getByRole('button',{name:'Tinjau perubahan'}).click();assert.equal(writes.length,0);await review.getByText('Rp20.000',{exact:true}).waitFor();
  await review.screenshot({path:'.env.edit-confirmation.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await review.getByRole('button',{name:'Konfirmasi simpan perubahan'}).click();await row('Expense edited').waitFor();
  assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0]).sort(),['amount','clientMutationId','expectedRevision','note'].sort());
  const originals=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const c=new SessionClient();return {owner:await c.me(),transactions:(await c.listTransactions()).transactions};});
  const expense=originals.transactions.find(t=>t.type==='expense');
  await row('Expense edited').getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByLabel('Pocket transaksi',{exact:true}).selectOption({label:'🚆 Transportation'}).catch(async()=>{
   const option=await form.getByLabel('Pocket transaksi',{exact:true}).locator('option').filter({hasText:'Transportation'}).first().getAttribute('value');await form.getByLabel('Pocket transaksi',{exact:true}).selectOption(option);
  });
  await save();await row('Expense edited').waitFor();assert.equal(writes[1].categoryId,null);assert.ok(writes[1].pocketId);assert.equal('budgetPocketId' in writes[1],false);
  // Seed an income through the already verified transport, then edit using UI.
  await page.evaluate(async e=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const c=new SessionClient(),o=await c.me();await c.createTransaction({version:1,ownerId:o.id,operation:'create',body:{clientMutationId:crypto.randomUUID(),type:'income',amount:1000,pocketId:e.pocketId,incomeSource:'gaji',occurredOn:e.occurredOn,occurredAtLocalTime:'10:00',note:'Income fixture'}});},expense);
  await page.reload();await row('Income fixture').getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByRole('button',{name:'Tanpa sumber',exact:true}).click();await form.getByLabel('Catatan edit').fill('Income edited');await save();await row('Income edited').waitFor();assert.equal(writes[2].incomeSource,null);
  await history.locator('li').filter({has:page.getByText('Transfer',{exact:true})}).first().getByRole('button',{name:'Edit transaksi',exact:true}).click();
  await form.getByLabel('Catatan edit').fill('Transfer edited');await save();await row('Transfer edited').waitFor();assert.deepEqual(Object.keys(writes[3]).sort(),['clientMutationId','expectedRevision','note'].sort());
  // Lose the PATCH response after server commit: immutable retry must recover it.
  await row('Expense edited').getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByLabel('Catatan edit').fill('Recovered edit');
  let finishLoss;const lossHandled=new Promise(resolve=>{finishLoss=resolve;});
  await page.route('**/v1/transactions/*',async route=>{if(route.request().method()==='PATCH'){await route.fetch();await route.abort('failed');finishLoss();}else await route.continue();},{times:1});
  await save();await lossHandled;await page.getByText('Permintaan edit tertunda',{exact:true}).waitFor();const lost=writes.at(-1);await page.unroute('**/v1/transactions/*');
  await page.reload();await page.getByText('Permintaan edit tertunda',{exact:true}).waitFor();assert.deepEqual(writes.at(-1),lost);
  await page.getByRole('button',{name:'Coba lagi permintaan yang sama'}).click();await row('Recovered edit').waitFor();assert.deepEqual(writes.at(-1),lost);
  // Another session edits after this form was opened. Never auto-merge/revise.
  await row('Recovered edit').getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByLabel('Catatan edit').fill('Stale draft');
  await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const c=new SessionClient(),o=await c.me(),t=(await c.listTransactions({type:'expense'})).transactions[0];await c.editTransaction({ownerId:o.id,transactionId:t.id,transactionType:t.type,clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,changes:{note:'External edit'}});});
  await save();await page.getByRole('alert').filter({hasText:'Transaksi sudah berubah'}).waitFor();
  await page.getByRole('button',{name:'Hentikan permintaan edit'}).click();await page.getByRole('button',{name:'Konfirmasi penghentian riwayat'}).click();await row('External edit').waitFor();assert.equal(await row('Stale draft').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
  for(const response of await Promise.all(csrfResponses))assert.equal(response.error.code,'INVALID_CSRF_TOKEN');
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('403 (Forbidden)')&&!e.text.includes('409 (Conflict)')&&!e.text.includes('net::ERR_FAILED')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS edit UI: unchanged/cancel no writes, confirmation, changed-only PATCH, pocket/category reset, income null, transfer, lost response/reload/same-ID retry, mobile overflow/console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
