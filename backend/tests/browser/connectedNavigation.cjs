const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const nav=page.getByRole('navigation',{name:'Navigasi server'});await nav.waitFor();
  page.on('request',r=>{if(['POST','PATCH','DELETE','PUT'].includes(r.method()))writes.push(r.url());});
  for(const [label,id] of [['Beranda','server-home'],['Pocket','server-pocket-list'],['Tambah transaksi','server-entry'],['Riwayat','server-history'],['Laporan','server-reports']]){
    await nav.getByRole('button',{name:label,exact:true}).click();
    assert.equal(await page.locator('#'+id).evaluate(el=>el===document.activeElement),true);
  }
  const home=page.getByRole('region',{name:'Ringkasan Beranda server'});
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Sembunyikan nominal Beranda'}).click();
  await nav.getByRole('button',{name:'Riwayat',exact:true}).click();
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Tampilkan nominal Beranda'}).waitFor();
  const entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  await nav.getByRole('button',{name:'Tambah transaksi',exact:true}).click();
  await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1234');
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  assert.equal(await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).inputValue(),'1234');
  await entry.getByRole('button',{name:'Batal',exact:true}).click();
  await nav.getByRole('button',{name:'Pocket',exact:true}).click();
  await page.getByRole('button',{name:'Edit pocket Transportation',exact:true}).click();
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await nav.screenshot({path:'.env.connected-navigation.png'});
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401')&&!((e.url.includes('fonts.googleapis.com')||e.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(e.text))),[]);
  console.log('PASS: five section targets/focus, privacy preserved, draft/edit navigation locks, mobile, console, no writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
