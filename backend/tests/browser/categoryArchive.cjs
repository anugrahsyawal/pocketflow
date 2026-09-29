// Run against disposable sessionPreview.ts --with-pockets only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],consoleErrors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({message:m.text(),url:m.location().url});});
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const nfc=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})});
    const reveal=async name=>{
      await nfc.getByRole('button',{name,exact:true,includeHidden:true}).waitFor({state:'attached'});
      if(!await nfc.locator('details').evaluate(el=>el.open))await nfc.locator('summary').click();
      await nfc.getByRole('button',{name,exact:true}).click();
    };
    let lose=true;
    await page.route('**/v1/categories/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      writes.push(route.request().postDataJSON());
      if(lose){lose=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}
      return route.continue();
    });
    await reveal('Arsipkan kategori MRT');
    await page.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(writes.length,0);
    await reveal('Arsipkan kategori MRT');
    await fs.mkdir('dist/qa-category-archive',{recursive:true});
    await nfc.screenshot({path:'dist/qa-category-archive/confirm-375.png'});
    await page.getByRole('button',{name:'Ya, arsipkan',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();
    await page.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();
    await reveal('Pulihkan kategori MRT');assert.deepEqual(writes[0],writes[1]);
    assert.equal(writes.length,2);assert.match(await nfc.innerText(),/82\.000/);
    await nfc.screenshot({path:'dist/qa-category-archive/restore-375.png'});
    await page.getByRole('button',{name:'Ya, pulihkan',exact:true}).click();
    await reveal('Arsipkan kategori MRT');assert.equal(writes.length,3);
    assert.equal(writes[2].expectedRevision,2);assert.equal(writes[2].isArchived,false);
    assert.match(await nfc.innerText(),/82\.000/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors.filter(({message,url})=>!message.includes('401 (Unauthorized)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    console.log('PASS cancel; archive; identical lost-response retry; restore; canonical revision/balance; mobile overflow; local storage; console');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
