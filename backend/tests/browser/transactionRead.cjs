// Dedicated disposable preview fixture; transport smoke, not history UI acceptance.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage(),errors=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),url:m.location().url});});
  try {
    await page.goto('http://127.0.0.1:5174');
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
    await page.getByRole('heading',{name:'NFC Card',exact:true}).waitFor();
    const result=await page.evaluate(async()=>{
      const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
      const client=new SessionClient();
      const first=await client.listTransactions({limit:1}),second=await client.listTransactions({limit:1,page:2});
      return {first,second,storage:Object.keys(localStorage)};
    });
    assert.equal(result.first.pagination.total,2);assert.equal(result.first.pagination.hasMore,true);
    assert.equal(result.second.pagination.hasMore,false);assert.notEqual(result.first.transactions[0].id,result.second.transactions[0].id);
    assert.deepEqual(result.storage,[]);assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors.filter(e=>!e.text.includes('401 (Unauthorized)')&&
      !(e.text.includes('net::ERR_NETWORK_ACCESS_DENIED')&&/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(e.url))),[]);
    console.log('PASS browser module loading, authenticated paginated GET, independent rows, local storage and console');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
