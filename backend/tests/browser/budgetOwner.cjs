// Disposable sessionPreview.ts --with-pockets only. No user browser profile.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[],warnings=[],consoleErrors=[],checks=[];
  const check=name=>{checks.push(name);console.log('PASS '+name);};
  const output=path.resolve('dist/qa-budget-owner');await fs.mkdir(output,{recursive:true});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='warning')warnings.push(message.text());
    if(message.type()==='error')consoleErrors.push({message:message.text(),url:message.location().url});
  });
  page.on('dialog',dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss());
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const nfc=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})});
    await nfc.waitFor();
    const open=()=>nfc.getByRole('button',{name:'Atur budget NFC Card',exact:true}).click();
    const form=page.getByRole('form',{name:'Atur budget NFC Card',exact:true});
    await open();
    const select=form.getByRole('combobox');
    const options=await select.locator('option').evaluateAll(rows=>rows.map(row=>({value:row.value,text:row.textContent})));
    const food=options.find(row=>row.text.includes('Food & Groceries')).value;
    const cash=options.find(row=>row.text.includes('Cash')).value;
    assert.equal(options[0].value,'');
    assert.ok(!options.some(row=>row.text.includes('NFC Card')));
    assert.equal(await form.getByRole('button',{name:'Simpan pengaturan'}).isDisabled(),true);
    await select.selectOption(food);
    await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();
    await form.waitFor();assert.equal(await select.inputValue(),food);
    check('valid options, no-op disabled, session check preserves edit');
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await nfc.screenshot({path:path.join(output,`form-${width}.png`)});
    }
    check('mobile overflow and screenshots');
    let mode='lost',writes=[];
    await page.route('**/v1/pockets/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const body=route.request().postDataJSON();writes.push(body);
      if(mode==='conflict'){
        mode='normal';
        const rival=await route.fetch({postData:{...body,clientMutationId:randomUUID(),budgetOwnerPocketId:cash}});
        assert.equal(rival.status(),200);
        return route.continue();
      }
      if(mode==='lost'){
        mode='normal';const response=await route.fetch();assert.equal(response.status(),200);
        return route.abort('failed');
      }
      return route.continue();
    });
    await form.getByRole('button',{name:'Simpan pengaturan'}).click();
    await form.getByRole('alert').waitFor();assert.equal(await select.isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Muat ulang',exact:true}).isDisabled(),true);
    await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();
    await nfc.getByRole('button',{name:'Atur budget NFC Card',exact:true}).waitFor();
    assert.deepEqual(writes[0],writes[1]);assert.equal(writes.length,2);
    assert.match(await nfc.innerText(),/Food & Groceries/);assert.match(await nfc.innerText(),/82\.000/);
    check('lost response locks edits; identical retry; canonical label and unchanged balance');
    await open();await select.selectOption('');mode='conflict';
    await form.getByRole('button',{name:'Simpan pengaturan'}).click();
    await form.getByRole('alert').filter({hasText:'Data berubah di server'}).waitFor();
    assert.equal(await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).count(),0);
    await form.getByRole('button',{name:'Muat data server'}).click();
    await nfc.getByRole('button',{name:'Atur budget NFC Card',exact:true}).waitFor();
    assert.match(await nfc.innerText(),/Cash/);
    check('real revision conflict is reload-only; newer server mapping preserved');
    await open();await select.selectOption('');mode='lost';
    await form.getByRole('button',{name:'Simpan pengaturan'}).click();
    await form.getByRole('alert').waitFor();const count=writes.length;
    await page.reload();await nfc.getByRole('button',{name:'Atur budget NFC Card',exact:true}).waitFor();
    assert.equal(writes.length,count);assert.match(await nfc.innerText(),/pocket sendiri/);
    assert.match(await nfc.innerText(),/82\.000/);
    check('reload after uncertain committed write reads explicit null without reissuing PATCH');
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
    assert.deepEqual(consoleErrors.filter(({message,url})=>
      !message.includes('401 (Unauthorized)')&&!message.includes('409 (Conflict)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    await open();await page.getByRole('button',{name:'Keluar dari server'}).click();
    await page.getByLabel('Email',{exact:true}).waitFor();assert.equal(await form.count(),0);
    check('no local persistence, no unexpected console errors, logout clears form');
    await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors,warnings,consoleErrors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
