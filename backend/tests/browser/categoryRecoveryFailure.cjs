// Fresh browser profile; disposable preview database only. No category POST expected.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage(),errors=[];let posts=0;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/v1/categories'))posts++;});
  const login=async()=>{
    await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
    await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
    await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  };
  try{
    await page.goto('http://127.0.0.1:5174');await login();
    await page.getByRole('button',{name:'Tambah kategori baru',exact:true}).click();
    await page.getByLabel('Nama kategori baru').fill('Session interrupted');
    await page.route('**/v1/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:{code:'UNAUTHENTICATED'}})}));
    await page.getByRole('button',{name:'Simpan kategori baru'}).click();await page.getByLabel('Email',{exact:true}).waitFor();
    assert.equal(posts,0);await page.unroute('**/v1/me');await login();
    await page.getByRole('button',{name:'Lanjutkan permintaan yang sama'}).waitFor();
    const owner=await page.evaluate(async()=> (await(await fetch('/v1/me')).json()).user.id);
    // Deliberately corrupt only this isolated browser's journal to verify fail-closed UI.
    await page.evaluate(owner=>new Promise((resolve,reject)=>{
      const req=indexedDB.open('pocketflow-connected-category-attempts',1);
      req.onsuccess=()=>{const db=req.result,tx=db.transaction('attempts','readwrite');
        tx.objectStore('attempts').put({ownerId:owner,version:999,body:{name:'corrupt'}});
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
      req.onerror=()=>reject(req.error);
    }),owner);
    await page.reload();await page.getByRole('alert').filter({hasText:'tidak tersedia atau rusak'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Tambah kategori baru',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Lanjutkan permintaan yang sama'}).count(),0);
    await page.getByRole('button',{name:'Periksa penyimpanan',exact:true}).click();assert.equal(posts,0);
    assert.deepEqual(errors,[]);console.log('PASS 401 before dispatch retains attempt; login recovery; corrupt journal fails closed without POST');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
