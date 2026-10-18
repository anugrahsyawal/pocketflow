// Connected capture with disposable preview fixtures only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),writes=[],errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/v1/transactions'))writes.push({path:new URL(r.url()).pathname,body:r.postDataJSON()});});
 const state=()=>page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {loadMasterData}=await import('/src/lib/api/masterData.ts');const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');const c=new SessionClient(),owner=await c.me();return {owner:owner.id,pockets:(await loadMasterData(c)).pockets,record:await new TransactionAttemptStore().read(owner.id)};});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const open=page.getByRole('button',{name:'Tambah beberapa pengeluaran',exact:true});await open.waitFor();
  const initial=await state(),nfc=initial.pockets.find(p=>p.templateKey==='nfc-card');assert.ok(nfc.currentBalance>3000);
  await open.click();
  await page.getByLabel('Nominal item 1 (rupiah)',{exact:true}).fill('1000');await page.getByLabel('Pocket item 1',{exact:true}).selectOption(nfc.id);
  await page.getByRole('button',{name:'Tambah item pengeluaran',exact:true}).click();
  await page.getByLabel('Nominal item 2 (rupiah)',{exact:true}).fill('2000');
  await page.getByLabel('Catatan item 2',{exact:true}).fill('capture exact');
  await page.getByRole('button',{name:'Periksa batch',exact:true}).click();
  await page.getByRole('region',{name:'Konfirmasi batch',exact:true}).waitFor();assert.equal(writes.length,0);assert.equal((await state()).record,null);
  await page.getByRole('button',{name:'Kembali ke draft',exact:true}).click();
  assert.equal(await page.getByLabel('Nominal item 2 (rupiah)',{exact:true}).inputValue(),'2000');
  const over=String(Math.floor(nfc.currentBalance/2)+1);
  await page.getByLabel('Nominal item 1 (rupiah)',{exact:true}).fill(over);await page.getByLabel('Nominal item 2 (rupiah)',{exact:true}).fill(over);
  await page.getByRole('button',{name:'Periksa batch',exact:true}).click();await page.getByRole('alert').filter({hasText:'melebihi saldo'}).waitFor();assert.equal(writes.length,0);
  await page.getByLabel('Nominal item 1 (rupiah)',{exact:true}).fill('1000');await page.getByLabel('Nominal item 2 (rupiah)',{exact:true}).fill('2000');
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});
  await page.getByRole('button',{name:'Periksa batch',exact:true}).click();
  await page.getByRole('region',{name:'Konfirmasi batch',exact:true}).screenshot({path:'.env.batch-capture-confirm.png'});
  let lose=true;await page.route('**/v1/transactions/batch',async route=>{if(lose){lose=false;await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Konfirmasi simpan batch',exact:true}).click();
  await page.getByRole('heading',{name:'Batch 2 pengeluaran tertunda',exact:true}).waitFor();
  const pending=(await state()).record;assert.equal(pending.operation,'batch');assert.deepEqual(pending.body,writes[0].body);
  await page.reload();await page.getByRole('button',{name:'Coba lagi batch yang sama',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Batch sudah diproses.'}).waitFor();
  const final=await state();assert.equal(final.record,null);assert.equal(final.pockets.find(p=>p.id===nfc.id).currentBalance,nfc.currentBalance-3000);
  assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);
  await open.click();await page.getByRole('button',{name:'Batal batch',exact:true}).click();assert.equal(writes.length,2);assert.equal((await state()).record,null);
  assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('net::ERR_FAILED')&&!((e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')||e.text.includes('net::ERR_TIMED_OUT'))&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS batch capture: review/back/cancel without writes, combined overspend, shared durable confirmation, lost-response recovery, once-only balance, mobile widths/console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
