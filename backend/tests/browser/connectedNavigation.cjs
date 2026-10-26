const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const nav=page.getByRole('navigation',{name:'Navigasi server'});await nav.waitFor();
  page.on('request',r=>{if(['POST','PATCH','DELETE','PUT'].includes(r.method()))writes.push(r.url());});
  for(const [label,id] of [['Beranda','server-home'],['Pocket','server-pocket-list'],['Tambah transaksi','server-entry'],['Riwayat','server-history'],['Laporan','server-reports']]){
    await nav.getByRole('button',{name:label,exact:true}).click();
    assert.equal(await page.locator('#'+id).evaluate(el=>el===document.activeElement),true);
    assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('aria-current'),'page');
    for(const other of ['server-home','server-pocket-list','server-entry','server-history','server-reports'])assert.equal(await page.locator('#'+other).isVisible(),other===id);
  }
  const home=page.getByRole('region',{name:'Ringkasan Beranda server'});
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Sembunyikan nominal Beranda'}).click();
  await nav.getByRole('button',{name:'Riwayat',exact:true}).click();
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('button',{name:'Tampilkan nominal Beranda'}).waitFor();
  await home.getByRole('link',{name:'Lihat riwayat',exact:true}).click();
  await page.locator('#server-history').waitFor({state:'visible'});
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await home.getByRole('link',{name:'Lihat riwayat',exact:true}).click();
  await page.locator('#server-history').waitFor({state:'visible'});
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  const entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true});
  await nav.getByRole('button',{name:'Tambah transaksi',exact:true}).click();
  await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1234');
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  assert.equal(await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).inputValue(),'1234');
  await entry.getByRole('button',{name:'Batal',exact:true}).click();
  await nav.getByRole('button',{name:'Pocket',exact:true}).click();
  await page.getByRole('button',{name:'Edit pocket Transportation',exact:true}).click();
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  const management=page.getByRole('region',{name:'Pocket dan pengaturan',exact:true});
  const category=management.getByRole('region',{name:'Tambah kategori server',exact:true});
  await nav.getByRole('button',{name:'Pocket',exact:true}).click();
  assert.equal(await management.evaluate(el=>el===document.activeElement),true);
  assert.equal(await category.isVisible(),true);
  await category.getByRole('button',{name:'Tambah kategori baru',exact:true}).click();
  await category.getByLabel('Nama kategori baru',{exact:true}).fill('Draft tanpa kirim');
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  assert.equal(await management.getByRole('button',{name:'Edit pocket Transportation',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Muat ulang',exact:true}).isDisabled(),true);
  await category.getByRole('button',{name:'Batal',exact:true}).click();
  for(const label of ['Atur budget Cash','Atur budget NFC Card','Arsipkan pocket Cash','Koreksi saldo awal Transportation','Atur klasifikasi Transportation']){
    await management.getByRole('button',{name:label,exact:true}).click();
    for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
    assert.equal(await category.getByRole('button',{name:'Tambah kategori baru',exact:true}).isDisabled(),true);
    await management.getByRole('button',{name:'Batal',exact:true}).click();
    for(const button of await nav.getByRole('button').all())assert.equal(await button.isEnabled(),true);
  }
  for(const width of [375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:844});await nav.screenshot({path:'.env.connected-navigation.png'});
  await nav.getByRole('button',{name:'Beranda',exact:true}).click();
  await page.screenshot({path:'.env.connected-screens.png'});
  // Isolated browser journals only: no financial request is submitted.
  const seeded=await page.evaluate(async()=>{
    const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
    const {loadMasterData}=await import('/src/lib/api/masterData.ts');
    const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
    const {CategoryAttemptStore}=await import('/src/lib/api/categoryAttempt.ts');
    const client=new SessionClient(),owner=await client.me(),data=await loadMasterData(client);
    const transaction={version:1,ownerId:owner.id,operation:'create',body:{clientMutationId:crypto.randomUUID(),type:'expense',pocketId:data.pockets[0].id,amount:1000,occurredOn:'2026-10-25',occurredAtLocalTime:'12:00'}};
    const category={version:1,ownerId:owner.id,body:{clientMutationId:crypto.randomUUID(),pocketId:data.pockets[0].id,name:'Unsent screen fixture',emoji:'🏷️'}};
    await new TransactionAttemptStore().prepare(transaction);await new CategoryAttemptStore().prepare(category);
    return {transaction,category};
  });
  await page.reload();
  await page.getByRole('button',{name:'Periksa permintaan transaksi',exact:true}).click();
  await entry.getByRole('button',{name:'Lanjutkan pengeluaran yang sama',exact:true}).waitFor();
  await page.getByRole('button',{name:'Periksa permintaan kategori',exact:true}).click();
  await category.getByRole('button',{name:'Lanjutkan permintaan yang sama',exact:true}).waitFor();
  const stored=await page.evaluate(async ownerId=>{
    const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
    const {CategoryAttemptStore}=await import('/src/lib/api/categoryAttempt.ts');
    return {transaction:await new TransactionAttemptStore().read(ownerId),category:await new CategoryAttemptStore().read(ownerId)};
  },seeded.transaction.ownerId);
  assert.deepEqual(stored,seeded);
  await page.evaluate(async records=>{
    const {TransactionAttemptStore}=await import('/src/lib/api/transactionAttempt.ts');
    const {CategoryAttemptStore}=await import('/src/lib/api/categoryAttempt.ts');
    const {SessionClient}=await import('/src/lib/api/sessionClient.ts');
    await new TransactionAttemptStore().acknowledge(records.transaction);await new CategoryAttemptStore().acknowledge(records.category);
    const rows=await new SessionClient().listTransactions({page:1,limit:1});
    const row=rows.transactions[0];if(!row)throw new Error('Active transaction fixture required');
    await new TransactionAttemptStore().prepare({version:1,ownerId:records.transaction.ownerId,operation:'archive',transactionId:row.id,body:{clientMutationId:crypto.randomUUID(),expectedRevision:row.revision}});
  },seeded);
  await page.reload();
  await page.locator('#server-history').waitFor({state:'visible'});
  await page.getByText('Permintaan arsip tertunda',{exact:true}).waitFor();
  for(const button of await nav.getByRole('button').all())assert.equal(await button.isDisabled(),true);
  assert.equal(await page.locator('#server-home').isVisible(),false);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(logs.filter(e=>!e.text.includes('401')&&!((e.url.includes('fonts.googleapis.com')||e.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(e.text))),[]);
  console.log('PASS: five section targets/focus, category included, privacy, draft/category/wallet/archive/opening/classification locks and cancellation, mobile, console, no writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
