// Explicit opt-in: real writes only against the disposable sessionPreview fixture.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 assert.equal(process.env.PREVIEW_MUTATIONS,'1','Set PREVIEW_MUTATIONS=1 only for disposable preview');
 const url=process.env.PREVIEW_URL||'http://127.0.0.1:5175';
 assert.equal(new URL(url).hostname,'127.0.0.1');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],logs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push({text:m.text(),url:m.location().url});});
 try{
  await page.goto(url);await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const home=page.getByRole('region',{name:'Ringkasan Beranda server'}),recent=home.getByRole('region',{name:'Transaksi terbaru Beranda'}),history=page.getByRole('region',{name:'Riwayat transaksi server',exact:true}),panel=page.getByRole('region',{name:'Export periode server'}),entry=page.getByRole('region',{name:'Tambah transaksi server',exact:true}),recovery=page.getByRole('region',{name:'Pemulihan arsip dan pulihkan',exact:true});
  await recent.getByText('-Rp18.000',{exact:true}).waitFor();
  const read=()=>page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  const baseline=await read();assert.equal(baseline.totals.totalExpense,18000);assert.equal(baseline.totals.transactionCount,2);
  assert.equal(baseline.pocketBudgetActuals.find(p=>p.label==='NFC Card').currentBalance,82000);
  const note='Home reconciliation '+Date.now();let createdId;
  const money=n=>'Rp'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const verifyDetail=async (name,reportRow,shown,active)=>{
    await home.getByRole('button',{name:`Detail ${name}`,exact:true}).click();
    const dialog=page.getByRole('dialog'),budget=reportRow.budget;
    const values=[money(reportRow.currentBalance),money(budget.expense),
      budget.revisedAllocation===null?'Belum tersedia':money(budget.revisedAllocation),
      budget.remaining===null?'Belum tersedia':money(budget.remaining)];
    assert.deepEqual(await dialog.locator('dd').allTextContents(),values);
    const activity=dialog.getByRole('region',{name:'Transaksi terbaru pocket'});
    await activity.getByText('Memuat transaksi terbaru…',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await activity.getByRole('alert').count(),0);
    if(shown)assert.equal(await activity.getByText(shown,{exact:true}).count(),active?1:0);
    await page.keyboard.press('Escape');
  };
  const verify=async (active,amount=1000)=>{
    const delta=active?amount:0,total=money(1532000-delta),expense=18000+delta;
    await home.getByText(total,{exact:true}).first().waitFor();
    assert.equal(await home.getByText(total,{exact:true}).count(),2);
    await home.getByRole('region',{name:'Ringkasan Pocket',exact:true}).getByText(money(82000-delta),{exact:true}).waitFor();
    await home.getByRole('region',{name:'Ringkasan Pocket',exact:true}).getByText(money(182000-delta),{exact:true}).waitFor();
    await panel.getByRole('region',{name:'Arus kas bersih'}).getByText('-'+money(expense),{exact:true}).waitFor();
    const report=await read(),nfc=report.pocketBudgetActuals.find(p=>p.label==='NFC Card'),transport=report.pocketBudgetActuals.find(p=>p.label==='Transportation');
    assert.equal(report.totals.totalExpense,expense);assert.equal(nfc.currentBalance,82000-delta);
    assert.equal(nfc.paymentExpense,expense);assert.equal(nfc.budget.expense,0);assert.equal(transport.budget.expense,expense);assert.equal(transport.currentBalance,100000);
    assert.equal(report.budget.availability,'missing-allocation');
    await home.getByRole('region',{name:'Progres anggaran Beranda'}).getByText(/Total anggaran belum tersedia/).waitFor();
    if(active)await recent.getByText('-'+money(amount),{exact:true}).waitFor();else assert.equal(await recent.getByText('-'+money(amount),{exact:true}).count(),0);
    const downloading=page.waitForEvent('download');await panel.getByRole('button',{name:'Export CSV',exact:true}).click();
    const stream=await (await downloading).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
    const csv=Buffer.concat(chunks).toString('utf8');
    assert.equal(csv.includes(createdId),active);
    if(active){const matching=csv.split(/\r?\n/).filter(line=>line.includes(createdId));assert.equal(matching.length,1);assert.match(matching[0],new RegExp('(?:^|,)"?'+amount+'"?(?:,|$)'));}
    await verifyDetail('NFC Card',nfc,'-'+money(amount),active);
    // NFC payment affects owner's budget but is not a Transportation payment row.
    await verifyDetail('Transportation',transport,'-'+money(amount),false);
  };
  await entry.getByRole('button',{name:'Tambah pengeluaran server',exact:true}).click();
  await entry.getByLabel('Pocket pembayaran',{exact:true}).selectOption({label:'💳 NFC Card'});
  await entry.getByLabel('Nominal pengeluaran (rupiah)',{exact:true}).fill('1000');
  await entry.getByLabel('Kategori pengeluaran',{exact:true}).selectOption({label:'🚇 MRT'});
  await entry.getByLabel('Catatan pengeluaran',{exact:true}).fill(note);
  const saved=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/v1/transactions');
  await entry.getByRole('button',{name:'Simpan pengeluaran server',exact:true}).click();
  const response=await saved;assert.equal(response.status(),201);
  await history.getByText(note,{exact:true}).waitFor();
  createdId=await page.evaluate(async note=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return (await new SessionClient().listTransactions({search:note})).transactions[0].id;},note);
  await verify(true);
  await home.screenshot({path:'.env.home-mutation.png'});
  const row=()=>history.locator('li').filter({has:page.getByText(note,{exact:true})});
  const editForm=page.getByRole('form',{name:'Form edit transaksi'}),editReview=page.getByRole('region',{name:'Konfirmasi edit transaksi'});
  const edit=async amount=>{
    await row().getByRole('button',{name:'Edit transaksi',exact:true}).click();
    await editForm.getByLabel('Nominal edit',{exact:true}).fill(String(amount));
    await editForm.getByRole('button',{name:'Tinjau perubahan'}).click();
    const changed=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname===`/v1/transactions/${createdId}`);
    await editReview.getByRole('button',{name:'Konfirmasi simpan perubahan'}).click();
    const response=await changed;assert.equal(response.status(),200);
    const body=response.request().postDataJSON();
    assert.deepEqual(Object.keys(body).sort(),['amount','clientMutationId','expectedRevision'].sort());
    await verify(true,amount);
    const tx=await page.evaluate(async note=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return (await new SessionClient().listTransactions({search:note})).transactions[0];},note);
    assert.equal(tx.id,createdId);assert.equal(tx.amount,amount);
    assert.equal(tx.revision,body.expectedRevision+1);
    assert.notEqual(tx.pocketId,tx.budgetPocketId);
    return tx;
  };
  const edited=await edit(2000);await home.screenshot({path:'.env.home-edit-mutation.png'});
  const reverted=await edit(1000);assert.equal(reverted.budgetPocketId,edited.budgetPocketId);assert.equal(reverted.pocketId,edited.pocketId);
  await row().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();await verify(false);
  // Other mutation types: each cycle starts and ends at the same active fixture.
  const beforeOther=await read();
  for(const kind of ['income','transfer']){
    const isIncome=kind==='income',amount=isIncome?2000:3000,label=isIncome?'pemasukan':'transfer',testNote=`Home ${kind} reconciliation ${Date.now()}`;
    await entry.getByRole('button',{name:`Tambah ${label} server`,exact:true}).click();
    if(isIncome){
      await entry.getByLabel('Pocket penerima',{exact:true}).selectOption({label:'💵 Cash'});
      await entry.getByRole('button',{name:'Gaji',exact:true}).click();
    }else{
      await entry.getByLabel('Pocket asal',{exact:true}).selectOption({label:'🚆 Transportation'});
      await entry.getByLabel('Pocket tujuan',{exact:true}).selectOption({label:'💳 NFC Card'});
      await entry.getByRole('button',{name:'Top up NFC',exact:true}).click();
    }
    await entry.getByLabel(`Nominal ${label} (rupiah)`,{exact:true}).fill(String(amount));
    await entry.getByLabel(`Catatan ${label}`,{exact:true}).fill(testNote);
    await entry.getByRole('button',{name:`Simpan ${label} server`,exact:true}).click();
    await history.getByText(testNote,{exact:true}).waitFor();
    const testRow=()=>history.locator('li').filter({has:page.getByText(testNote,{exact:true})});
    const transaction=await page.evaluate(async note=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return (await new SessionClient().listTransactions({search:note})).transactions[0];},testNote);
    const verifyOther=async active=>{
      const income=active&&isIncome?amount:0,transfer=active&&!isIncome?amount:0;
      await home.getByText(money(1532000+income),{exact:true}).first().waitFor();
      await panel.getByRole('region',{name:'Arus kas bersih'}).getByText('-'+money(18000-income),{exact:true}).waitFor();
      // Transfer is total/cash-flow neutral: wait for its affected wallet balance.
      const cards=home.getByRole('region',{name:'Ringkasan Pocket',exact:true});
      await cards.getByText(money(50000+income),{exact:true}).waitFor();await cards.getByText(money(82000+transfer),{exact:true}).waitFor();
      const r=await read(),pocket=name=>r.pocketBudgetActuals.find(p=>p.label===name);
      assert.equal(r.totals.totalIncome,income);assert.equal(r.totals.totalExpense,18000);assert.equal(r.totals.netCashFlow,income-18000);assert.equal(r.totals.transferVolume,100000+transfer);
      assert.equal(pocket('Cash').currentBalance,50000+income);assert.equal(pocket('Transportation').currentBalance,100000-transfer);assert.equal(pocket('NFC Card').currentBalance,82000+transfer);
      assert.deepEqual(r.pocketBudgetActuals.map(p=>p.budget),beforeOther.pocketBudgetActuals.map(p=>p.budget));
      const shown=(isIncome?'+':'')+money(amount);
      if(active)await recent.getByText(shown,{exact:true}).waitFor();else assert.equal(await recent.getByText(shown,{exact:true}).count(),0);
      const downloading=page.waitForEvent('download');await panel.getByRole('button',{name:'Export CSV',exact:true}).click();
      const stream=await (await downloading).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
      const matching=Buffer.concat(chunks).toString('utf8').split(/\r?\n/).filter(line=>line.includes(transaction.id));
      assert.equal(matching.length,active?1:0);if(active)assert.match(matching[0],new RegExp('(?:^|,)"?'+amount+'"?(?:,|$)'));
      if(isIncome)await verifyDetail('Cash',pocket('Cash'),shown,active);
      else{
        await verifyDetail('NFC Card',pocket('NFC Card'),shown,active);
        await verifyDetail('Transportation',pocket('Transportation'),shown,active);
      }
    };
    await verifyOther(true);await home.screenshot({path:`.env.home-${kind}-mutation.png`});
    await testRow().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();await verifyOther(false);
    await history.getByLabel('Sertakan transaksi diarsipkan').check();await history.getByRole('button',{name:'Terapkan filter',exact:true}).click();
    await testRow().getByRole('button',{name:'Pulihkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi pulihkan',exact:true}).click();await verifyOther(true);
    await testRow().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();await verifyOther(false);
  }
  await history.getByLabel('Sertakan transaksi diarsipkan').check();await history.getByRole('button',{name:'Terapkan filter',exact:true}).click();
  await row().getByRole('button',{name:'Pulihkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi pulihkan',exact:true}).click();await verify(true);
  // Leave fixture balances unchanged; retain the test row as recoverable archive.
  await row().getByRole('button',{name:'Arsipkan transaksi',exact:true}).click();await recovery.getByRole('button',{name:'Konfirmasi arsip',exact:true}).click();await verify(false);
  assert.deepEqual(errors,[]);assert.deepEqual(logs.filter(e=>!e.text.includes('401')&&!((e.url.includes('fonts.googleapis.com')||e.url.includes('fonts.gstatic.com'))&&/ERR_|Failed to load resource/.test(e.text))),[]);
  console.log('PASS: expense edit/lifecycle plus income and NFC top-up reconcile Home, pocket detail, budgets, cash flow and CSV; original active balances restored, three test rows archived');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
