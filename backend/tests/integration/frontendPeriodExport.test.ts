import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {SessionClient} from '../../../frontend/src/lib/api/sessionClient.ts';
import {snapshotExportPeriod} from '../../../frontend/src/lib/api/periodExport.ts';
import {transactionCsv} from '../../src/lib/transactionCsv.js';

const period={startDate:'2026-09-26',endDate:'2026-10-25'};
const filename='pocketflow-transactions_2026-09-26_to_2026-10-25.csv';
const headers={'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`};
describe('Connected CSV transport',()=>{
  it('uses immutable full-period credentialed GET and retains BOM bytes',async()=>{
    const input={...period};let calls=0;
    const client=new SessionClient(async(url,options)=>{
      calls++;assert.equal(String(url),'/v1/transactions/export?startDate=2026-09-26&endDate=2026-10-25');
      assert.equal(options?.method,'GET');assert.equal(options?.credentials,'include');assert.equal(options?.cache,'no-store');
      assert.equal(options?.body,undefined);input.endDate='2030-01-25';
      return new Response(transactionCsv([]),{headers});
    });
    const result=await client.exportPeriod(input);assert.equal(calls,1);assert.equal(result.filename,filename);assert.equal(result.empty,true);
    assert.deepEqual([...new Uint8Array(await result.blob.arrayBuffer()).slice(0,3)],[239,187,191]);
  });
  it('rejects malformed/incomplete periods before dispatch',async()=>{
    const client=new SessionClient(async()=>{assert.fail('Must not dispatch');});
    for(const p of [{startDate:'2026-09-27',endDate:period.endDate},{...period,endDate:'2026-11-25'},{startDate:'2026-02-30',endDate:'2026-03-25'}])
      await assert.rejects(client.exportPeriod(p),{code:'INVALID_INPUT'});
    assert.deepEqual(snapshotExportPeriod({startDate:'2026-12-26',endDate:'2027-01-25'}),{startDate:'2026-12-26',endDate:'2027-01-25'});
  });
  it('rejects wrong attachment, JSON success, missing BOM and partial body without fallback',async()=>{
    for(const response of [new Response('{}',{headers}),new Response(transactionCsv([]),{headers:{...headers,'Content-Disposition':'attachment; filename="other.csv"'}}),
      new Response(transactionCsv([]).slice(1),{headers}),new Response('{}',{headers:{'Content-Type':'application/json'}})])
      await assert.rejects(new SessionClient(async()=>response).exportPeriod(period),{code:'INVALID_RESPONSE'});
    const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(transactionCsv([])));controller.error(new Error('connection lost'));}});
    await assert.rejects(new SessionClient(async()=>new Response(stream,{headers})).exportPeriod(period),{code:'NETWORK_ERROR'});
  });
  it('preserves authentication/size errors; no implicit retries',async()=>{
    for(const [status,code] of [[401,'UNAUTHENTICATED'],[422,'EXPORT_TOO_LARGE'],[503,'EXPORT_UNAVAILABLE']] as const){
      let calls=0;const client=new SessionClient(async()=>{calls++;return new Response(JSON.stringify({error:{code}}),{status});});
      await assert.rejects(client.exportPeriod(period),{status,code});assert.equal(calls,1);
    }
  });
});
