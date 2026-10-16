// Dedicated disposable preview only. No personal profile or production data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const region=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  const open=()=>region.getByRole('button',{name:'Tambah pemasukan server',exact:true}).click();
  const submit=()=>region.getByRole('button',{name:'Simpan pemasukan server',exact:true}).click();
  const report=()=>page.evaluate(async()=>{const r=await fetch('/v1/reports/current-period');if(!r.ok)throw new Error('report');return r.json();});
  await open();await region.getByLabel('Nominal pemasukan (rupiah)',{exact:true}).fill('0');await submit();await region.getByRole('alert').waitFor();
  await region.getByRole('button',{name:'Batal',exact:true}).click();await open();
  await region.getByLabel('Pocket penerima',{exact:true}).selectOption({label:'💵 Cash'});
  await region.getByLabel('Nominal pemasukan (rupiah)',{exact:true}).fill('200000'); // Greater than existing Cash balance: income must not have an expense guard.
  await region.getByRole('button',{name:'Gaji',exact:true}).click();assert.equal(await region.getByRole('button',{name:'Gaji',exact:true}).getAttribute('aria-pressed'),'true');
  await region.getByLabel('Catatan pemasukan',{exact:true}).fill('Income UI recovery');
  assert.equal(await region.getByLabel('Kategori pengeluaran',{exact:true}).count(),0);
  const before=await report();
  await fs.mkdir('dist/qa-income-create',{recursive:true});for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await region.screenshot({path:`dist/qa-income-create/form-${width}.png`});}
  let lose=true;await page.route('**/v1/transactions',async route=>{if(route.request().method()!=='POST')return route.continue();writes.push(route.request().postDataJSON());if(lose){lose=false;assert.equal((await route.fetch()).status(),201);return route.abort('failed');}return route.continue();});
  await submit();await region.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Lanjutkan pemasukan yang sama',exact:true}).waitFor();assert.equal(writes.length,1);
  await region.getByText('Sumber: Gaji',{exact:true}).waitFor();assert.equal(await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).count(),0);
  await region.getByRole('button',{name:'Lanjutkan pemasukan yang sama',exact:true}).click();await region.getByRole('button',{name:'Tambah pemasukan server',exact:true}).waitFor();
  assert.deepEqual(writes[0],writes[1]);assert.equal(writes[0].type,'income');assert.equal(writes[0].incomeSource,'gaji');for(const key of ['categoryId','budgetPocketId','fromPocketId','toPocketId'])assert.equal(key in writes[0],false);
  const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true});await history.getByText('Income UI recovery',{exact:true}).waitFor();assert.equal(await history.getByText('Income UI recovery',{exact:true}).count(),1);
  const cash=page.locator('article').filter({has:page.getByRole('heading',{name:'Cash',exact:true})});await cash.getByText('Rp250.000',{exact:true}).waitFor();
  // Optional source is omitted, and switching from cancelled expense draft cannot leak its category.
  await region.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();await region.getByLabel('Pocket pembayaran',{exact:true}).selectOption({label:'💳 NFC Card'});await region.getByLabel('Kategori pengeluaran',{exact:true}).selectOption({label:'🚇 MRT'});await region.getByRole('button',{name:'Batal',exact:true}).click();
  await open();await region.getByLabel('Nominal pemasukan (rupiah)',{exact:true}).fill('1000');await submit();await region.getByRole('button',{name:'Tambah pemasukan server',exact:true}).waitFor();
  assert.equal('incomeSource' in writes[2],false);assert.equal('categoryId' in writes[2],false);
  // Verify income affects cash flow, not pocket budget allocations, from canonical reports.
  const after=await report();
  assert.equal(after.totals.totalIncome-before.totals.totalIncome,201000);
  assert.equal(after.totals.netCashFlow-before.totals.netCashFlow,201000);
  assert.equal(after.totals.totalExpense,before.totals.totalExpense);
  assert.deepEqual(after.pocketBudgetActuals.map(p=>({id:p.id,budget:p.budget})),before.pocketBudgetActuals.map(p=>({id:p.id,budget:p.budget})));
  await open();await region.getByLabel('Nominal pemasukan (rupiah)',{exact:true}).fill('1000');
  await page.route('**/v1/transactions',route=>route.request().method()==='POST'?route.fulfill({status:422,json:{error:{code:'INVALID_REFERENCE'}}}):route.continue());
  await submit();await region.getByRole('alert').filter({hasText:'Server menolak'}).waitFor();await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).click();await region.getByRole('button',{name:'Konfirmasi penghentian',exact:true}).click();await region.getByRole('button',{name:'Tambah pemasukan server',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('422 (Unprocessable Entity)')&&!e.text.includes('net::ERR_FAILED')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS income validation/source chips; mobile; lost response/reload/same-ID retry; canonical balance/history; omitted source/category isolation; rejection resolution; storage/console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
