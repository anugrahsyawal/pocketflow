const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 let release=()=>{};
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const panel=page.getByRole('region',{name:'Export periode server'}),summary=panel.getByLabel('Ringkasan laporan server');
  await summary.waitFor();assert.ok((await summary.innerText()).includes('18.000'));
  const current=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  const d=new Date(current.period.startDate+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);const previous=d.toISOString().slice(0,10);
  const prev=panel.getByRole('button',{name:'Periode export sebelumnya'}),next=panel.getByRole('button',{name:'Periode export berikutnya'});
  let started;const reached=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  await page.route('**/v1/reports/periods/'+previous,async route=>{const response=await route.fetch();started();await gate;await route.fulfill({response});},{times:1});
  await prev.click();await reached;assert.equal(await summary.count(),0);await panel.getByRole('status').filter({hasText:'Memuat laporan'}).waitFor();
  await next.click();await summary.waitFor();assert.ok((await summary.innerText()).includes('18.000'));
  const oldFinished=page.waitForResponse(r=>r.url().endsWith('/reports/periods/'+previous));release();await oldFinished;
  // Browser animation frame lets the stale Promise settle without a fixed sleep.
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.ok((await summary.innerText()).includes('18.000'));assert.equal(await panel.getByText('Periode berjalan',{exact:true}).count(),1);
  await page.route('**/v1/reports/periods/'+previous,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'INTERNAL_SERVER_ERROR'}})}),{times:1});
  await prev.click();await panel.getByRole('alert').filter({hasText:'Angka laporan belum ditampilkan'}).waitFor();assert.equal(await summary.count(),0);
  assert.equal(await panel.getByRole('button',{name:'Export CSV',exact:true}).isDisabled(),true);
  await panel.getByRole('button',{name:'Coba lagi laporan'}).click();await summary.waitFor();
  await summary.getByText('Belum ada transaksi aktif pada periode ini.').waitFor();await summary.getByText(/Anggaran historis belum tersedia/).waitFor();
  await next.click();await summary.waitFor();assert.ok((await summary.innerText()).includes('18.000'));
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await panel.screenshot({path:'.env.report-period.png'});
  assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!x.text.includes('503')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: current amounts, stale response suppression, loading without stale totals, error/retry, historical empty/null, mobile overflow, console');
 }finally{release();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
