import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { eq, sql } from 'drizzle-orm';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, type TestDatabase } from '../helpers/testDb.js';
import { buildApp } from '../../src/app.js';
import { loadAndValidateEnv } from '../../src/config/env.js';
import * as schema from '../../src/db/schema.js';
import { calculateReport, currentStart, periodEnd, validateReportRequest, type ReportInput, type ReportTransaction } from '../../src/lib/reports.js';
import Fastify, { type FastifyInstance } from 'fastify';
import { reportResponseSchema } from '../../src/lib/reportSchema.js';

const A = '10000000-0000-4000-8000-000000000001';
const B = '10000000-0000-4000-8000-000000000002';
const C = '10000000-0000-4000-8000-000000000003';
const fixed = new Date('2026-09-22T05:00:00Z');
const pocket = (id = A, name = 'Transportation', openingBalance = '200000') =>
  ({id,name,openingBalance,emoji:'🚆',isActive:true,isArchived:false,isSpendable:true});
const tx = (overrides: Partial<ReportTransaction> = {}): ReportTransaction => ({type:'expense',amount:'18000',
  pocketId:A,budgetPocketId:null,categoryId:null,fromPocketId:null,toPocketId:null,transferType:null,occurredOn:'2026-09-22',...overrides});
const fixture = (overrides: Partial<ReportInput> = {}): ReportInput => ({now:fixed,startDate:'2026-08-26',
  pockets:[pocket()],categories:[],transactions:[],allocations:[{pocketId:A,allocatedAmount:'200000'}],excluded:new Set(),...overrides});

describe('Reports deterministic contract calculations', () => {
  it('uses Jakarta midnight and fixed 26–25 periods including leap/year transitions', () => {
    assert.equal(currentStart(new Date('2026-09-25T16:59:59Z')),'2026-08-26');
    assert.equal(currentStart(new Date('2026-09-25T17:00:00Z')),'2026-09-26');
    assert.equal(currentStart(new Date('2026-01-02T00:00:00Z')),'2025-12-26');
    assert.equal(periodEnd('2024-02-26'),'2024-03-25');
    assert.equal(calculateReport(fixture({startDate:'2024-02-26'})).daily.length,29);
    assert.equal(periodEnd('0001-01-26'),'0001-02-25');
  });
  for (const date of ['2026-08-25','2026-13-26','0000-01-26','9999-01-26','2026-09-26','2026-8-26','x']) {
    it(`rejects invalid/future period ${date}`, () => assert.throws(() => validateReportRequest(date,{},fixed)));
  }
  it('normalizes exclusions and rejects malformed, excessive, or repeated parameters', () => {
    assert.deepEqual([...validateReportRequest('2026-08-26',{excludedPocketIds:`${A},${A}`},fixed)],[A]);
    assert.equal(validateReportRequest('2026-08-26',{excludedPocketIds:''},fixed).size,0);
    for(const query of [{x:'1'},{excludedPocketIds:[A,B]},{excludedPocketIds:`${A},`},
      {excludedPocketIds:` ${A}`},{excludedPocketIds:Array(101).fill(A).join(',')},{excludedPocketIds:'not-uuid'}]) {
      assert.throws(() => validateReportRequest('2026-08-26',query,fixed));
    }
  });
  it('keeps NFC payment, attributed transportation expense and both physical balances separate', () => {
    const r = calculateReport(fixture({pockets:[pocket(),pocket(B,'NFC','0')],allocations:[{pocketId:A,allocatedAmount:'200000'},{pocketId:B,allocatedAmount:'0'}],
      transactions:[tx({type:'transfer',pocketId:null,fromPocketId:A,toPocketId:B,amount:'100000',transferType:'top-up-nfc'}),tx({pocketId:B,budgetPocketId:A})]}));
    const a=r.pocketBudgetActuals.find(p=>p.id===A)!, b=r.pocketBudgetActuals.find(p=>p.id===B)!;
    assert.equal(a.budget.expense,18000); assert.equal(a.currentBalance,100000);
    assert.equal(a.budget.remaining,182000); assert.equal(b.currentBalance,82000);
    assert.equal(b.paymentExpense,18000); assert.equal(b.budget.expense,0);
    assert.equal(r.totals.totalExpense,18000); assert.equal(r.totals.transferVolume,100000);
    assert.equal(r.paymentPockets[0].id,B); assert.equal(b.attributedBudgets[0].pocketId,A);
  });
  it('counts reallocation once and uses already revised allocations without adding it again', () => {
    const r=calculateReport(fixture({pockets:[pocket(),pocket(B,'Care','0')],allocations:[{pocketId:A,allocatedAmount:'170000'},{pocketId:B,allocatedAmount:'30000'}],
      transactions:[tx({type:'transfer',pocketId:null,fromPocketId:A,toPocketId:B,amount:'30000',transferType:'budget-reallocation'}),tx({pocketId:B,amount:'30000'})]}));
    const a=r.pocketBudgetActuals.find(p=>p.id===A)!;
    assert.equal(a.budget.revisedAllocation,170000); assert.equal(a.reallocations.outAmount,30000);
    assert.equal(a.transfers.count,0); assert.equal(r.totals.transferCount,1); assert.equal(r.totals.totalIncome,0);
  });
  it('does not substitute current allocations or balances into historical reports', () => {
    const r=calculateReport(fixture({startDate:'2026-07-26',transactions:[tx({occurredOn:'2026-08-01'})]}));
    assert.equal(r.totals.totalExpense,18000); assert.equal(r.budget.availability,'historical-unavailable');
    assert.equal(r.budget.revisedAllocation,null); assert.equal(r.pocketBudgetActuals[0].currentBalance,null);
    assert.equal(r.weeklyUsage[0].allowance,null); assert.deepEqual(r.sinkingFund.candidates,[]);
    assert.equal(r.sinkingFund.suggestedAmount,null);
  });
  it('distinguishes missing allocation from zero and preserves available individual rows', () => {
    const r=calculateReport(fixture({pockets:[pocket(),pocket(B)],transactions:[tx()]}));
    assert.equal(r.budget.availability,'missing-allocation'); assert.equal(r.budget.remaining,null);
    assert.equal(r.pocketBudgetActuals.find(p=>p.id===A)!.budget.availability,'available');
    const z=calculateReport(fixture({allocations:[{pocketId:A,allocatedAmount:'0'}],transactions:[tx()]}));
    assert.equal(z.budget.status,'tanpa-alokasi'); assert.equal(z.budget.remaining,-18000); assert.equal(z.budget.usageRatio,null);
  });
  for (const [expense,expected] of [[69,'aman'],[70,'waspada'],[89,'waspada'],[90,'bahaya'],[99,'bahaya'],[100,'overbudget']] as const) {
    it(`uses exact budget boundary ${expense}%`,()=> assert.equal(calculateReport(fixture({allocations:[{pocketId:A,allocatedAmount:'100'}],transactions:[tx({amount:String(expense)})]})).budget.status,expected));
  }
  it('preserves four exact weekly fractions, zero-filled days and remainder days', () => {
    const r=calculateReport(fixture({allocations:[{pocketId:A,allocatedAmount:'101'}],transactions:[tx({amount:'1',occurredOn:'2026-08-26'}),tx({amount:'2',occurredOn:'2026-09-25'})]}));
    assert.equal(r.daily.length,31); assert.equal(r.daily[1].expense,0);
    assert.deepEqual(r.weeklyUsage.map(w=>w.expense),[1,0,0,2]);
    assert.deepEqual(r.weeklyUsage[0].allowance,{numerator:101,denominator:4});
    assert.deepEqual(r.weeklyUsage[0].remaining,{numerator:97,denominator:4});
    assert.equal(r.weeklyUsage[3].endDate,'2026-09-25');
  });
  it('includes archived metadata references and falls back without dropping transaction facts', () => {
    const r=calculateReport(fixture({pockets:[{...pocket(),isArchived:true}],transactions:[tx({budgetPocketId:B,categoryId:C})]}));
    assert.equal(r.pocketBudgetActuals.length,2); assert.equal(r.pocketBudgetActuals.find(p=>p.id===A)!.isCurrentlyActive,false);
    assert.equal(r.pocketBudgetActuals.find(p=>p.id===B)!.isMetadataMissing,true); assert.equal(r.categories[0].id,C);
    assert.equal(r.categories[0].amount,18000);
  });
  it('uses the complete ledger for current balance, including outside-period and future entries', () => {
    const r=calculateReport(fixture({transactions:[tx({amount:'1',occurredOn:'2026-01-01'}),tx({amount:'2',occurredOn:'2026-12-01'})]}));
    assert.equal(r.totals.transactionCount,0); assert.equal(r.pocketBudgetActuals[0].currentBalance,199997);
  });
  it('does not truncate breakdown groups and orders ties by label then ID', () => {
    const cats=Array.from({length:8},(_,i)=>({id:`20000000-0000-4000-8000-00000000000${i}`,name:String(8-i),emoji:'🍎',isActive:true,isArchived:false}));
    const r=calculateReport(fixture({categories:cats,transactions:cats.map(c=>tx({categoryId:c.id,amount:'10'}))}));
    assert.equal(r.categories.length,8); assert.equal(r.categories[0].label,'1'); assert.equal(r.categories[0].percentage,12.5);
  });
  it('returns deterministic insights and no recommendations for empty/transfer-only activity', () => {
    assert.deepEqual(calculateReport(fixture()).insights,[]);
    const r=calculateReport(fixture({allocations:[{pocketId:A,allocatedAmount:'100'}],transactions:[tx({amount:'100'})]}));
    assert.equal(r.insights.length,3); assert.ok(r.insights.some(i=>i.rule==='overbudget-pocket'));
    assert.ok(r.insights.some(i=>i.rule==='running-week-warning')); assert.ok(r.insights.some(i=>i.rule==='category-concentration'));
    assert.ok(!r.insights.some(i=>i.rule==='net-cash-flow'));
  });
  it('sinking candidates are independent, exclusions do not mutate balances or hide rows', () => {
    const r=calculateReport(fixture({pockets:[pocket(),pocket(B,'Cash','100')],excluded:new Set([A,C])}));
    assert.equal(r.sinkingFund.status,'available'); assert.equal(r.sinkingFund.daysRemaining,3);
    assert.equal(r.sinkingFund.candidates.length,2); assert.equal(r.sinkingFund.suggestedAmount,100);
    assert.equal(r.sinkingFund.candidates[0].currentBalance,200000);
    assert.equal(calculateReport(fixture({now:new Date('2026-09-01T00:00:00Z')})).sinkingFund.status,'not-near-period-end');
    assert.equal(calculateReport(fixture({pockets:[]})).sinkingFund.status,'no-eligible-pockets');
    assert.equal(calculateReport(fixture({pockets:[pocket(A,'Zero','0')]})).sinkingFund.status,'no-positive-balance');
  });
  it('handles exact Sinking day 6, 5 and 0 boundaries and all-positive exclusions',()=>{
    for(const [day,status,remaining] of [[19,'not-near-period-end',6],[20,'available',5],[25,'available',0]] as const) {
      const r=calculateReport(fixture({now:new Date(`2026-09-${day}T05:00:00Z`),excluded:new Set([A])}));
      assert.equal(r.sinkingFund.status,status);assert.equal(r.sinkingFund.daysRemaining,remaining);
      assert.equal(r.sinkingFund.suggestedAmount,0);assert.equal(r.sinkingFund.candidates.length,1);
    }
  });
  it('suppresses budget insights historically and excludes nonspendable/archived candidates',()=>{
    const r=calculateReport(fixture({startDate:'2026-07-26',transactions:[tx({occurredOn:'2026-08-01',amount:'300000'})]}));
    assert.ok(r.insights.every(i=>['category-concentration','net-cash-flow'].includes(i.rule)));
    assert.equal(calculateReport(fixture({pockets:[{...pocket(),isSpendable:false},{...pocket(B),isArchived:true}]})).sinkingFund.candidates.length,0);
    assert.deepEqual(calculateReport(fixture({transactions:[tx({type:'transfer',pocketId:null,fromPocketId:A,toPocketId:B,transferType:'normal'})]})).insights,[]);
  });
  it('rejects aggregate, balance and weekly numerator overflow instead of rounding', () => {
    const max=String(Number.MAX_SAFE_INTEGER);
    for(const input of [fixture({pockets:[],transactions:[tx({amount:max}),tx({amount:'1'})]}),
      fixture({pockets:[pocket(A,'Large',max)],transactions:[tx({type:'income',amount:'1'})]}),
      fixture({allocations:[{pocketId:A,allocatedAmount:'0'}],transactions:[tx({amount:max})]})]) {
      assert.throws(()=>calculateReport(input),{code:'REPORT_AMOUNT_OUT_OF_RANGE'});
    }
  });
});

describe('Reports live PostgreSQL routes', () => {
  let db:TestDatabase, app:FastifyInstance, owner:Awaited<ReturnType<typeof createTestOwner>>;
  before(async()=>{db=await getTestDb();app=await buildApp(loadAndValidateEnv(),{reportClock:()=>fixed});await app.ready();});
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{await resetTestDatabase(db);owner=await createTestOwner(db);});
  const get=(url='/v1/reports/current-period')=>app.inject({url,headers:{cookie:owner.cookieHeader}});
  async function seed() {
    await db.insert(schema.pockets).values({id:A,userId:owner.userId,name:'Transportation',emoji:'🚆',groupId:'daily',openingBalance:200000});
    await db.insert(schema.transactions).values({userId:owner.userId,type:'expense',amount:18000,pocketId:A,occurredOn:'2026-09-22',occurredAtLocalTime:'12:00:00'});
  }
  it('authenticates before validation and prevents caching even error responses',async()=>{
    const r=await app.inject({url:'/v1/reports/periods/invalid?bad=1'});
    assert.equal(r.statusCode,401);assert.equal(r.headers['cache-control'],'private, no-store');
    assert.equal((await app.inject('/v1/reports/current-period')).statusCode,401);
    await db.update(schema.authSessions).set({expiresAt:new Date(0)});
    assert.equal((await get()).statusCode,401);
  });
  it('pre-setup reports are read-only, complete and match explicit current period',async()=>{
    const first=await get(), second=await get('/v1/reports/periods/2026-08-26');
    assert.equal(first.statusCode,200,first.body);assert.deepEqual(first.json(),second.json());
    assert.equal(first.json().budget.availability,'missing-allocation');assert.equal(first.json().daily.length,31);
    assert.equal((await db.select().from(schema.budgetPeriods)).length,0);
    assert.equal((await db.select().from(schema.pockets)).length,0);
    assert.equal((await db.select().from(schema.idempotencyRecords)).length,0);
  });
  for(const query of ['?x=1','?excludedPocketIds=x',`?excludedPocketIds=${A}&excludedPocketIds=${B}`,`?excludedPocketIds=${A},`]) {
    it(`rejects query ${query}`,async()=>assert.equal((await get('/v1/reports/current-period'+query)).statusCode,400));
  }
  it('scopes all ledger, metadata, allocation and exclusion reads to the authenticated owner',async()=>{
    await seed(); const other=await createTestOwner(db);
    await db.insert(schema.pockets).values({id:B,userId:other.userId,name:'PRIVATE SECRET',emoji:'🔒',groupId:'daily',openingBalance:999999});
    await db.insert(schema.transactions).values({userId:other.userId,type:'income',amount:999999,pocketId:B,occurredOn:'2026-09-22',occurredAtLocalTime:'12:00:00'});
    const r=await get(`/v1/reports/current-period?excludedPocketIds=${B}`);
    assert.equal(r.statusCode,200,r.body);assert.equal(r.json().totals.totalExpense,18000);assert.equal(r.json().totals.totalIncome,0);
    assert.ok(!r.body.includes('PRIVATE SECRET'));assert.ok(!r.body.includes(B));
  });
  it('covers more than one transaction-list page, archive, restore and soft deletion',async()=>{
    await seed(); await db.insert(schema.transactions).values(Array.from({length:60},()=>({userId:owner.userId,type:'expense',amount:1,pocketId:A,occurredOn:'2026-09-22',occurredAtLocalTime:'12:00:00'})));
    assert.equal((await get()).json().totals.expenseCount,61);
    await db.update(schema.transactions).set({archivedAt:new Date()});assert.equal((await get()).json().totals.expenseCount,0);
    await db.update(schema.transactions).set({archivedAt:null});assert.equal((await get()).json().totals.totalExpense,18060);
    await db.update(schema.transactions).set({deletedAt:new Date()});assert.equal((await get()).json().totals.expenseCount,0);
  });
  it('returns current allocation but never presents it as a historical snapshot',async()=>{
    await seed();const [p]=await db.insert(schema.budgetPeriods).values({userId:owner.userId,startDate:'2026-08-26',endDate:'2026-09-25'}).returning();
    await db.insert(schema.pocketBudgetAllocations).values({budgetPeriodId:p.id,pocketId:A,allocatedAmount:200000});
    const r=await get();assert.equal(r.json().budget.revisedAllocation,200000);assert.equal(r.json().budget.remaining,182000);
    const [old]=await db.insert(schema.budgetPeriods).values({userId:owner.userId,startDate:'2026-07-26',endDate:'2026-08-25'}).returning();
    await db.insert(schema.pocketBudgetAllocations).values({budgetPeriodId:old.id,pocketId:A,allocatedAmount:88888});
    const h=await get('/v1/reports/periods/2026-07-26');assert.equal(h.json().budget.revisedAllocation,null);
  });
  it('preserves stored budget attribution after the Cash/NFC owner configuration changes',async()=>{
    await seed();await db.insert(schema.pockets).values({id:B,userId:owner.userId,name:'NFC',emoji:'💳',groupId:'daily',budgetOwnerPocketId:A});
    await db.update(schema.transactions).set({pocketId:B,budgetPocketId:A});
    await db.update(schema.pockets).set({budgetOwnerPocketId:null}).where(eq(schema.pockets.id,B));
    await db.insert(schema.transactions).values({userId:owner.userId,type:'transfer',amount:100000,fromPocketId:A,toPocketId:B,transferType:'top-up-nfc',occurredOn:'2026-09-22',occurredAtLocalTime:'12:00:00'});
    const r=await get();assert.equal(r.statusCode,200,r.body);
    const a=r.json().pocketBudgetActuals.find((p:{id:string})=>p.id===A), b=r.json().pocketBudgetActuals.find((p:{id:string})=>p.id===B);
    assert.equal(a.budget.expense,18000);assert.equal(b.budget.expense,0);assert.equal(b.currentBalance,82000);
    assert.equal(b.transferBreakdown[0].type,'top-up-nfc');
  });
  it('detects BIGINT overflow before serialization',async()=>{
    await seed();await db.execute(sql`UPDATE pockets SET opening_balance = 9007199254740992 WHERE id = ${A}`);
    await db.update(schema.transactions).set({deletedAt:new Date()});
    const r=await get();assert.equal(r.statusCode,422,r.body);assert.ok(r.body.includes('REPORT_AMOUNT_OUT_OF_RANGE'));
  });
  it('validates full response schemas for populated current and historical reports',async()=>{
    await seed();
    // Use Fastify's existing validator, without introducing a test dependency.
    let validate: ((data:unknown)=>boolean) | undefined;
    const checker=Fastify({ajv:{customOptions:{coerceTypes:false,removeAdditional:false,useDefaults:false}}});
    checker.get('/schema-check',async request=>{
      validate=request.compileValidationSchema(reportResponseSchema) as (data:unknown)=>boolean;
      return {};
    });
    try {
      await checker.inject('/schema-check');
      for(const url of ['/v1/reports/current-period','/v1/reports/periods/2026-07-26']) {
        const r=await get(url), data=r.json(), before=structuredClone(data);
        assert.equal(validate!(data),true);assert.deepEqual(data,before);
        delete data.totals;assert.equal(validate!(data),false);
      }
    } finally {await checker.close();}
  });
  it('keeps correlated pocket and ledger reads coherent during concurrent commits',async()=>{
    await seed();
    // Every committed state has balance 100: opening balance and expense change atomically.
    await db.transaction(async t=>{
      await t.update(schema.pockets).set({openingBalance:101}).where(eq(schema.pockets.id,A));
      await t.update(schema.transactions).set({amount:1});
    });
    const writer=(async()=>{
      for(let n=2;n<=30;n++) await db.transaction(async t=>{
        await t.update(schema.pockets).set({openingBalance:100+n}).where(eq(schema.pockets.id,A));
        await t.update(schema.transactions).set({amount:n});
      });
    })();
    try {
      for(let n=0;n<30;n++) {
        const r=await get();assert.equal(r.statusCode,200,r.body);
        assert.equal(r.json().pocketBudgetActuals[0].currentBalance,100);
      }
    } finally {await writer;}
  });
  it('serves authenticated JSON over a real loopback HTTP listener',async()=>{
    const address=await app.listen({port:0,host:'127.0.0.1'});
    const r=await fetch(address+'/v1/reports/current-period',{headers:{cookie:owner.cookieHeader}});
    assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');
    assert.equal((await r.json() as {schemaVersion:number}).schemaVersion,1);
  });
});
