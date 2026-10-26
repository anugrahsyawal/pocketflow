// Real writes: dedicated disposable sessionPreview database only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 assert.equal(process.env.PREVIEW_MUTATIONS,'1');
 const url=process.env.PREVIEW_URL||'http://127.0.0.1:5175';
 assert.equal(new URL(url).hostname,'127.0.0.1');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),writes=[],errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(url);
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const home=page.getByRole('region',{name:'Ringkasan Beranda server'}),entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  await home.getByText('Rp1.532.000',{exact:true}).first().waitFor();
  const note='Navigation recovery '+Date.now();
  const nav=page.getByRole('navigation',{name:'Navigasi server'});
  await nav.getByRole('button',{name:'Tambah transaksi',exact:true}).click();
  await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  await entry.getByLabel('Pocket pembayaran',{exact:true}).selectOption({label:'💳 NFC Card'});
  await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1000');
  await entry.getByLabel('Catatan pengeluaran',{exact:true}).fill(note);
  let lose=true;
  await page.route('**/v1/transactions',async route=>{
   if(route.request().method()!=='POST')return route.continue();
   writes.push(route.request().postDataJSON());
   if(lose){lose=false;assert.equal((await route.fetch()).status(),201);return route.abort('failed');}
   return route.continue();
  });
  await entry.getByRole('button',{name:'Simpan pengeluaran server',exact:true}).click();
  await entry.getByRole('alert').filter({hasText:'Hasil belum pasti'}).waitFor();
  const journal=()=>page.evaluate(async()=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
   const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
   const owner=await new SessionClient().me();return new TransactionAttemptStore().read(owner.id);
  });
  const pending=await journal();assert.ok(pending);assert.equal(writes.length,1);
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Detail NFC Card',exact:true}).click();
  const detail=page.getByRole('dialog',{name:'Detail NFC Card',exact:true});
  await detail.waitFor();
  await page.goBack();await detail.waitFor({state:'hidden'});
  await page.goForward();await detail.waitFor();
  assert.deepEqual(await journal(),pending);assert.equal(writes.length,1);
  // Reload with detail open must recover the same durable attempt, not send it.
  await page.reload();await detail.waitFor();
  assert.deepEqual(await journal(),pending);assert.equal(writes.length,1);
  await page.keyboard.press('Escape');await detail.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Periksa permintaan transaksi',exact:true}).click();
  const resume=entry.getByRole('button',{name:'Lanjutkan pengeluaran yang sama'});
  await resume.waitFor();assert.equal(await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).count(),0);
  await resume.click();
  await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();
  assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(await journal(),null);
  const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true});
  await nav.getByRole('button',{name:'Riwayat',exact:true}).click();
  await history.getByText(note,{exact:true}).waitFor();assert.equal(await history.getByText(note,{exact:true}).count(),1);
  const found=await page.evaluate(async note=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().listTransactions({search:note});
  },note);assert.equal(found.transactions.length,1);
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Detail NFC Card',exact:true}).click();
  await detail.getByText('Rp81.000',{exact:true}).waitFor();
  await page.keyboard.press('Escape');await detail.waitFor({state:'hidden'});
  // A committed edit with a lost response must also survive navigation unchanged.
  const patches=[];let loseEdit=true;
  const transactionId=found.transactions[0].id;
  await page.route(`**/v1/transactions/${transactionId}`,async route=>{
   if(route.request().method()!=='PATCH')return route.continue();
   patches.push(route.request().postDataJSON());
   if(loseEdit){loseEdit=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}
   return route.continue();
  });
  await nav.getByRole('button',{name:'Riwayat',exact:true}).click();
  await history.locator('li').filter({has:page.getByText(note,{exact:true})}).getByRole('button',{name:'Edit transaksi',exact:true}).click();
  const edit=page.getByRole('form',{name:'Form edit transaksi'});
  await edit.getByLabel('Nominal edit',{exact:true}).fill('2000');
  await edit.getByRole('button',{name:'Tinjau perubahan'}).click();
  await page.getByRole('button',{name:'Konfirmasi simpan perubahan'}).click();
  const recovery=page.getByRole('region',{name:'Pemulihan arsip dan pulihkan',exact:true});
  await recovery.getByRole('button',{name:'Coba lagi permintaan yang sama'}).waitFor();
  const pendingEdit=await journal();assert.equal(pendingEdit.operation,'edit');
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  assert.equal(await home.isVisible(),false);
  assert.deepEqual(await journal(),pendingEdit);assert.equal(patches.length,1);
  await page.reload();await recovery.getByText('Permintaan edit tertunda',{exact:true}).waitFor();
  assert.deepEqual(await journal(),pendingEdit);assert.equal(patches.length,1);
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  await recovery.getByRole('button',{name:'Coba lagi permintaan yang sama'}).click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[aria-label="Navigasi server"] button')).length===5&&Array.from(document.querySelectorAll('[aria-label="Navigasi server"] button')).every(b=>!b.disabled));
  assert.equal(patches.length,2);assert.deepEqual(patches[0],patches[1]);assert.equal(await journal(),null);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[aria-label="Navigasi server"] button')).every(b=>!b.disabled));
  const edited=await page.evaluate(async note=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().listTransactions({search:note});
  },note);
  assert.equal(edited.transactions.length,1);assert.equal(edited.transactions[0].amount,2000);
  assert.equal(edited.transactions[0].revision,found.transactions[0].revision+1);
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Detail NFC Card',exact:true}).click();
  await detail.getByText('Rp80.000',{exact:true}).waitFor();
  await page.keyboard.press('Escape');await detail.waitFor({state:'hidden'});
  const archives=[];let loseArchive=true;
  const archivePath=`/v1/transactions/${transactionId}/archive`;
  await page.route(`**${archivePath}`,async route=>{
   archives.push(route.request().postDataJSON());
   if(loseArchive){loseArchive=false;assert.equal((await route.fetch()).status(),200);return route.abort('failed');}
   return route.continue();
  });
  await nav.getByRole('button',{name:'Riwayat',exact:true}).click();
  await history.locator('li').filter({has:page.getByText(note,{exact:true})}).getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();
  await page.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();
  await recovery.getByRole('button',{name:'Coba lagi permintaan yang sama'}).waitFor();
  const pendingArchive=await journal();assert.equal(pendingArchive.operation,'archive');
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  assert.equal(await home.isVisible(),false);
  assert.deepEqual(await journal(),pendingArchive);assert.equal(archives.length,1);
  await page.reload();await recovery.getByText('Permintaan arsip tertunda',{exact:true}).waitFor();
  assert.deepEqual(await journal(),pendingArchive);assert.equal(archives.length,1);
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  await recovery.getByRole('button',{name:'Coba lagi permintaan yang sama'}).click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[aria-label="Navigasi server"] button')).length===5&&Array.from(document.querySelectorAll('[aria-label="Navigasi server"] button')).every(b=>!b.disabled));
  assert.equal(archives.length,2);assert.deepEqual(archives[0],archives[1]);
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByText('Rp1.532.000',{exact:true}).first().waitFor();
  const archived=await page.evaluate(async note=>{
   const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().listTransactions({search:note,includeArchived:true});
  },note);
  assert.equal(archived.transactions.length,1);assert.equal(archived.transactions[0].isArchived,true);
  assert.equal(archived.transactions[0].revision,edited.transactions[0].revision+1);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[aria-label="Navigasi server"] button')).every(b=>!b.disabled));
  assert.equal(await journal(),null);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401')&&!((e.url.endsWith('/v1/transactions')||e.url.endsWith(`/v1/transactions/${transactionId}`)||e.url.endsWith(archivePath))&&e.text.includes('ERR_FAILED'))&&!((e.url.includes('fonts.googleapis.com')||e.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(e.text))),[]);
  console.log('PASS: create/edit/archive lost responses survive navigation/reload; explicit identical retries; one row and single revision per mutation; active total restored');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
