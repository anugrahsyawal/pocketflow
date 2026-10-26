// Read-only browser response fixture: test navigation, not report calculations.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[],logs=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')logs.push({text:message.text(),url:message.location().url});});
 try{
  await page.route(url=>['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname),route=>route.abort());
  await page.route('**/v1/reports/**',async route=>{
   const response=await route.fetch();assert.equal(response.status(),200);
   const report=await response.json();
   for(const key of Object.keys(report.totals))report.totals[key]=0;
   report.daily=report.daily.map(day=>({...day,income:0,expense:0,netCashFlow:0}));
   report.budget={...report.budget,expense:0};
   report.pocketBudgetActuals=[];report.categories=[];report.paymentPockets=[];report.insights=[];
   report.weeklyUsage=report.weeklyUsage.map(week=>({...week,expense:0}));
   await route.fulfill({response,body:JSON.stringify(report)});
  });
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const nav=page.getByRole('navigation',{name:'Navigasi server'});
  await nav.waitFor();page.on('request',r=>{if(['POST','PATCH','PUT','DELETE'].includes(r.method()))writes.push(r.url());});
  const report=page.getByRole('region',{name:'Export periode server'});
  const entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  for(let attempt=0;attempt<2;attempt++){
   await nav.getByRole('button',{name:'Laporan',exact:true}).click();
   await report.getByRole('button',{name:'Catat Pengeluaran',exact:true}).click();
   await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).waitFor();
   assert.equal(await report.isVisible(),false);
   assert.equal(await nav.getByRole('button',{name:'Tambah transaksi',exact:true}).getAttribute('aria-current'),'page');
   for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
   if(attempt===0)await page.screenshot({path:'.env.connected-empty-report-entry.png'});
   await entry.getByRole('button',{name:'Batal',exact:true}).click();
  }
  await nav.getByRole('button',{name:'Laporan',exact:true}).click();
  await report.getByRole('button',{name:'Periode export sebelumnya',exact:true}).click();
  await report.getByRole('button',{name:'Kembali ke Periode Berjalan',exact:true}).click();
  await report.getByRole('button',{name:'Catat Pengeluaran',exact:true}).waitFor();
  assert.equal(await entry.isVisible(),false);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401')&&!((e.url.includes('fonts.googleapis.com')||e.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(e.text))),[]);
  console.log('PASS: empty current report opens expense twice, locks navigation, cancels; historical action returns to current report, no writes');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
