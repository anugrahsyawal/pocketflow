// Disposable sessionPreview --with-pockets only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='PATCH'&&r.url().includes('/transactions/'))writes.push(r.postDataJSON());});
 const history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true}),form=page.getByRole('form',{name:'Form edit transaksi'});
 const row=note=>history.locator('li').filter({has:page.getByText(note,{exact:true})});
 const save=async()=>{await form.getByRole('button',{name:'Tinjau perubahan'}).click();await page.getByRole('button',{name:'Konfirmasi simpan perubahan'}).click();};
 const state=()=>page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{loadMasterData}=await import('/src/lib/api/masterData.ts');const c=new SessionClient();return {data:await loadMasterData(c),transactions:(await c.listTransactions({includeArchived:true})).transactions};});
 try{
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();await history.getByText('Rp18.000',{exact:true}).waitFor();
  const initial=await state();
  await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{loadMasterData}=await import('/src/lib/api/masterData.ts');const c=new SessionClient(),o=await c.me(),data=await loadMasterData(c),t=(await c.listTransactions({type:'expense'})).transactions[0],cat=data.pockets.flatMap(p=>p.categories).find(v=>v.id===t.categoryId);await c.setCategoryArchived(cat.id,{clientMutationId:crypto.randomUUID(),expectedRevision:cat.revision,isArchived:true});});
  await page.reload();await history.locator('li').filter({has:page.getByText('Rp18.000',{exact:true})}).getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByLabel('Catatan edit').fill('Category cleared');
  const before=writes.length;await form.getByRole('button',{name:'Tinjau perubahan'}).click();await form.getByRole('alert').filter({hasText:'Kategori tersimpan sudah diarsipkan'}).waitFor();assert.equal(writes.length,before);
  await form.getByRole('button',{name:'Tanpa kategori',exact:true}).click();await save();await row('Category cleared').waitFor();const cleared=await state(),expense=cleared.transactions.find(t=>t.type==='expense');assert.equal(expense.categoryId,null);assert.equal(expense.budgetPocketId,initial.transactions.find(t=>t.type==='expense').budgetPocketId);
  // Archived transaction edit must not restore it or change the effective balance.
  await row('Category cleared').getByRole('button',{name:'Arsipkan transaksi'}).click();await page.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();await history.getByText('1 transaksi sesuai filter',{exact:false}).waitFor();
  const archived=await state();await history.getByLabel('Sertakan transaksi diarsipkan').check();await history.getByRole('button',{name:'Terapkan filter'}).click();await row('Category cleared').getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByLabel('Nominal edit').fill('19000');await form.getByLabel('Catatan edit').fill('Archived edited');await save();
  await page.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).waitFor();const edited=await state();assert.equal(edited.transactions.find(t=>t.id===expense.id).isArchived,true);assert.equal(edited.transactions.find(t=>t.id===expense.id).amount,19000);assert.deepEqual(edited.data.pockets.map(p=>p.currentBalance),archived.data.pockets.map(p=>p.currentBalance));
  // Reallocation amount/date/target edits must update canonical allocations only once.
  const transfer=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts'),{loadMasterData}=await import('/src/lib/api/masterData.ts');const c=new SessionClient(),o=await c.me(),d=await loadMasterData(c),food=d.pockets.find(p=>p.templateKey==='food-groceries'),transport=d.pockets.find(p=>p.templateKey==='transportation');return c.createTransaction({version:1,ownerId:o.id,operation:'create',body:{clientMutationId:crypto.randomUUID(),type:'transfer',fromPocketId:food.id,toPocketId:transport.id,transferType:'budget-reallocation',amount:30000,occurredOn:d.period.startDate,occurredAtLocalTime:'11:00',note:'Reallocation fixture'}});});
  await page.reload();await row('Reallocation fixture').getByRole('button',{name:'Edit transaksi',exact:true}).click();await form.getByLabel('Nominal edit').fill('20000');
  const day=new Date(transfer.occurredOn+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+1);await form.getByLabel('Tanggal edit').fill(day.toISOString().slice(0,10));await form.getByLabel('Catatan edit').fill('Reallocation edited');
  const cash=edited.data.pockets.find(p=>p.templateKey==='cash');await form.getByLabel('Pocket tujuan',{exact:true}).selectOption(cash.id);await save();await row('Reallocation edited').waitFor();
  const realloc=await state(),find=key=>realloc.data.pockets.find(p=>p.templateKey===key);assert.equal(find('transportation').allocation,200000);assert.equal(find('food-groceries').allocation,1280000);assert.equal(find('cash').allocation,20000);assert.equal(find('cash').currentBalance,70000);
  // Move into an unallocated period: server rejects, journal retains, stop is non-financial.
  await row('Reallocation edited').getByRole('button',{name:'Edit transaksi',exact:true}).click();const future=new Date(transfer.occurredOn+'T00:00:00Z');future.setUTCMonth(future.getUTCMonth()+1);await form.getByLabel('Tanggal edit').fill(future.toISOString().slice(0,10));await save();await page.getByRole('alert').filter({hasText:'Server menolak tindakan'}).waitFor();
  await page.getByRole('button',{name:'Hentikan permintaan edit'}).click();await page.getByRole('button',{name:'Konfirmasi penghentian riwayat'}).click();await row('Reallocation edited').waitFor();assert.deepEqual(await state(),realloc);
  // A fresh page with unavailable recovery storage must disable edits, never send.
  const count=writes.length;
  await page.addInitScript(()=>{IDBFactory.prototype.open=function(){throw new DOMException('Test storage unavailable','SecurityError');};});
  await page.reload();await page.getByRole('button',{name:'Periksa pemulihan riwayat'}).waitFor();
  assert.equal(await history.getByRole('button',{name:'Edit transaksi',exact:true}).first().isDisabled(),true);assert.equal(writes.length,count);
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS archived category preflight/explicit clearing; archived expense edit balance neutrality; reallocation amount/date/destination; cross-period rejection/fence/canonical invariants');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
