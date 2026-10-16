// Disposable sessionPreview --with-pockets fixture, isolated Edge profile only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:375,height:844}}),page=await context.newPage();
 const errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(r.method()==='DELETE'||(r.method()==='POST'&&r.url().includes('/resolve-attempt')))writes.push({url:r.url(),method:r.method(),body:r.postDataJSON()});});
 const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true}),panel=history.getByRole('region',{name:'Pemulihan arsip dan pulihkan',exact:true});
 const row=amount=>history.locator('li').filter({has:page.getByText(amount,{exact:true})});
 const balance=amount=>page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})}).getByText(amount,{exact:true}).waitFor();
 const login=async()=>{await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();};
 const stop=async()=>{await panel.getByRole('button',{name:'Hentikan permintaan hapus',exact:true}).click();await panel.getByRole('button',{name:'Konfirmasi penghentian riwayat',exact:true}).click();};
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});await login();await balance('Rp82.000');
  await row('Rp18.000').getByRole('button',{name:'Hapus permanen',exact:true}).click();await panel.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(writes.length,0);
  await row('Rp18.000').getByRole('button',{name:'Hapus permanen',exact:true}).click();
  await fs.mkdir('dist/qa-delete-ui',{recursive:true});for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await panel.screenshot({path:`dist/qa-delete-ui/confirm-${width}.png`});}
  let lose=true;await page.route('**/v1/transactions/*',async route=>{if(route.request().method()!=='DELETE')return route.continue();if(lose){lose=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}return route.continue();});
  await panel.getByRole('button',{name:'Konfirmasi hapus permanen',exact:true}).click();await panel.getByRole('alert').filter({hasText:'Hasil belum terkonfirmasi'}).waitFor();assert.equal(writes.length,1);
  await page.reload({waitUntil:'domcontentloaded'});await panel.getByText('Permintaan hapus permanen tertunda',{exact:true}).waitFor();assert.equal(writes.length,1);
  await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();await login();await panel.getByText('Permintaan hapus permanen tertunda',{exact:true}).waitFor();assert.equal(writes.length,1);
  await panel.getByRole('button',{name:'Coba lagi permintaan yang sama',exact:true}).click();await page.getByRole('status').filter({hasText:'Transaksi sudah dihapus permanen'}).waitFor();await balance('Rp100.000');assert.deepEqual(writes[0],writes[1]);assert.equal(writes[0].body.confirmPermanentDelete,true);
  // Aborted dispatch did not reach server. Resolution must fence it, not delete.
  await page.route('**/v1/transactions/*',route=>route.request().method()==='DELETE'?route.abort('failed'):route.continue());
  await row('Rp100.000').getByRole('button',{name:'Hapus permanen',exact:true}).click();await panel.getByRole('button',{name:'Konfirmasi hapus permanen',exact:true}).click();await panel.getByRole('alert').filter({hasText:'Hasil belum terkonfirmasi'}).waitFor();
  let loseStop=true;await page.route('**/v1/transactions/*/resolve-attempt',async route=>{if(loseStop){loseStop=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}return route.continue();});
  await stop();await panel.getByRole('alert').filter({hasText:'Hasil belum terkonfirmasi'}).waitFor();const beforeReload=writes.length;
  await page.reload({waitUntil:'domcontentloaded'});await panel.getByText('Permintaan hapus permanen tertunda',{exact:true}).waitFor();assert.equal(writes.length,beforeReload);
  await stop();await page.getByRole('status').filter({hasText:'Permintaan dihentikan oleh server'}).waitFor();await balance('Rp100.000');await row('Rp100.000').waitFor();assert.deepEqual(writes[3],writes[4]);
  // Shared real IndexedDB rejects competing operations and stale compare-and-clear.
  const original=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient(),ownerId=(await client.me()).id,t=(await client.listTransactions()).transactions[0];
   const record={version:1,ownerId,operation:'delete',transactionId:t.id,body:{clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,confirmPermanentDelete:true}};
   await new TransactionAttemptStore().prepare(record);return record;
  });
  const second=await context.newPage();await second.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  const storage=await second.evaluate(async record=>{
   const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');const store=new TransactionAttemptStore();
   const candidate={version:1,ownerId:record.ownerId,operation:'create',body:{clientMutationId:crypto.randomUUID(),type:'income',pocketId:record.transactionId,amount:1,occurredOn:'2026-10-04',occurredAtLocalTime:'12:00'}};
   const winner=await store.prepare(candidate);let rejected=false;try{await store.acknowledge({...record,body:{...record.body,clientMutationId:crypto.randomUUID()}});}catch{rejected=true;}
   return {winner,rejected,saved:await store.read(record.ownerId)};
  },original);assert.equal(storage.winner.created,false);assert.deepEqual(storage.saved,original);assert.equal(storage.rejected,true);await second.close();
  await page.reload({waitUntil:'domcontentloaded'});await panel.getByText('Permintaan hapus permanen tertunda',{exact:true}).waitFor();await stop();await page.getByRole('status').filter({hasText:'Permintaan dihentikan oleh server'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('net::ERR_FAILED')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS delete confirmation/cancel; lost commit/reload/logout/explicit retry; cancellation loss/retry; canonical balance; cross-tab journal collision/stale cleanup; mobile/console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
