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
  const panel=page.getByRole('region',{name:'Export periode server'}),insights=panel.getByRole('region',{name:'Insight periode server'});
  await insights.getByRole('heading',{name:'Defisit arus kas',exact:true}).waitFor();
  await insights.getByText('MRT menyumbang 100% dari seluruh pengeluaran periode terpilih (Rp18.000).',{exact:true}).waitFor();
  const current=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  assert.equal(await insights.locator('h4').count(),current.insights.length);
  const prev=panel.getByRole('button',{name:'Periode export sebelumnya'}),next=panel.getByRole('button',{name:'Periode export berikutnya'});
  await prev.click();await insights.getByText('Belum cukup data untuk membuat insight.').waitFor();
  assert.equal(await insights.locator('h4').count(),0);
  const date=new Date(current.period.startDate+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()-1);const previous=date.toISOString().slice(0,10);
  const currentRoute='**/v1/reports/periods/'+current.period.startDate;
  // Presentation fixture: income-only valid surplus must not be hidden.
  const income=structuredClone(current);
  income.totals={...income.totals,totalIncome:25000,totalExpense:0,netCashFlow:25000,incomeCount:1,expenseCount:0};
  income.insights=[{id:'net-cash-flow:surplus',rule:'net-cash-flow',severity:'positive',pocketId:null,categoryId:null,weekNumber:null,amount:25000,percentage:null}];
  await page.route(currentRoute,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(income)}),{times:1});
  await next.click();await insights.getByRole('heading',{name:'Surplus arus kas',exact:true}).waitFor();
  await insights.getByText('Pemasukan melebihi pengeluaran sebesar Rp25.000 pada periode terpilih.').waitFor();
  assert.equal(await insights.getByText(/Belum cukup data/).count(),0);
  // Historical analytics do not need budget snapshots; no current-budget advice.
  await page.route('**/v1/reports/periods/'+previous,async route=>{
   const response=await route.fetch(),body=await response.json();
   body.categories=current.categories;body.totals=current.totals;body.insights=current.insights;
   await route.fulfill({response,body:JSON.stringify(body)});
  },{times:1});
  await prev.click();await insights.getByRole('heading',{name:'Defisit arus kas'}).waitFor();
  assert.equal(await insights.getByText('Pemakaian budget mencapai batas',{exact:true}).count(),0);
  // Renderer fixtures never write financial data or establish backend eligibility.
  const edge=structuredClone(current),transport=edge.pocketBudgetActuals.find(p=>p.label==='Transportation');
  const base={pocketId:null,categoryId:null,weekNumber:null,amount:18000,percentage:120};
  edge.insights=[
   {...base,id:'overbudget-pocket:'+transport.id,rule:'overbudget-pocket',severity:'critical',pocketId:transport.id},
   {...base,id:'running-week-warning:2',rule:'running-week-warning',severity:'warning',weekNumber:2,percentage:75},
   {...base,id:'category-concentration:none',rule:'category-concentration',severity:'info',percentage:60},
  ];
  await page.route(currentRoute,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(edge)}),{times:1});
  await next.click();await insights.getByText('Budget Transportation telah terpakai 120%, dengan pengeluaran Rp18.000.').waitFor();
  assert.deepEqual(await insights.locator('h4').allTextContents(),['Pemakaian budget mencapai batas','Perhatikan pemakaian minggu berjalan','Kategori pengeluaran terbesar']);
  await insights.getByText('Minggu 2 telah memakai 75% target mingguan, dengan pengeluaran Rp18.000.').waitFor();
  await insights.getByText('Tanpa kategori menyumbang 60% dari seluruh pengeluaran periode terpilih (Rp18.000).').waitFor();
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await insights.screenshot({path:'.env.report-insights.png'});
  assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: real category/deficit facts, empty historical, income-only surplus, historical analytics, ordered three rules and driver labels, mobile and console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
