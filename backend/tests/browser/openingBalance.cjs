// Disposable preview only; never use a personal browser profile.
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
  try{
    await page.goto('http://127.0.0.1:5174');await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const card=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})});
    const open=async()=>card.getByRole('button',{name:'Koreksi saldo awal NFC Card',exact:true}).click();
    const form=page.getByRole('form',{name:'Koreksi saldo awal NFC Card',exact:true});
    const input=()=>form.getByLabel('Saldo awal baru (rupiah)',{exact:true});
    const save=()=>form.getByRole('button',{name:'Simpan koreksi saldo awal',exact:true});
    await open();assert.equal(await save().isDisabled(),true);
    await input().fill('10000');assert.equal(await save().isDisabled(),true);
    await form.getByRole('checkbox').check();await input().fill('20000');assert.equal(await form.getByRole('checkbox').isChecked(),false);
    for(const invalid of ['','-1','1.5','1e3','10.000','9007199254740992']){await input().fill(invalid);assert.equal(await save().isDisabled(),true);}
    await form.getByRole('button',{name:'Batal',exact:true}).click();await open();assert.equal(await input().inputValue(),'0');
    await input().fill('10000');await form.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();await form.waitFor();assert.equal(await input().inputValue(),'10000');
    await fs.mkdir('dist/qa-opening-balance',{recursive:true});
    for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await form.screenshot({path:`dist/qa-opening-balance/form-${width}.png`});}
    let mode='lost';await page.route('**/v1/pockets/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const body=route.request().postDataJSON();writes.push(body);
      if(mode==='lost'){mode='normal';assert.equal((await route.fetch()).status(),200);return route.abort('failed');}
      if(mode==='conflict'){mode='normal';assert.equal((await route.fetch({postData:{...body,clientMutationId:randomUUID(),openingBalance:15000}})).status(),200);}
      return route.continue();
    });
    await save().click();await form.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();assert.equal(await input().isDisabled(),true);
    await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();await card.getByText('Rp92.000',{exact:true}).waitFor();assert.deepEqual(writes[0],writes[1]);assert.match(await card.innerText(),/Transportation/);
    await open();assert.equal(await input().inputValue(),'10000');await input().fill('20000');await form.getByRole('checkbox').check();mode='conflict';
    await save().click();await form.getByRole('alert').filter({hasText:'Pocket berubah'}).waitFor();assert.equal(await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).count(),0);
    await form.getByRole('button',{name:'Muat data server'}).click();await card.getByText('Rp97.000',{exact:true}).waitFor();
    await open();assert.equal(await input().inputValue(),'15000');await input().fill('0');await form.getByRole('checkbox').check();mode='lost';await save().click();await form.getByRole('alert').waitFor();
    const count=writes.length;await page.reload();await card.getByText('Rp82.000',{exact:true}).waitFor();assert.equal(writes.length,count);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors.filter(({message,url})=>!message.includes('401 (Unauthorized)')&&!message.includes('409 (Conflict)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    console.log('PASS confirmation/reset, validation, cancel, session draft, mobile, identical retry, conflict reload-only, reload without resend, canonical balance, logout/storage/console');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
