// Only run against the disposable sessionPreview fixture, never a personal profile.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const region=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  const open=()=>region.getByRole('button',{name:'Tambah transfer server',exact:true}).click();
  const submit=()=>region.getByRole('button',{name:'Simpan transfer server',exact:true}).click();
  const report=()=>page.evaluate(async()=>{const r=await fetch('/v1/reports/current-period');if(!r.ok)throw new Error('report');return r.json();});
  const row=(r,name)=>{const found=r.pocketBudgetActuals.find(p=>p.label===name);assert.ok(found,`Missing report pocket ${name}`);return found;};
  const budgets=r=>r.pocketBudgetActuals.map(p=>({id:p.id,budget:p.budget}));
  const neutral=(a,b)=>{for(const key of ['totalIncome','totalExpense','netCashFlow'])assert.equal(a.totals[key],b.totals[key]);assert.equal(a.pocketBudgetActuals.reduce((s,p)=>s+p.currentBalance,0),b.pocketBudgetActuals.reduce((s,p)=>s+p.currentBalance,0));};
  const choose=async(from,to,type,amount,note)=>{await open();await region.getByLabel('Pocket asal',{exact:true}).selectOption({label:from});await region.getByLabel('Pocket tujuan',{exact:true}).selectOption({label:to});await region.getByRole('button',{name:type,exact:true}).click();await region.getByLabel('Nominal transfer (rupiah)',{exact:true}).fill(amount);await region.getByLabel('Catatan transfer',{exact:true}).fill(note);};
  const ready=()=>region.getByRole('button',{name:'Tambah transfer server',exact:true}).waitFor();
  await ready();const before=await report();
  await open();await region.getByLabel('Nominal transfer (rupiah)',{exact:true}).fill('1000');await submit();await region.getByRole('alert').filter({hasText:'berbeda'}).waitFor();
  await region.getByLabel('Pocket asal',{exact:true}).selectOption({label:'🚆 Transportation'});await region.getByLabel('Pocket tujuan',{exact:true}).selectOption({label:'💳 NFC Card'});
  // A subsequent source change can make the retained destination equal: explicit guard still applies.
  await region.getByLabel('Pocket asal',{exact:true}).selectOption({label:'💳 NFC Card'});await submit();await region.getByRole('alert').filter({hasText:'berbeda'}).waitFor();
  await region.getByRole('button',{name:'Batal',exact:true}).click();
  await choose('🚆 Transportation','💳 NFC Card','Top up NFC','99999999','Transfer UI recovery');await submit();await region.getByRole('alert').filter({hasText:'melebihi saldo'}).waitFor();
  await region.getByLabel('Nominal transfer (rupiah)',{exact:true}).fill('1000');
  await fs.mkdir('dist/qa-transfer-create',{recursive:true});for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await region.screenshot({path:`dist/qa-transfer-create/form-${width}.png`});}
  let lose=true;await page.route('**/v1/transactions',async route=>{if(route.request().method()!=='POST')return route.continue();writes.push(route.request().postDataJSON());if(lose){lose=false;assert.equal((await route.fetch()).status(),201);return route.abort('failed');}return route.continue();});
  await submit();await region.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();await page.reload({waitUntil:'domcontentloaded'});await region.getByRole('button',{name:'Lanjutkan transfer yang sama',exact:true}).waitFor();assert.equal(writes.length,1);
  await region.getByText('Pocket: Transportation → NFC Card',{exact:true}).waitFor();await region.getByText('Jenis: Top up NFC',{exact:true}).waitFor();
  await region.getByRole('button',{name:'Lanjutkan transfer yang sama',exact:true}).click();await ready();assert.deepEqual(writes[0],writes[1]);
  for(const key of ['pocketId','categoryId','incomeSource','budgetPocketId'])assert.equal(key in writes[0],false);
  const topped=await report();neutral(before,topped);assert.deepEqual(budgets(before),budgets(topped));assert.equal(row(topped,'Transportation').currentBalance,99000);assert.equal(row(topped,'NFC Card').currentBalance,83000);
  const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true});await history.getByText('Transfer UI recovery',{exact:true}).waitFor();assert.equal(await history.getByText('Transfer UI recovery',{exact:true}).count(),1);
  await choose('🍜 Food & Groceries','💵 Cash','Tarik Tunai','2000','Cash withdrawal');await submit();await ready();
  const withdrawn=await report();neutral(before,withdrawn);assert.deepEqual(budgets(before),budgets(withdrawn));assert.equal(row(withdrawn,'Cash').currentBalance,52000);
  for(const type of ['Transfer biasa','Reimbursement','Alokasi tabungan']){await choose('🍜 Food & Groceries','💵 Cash',type,'1000',type);await submit();await ready();}
  const standard=await report();neutral(before,standard);assert.deepEqual(budgets(before),budgets(standard));
  await choose('🍜 Food & Groceries','🚆 Transportation','Pindah Alokasi Budget','30000','Reallocation UI');await region.getByText(/periode 26–25/).waitFor();await submit();await ready();
  const reallocated=await report();neutral(before,reallocated);assert.equal(row(reallocated,'Food & Groceries').budget.revisedAllocation,1270000);assert.equal(row(reallocated,'Transportation').budget.revisedAllocation,230000);
  assert.equal(row(reallocated,'Food & Groceries').currentBalance,row(standard,'Food & Groceries').currentBalance-30000);assert.equal(row(reallocated,'Transportation').currentBalance,row(standard,'Transportation').currentBalance+30000);
  // Real server allocation-floor rejection: NFC has balance but allocation zero.
  await choose('💳 NFC Card','💵 Cash','Pindah Alokasi Budget','1000','Rejected allocation');await submit();await region.getByRole('alert').filter({hasText:'INSUFFICIENT_ALLOCATION'}).waitFor();
  await region.getByRole('button',{name:'Hentikan permintaan ini',exact:true}).click();await region.getByRole('button',{name:'Konfirmasi penghentian',exact:true}).click();await ready();
  const final=await report();assert.deepEqual(final.totals,reallocated.totals);assert.deepEqual(budgets(final),budgets(reallocated));neutral(final,reallocated);
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('422 (Unprocessable Entity)')&&!e.text.includes('net::ERR_FAILED')&&!(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
  console.log('PASS transfer guards/all six types; top-up/withdrawal balances; neutral cash flow and total money; unchanged standard allocation; reallocation and real floor rejection; lost response/reload/retry; cancellation; mobile/console/storage');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
