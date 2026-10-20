import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportDistribution} from '../../../frontend/src/lib/api/reportDistribution.js';
import type {ServerReport} from '../../../frontend/src/lib/api/reportRead.js';

type Input=Parameters<typeof reportDistribution>[0];
const row=(id:string|null,amount:number,total:number)=>({
  id,label:id??'Tanpa kategori',emoji:null,isMetadataMissing:false,isCurrentlyActive:true,
  amount,transactionCount:1,percentage:amount/total*100,
});
const input=(categories:ServerReport['categories'],paymentPockets:ServerReport['paymentPockets'],totalExpense:number):Input=>({
  categories,paymentPockets,
  totals:{totalExpense,totalIncome:0,netCashFlow:-totalExpense,transferVolume:100000,transactionCount:10,expenseCount:9,incomeCount:0,transferCount:1},
});
test('top five + remainder preserve amounts/counts, null category and server tie ordering',()=>{
  const amounts=[70,60,50,40,30,20,10],total=280;
  const source=input(amounts.map((n,i)=>row(i===0?null:String(i),n,total)),[],total);
  const before=structuredClone(source),result=reportDistribution(source);
  assert.equal(result.categories.length,6);
  assert.equal(result.categories[0].label,'Tanpa kategori');
  assert.equal(result.categories[5].label,'Lainnya');
  assert.equal(result.categories[5].amount,30);
  assert.equal(result.categories[5].transactionCount,2);
  assert.equal(result.categories.reduce((sum,r)=>sum+r.amount,0),total);
  assert.deepEqual(source,before);
  const ties=input([row('b',10,20),row('a',10,20)],[],20);
  assert.deepEqual(reportDistribution(ties).categories.map(r=>r.id),['b','a']);
});
test('pockets retain payment identity and denominator includes pockets outside top five',()=>{
  const amounts=[60,50,40,30,20,10],total=210;
  const source=input([],amounts.map((n,i)=>({...row(String(i),n,total),id:String(i)})),total);
  const {pockets}=reportDistribution(source);
  assert.equal(pockets.length,5);
  assert.equal(pockets[0].percentageOfTop,1);
  assert.equal(pockets[1].percentageOfTop,50/60);
  assert.equal(pockets[0].percentageOfTotal,source.paymentPockets[0].percentage/100);
  assert.equal(pockets.reduce((sum,r)=>sum+r.amount,0),200);
});
test('empty report has no fabricated rows; unresolved IDs never merge with null category',()=>{
  assert.deepEqual(reportDistribution(input([],[],0)),{categories:[],pockets:[]});
  const rows=[row(null,10,20),{...row('unresolved',10,20),label:'Tanpa kategori',isMetadataMissing:true}];
  const {categories}=reportDistribution(input(rows,[],20));
  assert.equal(categories.length,2);
  assert.notEqual(categories[0].id,categories[1].id);
});
