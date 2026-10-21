import type {MasterData,ServerPocket} from './masterData';

function sumBalances(pockets:readonly ServerPocket[]):number|null {
  if(pockets.some(p=>p.currentBalance===null))return null;
  const total=pockets.reduce((sum,p)=>sum+BigInt(p.currentBalance!),0n);
  return total>BigInt(Number.MAX_SAFE_INTEGER)||total<BigInt(Number.MIN_SAFE_INTEGER)?null:Number(total);
}
/** Aggregate each active server wallet once; never use allocation as available money. */
export function homeSnapshot(data:MasterData,today:string) {
  const total=sumBalances(data.pockets),spendable=sumBalances(data.pockets.filter(p=>p.isSpendable));
  const period=data.period;
  const days=period&&today>=period.startDate&&today<=period.endDate?
    Math.round((Date.parse(period.endDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000)+1:null;
  const remainingDays=days!==null&&Number.isFinite(days)&&days>0?days:null;
  const safePerDay=spendable===null||remainingDays===null?null:Math.max(0,Math.floor(spendable/remainingDays));
  return {total,spendable,safePerDay,remainingDays};
}
export function jakartaDate(now=new Date()):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
}
