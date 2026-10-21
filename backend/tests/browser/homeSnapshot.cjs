const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const home=page.getByRole('region',{name:'Ringkasan Beranda server'});await home.waitFor();
  assert.equal(await home.getByText('Rp1.532.000',{exact:true}).count(),2);
  const expected=await page.evaluate(async()=>{const {loadMasterData}=await import('/src/lib/api/masterData.ts');const {SessionClient}=await import('/src/lib/api/sessionClient.ts');const {homeSnapshot,jakartaDate}=await import('/src/lib/api/homeSnapshot.ts');return homeSnapshot(await loadMasterData(new SessionClient()),jakartaDate());});
  const money=n=>'Rp'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  assert.equal(await home.locator('dl > div').filter({has:page.getByText('Aman per hari',{exact:true})}).locator('dd').innerText(),money(expected.safePerDay));
  await home.getByRole('button',{name:'Sembunyikan nominal Beranda'}).click();
  assert.equal(await home.getByText('••••••••',{exact:true}).count(),3);
  assert.equal((await home.innerText()).includes('Rp'),false);
  assert.equal(await home.getByRole('button',{name:'Tampilkan nominal Beranda'}).getAttribute('aria-pressed'),'true');
  await home.getByRole('button',{name:'Tampilkan nominal Beranda'}).click();
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await home.screenshot({path:'.env.home-snapshot.png'});
  // UI-only unknown balance fixture: never substitute zero for missing server money.
  await page.route('**/v1/reports/current-period',async route=>{const response=await route.fetch(),body=await response.json();body.pocketBudgetActuals[0].currentBalance=null;await route.fulfill({response,body:JSON.stringify(body)});},{times:1});
  await page.getByRole('button',{name:'Muat ulang',exact:true}).click();await home.getByText('Belum tersedia',{exact:true}).first().waitFor();
  assert.equal(await home.getByText('Belum tersedia',{exact:true}).count(),3);
  await page.getByRole('button',{name:'Muat ulang',exact:true}).click();await home.getByText('Rp1.532.000',{exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  console.log('PASS: server total/spendable/daily, Home-only privacy, unknown balances, refresh, mobile and console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
