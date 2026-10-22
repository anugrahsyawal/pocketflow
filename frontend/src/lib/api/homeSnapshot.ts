import type {MasterData,ServerPocket} from './masterData';

export function sumBalances(pockets:readonly ServerPocket[]):number|null {
  if(pockets.some(p=>p.currentBalance===null))return null;
  const total=pockets.reduce((sum,p)=>sum+BigInt(p.currentBalance!),0n);
  return total>BigInt(Number.MAX_SAFE_INTEGER)||total<BigInt(Number.MIN_SAFE_INTEGER)?null:Number(total);
}
/** Visual template pairs only; grouping never changes expense budget attribution. */
export function homePocketCards(pockets:readonly ServerPocket[]) {
  const used=new Set<string>();
  const cards:{id:string;members:ServerPocket[];total:number|null}[]=[];
  for(const keys of [['transportation','nfc-card'],['food-groceries','cash']]) {
    const members=keys.flatMap(key=>pockets.filter(p=>p.templateKey===key&&!used.has(p.id)));
    if(members.length){members.forEach(p=>used.add(p.id));cards.push({id:members[0]!.id,members,total:sumBalances(members)});}
  }
  for(const pocket of pockets)if(!used.has(pocket.id))cards.push({id:pocket.id,members:[pocket],total:pocket.currentBalance});
  return cards;
}
export function homeAttention(pockets:readonly ServerPocket[]) {
  const owners=homePocketCards(pockets).flatMap(c=>c.members).filter(p=>p.templateKey!=='cash'&&p.templateKey!=='nfc-card');
  const severity={aman:0,'tanpa-alokasi':0,waspada:1,bahaya:2,overbudget:3};
  return {
    alerts:owners.filter(p=>p.budgetStatus&&severity[p.budgetStatus]>0)
      .sort((a,b)=>severity[b.budgetStatus!]-severity[a.budgetStatus!]).slice(0,2),
    allSafe:owners.length>0&&owners.every(p=>p.budgetStatus==='aman'),
  };
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
