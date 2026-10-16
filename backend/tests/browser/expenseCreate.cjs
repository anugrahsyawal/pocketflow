// Disposable fixture only; no personal browser profile.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],consoleErrors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),url:m.location().url});});
 const login=async()=>{await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();};
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});await login();
  const region=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  const open=()=>region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  const submit=()=>region.getByRole('button',{name:'Simpan pengeluaran server',exact:true}).click();
  await open();await region.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('0');await submit();await region.getByRole('alert').waitFor();
  await region.getByRole('button',{name:'Batal',exact:true}).click();await open();
  await region.getByLabel('Pocket pembayaran',{exact:true}).selectOption({label:'💳 NFC Card'});
  await region.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('90000');await submit();await region.getByRole('alert').filter({hasText:'melebihi saldo'}).waitFor();
  await region.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1000');
  await region.getByLabel('Kategori pengeluaran',{exact:true}).selectOption({label:'🚇 MRT'});
  await region.getByLabel('Catatan pengeluaran',{exact:true}).fill('Expense UI recovery');
  await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();await region.getByRole('form').waitFor();
  assert.equal(await region.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).inputValue(),'1000');
  await fs.mkdir('dist/qa-expense-create',{recursive:true});for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await region.screenshot({path:`dist/qa-expense-create/form-${width}.png`});}
  let lose=true;await page.route('**/v1/transactions',async route=>{if(route.request().method()!=='POST')return route.continue();writes.push(route.request().postDataJSON());if(lose){lose=false;assert.equal((await route.fetch()).status(),201);return route.abort('failed');}return route.continue();});
  await submit();await region.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();assert.equal(writes.length,1);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Lanjutkan pengeluaran yang sama'}).waitFor();assert.equal(writes.length,1);
  await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();await login();
  await region.getByRole('button',{name:'Lanjutkan pengeluaran yang sama'}).click();await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  assert.deepEqual(writes[0],writes[1]);assert.equal('budgetPocketId' in writes[0],false);
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})});await card.getByText('Rp81.000',{exact:true}).waitFor();
  const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true});await history.getByText('Expense UI recovery',{exact:true}).waitFor();assert.equal(await history.getByText('Expense UI recovery',{exact:true}).count(),1);
  await open();await region.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1000');
  await page.route('**/v1/transactions',route=>route.request().method()==='POST'?route.fulfill({status:422,json:{error:{code:'INSUFFICIENT_FUNDS'}}}):route.continue());
  await submit();await region.getByRole('alert').filter({hasText:'Server menolak'}).waitFor();assert.equal(await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).count(),0);
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Lanjutkan pengeluaran yang sama'}).waitFor();
  await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).click();
  await region.getByRole('button',{name:'Kembali',exact:true}).click();
  assert.equal(await region.getByRole('button',{name:'Konfirmasi penghentian',exact:true}).count(),0);
  let resolutions=0;
  await page.route('**/v1/transactions/resolve-attempt',async route=>{resolutions++;const response=await route.fetch();assert.equal(response.status(),200);return route.abort('failed');});
  await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).click();
  await region.getByRole('button',{name:'Konfirmasi penghentian',exact:true}).click();
  await region.getByRole('alert').filter({hasText:'Penghentian belum terkonfirmasi'}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).waitFor();assert.equal(resolutions,1);
  await page.unroute('**/v1/transactions/resolve-attempt');
  await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).click();
  await region.getByRole('button',{name:'Konfirmasi penghentian',exact:true}).click();
  await page.getByText('Permintaan dibatalkan oleh server. Tidak ada transaksi baru dari permintaan ini.',{exact:true}).waitFor();
  await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  // A genuinely committed request with a lost response must not be deleted by resolution.
  await page.unroute('**/v1/transactions');
  await page.route('**/v1/transactions',async route=>{if(route.request().method()!=='POST')return route.continue();assert.equal((await route.fetch()).status(),201);return route.abort('failed');});
  await open();await region.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1000');
  await region.getByLabel('Catatan pengeluaran',{exact:true}).fill('Committed resolution preserved');
  await submit();await region.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();
  await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).click();
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await region.screenshot({path:`dist/qa-expense-create/resolution-${width}.png`});}
  await region.getByRole('button',{name:'Konfirmasi penghentian',exact:true}).click();
  await page.getByText('Transaksi ternyata sudah tersimpan. Transaksi tetap dipertahankan; periksa riwayat sebelum membuat pengganti.',{exact:true}).waitFor();
  await history.getByText('Committed resolution preserved',{exact:true}).waitFor();assert.equal(await history.getByText('Committed resolution preserved',{exact:true}).count(),1);
  await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(consoleErrors.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('422 (Unprocessable Entity)')&&!e.text.includes('net::ERR_FAILED')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS expense regression; confirmed cancellation; lost resolution/reload/explicit retry; committed result preserved; mobile confirmation; storage/console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
