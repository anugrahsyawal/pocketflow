// Run only against the disposable sessionPreview --with-pockets fixture.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/v1/transactions/'))writes.push({url:r.url(),body:r.postDataJSON()});});
 const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true});
 const recovery=page.getByRole('region',{name:'Pemulihan arsip dan pulihkan',exact:true});
 const expense=()=>history.locator('li').filter({has:page.getByText('Rp18.000',{exact:true})});
 const balance=value=>page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})}).getByText(value,{exact:true}).waitFor();
 const showArchived=async()=>{await history.getByLabel('Sertakan transaksi diarsipkan').check();await history.getByRole('button',{name:'Terapkan filter',exact:true}).click();await expense().waitFor();};
 try {
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  await balance('Rp82.000');await expense().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();
  await recovery.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(writes.length,0);
  await expense().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();
  await fs.mkdir('dist/qa-lifecycle-ui',{recursive:true});
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await recovery.screenshot({path:`dist/qa-lifecycle-ui/confirm-${width}.png`});}
  let lost=true;await page.route('**/v1/transactions/*/archive',async route=>{if(lost){lost=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}return route.continue();});
  await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();await recovery.getByRole('alert').filter({hasText:'Hasil belum terkonfirmasi'}).waitFor();assert.equal(writes.length,1);
  await page.reload({waitUntil:'domcontentloaded'});await recovery.getByText('Permintaan arsip tertunda',{exact:true}).waitFor();assert.equal(writes.length,1);
  assert.ok(await page.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).count()===0);
  await recovery.getByRole('button',{name:'Coba lagi permintaan yang sama',exact:true}).click();await balance('Rp100.000');
  await page.getByRole('status').filter({hasText:'Permintaan arsip/pulihkan sudah diproses'}).waitFor();assert.deepEqual(writes[0],writes[1]);
  await showArchived();await expense().getByRole('button',{name:'Pulihkan transaksi',exact:true}).click();
  await recovery.getByRole('button',{name:'Konfirmasi pulihkan',exact:true}).click();await balance('Rp82.000');assert.equal(writes.length,3);
  // A business/revision rejection must retain the original durable attempt.
  await page.route('**/v1/transactions/*/archive',route=>route.fulfill({status:409,json:{error:{code:'REVISION_CONFLICT'}}}));
  await expense().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();
  await recovery.getByRole('alert').filter({hasText:'Transaksi sudah berubah'}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await recovery.getByText('Permintaan arsip tertunda',{exact:true}).waitFor();assert.equal(writes.length,4);
  await recovery.getByRole('button',{name:'Hentikan permintaan arsip/pulihkan',exact:true}).click();
  let lostResolution=true;await page.route('**/v1/transactions/*/resolve-attempt',async route=>{if(lostResolution){lostResolution=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}return route.continue();});
  await recovery.getByRole('button',{name:'Konfirmasi penghentian riwayat',exact:true}).click();await recovery.getByRole('alert').filter({hasText:'Hasil belum terkonfirmasi'}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await recovery.getByText('Permintaan arsip tertunda',{exact:true}).waitFor();assert.equal(writes.length,5);
  await recovery.getByRole('button',{name:'Hentikan permintaan arsip/pulihkan',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi penghentian riwayat',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Permintaan dihentikan oleh server'}).waitFor();await balance('Rp82.000');assert.deepEqual(writes[4],writes[5]);
  await page.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  assert.ok(await expense().getByRole('button',{name:'Arsipkan transaksi',exact:true}).isDisabled());
  await page.getByRole('region',{name:'Tambah transaksi server',exact:true}).getByRole('button',{name:'Batal',exact:true}).click();
  await page.route('**/v1/transactions/*/archive',route=>route.fulfill({status:422,json:{error:{code:'INSUFFICIENT_FUNDS'}}}));
  await expense().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();
  await recovery.getByRole('alert').filter({hasText:'Server menolak tindakan'}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await recovery.getByText('Permintaan arsip tertunda',{exact:true}).waitFor();assert.equal(writes.length,7);
  await recovery.getByRole('button',{name:'Hentikan permintaan arsip/pulihkan',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi penghentian riwayat',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Permintaan dihentikan oleh server'}).waitFor();await balance('Rp82.000');assert.equal(writes.length,8);
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('409 (Conflict)')&&!e.text.includes('422 (Unprocessable Entity)')&&!e.text.includes('net::ERR_FAILED')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS lifecycle UI confirmation/cancel; archive/restore balances; lost response/reload/same-ID retry; conflict retained; terminal resolution loss/retry; form lock; mobile/console/storage');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
