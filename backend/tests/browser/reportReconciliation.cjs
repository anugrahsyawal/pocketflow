// Read-only reconciliation on the dedicated seeded preview, not a mutation test.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict');
function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&c===','){row.push(cell);cell='';}
  else if(!quoted&&(c==='\r'||c==='\n')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 assert.equal(quoted,false);if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
assert.deepEqual(parseCsv('"a","b"\r\n"x,y","line\r\n""quote"""'),[['a','b'],['x,y','line\r\n"quote"']]);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844}}),errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
  await page.getByLabel('Password',{exact:true}).fill('Disposable-preview-123!');
  await page.getByRole('button',{name:'Masuk ke server',exact:true}).click();
  const panel=page.getByRole('region',{name:'Export periode server'}),summary=panel.getByLabel('Ringkasan laporan server');
  await summary.waitFor();
  page.on('request',r=>{if(r.url().includes('/v1/')&&r.method()!=='GET')writes.push(r.url());});
  const report=await page.evaluate(async()=>{const {SessionClient}=await import('/src/lib/api/sessionClient.ts');return new SessionClient().readReport();});
  const downloadReady=page.waitForEvent('download');await panel.getByRole('button',{name:'Export CSV',exact:true}).click();
  const download=await downloadReady,stream=await download.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const bytes=Buffer.concat(chunks);assert.deepEqual([...bytes.subarray(0,3)],[239,187,191]);
  const [header,...csv]=parseCsv(bytes.toString('utf8').slice(1));
  const records=csv.map(row=>{assert.equal(row.length,header.length);return Object.fromEntries(header.map((key,i)=>[key,row[i]]));});
  const sum=(rows,field)=>rows.reduce((total,row)=>total+BigInt(row[field]),0n);
  const expenses=records.filter(r=>r.type==='expense'),income=records.filter(r=>r.type==='income'),transfers=records.filter(r=>r.type==='transfer');
  assert.equal(records.length,report.totals.transactionCount);
  assert.equal(new Set(records.map(r=>r.transaction_id)).size,records.length);
  assert.ok(records.every(r=>r.date>=report.period.startDate&&r.date<=report.period.endDate));
  assert.equal(sum(expenses,'amount'),BigInt(report.totals.totalExpense));
  assert.equal(sum(income,'amount'),BigInt(report.totals.totalIncome));
  assert.equal(sum(income,'amount')-sum(expenses,'amount'),BigInt(report.totals.netCashFlow));
  assert.equal(sum(transfers,'amount'),BigInt(report.totals.transferVolume));
  for(const [rows,field] of [[report.categories,'amount'],[report.paymentPockets,'amount'],[report.weeklyUsage,'expense'],[report.daily,'expense']])assert.equal(sum(rows,field),sum(expenses,'amount'));
  assert.equal(report.pocketBudgetActuals.reduce((n,p)=>n+BigInt(p.budget.expense),0n),sum(expenses,'amount'));
  assert.equal(report.pocketBudgetActuals.reduce((n,p)=>n+BigInt(p.paymentExpense),0n),sum(expenses,'amount'));
  assert.equal(sum(report.daily,'income'),sum(income,'amount'));
  const nfc=report.pocketBudgetActuals.find(p=>p.label==='NFC Card'),transport=report.pocketBudgetActuals.find(p=>p.label==='Transportation');
  assert.equal(nfc.currentBalance,82000);assert.equal(nfc.paymentExpense,18000);assert.equal(nfc.budget.expense,0);
  assert.equal(transport.currentBalance,100000);assert.equal(transport.budget.expense,18000);assert.equal(transport.paymentExpense,0);
  assert.deepEqual(await summary.locator('h3').allTextContents(),['Arus Kas Bersih','Arus Kas Periode','Anggaran Periode','Budget vs Aktual Pocket','Distribusi Kategori','Pocket Pengeluaran Terbesar','Pemakaian Mingguan','Insight Periode','Rekomendasi Sinking Fund']);
  await summary.getByRole('region',{name:'Arus kas bersih'}).getByText('-Rp18.000',{exact:true}).waitFor();
  await summary.getByRole('region',{name:'Distribusi kategori server'}).getByText('-Rp18.000',{exact:true}).waitFor();
  await summary.getByRole('region',{name:'Distribusi pocket pembayaran server'}).getByText('-Rp18.000',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Periode export sebelumnya'}).click();
  await summary.getByText('Belum ada transaksi aktif pada periode ini.').waitFor();
  assert.equal(await summary.locator('h3').count(),9);
  assert.equal(await summary.getByRole('region',{name:'Rekomendasi Sinking Fund server'}).getByRole('checkbox').count(),0);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  console.log('PASS: downloaded CSV reconciles totals/category/payment/budget/daily/weekly, neutral transfer, independent NFC balance, rendered figures and stable section order; no writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
