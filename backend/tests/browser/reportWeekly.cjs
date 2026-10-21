const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const panel=page.getByRole('region',{name:'Export periode server'}),weekly=panel.getByRole('region',{name:'Pemakaian mingguan server'});
  await weekly.waitFor();
  assert.equal(await weekly.getByText(/Belum diatur. Alokasi periode belum lengkap/).count(),4);
  assert.equal(await weekly.getByRole('progressbar').count(),0);
  await weekly.getByText('Rp18.000',{exact:true}).waitFor();
  const current=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  assert.equal(current.weeklyUsage.reduce((sum,w)=>sum+w.expense,0),current.totals.totalExpense);
  assert.equal(current.totals.totalExpense,18000);
  for(const w of current.weeklyUsage){
   const section=weekly.getByRole('region',{name:`Minggu ${w.weekNumber}`,exact:true});
   const date=v=>new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(v+'T00:00:00Z'));
   await section.getByText(`${date(w.startDate)} – ${date(w.endDate)}`,{exact:true}).waitFor();
  }
  const prev=panel.getByRole('button',{name:'Periode export sebelumnya'}),next=panel.getByRole('button',{name:'Periode export berikutnya'});
  await prev.click();await weekly.getByText(/Target historis belum tersedia/).first().waitFor();
  assert.equal(await weekly.getByText(/Target historis belum tersedia/).count(),4);
  assert.equal(await weekly.getByRole('progressbar').count(),0);
  assert.equal(await weekly.getByText('Target mingguan',{exact:true}).count(),0);
  // Presentation-only values: no allocations or ledger records are changed.
  const edge=structuredClone(current);
  const expenses=[18000,0,0,0],states=['selesai','berjalan','akan-datang','akan-datang'];
  edge.weeklyUsage.forEach((w,i)=>Object.assign(w,{
   temporalState:states[i],availability:'available',expense:expenses[i],
   allowance:{numerator:60001,denominator:4},remaining:{numerator:60001-4*expenses[i],denominator:4},
   usageRatio:4*expenses[i]/60001,status:i===0?'overbudget':'aman',
  }));
  await page.route('**/v1/reports/periods/'+current.period.startDate,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(edge)}),{times:1});
  await next.click();await weekly.getByText('Overbudget',{exact:true}).waitFor();
  assert.equal(await weekly.getByText('Rp15.000,25',{exact:true}).count(),7);
  await weekly.getByText('-Rp2.999,75',{exact:true}).waitFor();
  await weekly.getByText('120% terpakai',{exact:true}).waitFor();
  assert.equal(await weekly.getByRole('progressbar').first().getAttribute('aria-valuenow'),'100');
  await weekly.getByText('Selesai',{exact:true}).waitFor();await weekly.getByText('Berjalan',{exact:true}).waitFor();
  assert.equal(await weekly.getByText('Akan datang',{exact:true}).count(),2);
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await weekly.screenshot({path:'.env.report-weekly.png'});
  await prev.click();await weekly.getByText(/Target historis belum tersedia/).first().waitFor();
  edge.weeklyUsage.forEach(w=>Object.assign(w,{allowance:{numerator:0,denominator:4},remaining:{numerator:-4*w.expense,denominator:4},usageRatio:null,status:'tanpa-alokasi'}));
  await page.route('**/v1/reports/periods/'+current.period.startDate,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(edge)}),{times:1});
  await next.click();await weekly.getByText('Tanpa alokasi',{exact:true}).first().waitFor();
  assert.equal(await weekly.getByText('Tanpa alokasi',{exact:true}).count(),4);
  assert.equal(await weekly.getByText(/Belum diatur/).count(),0);
  assert.equal(await weekly.getByRole('progressbar').count(),0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: real weekly expense reconciliation/dates, missing vs zero vs historical, precise fractions, overbudget, temporal states, mobile and console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
