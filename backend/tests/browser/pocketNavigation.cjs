const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],writes=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  // External fonts are not part of this navigation test; avoid environment-dependent CORS failures.
  await page.route(url=>['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname),route=>route.abort());
  const base=process.env.PREVIEW_URL||'http://127.0.0.1:5175';
  await page.goto(base);
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const home=page.getByRole('region',{name:'Ringkasan Beranda server'});
  await home.waitFor();
  page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
  const entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  const nav=page.getByRole('navigation',{name:'Navigasi server'});
  await home.getByRole('button',{name:'Sembunyikan nominal Beranda'}).click();
  await nav.getByRole('button',{name:'Tambah transaksi',exact:true}).click();
  await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  const amount=entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true});
  await amount.fill('1234');
  assert.equal(await nav.getByRole('button',{name:'Beranda',exact:true}).isDisabled(),true);
  assert.equal(await amount.inputValue(),'1234');
  await entry.getByRole('button',{name:'Batal',exact:true}).click();
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Detail NFC Card',exact:true}).click();
  const detail=page.getByRole('dialog',{name:'Detail NFC Card',exact:true});
  await detail.waitFor();
  const url=page.url();assert.match(url,/#\/pockets\/[a-f0-9-]+$/);
  assert.equal((await detail.innerText()).includes('Rp'),false);
  await page.goBack();await detail.waitFor({state:'hidden'});
  await page.goForward();await detail.waitFor();
  assert.equal((await detail.innerText()).includes('Rp'),false);
  await page.keyboard.press('Escape');await detail.waitFor({state:'hidden'});
  // A reload is a new document, not draft persistence; test it after navigation assertions.
  await page.goto(url);await detail.waitFor();
  await page.reload();await detail.waitFor();
  await detail.getByText('Rp82.000',{exact:true}).waitFor();
  await detail.screenshot({path:'.env.pocket-navigation.png'});
  await page.getByRole('button',{name:'Tutup dialog'}).click();await detail.waitFor({state:'hidden'});
  assert.equal(new URL(page.url()).hash,'');
  await page.goto(base+'/#/pockets/not-a-pocket');
  await page.getByRole('dialog',{name:'Pocket tidak tersedia'}).waitFor();
  assert.equal(await page.getByRole('dialog').locator('dd').count(),0);
  await page.getByRole('button',{name:'Tutup dialog'}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(new URL(page.url()).hash,'');
  // Browser-only archive fixture; do not mutate server pocket state.
  const pocketId=new URL(url).hash.split('/').pop();
  await page.route('**/v1/pockets?includeArchived=true',async route=>{
    const response=await route.fetch(),body=await response.json();
    const pocket=body.pockets.find(p=>p.id===pocketId);
    pocket.isArchived=true;pocket.isActive=false;
    await route.fulfill({response,body:JSON.stringify(body)});
  });
  await page.goto(url);
  await page.reload();
  await page.getByRole('dialog',{name:'Pocket tidak tersedia'}).waitFor();
  assert.equal(await page.getByRole('dialog').locator('dd').count(),0);
  await page.unroute('**/v1/pockets?includeArchived=true');
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(x=>!x.text.includes('401')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text))),[]);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>/usePocketStore|useAuthStore|useTransactionStore/.test(e.name))),false);
  console.log('PASS: URL, back/forward, draft navigation lock, privacy preservation, direct refresh, invalid ID, no writes/local stores');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
