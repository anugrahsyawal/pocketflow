// Existing disposable preview only. Real IndexedDB and user-facing recovery controls.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:375,height:844}}),page=await context.newPage();
 const errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/v1/transactions'))writes.push({path:new URL(r.url()).pathname,body:r.postDataJSON()});});
 const login=async()=>{await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();await page.getByRole('heading',{name:'Riwayat transaksi',exact:true}).waitFor();};
 const saved=()=>page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');return new TransactionAttemptStore().read((await new SessionClient().me()).id);});
 const prepare=()=>page.evaluate(async()=>{
  const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
  const c=new SessionClient(),owner=await c.me(),t=(await c.listTransactions({type:'expense'})).transactions[0];
  const record={version:1,ownerId:owner.id,operation:'batch',body:{clientMutationId:crypto.randomUUID(),items:[1000,2000].map(amount=>({clientMutationId:crypto.randomUUID(),type:'expense',amount,pocketId:t.pocketId,occurredOn:t.occurredOn,occurredAtLocalTime:'11:00',note:' recovery original '}))}};
  const store=new TransactionAttemptStore();await store.prepare(record);
  const other={version:1,ownerId:owner.id,operation:'create',body:record.body.items[0]};
  const blocked=await store.prepare(other);
  if(blocked.created||blocked.record.operation!=='batch')throw new Error('Shared slot overwritten');
  let rejected=false;
  try{await store.acknowledge({...record,body:{...record.body,items:[...record.body.items].reverse()}});}catch{rejected=true;}
  if(!rejected||JSON.stringify(await store.read(owner.id))!==JSON.stringify(record))throw new Error('Changed cleanup must preserve batch');
  return record;
 });
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');await login();
  const original=await prepare(),before=writes.length;
  await page.reload();await page.getByRole('heading',{name:'Batch 2 pengeluaran tertunda',exact:true}).waitFor();
  assert.equal(writes.length,before);assert.deepEqual(await saved(),original);
  await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await login();
  await page.getByRole('heading',{name:'Batch 2 pengeluaran tertunda',exact:true}).waitFor();assert.deepEqual(await saved(),original);
  await page.getByRole('region',{name:'Pemulihan arsip dan pulihkan',exact:true}).screenshot({path:'.env.batch-recovery-panel.png'});
  const screen=page.getByRole('region',{name:'Tambah transaksi server'});
  assert.equal(await screen.getByRole('button',{name:'Tambah pengeluaran',exact:true}).count(),0);
  let lose=true;
  await page.route('**/v1/transactions/batch',async route=>{if(lose){lose=false;await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Coba lagi batch yang sama',exact:true}).click();
  await page.getByText('Hasil belum terkonfirmasi.',{exact:false}).waitFor();assert.deepEqual(await saved(),original);
  await page.reload();await page.getByRole('button',{name:'Coba lagi batch yang sama',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Batch sudah diproses.'}).waitFor();assert.equal(await saved(),null);
  const sent=writes.filter(w=>w.path==='/v1/transactions/batch');assert.equal(sent.length,2);assert.deepEqual(sent[0],sent[1]);
  await page.unroute('**/v1/transactions/batch');

  const mixed=await prepare();
  await page.evaluate(async record=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');await new SessionClient().createTransaction({version:1,ownerId:record.ownerId,operation:'create',body:record.body.items[0]});},mixed);
  await page.reload();await page.getByRole('button',{name:'Hentikan permintaan batch',exact:true}).click();
  const beforeStop=writes.length;await page.getByRole('button',{name:'Kembali',exact:true}).click();assert.equal(writes.length,beforeStop);
  await page.getByRole('button',{name:'Hentikan permintaan batch',exact:true}).click();
  await page.route('**/v1/pockets?includeArchived=true',route=>route.fulfill({status:500,json:{error:{code:'INTERNAL_SERVER_ERROR'}}}));
  await page.getByRole('button',{name:'Konfirmasi penghentian batch',exact:true}).click();
  const notice=page.getByRole('status').filter({hasText:'Batch dihentikan.'});await notice.waitFor();
  assert.match(await notice.innerText(),/1\. Rp1\.000 — tersimpan/);assert.match(await notice.innerText(),/2\. Rp2\.000 — dihentikan, tidak disimpan/);
  assert.equal(await saved(),null);
  await page.getByText('Data belum ditampilkan.',{exact:false}).waitFor();
  assert.match(await notice.innerText(),/2\. Rp2\.000 — dihentikan, tidak disimpan/);
  await page.unroute('**/v1/pockets?includeArchived=true');await page.getByRole('button',{name:'Muat ulang',exact:true}).click();
  await page.getByRole('heading',{name:'Riwayat transaksi',exact:true}).waitFor();
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);}

  // Storage outage blocks controls and does not dispatch any mutation.
  await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new Error('simulated unavailable storage');}});});
  const beforeFailure=writes.length;await page.reload();await page.getByText('Penyimpanan pemulihan tidak tersedia atau rusak. Tindakan diblokir; jangan hapus data situs.',{exact:true}).waitFor();
  assert.equal(writes.length,beforeFailure);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('500 (Internal Server Error)')&&!e.text.includes('net::ERR_FAILED')&&
    !((e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')||e.text.includes('net::ERR_TIMED_OUT'))&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS batch recovery: shared slot, reload/logout, no auto-send, response loss/retry, mixed terminal outcome, storage outage, mobile widths and console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
