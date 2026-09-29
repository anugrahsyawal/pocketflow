// Disposable sessionPreview.ts --with-pockets only; isolated headless profile.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],consoleErrors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({message:m.text(),url:m.location().url});});
  page.on('dialog',d=>d.type()==='beforeunload'?d.accept():d.dismiss());
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const open=async(action,name)=>{
      await page.getByRole('button',{name:`${action} pocket ${name}`,exact:true}).click();
      return page.getByRole('form',{name:`${action} pocket ${name}`,exact:true});
    };
    let mode='normal';
    await page.route('**/v1/pockets/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const body=route.request().postDataJSON();writes.push(body);
      if(mode==='lost'){mode='normal';assert.equal((await route.fetch()).status(),200);return route.abort('failed');}
      return route.continue();
    });
    let form=await open('Arsipkan','Transportation');
    assert.equal(await form.getByRole('button',{name:'Ya, arsipkan pocket'}).isDisabled(),true);
    assert.match(await form.innerText(),/NFC Card/);
    await form.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(writes.length,0);
    form=await open('Arsipkan','NFC Card');
    await fs.mkdir('dist/qa-pocket-archive',{recursive:true});
    await form.screenshot({path:'dist/qa-pocket-archive/archive-375.png'});
    mode='lost';await form.getByRole('button',{name:'Ya, arsipkan pocket'}).click();
    await form.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();
    await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();
    await page.getByRole('button',{name:'Pulihkan pocket NFC Card',exact:true}).waitFor();assert.deepEqual(writes[0],writes[1]);
    const archived=page.getByRole('region',{name:'Pocket diarsipkan',exact:true});
    await archived.getByText('Kategori tersimpan (1)',{exact:true}).click();await archived.getByText('🚇 MRT',{exact:true}).waitFor();
    assert.equal(await archived.getByRole('button',{name:'Edit kategori MRT',exact:true}).count(),0);
    form=await open('Arsipkan','Transportation');await form.getByRole('button',{name:'Ya, arsipkan pocket'}).click();
    await page.getByRole('button',{name:'Pulihkan pocket Transportation',exact:true}).waitFor();
    form=await open('Pulihkan','NFC Card');
    assert.equal(await form.getByRole('button',{name:'Ya, pulihkan pocket'}).isDisabled(),true);
    await form.getByLabel('Budget setelah dipulihkan').selectOption({label:'🍜 Food & Groceries'});
    await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();await form.waitFor();
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await form.screenshot({path:`dist/qa-pocket-archive/restore-${width}.png`});
    }
    await form.getByRole('button',{name:'Ya, pulihkan pocket'}).click();
    await page.getByRole('button',{name:'Arsipkan pocket NFC Card',exact:true}).waitFor();
    let card=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})});
    assert.match(await card.innerText(),/82\.000/);assert.match(await card.innerText(),/Food & Groceries/);
    // Restore valid retained mapping without sending an implicit replacement.
    form=await open('Arsipkan','NFC Card');await form.getByRole('button',{name:'Ya, arsipkan pocket'}).click();
    form=await open('Pulihkan','NFC Card');await form.getByRole('button',{name:'Ya, pulihkan pocket'}).click();
    await page.getByRole('button',{name:'Arsipkan pocket NFC Card',exact:true}).waitFor();
    assert.equal('budgetOwnerPocketId' in writes.at(-1),false);
    // Explicit fallback with uncertain committed result reconciles by reload.
    form=await open('Arsipkan','NFC Card');await form.getByRole('button',{name:'Ya, arsipkan pocket'}).click();
    form=await open('Pulihkan','NFC Card');await form.getByLabel('Budget setelah dipulihkan').selectOption('self');
    mode='lost';await form.getByRole('button',{name:'Ya, pulihkan pocket'}).click();await form.getByRole('alert').waitFor();
    assert.equal(await form.getByLabel('Budget setelah dipulihkan').isDisabled(),true);
    const count=writes.length;await page.reload();await page.getByRole('button',{name:'Arsipkan pocket NFC Card',exact:true}).waitFor();
    assert.equal(writes.length,count);assert.equal(writes.at(-1).budgetOwnerPocketId,null);
    assert.match(await card.innerText(),/pocket sendiri/);assert.match(await card.innerText(),/82\.000/);
    // Competing edit increments revision; stale lifecycle mutation must reload.
    await page.route('**/v1/pockets/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const body=route.request().postDataJSON();
      const rival=await route.fetch({postData:{clientMutationId:randomUUID(),expectedRevision:body.expectedRevision,name:'NFC Baru'}});
      assert.equal(rival.status(),200);return route.continue();
    });
    form=await open('Arsipkan','NFC Card');await form.getByRole('button',{name:'Ya, arsipkan pocket'}).click();
    await form.getByRole('alert').filter({hasText:'Pocket berubah'}).waitFor();
    assert.equal(await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).count(),0);
    await form.getByRole('button',{name:'Muat data server'}).click();await page.getByRole('button',{name:'Arsipkan pocket NFC Baru',exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await open('Arsipkan','NFC Baru');await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors.filter(({message,url})=>!message.includes('401 (Unauthorized)')&&!message.includes('409 (Conflict)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    console.log('PASS dependency block; cancel; archive/retry; archived categories; invalid owner; replacement/keep/self restore; session/reload/conflict; balances; mobile; logout/storage/console');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
