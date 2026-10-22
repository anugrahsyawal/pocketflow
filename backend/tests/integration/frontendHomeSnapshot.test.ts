import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {MasterData,ServerPocket} from '../../../frontend/src/lib/api/masterData.js';
import {homeSnapshot,homePocketCards,homeAttention,jakartaDate} from '../../../frontend/src/lib/api/homeSnapshot.js';
const pocket=(currentBalance:number|null,isSpendable=true)=>({currentBalance,isSpendable} as ServerPocket);
const data=(pockets:ServerPocket[]):MasterData=>({isSetupCompleted:true,period:{startDate:'2026-09-26',endDate:'2026-10-25'},pockets,archivedPockets:[]});

test('attention respects server severity, max two, payment-wallet exclusion and unknown safety',()=>{
 const p=(id:string,status:ServerPocket['budgetStatus'],templateKey:string|null=null)=>({...pocket(0),id,templateKey,budgetStatus:status});
 assert.deepEqual(homeAttention([p('a','waspada'),p('b','overbudget'),p('c','bahaya'),p('d','overbudget','cash')]).alerts.map(p=>p.id),['b','c']);
 assert.equal(homeAttention([p('a','aman')]).allSafe,true);
 for(const state of [null,undefined,'tanpa-alokasi'] as const)assert.equal(homeAttention([p('a','aman'),p('b',state)]).allSafe,false);
 assert.equal(homeAttention([]).allSafe,false);
});

test('carousel pairs stable template IDs, retains orphan wallets and every other active pocket once',()=>{
 const p=(id:string,key:string|null,balance:number|null)=>({...pocket(balance),id,templateKey:key,name:'Renamed'});
 const rows=[p('extra',null,20),p('cash','cash',50),p('nfc','nfc-card',82),p('transport','transportation',100),p('food','food-groceries',1300)];
 const cards=homePocketCards(rows);
 assert.deepEqual(cards.map(c=>c.members.map(p=>p.id)),[['transport','nfc'],['food','cash'],['extra']]);
 assert.deepEqual(cards.map(c=>c.total),[182,1350,20]);
 assert.equal(new Set(cards.flatMap(c=>c.members.map(p=>p.id))).size,rows.length);
 assert.deepEqual(homePocketCards([rows[1]!]).map(c=>c.members.map(p=>p.id)),[['cash']]);
 assert.equal(homePocketCards([p('t','transportation',null),rows[2]!])[0]!.total,null);
 assert.deepEqual(homePocketCards([]),[]);
});
test('wallets count once, spendable classification respected, inclusive Jakarta days',()=>{
 const value=homeSnapshot(data([pocket(100000),pocket(82000),pocket(1300000),pocket(50000),pocket(400000,false)]),'2026-10-21');
 assert.deepEqual(value,{total:1932000,spendable:1532000,safePerDay:306400,remainingDays:5});
 assert.equal(jakartaDate(new Date('2026-10-20T17:00:00Z')),'2026-10-21');
 assert.equal(homeSnapshot(data([pocket(100)]),'2026-10-25').safePerDay,100);
});
test('unknown and overflow never become zero; negative balance only clamps safe per day',()=>{
 assert.equal(homeSnapshot(data([pocket(null)]),'2026-10-21').total,null);
 const unknownNonspendable=homeSnapshot(data([pocket(null,false),pocket(100)]),'2026-10-21');
 assert.equal(unknownNonspendable.total,null);assert.equal(unknownNonspendable.spendable,100);
 assert.equal(homeSnapshot(data([pocket(Number.MAX_SAFE_INTEGER),pocket(1)]),'2026-10-21').total,null);
 assert.equal(homeSnapshot(data([pocket(-100)]),'2026-10-21').spendable,-100);
 assert.equal(homeSnapshot(data([pocket(-100)]),'2026-10-21').safePerDay,0);
});
test('empty is truthful zero; stale period has no daily estimate',()=>{
 assert.equal(homeSnapshot(data([]),'2026-10-21').total,0);
 assert.equal(homeSnapshot(data([pocket(100)]),'2026-10-26').safePerDay,null);
 assert.equal(homeSnapshot(data([pocket(100)]),'2026-09-25').remainingDays,null);
});
