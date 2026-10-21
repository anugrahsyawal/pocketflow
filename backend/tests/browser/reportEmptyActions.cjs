const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const panel=page.getByRole('region',{name:'Export periode server'}),entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  await panel.getByLabel('Ringkasan laporan server').waitFor();
  page.on('request',r=>{if(r.url().includes('/v1/')&&r.method()!=='GET')writes.push(r.url());});
  assert.equal(await panel.getByRole('button',{name:'Catat Pengeluaran',exact:true}).count(),0);
  await panel.getByRole('button',{name:'Periode export sebelumnya'}).click();
  const back=panel.getByRole('button',{name:'Kembali ke Periode Berjalan',exact:true});await back.waitFor();
  await panel.getByRole('button',{name:'Periode export sebelumnya'}).click();await back.waitFor();
  await back.click();await panel.getByText('Periode berjalan',{exact:true}).waitFor();
  assert.equal(await panel.getByRole('button',{name:'Periode export berikutnya'}).isDisabled(),true);
  const report=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  // Presentation-only empty-current fixture, no ledger mutation.
  for(const key of Object.keys(report.totals))report.totals[key]=0;
  report.categories=[];report.paymentPockets=[];report.insights=[];
  report.daily.forEach(d=>Object.assign(d,{expense:0,income:0,netCashFlow:0}));
  await page.route('**/v1/reports/periods/'+report.period.startDate,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(report)}));
  await page.reload();await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  const create=panel.getByRole('button',{name:'Catat Pengeluaran',exact:true});await create.waitFor();assert.equal(await create.count(),1);
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});
  await create.click();await page.getByRole('form',{name:'Form pengeluaran server',exact:true}).waitFor();
  assert.equal(await entry.evaluate(el=>el===document.activeElement),true);
  assert.equal(await create.isDisabled(),true);
  await page.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('12345');
  await entry.getByRole('button',{name:'Batal',exact:true}).click();
  await entry.getByRole('button',{name:'Tambah pemasukan server',exact:true}).click();
  await page.getByLabel('Nominal pemasukan (rupiah)',{exact:true}).fill('67890');
  assert.equal(await create.isDisabled(),true);
  assert.equal(await page.getByLabel('Nominal pemasukan (rupiah)',{exact:true}).inputValue(),'67890');
  await entry.getByRole('button',{name:'Batal',exact:true}).click();
  await panel.getByRole('button',{name:'Periode export sebelumnya'}).click();await back.waitFor();
  await back.screenshot({path:'.env.report-empty-action.png'});
  const pendingId=await page.evaluate(async startDate=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient(),owner=await client.me(),report=await client.readReport();
   const clientMutationId=crypto.randomUUID();
   await new TransactionAttemptStore().prepare({version:1,ownerId:owner.id,operation:'create',body:{clientMutationId,type:'expense',amount:1000,pocketId:report.pocketBudgetActuals[0].id,occurredOn:startDate,occurredAtLocalTime:'10:00'}});
   return clientMutationId;
  },report.period.startDate);
  await page.reload();await entry.getByRole('heading',{name:'Transaksi tertunda',exact:true}).waitFor();await create.waitFor();
  if(!await create.isDisabled())await create.click();
  assert.equal(await page.getByRole('form',{name:'Form pengeluaran server',exact:true}).count(),0);
  assert.equal(await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');return (await new TransactionAttemptStore().read((await new SessionClient().me()).id)).body.clientMutationId;}),pendingId);
  assert.equal(await page.getByText(/Batch, edit transaksi dan migrasi data belum tersedia/).count(),0);
  await page.getByText(/Tahap 7C.4 · Pratinjau integrasi server/).waitFor();
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: unified historical/current CTA, direct current return, existing expense entry/focus, draft and pending recovery preservation, updated intro, mobile/console; no server writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
