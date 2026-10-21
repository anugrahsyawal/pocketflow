import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportInsights} from '../../../frontend/src/lib/api/reportInsights.js';
type Input=Parameters<typeof reportInsights>[0];
const fact=(rule:Input['insights'][number]['rule'],overrides:Partial<Input['insights'][number]>={}):Input['insights'][number]=>({
  id:rule,rule,severity:'info',pocketId:null,categoryId:null,weekNumber:null,amount:18000,percentage:100,...overrides,
});
test('translates all server rules, preserves ordering/severity and never invents drivers',()=>{
 const input:Input={categories:[],pocketBudgetActuals:[],insights:[
  fact('overbudget-pocket',{severity:'critical',pocketId:'missing'}),
  fact('running-week-warning',{severity:'warning',weekNumber:2,percentage:75}),
  fact('category-concentration'),
  fact('net-cash-flow',{severity:'positive',percentage:null}),
 ]};
 const before=structuredClone(input),result=reportInsights(input);
 assert.deepEqual(input,before);
 assert.deepEqual(result.map(x=>x.id),input.insights.map(x=>x.id));
 assert.deepEqual(result.map(x=>x.severity),input.insights.map(x=>x.severity));
 assert.match(result[0].message,/Pocket tidak tersedia/);
 assert.match(result[1].message,/Minggu 2.*75%/);
 assert.doesNotMatch(result[1].message,/kategori|Transportation|disebabkan/i);
 assert.match(result[2].message,/Tanpa kategori/);
 assert.equal(result[3].title,'Surplus arus kas');
 assert.match(result[3].message,/Rp18.000/);
});
test('category identity lookup distinguishes null from unresolved ID; empty stays empty',()=>{
 const category=(id:string|null,label:string)=>({id,label,emoji:null,isMetadataMissing:false,isCurrentlyActive:true,amount:18000,transactionCount:1,percentage:100});
 const input:Input={pocketBudgetActuals:[],categories:[category(null,'Tanpa kategori'),category('other','Label server')],insights:[fact('category-concentration',{categoryId:'other'})]};
 assert.match(reportInsights(input)[0].message,/Label server/);
 input.insights=[fact('net-cash-flow',{severity:'warning',percentage:null})];
 assert.equal(reportInsights(input)[0].title,'Defisit arus kas');
 input.insights=[];
 assert.deepEqual(reportInsights(input),[]);
});
