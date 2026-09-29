// Run only with sessionPreview.ts on its dedicated disposable database.
// Supply PLAYWRIGHT_MODULE_PATH when using the bundled workspace runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  const errors = [], warnings = [], consoleErrors = [];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{
    if(m.type()==='warning')warnings.push(m.text());
    if(m.type()==='error')consoleErrors.push({message:m.text(),url:m.location().url});
  });
  const output=path.resolve('dist/qa-7c2');
  await fs.mkdir(output,{recursive:true});
  const checks=[];
  const check=(name)=>{checks.push(name);console.log('PASS '+name);};
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    const setup=page.getByRole('region',{name:'Setup server',exact:true});
    await setup.waitFor();
    await page.getByRole('checkbox',{name:/Food & Groceries/}).uncheck();
    await page.getByRole('button',{name:'Tinjau setup'}).click();
    await page.getByRole('alert').filter({hasText:'Cash membutuhkan Food'}).waitFor();
    check('explicit companion validation');
    await page.getByRole('checkbox',{name:/Food & Groceries/}).check();
    await page.getByLabel('Saldo awal Cash (Rp)',{exact:true}).fill('30000');
    await page.getByLabel('Saldo awal NFC (Rp)',{exact:true}).fill('40000');
    await page.getByRole('button',{name:'Periksa sesi',exact:true}).click();
    await setup.waitFor();
    assert.equal(await page.getByLabel('Saldo awal Cash (Rp)',{exact:true}).inputValue(),'30000');
    check('session check preserves draft');
    await page.getByRole('button',{name:'Tinjau setup'}).click();
    await page.getByRole('heading',{name:'Konfirmasi 12 pocket'}).waitFor();
    for (const width of [375,390,430]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await setup.screenshot({path:path.join(output,`review-${width}.png`)});
    }
    check('review has no horizontal overflow at 375/390/430px');
    await page.getByRole('button',{name:'Ubah isian'}).click();
    assert.equal(await page.getByLabel('Saldo awal NFC (Rp)',{exact:true}).inputValue(),'40000');
    await page.getByRole('button',{name:'Tinjau setup'}).click();
    check('review/back preserves balances');
    // Real server commits; the browser loses the response. Retry must be identical.
    const sent=[], statuses=[];
    await page.route('**/v1/setup',async route=>{
      if(route.request().method()!=='PUT')return route.continue();
      sent.push(route.request().postData());
      const response=await route.fetch();
      statuses.push(response.status());
      if(sent.length===1){
        if(response.status()!==200)return route.fulfill({response});
        return route.abort('failed');
      }
      await route.fulfill({response});
    });
    await page.getByRole('button',{name:'Buat pocket di server'}).click();
    await page.getByRole('alert').filter({hasText:'Hasil penyimpanan belum dapat dipastikan'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Ubah isian'}).count(),0);
    await page.getByRole('button',{name:'Coba ulang permintaan yang sama'}).click();
    await page.locator('article').nth(11).waitFor();
    assert.equal(sent.length,2);assert.equal(sent[0],sent[1]);
    assert.deepEqual(statuses,[200,200]);
    assert.equal(await page.locator('article').count(),12);
    check('lost response retry reuses exact payload and produces 12 pockets once');
    const cash=page.locator('article').filter({has:page.getByRole('heading',{name:'Cash',exact:true})});
    assert.match(await cash.innerText(),/30\.000/);
    const nfc=page.locator('article').filter({has:page.getByRole('heading',{name:'NFC Transportation Card',exact:true})});
    assert.match(await nfc.innerText(),/40\.000/);
    await page.reload();
    await page.locator('article').nth(11).waitFor();
    assert.equal(await setup.count(),0);assert.equal(await page.locator('article').count(),12);
    assert.equal(sent.length,2);
    check('reload reconciles completed setup without another PUT');
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
    // Anonymous bootstrap 401 and deliberately aborted response are expected.
    assert.deepEqual(consoleErrors.filter(({message,url})=>
      !message.includes('401 (Unauthorized)') && !message.includes('net::ERR_FAILED') &&
      !(message.includes('net::ERR_NETWORK_ACCESS_DENIED') && /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url))
    ),[]);
    check('no local storage writes, uncaught errors or console warnings');
    await page.getByRole('button',{name:'Keluar dari server'}).click();
    await page.getByLabel('Email',{exact:true}).waitFor();
    assert.equal(await page.locator('article').count(),0);
    check('logout clears pocket view');
    await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors,warnings,consoleErrors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
