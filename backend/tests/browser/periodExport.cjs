// Read-only CSV UI checks on the dedicated disposable preview fixture.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],downloads=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 page.on('download',d=>downloads.push(d));
 page.on('request',r=>{if(r.url().includes('/v1/transactions/export'))requests.push(r);});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const panel=page.getByRole('region',{name:'Export periode server'}),button=panel.getByRole('button',{name:'Export CSV',exact:true});await button.waitFor();
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});
  const ready=page.waitForEvent('download');await button.click();const download=await ready;
  assert.match(download.suggestedFilename(),/^pocketflow-transactions_\d{4}-\d{2}-26_to_\d{4}-\d{2}-25\.csv$/);
  const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const bytes=Buffer.concat(chunks),csv=bytes.toString('utf8');
  assert.deepEqual([...bytes.subarray(0,3)],[239,187,191]);assert.ok(csv.includes('"NFC Card"'));assert.ok(csv.includes('"top-up-nfc"'));assert.ok(csv.includes('"18000"'));
  await panel.getByRole('status').filter({hasText:'CSV lengkap'}).waitFor();
  await panel.screenshot({path:'.env.period-export.png'});
  await panel.getByRole('button',{name:'Periode export sebelumnya'}).click();await button.click();
  await panel.getByRole('status').filter({hasText:'Tidak ada transaksi aktif'}).waitFor();assert.equal(downloads.length,1);
  await panel.getByRole('button',{name:'Periode export berikutnya'}).click();
  let blocked,release;const received=new Promise(r=>blocked=r),gate=new Promise(r=>release=r);
  await page.route('**/v1/transactions/export?**',async route=>{blocked();await gate;await route.continue();},{times:1});
  const before=requests.length,nextDownload=page.waitForEvent('download');await button.click();await received;
  assert.equal(await button.isDisabled(),true);assert.equal(await panel.getByRole('button',{name:'Periode export sebelumnya'}).isDisabled(),true);
  release();await nextDownload;await panel.getByRole('status').filter({hasText:'CSV lengkap'}).waitFor();assert.equal(requests.length,before+1);
  await page.route('**/v1/transactions/export?**',route=>route.abort('failed'),{times:1});await button.click();
  await panel.getByRole('alert').filter({hasText:'Tidak ada file yang diunduh'}).waitFor();assert.equal(downloads.length,2);
  assert.equal(errors.length,0,JSON.stringify(errors));
  const unexpected=logs.filter(x=>!x.text.includes('401')&&!x.text.includes('ERR_FAILED')&&!((x.url.includes('fonts.googleapis.com')||x.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(x.text)));
  assert.deepEqual(unexpected,[]);console.log('PASS: complete CSV download/BOM, period navigation, empty period, in-flight lock, network failure, mobile widths, console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
