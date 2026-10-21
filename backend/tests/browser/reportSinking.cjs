const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 let release=()=>{};
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const panel=page.getByRole('region',{name:'Export periode server'}),card=panel.getByRole('region',{name:'Rekomendasi Sinking Fund server'});
  await card.waitFor();
  page.on('request',r=>{if(r.url().includes('/v1/')&&r.method()!=='GET')writes.push(r.method()+' '+r.url());});
  const initial=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  const selected=initial.sinkingFund.candidates.find(c=>c.label==='Transportation');
  assert.ok(selected);
  const checkbox=()=>card.getByRole('checkbox',{name:'Sertakan Transportation dalam rekomendasi Sinking Fund'});
  assert.equal(await checkbox().isChecked(),true);
  const path='**/v1/reports/periods/'+initial.period.startDate+'*';
  let started;const reached=new Promise(r=>started=r),held=new Promise(r=>release=r);
  await page.route(path,async route=>{
   assert.equal(new URL(route.request().url()).searchParams.get('excludedPocketIds'),selected.pocketId);
   const response=await route.fetch();started();await held;await route.fulfill({response});
  },{times:1});
  await checkbox().click();await reached;
  assert.equal(await card.count(),0); // Never show the old recommendation under a new selection.
  const prev=panel.getByRole('button',{name:'Periode export sebelumnya'}),next=panel.getByRole('button',{name:'Periode export berikutnya'});
  await prev.click();await card.getByText(/Rekomendasi historis belum tersedia/).waitFor();
  const settled=page.waitForResponse(r=>r.url().includes('/reports/periods/'+initial.period.startDate)&&r.url().includes('excludedPocketIds'));
  release();await settled;await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await card.getByRole('checkbox').count(),0);
  await next.click();await checkbox().waitFor();assert.equal(await checkbox().isChecked(),false);
  const excluded=await page.evaluate(async id=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport({excludedPocketIds:[id]});},selected.pocketId);
  assert.equal(excluded.sinkingFund.candidates.length,initial.sinkingFund.candidates.length);
  assert.equal(excluded.sinkingFund.candidates.find(c=>c.pocketId===selected.pocketId).isExcluded,true);
  if(initial.sinkingFund.status==='available')assert.equal(excluded.sinkingFund.suggestedAmount,initial.sinkingFund.suggestedAmount-selected.eligibleAmount);
  await page.reload();await checkbox().waitFor();assert.equal(await checkbox().isChecked(),false);
  // Failed local persistence does not apply a new selection or silently claim success.
  await page.evaluate(()=>{window.originalSinkingSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('pocketflow-connected-sinking'))throw new Error('test quota');return window.originalSinkingSet.call(this,k,v);};});
  await checkbox().click();await panel.getByRole('alert').filter({hasText:'Pilihan tidak disimpan'}).waitFor();assert.equal(await checkbox().isChecked(),false);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSinkingSet;});
  await checkbox().click();await checkbox().waitFor();assert.equal(await checkbox().isChecked(),true);
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await card.screenshot({path:'.env.report-sinking.png'});
  // Renderer-only status fixtures; no database writes or fake clock in production.
  for(const [status,days,text] of [
   ['not-near-period-end',6,'Rekomendasi tersedia mulai 5 hari sebelum periode berakhir.'],
   ['no-eligible-pockets',0,'Belum ada pocket spendable aktif yang memenuhi syarat.'],
   ['no-positive-balance',0,'Belum ada saldo positif pada pocket yang memenuhi syarat.'],
   ['available',0,'Tidak ada saldo positif yang disertakan dalam rekomendasi ini.'],
  ]){
   await prev.click();await card.getByText(/Rekomendasi historis belum tersedia/).waitFor();
   const edge=structuredClone(initial);Object.assign(edge.sinkingFund,{status,daysRemaining:days,suggestedAmount:0});
   if(status==='no-eligible-pockets')edge.sinkingFund.candidates=[];
   else edge.sinkingFund.candidates=edge.sinkingFund.candidates.map(c=>({...c,isExcluded:status==='available',eligibleAmount:status==='no-positive-balance'?0:c.eligibleAmount,currentBalance:status==='no-positive-balance'?-100:c.currentBalance}));
   await page.route(path,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(edge)}),{times:1});
   await next.click();await card.getByText(text,{exact:true}).waitFor();
   if(days===0)await card.getByText('Hari terakhir periode',{exact:true}).waitFor();
   if(status==='available')assert.equal(await card.getByRole('checkbox',{checked:false}).count(),initial.sinkingFund.candidates.length);
  }
  await page.evaluate(()=>{
   const key=Object.keys(localStorage).find(k=>k.startsWith('pocketflow-connected-sinking-exclusions-v1:'));
   if(!key)throw new Error('Missing persisted preference');
   localStorage.setItem(key,'{broken');
  });
  await page.reload();await card.waitFor();
  await panel.getByRole('alert').filter({hasText:'Pilihan pengecualian lokal tidak dapat dibaca'}).waitFor();
  assert.equal(await checkbox().isChecked(),true);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: exclusion GET/reconciliation/persistence, stale response across navigation, storage failure, statuses/final day, mobile/console, no server writes');
 }finally{release();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
