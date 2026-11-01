// Disposable browser context. Auth writes only; no financial mutations.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&!/\/v1\/auth\/(login|logout)$/.test(new URL(r.url()).pathname))writes.push(r.url());});
 const login=async(password='Disposable-preview-123!')=>{
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
 };
 const session=page.getByRole('region',{name:'Sesi server',exact:true});
 const home=page.getByRole('region',{name:'Ringkasan Beranda server',exact:true});
 const summary=session.locator('summary');
 const openSession=async()=>{if(!await session.locator('details').evaluate(el=>el.open))await summary.click();};
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await login('Invalid-password-only-for-QA');await session.getByRole('alert').waitFor();
  assert.equal(await home.count(),0);
  await login();await home.waitFor();
  assert.equal(await session.locator('details').evaluate(el=>el.open),false);
  assert.equal(await session.getByRole('button',{name:'Keluar dari server',exact:true}).isVisible(),false);
  await summary.focus();await page.keyboard.press('Enter');
  await session.getByRole('button',{name:'Periksa sesi',exact:true}).click();await home.waitFor();
  assert.equal(await session.locator('details').evaluate(el=>el.open),true);
  await summary.click();
  for(const width of [375,390,430,1280]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'.env.connected-shell.png'});
  const nav=page.getByRole('navigation',{name:'Navigasi server'});
  await nav.getByRole('button',{name:'Pocket',exact:true}).click();
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  const last=page.getByRole('region',{name:'Pocket dan pengaturan',exact:true}).getByRole('button').last();
  assert.ok((await last.boundingBox()).y+(await last.boundingBox()).height<=(await nav.boundingBox()).y);
  const pending=await page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const {loadMasterData}=await import('/src/lib/api/masterData.ts');
   const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const client=new SessionClient(),owner=await client.me(),data=await loadMasterData(client);
   const record={version:1,ownerId:owner.id,operation:'create',body:{clientMutationId:crypto.randomUUID(),type:'expense',pocketId:data.pockets[0].id,amount:1000,occurredOn:'2026-10-26',occurredAtLocalTime:'12:00'}};
   await new TransactionAttemptStore().prepare(record);return record;
  });
  const journal=()=>page.evaluate(async ownerId=>{const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');return new TransactionAttemptStore().read(ownerId);},pending.ownerId);
  await page.reload();await page.getByRole('button',{name:'Periksa permintaan transaksi',exact:true}).waitFor();
  await openSession();await session.getByRole('button',{name:'Keluar dari server',exact:true}).click();
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).waitFor();
  assert.equal(await home.count(),0);assert.deepEqual(await journal(),pending);
  await login();await page.getByRole('button',{name:'Periksa permintaan transaksi',exact:true}).click();
  await page.getByRole('button',{name:'Lanjutkan pengeluaran yang sama',exact:true}).waitFor();
  assert.deepEqual(await journal(),pending);
  await page.route('**/v1/me',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE'}})}));
  await openSession();await session.getByRole('button',{name:'Periksa sesi',exact:true}).click();
  await session.getByRole('alert').waitFor();assert.equal(await home.isVisible(),false);
  await page.unroute('**/v1/me');await session.getByRole('button',{name:'Periksa sesi',exact:true}).click();
  await page.getByRole('button',{name:'Lanjutkan pengeluaran yang sama',exact:true}).waitFor();
  await page.route('**/v1/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:{code:'UNAUTHENTICATED'}})}));
  await session.getByRole('button',{name:'Periksa sesi',exact:true}).click();
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).waitFor();
  assert.equal(await home.count(),0);assert.deepEqual(await journal(),pending);
  await page.unroute('**/v1/me');await login();
  await page.getByRole('button',{name:'Periksa permintaan transaksi',exact:true}).click();
  await page.getByRole('button',{name:'Lanjutkan pengeluaran yang sama',exact:true}).waitFor();
  assert.deepEqual(await journal(),pending);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!(/401|503/.test(e.text)&&/\/v1\/(me|auth\/login)$/.test(new URL(e.url||'http://localhost').pathname))&&!((e.url.includes('fonts.googleapis.com')||e.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(e.text))),[]);
  console.log('PASS: invalid/valid login, compact keyboard session controls, widths/footer, session failure/expiry, logout/relogin preserve owner journal; no financial writes');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
