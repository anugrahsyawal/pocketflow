import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {MasterData,ServerPocket} from '../../../frontend/src/lib/api/masterData.js';
import {homeSnapshot,jakartaDate} from '../../../frontend/src/lib/api/homeSnapshot.js';
const pocket=(currentBalance:number|null,isSpendable=true)=>({currentBalance,isSpendable} as ServerPocket);
const data=(pockets:ServerPocket[]):MasterData=>({isSetupCompleted:true,period:{startDate:'2026-09-26',endDate:'2026-10-25'},pockets,archivedPockets:[]});
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
