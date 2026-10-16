const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {randomUUID}=require('node:crypto');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),url:m.location().url});});
  try{
    await page.goto('http://127.0.0.1:5174');await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const region=page.getByRole('region',{name:'Riwayat transaksi server',exact:true});
    await region.getByText('Halaman 1 dari 1 · 2 transaksi sesuai filter',{exact:true}).waitFor();
    assert.equal(await region.locator('li').count(),2);assert.match(await region.innerText(),/Budget: Transportation/);
    const apply=()=>region.getByRole('button',{name:'Terapkan filter'}).click();
    await region.getByLabel('Jenis transaksi',{exact:true}).selectOption('income');await apply();await region.getByText('Tidak ada transaksi sesuai filter.',{exact:true}).waitFor();
    await region.getByLabel('Jenis transaksi',{exact:true}).selectOption('expense');await apply();await region.getByText('Halaman 1 dari 1 · 1 transaksi sesuai filter',{exact:true}).waitFor();
    await region.getByLabel('Tanggal mulai',{exact:true}).fill('2026-10-10');await region.getByLabel('Tanggal akhir',{exact:true}).fill('2026-09-01');await apply();await region.getByRole('alert').filter({hasText:'Periksa rentang'}).waitFor();
    await region.getByRole('button',{name:'Reset filter'}).click();await region.getByText('Halaman 1 dari 1 · 2 transaksi sesuai filter',{exact:true}).waitFor();
    const base=await page.evaluate(async()=>{const r=await fetch('/v1/transactions');return r.json();});
    const rows=Array.from({length:51},(_,i)=>({...base.transactions[0],id:randomUUID(),note:`Pagination item ${i+1}`}));
    let mode='pages',release,started;
    let slowStarted=new Promise(resolve=>{started=resolve;});
    await page.route('**/v1/transactions?*',async route=>{
      const url=new URL(route.request().url()),p=Number(url.searchParams.get('page')||1);
      if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'UNAVAILABLE'}})});
      if(mode==='race'&&url.searchParams.get('search')==='slow'){started();await new Promise(resolve=>{release=resolve;});return route.fulfill({json:{transactions:[{...rows[0],note:'STALE ROW'}],pagination:{page:1,limit:50,total:1,totalPages:1,hasMore:false}}});}
      if(mode==='race')return route.fulfill({json:{transactions:[{...rows[1],note:'LATEST ROW'}],pagination:{page:1,limit:50,total:1,totalPages:1,hasMore:false}}});
      return route.fulfill({json:{transactions:rows.slice((p-1)*50,p*50),pagination:{page:p,limit:50,total:51,totalPages:2,hasMore:p<2}}});
    });
    await region.getByRole('button',{name:'Muat ulang riwayat'}).click();await region.getByText('Halaman 1 dari 2 · 51 transaksi sesuai filter',{exact:true}).waitFor();
    await region.getByRole('button',{name:'Berikutnya',exact:true}).click();await region.getByText('Pagination item 51',{exact:true}).waitFor();assert.equal(await region.locator('li').count(),1);
    await region.getByRole('button',{name:'Sebelumnya',exact:true}).click();await region.getByText('Pagination item 1',{exact:true}).waitFor();
    mode='error';await region.getByRole('button',{name:'Muat ulang riwayat'}).click();await region.getByRole('alert').filter({hasText:'Riwayat belum ditampilkan'}).waitFor();assert.equal(await region.locator('li').count(),0);
    mode='race';await region.getByLabel('Cari catatan',{exact:true}).fill('slow');await apply();await slowStarted;
    await region.getByLabel('Cari catatan',{exact:true}).fill('fast');await apply();await region.getByText('LATEST ROW',{exact:true}).waitFor();
    const oldResponse=page.waitForResponse(r=>r.url().includes('search=slow'));release();await oldResponse;
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await region.getByText('STALE ROW',{exact:true}).count(),0);await region.getByText('LATEST ROW',{exact:true}).waitFor();
    await fs.mkdir('dist/qa-transaction-history',{recursive:true});
    for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await region.screenshot({path:`dist/qa-transaction-history/history-${width}.png`});}
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();assert.equal(await region.count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors.filter(e=>!e.text.includes('401 (Unauthorized)')&&!e.text.includes('503 (Service Unavailable)')&&
      !(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
    console.log('PASS live filters/labels/empty; invalid dates; simulated pagination/error/stale response; mobile; logout/storage/console');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
