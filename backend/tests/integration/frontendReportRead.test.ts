import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {calculateReport} from '../../src/lib/reports.js';
import {reportQuery,parseReport,LatestReportRequest} from '../../../frontend/src/lib/api/reportRead.ts';
import {SessionClient} from '../../../frontend/src/lib/api/sessionClient.ts';

const fixture=(startDate='2026-09-26')=>calculateReport({now:new Date('2026-10-19T00:00:00Z'),startDate,pockets:[],categories:[],transactions:[],allocations:[],excluded:new Set()});
describe('Phase 7C.4 report read foundation',()=>{
  it('decodes actual current and historical server DTOs without replacing unknowns with zero',()=>{
    const current=parseReport(fixture(),reportQuery());assert.equal(current.budget.revisedAllocation,null);
    const historical=parseReport(fixture('2026-08-26'),reportQuery({startDate:'2026-08-26'}));
    assert.equal(historical.budget.availability,'historical-unavailable');assert.equal(historical.sinkingFund.suggestedAmount,null);
  });
  it('rejects wrong-period, invalid nested data and unavailable values presented as amounts',()=>{
    assert.throws(()=>parseReport(fixture(),reportQuery({startDate:'2026-08-26'})),{code:'INVALID_RESPONSE'});
    for(const mutate of [(r:any)=>r.totals.totalIncome=Infinity,(r:any)=>r.totals.totalExpense=-1,
      (r:any)=>r.totals.extra='private',(r:any)=>delete r.daily,(r:any)=>r.budget.revisedAllocation=0,
      (r:any)=>r.period.endDate='2026-10-24',(r:any)=>r.timezone='UTC']){
      const value=fixture();mutate(value);assert.throws(()=>parseReport(value,reportQuery()),{code:'INVALID_RESPONSE'});
    }
  });
  it('snapshots exclusion IDs and uses existing credentialed read transport',async()=>{
    const ids=['12345678-1234-4123-8123-123456789ABC'];const input={excludedPocketIds:ids};
    let calls=0;const client=new SessionClient(async(path,options)=>{
      calls++;assert.equal(String(path),'/v1/reports/current-period?excludedPocketIds=12345678-1234-4123-8123-123456789abc');
      assert.equal(options?.credentials,'include');assert.equal(options?.cache,'no-store');ids.push('bad');
      return new Response(JSON.stringify(fixture()));
    });
    assert.equal((await client.readReport(input)).schemaVersion,1);assert.equal(calls,1);
    for(const invalid of [{startDate:'2026-02-25'},{startDate:'0000-01-26'},{excludedPocketIds:['bad']},{excludedPocketIds:Array(101).fill('12345678-1234-4123-8123-123456789abc')}])
      assert.throws(()=>reportQuery(invalid),{code:'INVALID_INPUT'});
  });
  it('suppresses out-of-order responses, stale errors and completion after invalidation',async()=>{
    const gate=new LatestReportRequest();let resolve!:(v:string)=>void;
    const older=gate.run(()=>new Promise<string>(r=>{resolve=r;}));
    assert.deepEqual(await gate.run(async()=>'latest'),{kind:'ready',value:'latest'});
    resolve('old');assert.deepEqual(await older,{kind:'stale'});
    let reject!:(reason:unknown)=>void;const expired=gate.run(()=>new Promise((_,r)=>{reject=r;}));
    gate.invalidate();reject(new Error('old failure'));assert.deepEqual(await expired,{kind:'stale'});
    const failed=await gate.run(async()=>{throw new Error('current failure');});assert.equal(failed.kind,'error');
  });
  it('reads populated reports through a real authenticated loopback HTTP server',async()=>{
    const {getTestDb,resetTestDatabase,createTestOwner,closeTestDb}=await import('../helpers/testDb.js');
    const {createTestApp}=await import('../helpers/testApp.js');
    const {seedMasterData}=await import('../helpers/masterDataFixture.js');
    const db=await getTestDb();await resetTestDatabase(db);const owner=await createTestOwner(db);
    await seedMasterData(db,owner.userId);const app=await createTestApp();
    try{
      const address=await app.listen({port:0,host:'127.0.0.1'});
      const client=new SessionClient((path,options)=>fetch(address+String(path),{...options,headers:{...options?.headers,cookie:owner.cookieHeader}}));
      const report=await client.readReport();assert.equal(report.totals.totalExpense,18000);assert.equal(report.totals.transferVolume,100000);
      assert.equal(report.pocketBudgetActuals.find(p=>p.label==='NFC Card')?.currentBalance,82000);
      const previous=new Date(report.period.startDate+'T00:00:00Z');previous.setUTCMonth(previous.getUTCMonth()-1);
      const historical=await client.readReport({startDate:previous.toISOString().slice(0,10)});
      assert.equal(historical.budget.availability,'historical-unavailable');assert.ok(historical.pocketBudgetActuals.every(p=>p.currentBalance===null));
    }finally{await app.close();await closeTestDb();}
  });
});
