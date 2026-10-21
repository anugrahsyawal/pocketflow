import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatWeeklyAmount} from '../../../frontend/src/lib/api/weeklyDisplay.js';
test('quarter rupiah values remain exact, including negative and safe-integer boundaries',()=>{
  for(const [numerator,expected] of [[0,'Rp0'],[1,'Rp0,25'],[2,'Rp0,50'],[3,'Rp0,75'],[4001,'Rp1.000,25'],[-1,'-Rp0,25'],[-4003,'-Rp1.000,75'],[Number.MAX_SAFE_INTEGER,'Rp2.251.799.813.685.247,75']] as const){
    assert.equal(formatWeeklyAmount({numerator,denominator:4}),expected);
  }
});
