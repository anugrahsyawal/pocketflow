import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCurrentBudget} from '../../../frontend/src/lib/api/reportRead.js';
test('Home budget preserves server values, zero, negative remainder and missing allocation',()=>{
  const known={availability:'available',revisedAllocation:100,expense:120,remaining:-20,usageRatio:1.2,status:'overbudget'};
  assert.deepEqual(parseCurrentBudget(known),known);
  assert.equal(parseCurrentBudget({...known,revisedAllocation:0,remaining:-120,usageRatio:null,status:'tanpa-alokasi'}).usageRatio,null);
  assert.equal(parseCurrentBudget({...known,availability:'missing-allocation',revisedAllocation:null,remaining:null,usageRatio:null,status:null}).expense,120);
});
test('Home budget rejects historical, malformed and partial available values',()=>{
  const known={availability:'available',revisedAllocation:100,expense:20,remaining:80,usageRatio:0.2,status:'aman'};
  for(const patch of [{availability:'historical-unavailable'},{availability:'missing-allocation'},{remaining:null},{revisedAllocation:null},{status:'safe'},{expense:NaN},{usageRatio:Infinity},{usageRatio:null},{revisedAllocation:0}])assert.throws(()=>parseCurrentBudget({...known,...patch}),{code:'INVALID_RESPONSE'});
});
