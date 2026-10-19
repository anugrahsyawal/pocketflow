import {describe,it,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {eq,sql} from 'drizzle-orm';
import type {FastifyInstance} from 'fastify';
import {createTestApp} from '../helpers/testApp.js';
import {getTestDb,resetTestDatabase,createTestOwner,closeTestDb,type TestDatabase} from '../helpers/testDb.js';
import {transactions,pockets,categories,budgetPeriods,pocketBudgetAllocations} from '../../src/db/schema.js';
import {transactionCsv,CSV_COLUMNS,EXPORT_MAX_ROWS,type ExportRow} from '../../src/lib/transactionCsv.js';

// Independent CSV reader, including quoted embedded CRLF and doubled quotes.
function parse(csv:string):string[][] {
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
  for(let i=1;i<csv.length;i++) {
    const c=csv[i];
    if(c==='"') {if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if(c==='\r'&&csv[i+1]==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field='';i++;}
    else field+=c;
  }
  assert.equal(quoted,false);row.push(field);rows.push(row);return rows;
}
describe('Complete period CSV export',()=>{
  let app:FastifyInstance,db:TestDatabase,owner:Awaited<ReturnType<typeof createTestOwner>>,p:string,q:string;
  const url='/v1/transactions/export?startDate=2026-09-26&endDate=2026-10-25';
  before(async()=>{db=await getTestDb();app=await createTestApp();});
  beforeEach(async()=>{
    await resetTestDatabase(db);owner=await createTestOwner(db);
    const ps=await db.insert(pockets).values(['Food','Cash'].map(name=>({userId:owner.userId,name,emoji:'💰',groupId:'daily'}))).returning();
    [p,q]=ps.map(x=>x.id);
  });
  after(async()=>{await app.close();await closeTestDb();});
  const get=(path=url)=>app.inject({method:'GET',url:path,headers:{cookie:owner.cookieHeader}});
  const entry=(extra:Partial<typeof transactions.$inferInsert>={})=>({userId:owner.userId,type:'expense',amount:123,pocketId:p,
    occurredOn:'2026-10-01',occurredAtLocalTime:'12:34:56',...extra});

  it('requires authentication; validates exact period/allowlist/repeated values; no-store on errors',async()=>{
    const no=await app.inject({method:'GET',url});assert.equal(no.statusCode,401);assert.equal(no.headers['cache-control'],'private, no-store');
    for(const path of [url+'&limit=100',url+'&startDate=2026-09-26',url.replace('09-26','09-27'),
      url.replace('10-25','10-24'),url.replace('09-26','02-30'),'/v1/transactions/export']) {
      const r=await get(path);assert.equal(r.statusCode,400,r.body);assert.equal(r.json().error.code,'INVALID_INPUT');assert.equal(r.headers['content-disposition'],undefined);
    }
    assert.equal((await get('/v1/transactions/export?startDate=2026-12-26&endDate=2027-01-25')).statusCode,200);
    assert.equal((await get('/v1/transactions/export?startDate=2028-02-26&endDate=2028-03-25')).statusCode,200);
  });
  it('returns BOM/header-only for empty period and exact safe attachment headers',async()=>{
    const r=await get();assert.equal(r.statusCode,200);assert.equal(r.body.charCodeAt(0),0xfeff);
    assert.deepEqual(parse(r.body),[[...CSV_COLUMNS]]);assert.equal(r.headers['content-type'],'text/csv; charset=utf-8');
    assert.equal(r.headers['cache-control'],'private, no-store');
    assert.equal(r.headers['content-disposition'],'attachment; filename="pocketflow-transactions_2026-09-26_to_2026-10-25.csv"');
  });
  it('exports more than 100 rows, boundaries and all types; excludes archive/delete/other owner; stable ties; no financial writes',async()=>{
    const created=new Date('2026-10-01T00:00:00Z');
    const seeded=await db.insert(transactions).values(Array.from({length:125},()=>entry({createdAt:created}))).returning();
    await db.insert(transactions).values([
      entry({occurredOn:'2026-09-26'}),entry({occurredOn:'2026-10-25',type:'income',incomeSource:'gaji',amount:Number.MAX_SAFE_INTEGER}),
      entry({type:'transfer',pocketId:null,fromPocketId:p,toPocketId:q,transferType:'tarik-tunai'}),
      entry({occurredOn:'2026-09-25'}),entry({occurredOn:'2026-10-26'}),entry({archivedAt:new Date()}),entry({deletedAt:new Date()})]);
    const other=await createTestOwner(db);await db.insert(transactions).values(entry({userId:other.userId,note:'PRIVATE'}));
    const beforeState=await Promise.all([db.select().from(transactions),db.select().from(pockets),db.select().from(budgetPeriods),db.select().from(pocketBudgetAllocations)]);
    const r=await get();assert.equal(r.statusCode,200,r.body);const rows=parse(r.body).slice(1);assert.equal(rows.length,128);assert.ok(!r.body.includes('PRIVATE'));
    assert.equal(rows[0][2],'2026-10-25');assert.equal(rows[0][4],String(Number.MAX_SAFE_INTEGER));assert.equal(rows.at(-1)![2],'2026-09-26');
    const ids=new Set(seeded.map(x=>x.id));assert.deepEqual(rows.filter(x=>ids.has(x[0])).map(x=>x[0]),[...ids].sort().reverse());
    const transfer=rows.find(x=>x[1]==='transfer')!;assert.deepEqual(transfer.slice(5,9),['','Food','Cash','']);
    assert.deepEqual(await Promise.all([db.select().from(transactions),db.select().from(pockets),db.select().from(budgetPeriods),db.select().from(pocketBudgetAllocations)]),beforeState);
  });
  it('resolves inactive labels, neutralizes formula prefixes and quotes Unicode/newlines',async()=>{
    await db.update(pockets).set({name:'  =Food,"🍜"',isArchived:true,isActive:false}).where(eq(pockets.id,p));
    const [c]=await db.insert(categories).values({userId:owner.userId,pocketId:p,name:'@category',emoji:'🧼',isArchived:true}).returning();
    const note=' \t+SUM(1,2)\r\n"sabun" 🧼';
    await db.insert(transactions).values(entry({categoryId:c.id,note}));
    const r=await get();const row=parse(r.body)[1];assert.equal(row[5],"'  =Food,\"🍜\"");assert.equal(row[8],"'@category");assert.equal(row[11],"'"+note);
  });
  it('does not leak another owner reference label and uses category fallback',async()=>{
    const other=await createTestOwner(db);
    const [foreign]=await db.insert(pockets).values({userId:other.userId,name:'SECRET',emoji:'💰',groupId:'daily'}).returning();
    await db.insert(transactions).values(entry({pocketId:foreign.id}));
    const r=await get();const row=parse(r.body)[1];assert.equal(row[5],'Pocket tidak tersedia');assert.equal(row[8],'Tanpa kategori');assert.ok(!r.body.includes('SECRET'));
  });
  it('keeps labels, values and row membership coherent during atomic concurrent writes',async()=>{
    const [a,b]=await db.insert(transactions).values([entry({amount:1}),entry({amount:1,archivedAt:new Date()})]).returning();
    await db.update(pockets).set({name:'v1'}).where(eq(pockets.id,p));
    const writer=(async()=>{for(let n=2;n<=35;n++)await db.transaction(async tx=>{
      await tx.update(pockets).set({name:`v${n}`}).where(eq(pockets.id,p));
      await tx.update(transactions).set({amount:n,archivedAt:n%2===0?new Date():null}).where(eq(transactions.id,a.id));
      await tx.update(transactions).set({amount:n,archivedAt:n%2===0?null:new Date()}).where(eq(transactions.id,b.id));
    });})();
    try {for(let i=0;i<35;i++){const r=await get();assert.equal(r.statusCode,200,r.body);const rows=parse(r.body).slice(1);assert.equal(rows.length,1);assert.equal(rows[0][5],`v${rows[0][4]}`);}}
    finally {await writer;}
  });
  it('rejects row overflow instead of returning a truncated attachment',async()=>{
    for(let i=0;i<=EXPORT_MAX_ROWS;i+=500)await db.insert(transactions).values(Array.from({length:Math.min(500,EXPORT_MAX_ROWS+1-i)},()=>entry()));
    const r=await get();assert.equal(r.statusCode,422,r.body);assert.equal(r.json().error.code,'EXPORT_TOO_LARGE');assert.equal(r.headers['content-disposition'],undefined);
  });
  it('CSV encoder rejects byte overflow and unsafe monetary values',()=>{
    const row:ExportRow={id:'x',type:'expense',amount:'1',occurredOn:'2026-10-01',occurredAtLocalTime:'12:00:00',pocket:'Food',source:null,destination:null,category:null,incomeSource:null,transferType:null,note:null,createdAt:new Date(),updatedAt:new Date()};
    assert.throws(()=>transactionCsv([{...row,note:'x'.repeat(16*1024*1024)}]),{code:'EXPORT_TOO_LARGE'});
    assert.throws(()=>transactionCsv([{...row,amount:'9007199254740992'}]),{code:'INTERNAL_SERVER_ERROR'});
  });
  it('returns a safe retryable error after the real database timeout, with no partial attachment', {timeout:45_000}, async()=>{
    // The suite's safety-checked disposable DB only. Hold a table lock so the
    // export SELECT actually reaches its production 30-second statement timeout.
    let release!:()=>void,locked!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const ready=new Promise<void>(resolve=>{locked=resolve;});
    const blocker=db.transaction(async tx=>{
      await tx.execute(sql`LOCK TABLE transactions IN ACCESS EXCLUSIVE MODE`);
      locked();await gate;
    });
    try {
      await Promise.race([ready,blocker.then(()=>{throw new Error('Lock unexpectedly released');})]);
      const response=await get();
      assert.equal(response.statusCode,503,response.body);
      assert.equal(response.json().error.code,'EXPORT_UNAVAILABLE');
      assert.equal(response.headers['content-disposition'],undefined);
      assert.equal(response.headers['cache-control'],'private, no-store');
      assert.ok(!response.body.includes('SELECT'));
    }finally{release();await blocker;}
    // Failed read leaves the connection usable, with no financial side effects.
    const retry=await get();assert.equal(retry.statusCode,200,retry.body);
    assert.deepEqual(parse(retry.body),[[...CSV_COLUMNS]]);
  });
});
