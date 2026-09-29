// Disposable sessionPreview.ts --with-pockets; fresh browser profile only.
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
  const output=path.resolve('dist/qa-category-edit');await fs.mkdir(output,{recursive:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
    if(m.type()==='warning')warnings.push(m.text());
    if(m.type()==='error')consoleErrors.push({message:m.text(),url:m.location().url});
  });
  page.on('dialog',dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss());
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const nfc=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Card',exact:true})});
    await nfc.waitFor();
    const expand=async()=>{if(!await nfc.locator('details').getAttribute('open')){
      if(!await nfc.locator('details').evaluate(el=>el.open))await nfc.locator('summary').click();
    }};
    const reveal=async name=>{
      // Wait for canonical refreshed content before opening its disclosure.
      // The previous article can briefly remain mounted while reload begins.
      await nfc.getByRole('button',{name:`Edit kategori ${name}`,exact:true,includeHidden:true}).waitFor({state:'attached'});
      await expand();
      await nfc.getByRole('button',{name:`Edit kategori ${name}`,exact:true}).waitFor();
    };
    const open=async name=>{await reveal(name);await nfc.getByRole('button',{name:`Edit kategori ${name}`,exact:true}).click();};
    let form=page.getByRole('form',{name:'Edit kategori MRT',exact:true});
    await open('MRT');
    assert.equal(await form.getByRole('button',{name:'Simpan kategori'}).isDisabled(),true);
    await form.getByLabel('Nama kategori').fill('   ');
    await form.getByRole('button',{name:'Simpan kategori'}).click();
    await form.getByRole('alert').filter({hasText:'Isian tidak boleh hanya spasi'}).waitFor();
    await form.getByLabel('Nama kategori').fill('MRT Kota');
    await form.getByLabel('Emoji kategori').fill('🚆');
    assert.equal(await form.getByRole('alert').count(),0);
    await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();
    await form.waitFor();assert.equal(await form.getByLabel('Nama kategori').inputValue(),'MRT Kota');
    check('blank validation, no-op disabled, session check preserves draft');
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await nfc.screenshot({path:path.join(output,`edit-${width}.png`)});
    }
    check('mobile layout screenshots and no overflow');
    await form.getByRole('button',{name:'Batal',exact:true}).click();
    await open('MRT');assert.equal(await form.getByLabel('Nama kategori').inputValue(),'MRT');
    await form.getByLabel('Nama kategori').fill('  MRT Kota  ');await form.getByLabel('Emoji kategori').fill('🚆');
    let mode='lost';const writes=[];
    await page.route('**/v1/categories/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const body=route.request().postDataJSON();writes.push(body);
      if(mode==='conflict'){
        mode='normal';const rival=await route.fetch({postData:{...body,clientMutationId:randomUUID(),name:'Label Server'}});
        assert.equal(rival.status(),200);return route.continue();
      }
      if(mode==='lost'){
        mode='normal';const response=await route.fetch();assert.equal(response.status(),200);return route.abort('failed');
      }
      return route.continue();
    });
    await form.getByRole('button',{name:'Simpan kategori'}).click();
    await form.getByRole('alert').filter({hasText:'Hasil penyimpanan belum pasti'}).waitFor();
    assert.equal(await form.getByLabel('Nama kategori').isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Muat ulang',exact:true}).isDisabled(),true);
    await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();
    await reveal('MRT Kota');
    assert.deepEqual(writes[0],writes[1]);assert.equal(writes.length,2);assert.equal(writes[0].name,'MRT Kota');
    assert.match(await nfc.innerText(),/82\.000/);
    check('cancel discards unsent draft; lost response retry is identical and canonical label updates');
    await open('MRT Kota');form=page.getByRole('form',{name:'Edit kategori MRT Kota',exact:true});
    await form.getByLabel('Nama kategori').fill('My edit');mode='conflict';
    await form.getByRole('button',{name:'Simpan kategori'}).click();
    await form.getByRole('alert').filter({hasText:'Kategori berubah di server'}).waitFor();
    assert.equal(await form.getByRole('button',{name:'Coba ulang permintaan yang sama'}).count(),0);
    await form.getByRole('button',{name:'Muat data server'}).click();
    await nfc.waitFor();await open('Label Server');form=page.getByRole('form',{name:'Edit kategori Label Server',exact:true});
    assert.equal(await form.getByLabel('Nama kategori').inputValue(),'Label Server');
    check('real revision conflict is reload-only and preserves newer label');
    await form.getByLabel('Nama kategori').fill('MRT Final');mode='lost';
    await form.getByRole('button',{name:'Simpan kategori'}).click();await form.getByRole('alert').waitFor();
    const count=writes.length;await page.reload();await reveal('MRT Final');assert.equal(writes.length,count);
    assert.match(await nfc.innerText(),/82\.000/);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    check('reload reconciles uncertain committed edit without another PATCH or local writes');
    await open('MRT Final');await page.getByRole('button',{name:'Keluar dari server',exact:true}).click();
    await page.getByLabel('Email',{exact:true}).waitFor();assert.equal(await page.getByRole('form',{name:/Edit kategori/}).count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
    assert.deepEqual(consoleErrors.filter(({message,url})=>!message.includes('401 (Unauthorized)')&&!message.includes('409 (Conflict)')&&!message.includes('net::ERR_FAILED')&&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))),[]);
    check('logout clears editor; no unexpected console errors');
    await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors,warnings,consoleErrors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
