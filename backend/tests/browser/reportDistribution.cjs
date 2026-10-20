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
  const panel=page.getByRole('region',{name:'Export periode server'});
  const categories=panel.getByRole('region',{name:'Distribusi kategori server'});
  const pockets=panel.getByRole('region',{name:'Distribusi pocket pembayaran server'});
  await categories.getByText('MRT',{exact:true}).waitFor();
  assert.equal(await categories.getByText('-Rp18.000',{exact:true}).count(),1);
  await pockets.getByText('NFC Card',{exact:true}).waitFor();
  assert.equal(await pockets.getByText('-Rp18.000',{exact:true}).count(),1);
  assert.equal(await pockets.getByText('Transportation',{exact:true}).count(),0);
  assert.equal(await pockets.getByText('100% dari total',{exact:true}).count(),1);
  const current=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  const date=new Date(current.period.startDate+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()-1);
  const previous=date.toISOString().slice(0,10);
  const prev=panel.getByRole('button',{name:'Periode export sebelumnya'}),next=panel.getByRole('button',{name:'Periode export berikutnya'});
  await prev.click();
  await categories.getByText('Belum ada pengeluaran untuk dibagi per kategori.').waitFor();
  await pockets.getByText('Belum ada pocket dengan pengeluaran pada periode ini.').waitFor();
  assert.equal(await categories.locator('svg').count(),0);
  await next.click();await categories.getByText('MRT',{exact:true}).waitFor();
  // Presentation fixture only: historical analytics do not require allocation snapshots.
  await page.route('**/v1/reports/periods/'+previous,async route=>{
   const response=await route.fetch(),body=await response.json();
   const id=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
   const row=(amount,i)=>({id:id(i+1),label:`Kategori ${i+1}`,emoji:null,isMetadataMissing:false,isCurrentlyActive:true,amount,transactionCount:1,percentage:amount/18000*100});
   body.totals={...body.totals,totalExpense:18000,netCashFlow:-18000,transactionCount:7,expenseCount:7};
   body.categories=[6000,4000,3000,2000,1500,1000,500].map(row);
   body.categories[0].id=null;body.categories[0].label='Tanpa kategori';
   body.categories[1].label='Kategori dengan nama panjang untuk pemeriksaan tampilan responsif';
   body.paymentPockets=[6000,4000,3000,2000,2000,1000].map((amount,i)=>({...row(amount,i),label:`Pocket ${i+1}`}));
   body.paymentPockets[0].label='Cash';body.paymentPockets[1].label='NFC Card';
   body.paymentPockets[2]={...body.paymentPockets[2],label:'Pocket tidak tersedia',isMetadataMissing:true,isCurrentlyActive:false};
   await route.fulfill({response,body:JSON.stringify(body)});
  },{times:1});
  await prev.click();await categories.getByText('Lainnya',{exact:true}).waitFor();
  await categories.getByText('Tanpa kategori',{exact:true}).waitFor();
  assert.equal(await categories.getByText('-Rp1.500',{exact:true}).count(),2);
  assert.equal(await categories.getByText('2 transaksi',{exact:true}).count(),1);
  assert.equal(await categories.locator('svg circle').count(),6);
  assert.equal(await categories.getByText('Kategori 6',{exact:true}).count(),0);
  await pockets.getByText('Pocket tidak tersedia',{exact:true}).waitFor();
  assert.equal(await pockets.getByText('Pocket 6',{exact:true}).count(),0);
  await pockets.getByText('33% dari total',{exact:true}).waitFor();
  await panel.getByText(/Anggaran historis belum tersedia/).waitFor();
  for(const width of [375,390,430]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.setViewportSize({width:375,height:844});
  await categories.screenshot({path:'.env.report-distribution-category.png'});
  await pockets.screenshot({path:'.env.report-distribution-pocket.png'});
  assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: real expense-only category/payment pocket data; empty period; historical analytics; top-five/Other; null/missing labels; all-pocket denominator; responsive widths and console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
