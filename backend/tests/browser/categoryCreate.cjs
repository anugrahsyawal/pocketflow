// Isolated headless browser and disposable sessionPreview.ts --with-pockets only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:375,height:844}});
  const page=await context.newPage(),errors=[],consoleErrors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({message:m.text(),url:m.location().url});});
  const section=page.getByRole('region',{name:'Tambah kategori server',exact:true});
  const login=async()=>{
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  };
  const draft=async name=>{
    await section.getByRole('button',{name:'Tambah kategori baru',exact:true}).click();
    await section.getByLabel('Pocket kategori').selectOption({label:'💳 NFC Card'});
    await section.getByLabel('Nama kategori baru').fill(name);
    await section.getByLabel('Emoji kategori baru').fill('🚌');
  };
  const journal=()=>page.evaluate(async()=>{
    const {CategoryAttemptStore}=await import('/src/lib/api/categoryAttempt.ts');
    const {user}=await(await fetch('/v1/me')).json();return new CategoryAttemptStore().read(user.id);
  });
  const show=async name=>{
    const button=page.getByRole('button',{name:`Edit kategori ${name}`,exact:true,includeHidden:true});
    await button.waitFor({state:'attached'});
    await section.getByRole('button',{name:'Tambah kategori baru',exact:true}).waitFor();
  };
  try {
    await page.goto('http://127.0.0.1:5174');await login();
    await page.evaluate(()=>localStorage.setItem('legacy-test-sentinel','unchanged'));
    let lose=true;
    await page.route('**/v1/categories',async route=>{
      if(route.request().method()!=='POST')return route.continue();
      writes.push(route.request().postDataJSON());
      if(lose){lose=false;assert.equal((await route.fetch()).status(),201);return route.abort('failed');}
      return route.continue();
    });
    await draft('Bus Kota');
    await fs.mkdir('dist/qa-category-create',{recursive:true});
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await section.screenshot({path:`dist/qa-category-create/form-${width}.png`});
    }
    await section.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(writes.length,0);
    await draft('Bus Kota');await section.getByRole('button',{name:'Simpan kategori baru'}).click();
    await section.getByRole('alert').filter({hasText:'Hasil belum'}).waitFor();
    const saved=await journal();assert.deepEqual(saved.body,writes[0]);
    await page.reload();await section.getByRole('button',{name:'Lanjutkan permintaan yang sama'}).waitFor();assert.equal(writes.length,1);
    const second=await context.newPage();await second.goto('http://127.0.0.1:5174');
    await second.getByRole('button',{name:'Lanjutkan permintaan yang sama'}).waitFor();
    assert.equal(await second.getByRole('button',{name:'Tambah kategori baru',exact:true}).count(),0);await second.close();
    await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
    assert.equal(await section.count(),0);await login();await section.getByRole('button',{name:'Lanjutkan permintaan yang sama'}).click();
    await show('Bus Kota');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(await journal(),null);
    console.log('PASS cancel; lost acknowledgement; durable reload; second tab; logout/login; identical replay; cleanup');
    // Failure to save before dispatch must prevent any POST.
    await draft('Storage blocked');
    await page.evaluate(()=>{window.originalOpen=indexedDB.open.bind(indexedDB);indexedDB.open=()=>{throw new Error('test unavailable');};});
    await section.getByRole('button',{name:'Simpan kategori baru'}).click();await section.getByRole('alert').filter({hasText:'Penyimpanan pemulihan gagal'}).waitFor();assert.equal(writes.length,2);
    await page.reload();await draft('Cleanup retry');
    await page.evaluate(()=>{window.originalDelete=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(){throw new Error('test cleanup failed');};});
    await section.getByRole('button',{name:'Simpan kategori baru'}).click();await section.getByRole('alert').filter({hasText:'Kategori tersimpan'}).waitFor();
    assert.equal(writes.length,3);assert.ok(await journal());
    await page.reload();await section.getByRole('button',{name:'Lanjutkan permintaan yang sama'}).click();await show('Cleanup retry');
    assert.equal(writes.length,4);assert.deepEqual(writes[2],writes[3]);assert.equal(await journal(),null);
    console.log('PASS storage failure blocks POST; cleanup failure retains original identity');
    // Native IndexedDB transactions serialize different tab attempts for one owner.
    const ids=await page.evaluate(()=>({owner:crypto.randomUUID(),other:crypto.randomUUID(),pocket:crypto.randomUUID(),a:crypto.randomUUID(),b:crypto.randomUUID()}));
    const secondStorePage=await context.newPage();await secondStorePage.goto('http://127.0.0.1:5174');
    const prepare=async({owner,pocket,id})=>{
      const {CategoryAttemptStore}=await import('/src/lib/api/categoryAttempt.ts');
      return new CategoryAttemptStore().prepare({version:1,ownerId:owner,body:{clientMutationId:id,pocketId:pocket,name:'Race',emoji:'🚌'}});
    };
    const results=await Promise.all([page.evaluate(prepare,{owner:ids.owner,pocket:ids.pocket,id:ids.a}),secondStorePage.evaluate(prepare,{owner:ids.owner,pocket:ids.pocket,id:ids.b})]);
    assert.equal(results.filter(r=>r.created).length,1);assert.deepEqual(results[0].record,results[1].record);
    const checks=await page.evaluate(async({ids,record})=>{
      const {CategoryAttemptStore}=await import('/src/lib/api/categoryAttempt.ts');const store=new CategoryAttemptStore();
      const hidden=await store.read(ids.other);let rejected=false;
      try{await store.acknowledge({...record,body:{...record.body,clientMutationId:crypto.randomUUID()}});}catch{rejected=true;}
      const retained=await store.read(ids.owner);await store.acknowledge(record);return {hidden,rejected,retained};
    },{ids,record:results[0].record});
    assert.equal(checks.hidden,null);assert.equal(checks.rejected,true);assert.deepEqual(checks.retained,results[0].record);await secondStorePage.close();
    console.log('PASS atomic two-tab prepare; owner isolation; stale cleanup cannot erase another attempt');
    const all=await page.evaluate(async()=> (await(await fetch('/v1/categories')).json()).categories);
    assert.equal(all.filter(c=>c.name==='Bus Kota').length,1);assert.equal(all.filter(c=>c.name==='Cleanup retry').length,1);
    assert.equal(await page.evaluate(()=>localStorage.getItem('legacy-test-sentinel')),'unchanged');
    assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors.filter(({message,url})=>!message.includes('401 (Unauthorized)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    console.log('PASS no duplicate categories; legacy storage untouched; no unexpected console/page errors');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
