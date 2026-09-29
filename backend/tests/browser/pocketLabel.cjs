// Disposable sessionPreview.ts --with-pockets, fresh headless profile only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],consoleErrors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({message:m.text(),url:m.location().url});});
  page.on('dialog',dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss());
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const edit=async name=>page.getByRole('button',{name:`Edit pocket ${name}`,exact:true}).click();
    await edit('NFC Card');
    let form=page.getByRole('form',{name:'Edit pocket NFC Card',exact:true});
    assert.equal(await form.getByRole('button',{name:'Simpan pocket'}).isDisabled(),true);
    await form.getByLabel('Nama pocket').fill('   ');
    await form.getByRole('button',{name:'Simpan pocket'}).click();await form.getByRole('alert').waitFor();
    await form.getByLabel('Nama pocket').fill('Kartu Saya');await form.getByLabel('Emoji pocket').fill('🚆');
    await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();await form.waitFor();
    assert.equal(await form.getByLabel('Nama pocket').inputValue(),'Kartu Saya');
    await fs.mkdir('dist/qa-pocket-label',{recursive:true});
    await form.screenshot({path:'dist/qa-pocket-label/form-375.png'});
    await form.getByRole('button',{name:'Batal',exact:true}).click();
    await edit('NFC Card');assert.equal(await form.getByLabel('Nama pocket').inputValue(),'NFC Card');
    await form.getByLabel('Nama pocket').fill('Kartu Saya');
    let mode='lost';
    await page.route('**/v1/pockets/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const body=route.request().postDataJSON();writes.push(body);
      if(mode==='lost'){mode='normal';assert.equal((await route.fetch()).status(),200);return route.abort('failed');}
      if(mode==='conflict'){mode='normal';assert.equal((await route.fetch({postData:{...body,clientMutationId:randomUUID(),name:'Kartu Server'}})).status(),200);}
      return route.continue();
    });
    await form.getByRole('button',{name:'Simpan pocket'}).click();await form.getByRole('alert').filter({hasText:'belum pasti'}).waitFor();
    assert.equal(await form.getByLabel('Nama pocket').isDisabled(),true);
    await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();
    await edit('Kartu Saya');assert.deepEqual(writes[0],writes[1]);
    form=page.getByRole('form',{name:'Edit pocket Kartu Saya',exact:true});
    const card=page.locator('article').filter({has:form});
    assert.match(await card.innerText(),/82\.000/);assert.match(await card.innerText(),/Transportation/);
    await card.getByRole('button',{name:'Atur budget Kartu Saya',exact:true}).waitFor();
    await form.getByLabel('Nama pocket').fill('My change');mode='conflict';
    await form.getByRole('button',{name:'Simpan pocket'}).click();await form.getByRole('alert').filter({hasText:'Pocket berubah'}).waitFor();
    assert.equal(await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).count(),0);
    await form.getByRole('button',{name:'Muat data server'}).click();await edit('Kartu Server');
    form=page.getByRole('form',{name:'Edit pocket Kartu Server',exact:true});
    await form.getByLabel('Nama pocket').fill('NFC Card');mode='lost';
    await form.getByRole('button',{name:'Simpan pocket'}).click();await form.getByRole('alert').waitFor();
    const count=writes.length;await page.reload();await edit('NFC Card');assert.equal(writes.length,count);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors.filter(({message,url})=>!message.includes('401 (Unauthorized)')&&!message.includes('409 (Conflict)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    console.log('PASS no-op/blank/cancel; session draft; identical retry; conflict reload-only; reload without PATCH; wallet role/balance; mobile; local storage; logout; console');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
