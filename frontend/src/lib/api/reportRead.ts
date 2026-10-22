import {ApiError} from './sessionClient';

type Decoder<T>=(value:unknown)=>T;
const invalid=():never=>{throw new ApiError(502,'INVALID_RESPONSE');};
const text:Decoder<string>=v=>typeof v==='string'?v:invalid();
const bool:Decoder<boolean>=v=>typeof v==='boolean'?v:invalid();
const amount:Decoder<number>=v=>typeof v==='number'&&Number.isSafeInteger(v)&&!Object.is(v,-0)?v:invalid();
const positive:Decoder<number>=v=>amount(v)>=0?v as number:invalid();
const ratio:Decoder<number>=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&!Object.is(v,-0)?v:invalid();
const nullable=<T>(decode:Decoder<T>):Decoder<T|null>=>v=>v===null?null:decode(v);
const array=<T>(decode:Decoder<T>):Decoder<T[]>=>v=>Array.isArray(v)?v.map(decode):invalid();
const enumeration=<T extends string|number>(...values:T[]):Decoder<T>=>v=>values.includes(v as T)?v as T:invalid();
const object=<S extends Record<string,Decoder<unknown>>>(shape:S):Decoder<{[K in keyof S]:ReturnType<S[K]>}>=>v=>{
  if(!v||typeof v!=='object'||Array.isArray(v))return invalid();
  const value=v as Record<string,unknown>;
  if(Object.keys(value).length!==Object.keys(shape).length||Object.keys(value).some(k=>!(k in shape)))return invalid();
  return Object.fromEntries(Object.entries(shape).map(([key,decode])=>[key,decode(value[key])])) as {[K in keyof S]:ReturnType<S[K]>};
};
const uuid:Decoder<string>=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:invalid();
const date:Decoder<string>=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v?v:invalid();
const instant:Decoder<string>=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v?v:invalid();
const availability=enumeration('available','missing-allocation','historical-unavailable');
const status=nullable(enumeration('aman','waspada','bahaya','overbudget','tanpa-alokasi'));
const budget=object({availability,revisedAllocation:nullable(positive),expense:positive,remaining:nullable(amount),usageRatio:nullable(ratio),status});
export function parseCurrentBudget(value:unknown) {
  const result=budget(value);
  if(result.availability==='historical-unavailable')invalid();
  if(result.availability==='available') {
    if(result.revisedAllocation===null||result.remaining===null)invalid();
    // A missing ratio is valid only for known zero, not an unknown positive budget.
    if((result.revisedAllocation===0)!==(result.usageRatio===null))invalid();
  } else if(result.revisedAllocation!==null||result.remaining!==null||result.usageRatio!==null||result.status!==null)invalid();
  return result;
}
const metadata={id:uuid,label:text,emoji:nullable(text),isMetadataMissing:bool,isCurrentlyActive:bool};
const transfer=object({inAmount:positive,outAmount:positive,netAmount:amount,count:positive});
const breakdown={...metadata,amount:positive,transactionCount:positive,percentage:ratio};
const weekNumber=enumeration(1,2,3,4);
const fraction=(numerator:Decoder<number>)=>nullable(object({numerator,denominator:enumeration(4)}));
const decodeReport=object({
  schemaVersion:enumeration(1),generatedAt:instant,timezone:enumeration('Asia/Jakarta'),
  period:object({startDate:date,endDate:date,isCurrent:bool}),
  totals:object({totalIncome:positive,totalExpense:positive,netCashFlow:amount,transferVolume:positive,transactionCount:positive,incomeCount:positive,expenseCount:positive,transferCount:positive}),
  daily:array(object({date,income:positive,expense:positive,netCashFlow:amount})),budget,
  pocketBudgetActuals:array(object({...metadata,budget,attributedExpenseCount:positive,paymentExpense:positive,paymentExpenseCount:positive,currentBalance:nullable(amount),transfers:transfer,reallocations:transfer,
    transferBreakdown:array(object({type:enumeration('normal','tarik-tunai','top-up-nfc','reimbursement','saving-allocation','budget-reallocation'),inAmount:positive,outAmount:positive,count:positive})),
    attributedBudgets:array(object({pocketId:uuid,label:text,emoji:nullable(text),amount:positive}))})),
  categories:array(object({...breakdown,id:nullable(uuid)})),paymentPockets:array(object(breakdown)),
  weeklyUsage:array(object({weekNumber,startDate:date,endDate:date,temporalState:enumeration('selesai','berjalan','akan-datang'),expense:positive,availability,allowance:fraction(positive),remaining:fraction(amount),usageRatio:nullable(ratio),status})),
  insights:array(object({id:text,rule:enumeration('overbudget-pocket','running-week-warning','category-concentration','net-cash-flow'),severity:enumeration('critical','warning','info','positive'),pocketId:nullable(uuid),categoryId:nullable(uuid),weekNumber:nullable(weekNumber),amount:positive,percentage:nullable(ratio)})),
  sinkingFund:object({status:enumeration('not-near-period-end','available','no-eligible-pockets','no-positive-balance','historical-unavailable'),daysRemaining:nullable(positive),suggestedAmount:nullable(positive),candidates:array(object({pocketId:uuid,label:text,emoji:nullable(text),currentBalance:amount,eligibleAmount:positive,isExcluded:bool}))})
});
export type ServerReport=ReturnType<typeof decodeReport>;
export interface ReportQuery {startDate?:string;excludedPocketIds?:readonly string[]}
export function reportQuery(input:ReportQuery={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)||(input.excludedPocketIds!==undefined&&!Array.isArray(input.excludedPocketIds)))throw new ApiError(400,'INVALID_INPUT');
  const {startDate}=input,ids=[...(input.excludedPocketIds??[])];
  if(Object.keys(input).some(k=>!['startDate','excludedPocketIds'].includes(k))||
    (startDate!==undefined&&(!/^\d{4}-(0[1-9]|1[0-2])-26$/.test(startDate)||Number(startDate.slice(0,4))<1||Number(startDate.slice(0,4))>9998))||ids.length>100)
    throw new ApiError(400,'INVALID_INPUT');
  try{ids.forEach(uuid);}catch{throw new ApiError(400,'INVALID_INPUT');}
  const normalized=[...new Set(ids.map(id=>id.toLowerCase()))];
  const path=startDate===undefined?'/reports/current-period':`/reports/periods/${startDate}`;
  return {startDate,path:path+(normalized.length?`?${new URLSearchParams({excludedPocketIds:normalized.join(',')})}`:'')};
}
export function parseReport(value:unknown,query:ReturnType<typeof reportQuery>):ServerReport {
  const report=decodeReport(value),p=report.period;
  if(!/^\d{4}-(0[1-9]|1[0-2])-26$/.test(p.startDate))invalid();
  const end=new Date(p.startDate+'T00:00:00Z');end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(25);
  if(end.toISOString().slice(0,10)!==p.endDate||(query.startDate===undefined?!p.isCurrent:query.startDate!==p.startDate))invalid();
  const budgets=[report.budget,...report.pocketBudgetActuals.map(p=>p.budget)];
  for(const b of budgets){
    if(!p.isCurrent&&b.availability!=='historical-unavailable')invalid();
    if(p.isCurrent&&b.availability==='historical-unavailable')invalid();
    if(b.availability==='available'&&(b.revisedAllocation===null||b.remaining===null))invalid();
    if(b.availability!=='available'&&(b.revisedAllocation!==null||b.remaining!==null||b.usageRatio!==null||b.status!==null))invalid();
  }
  if(!p.isCurrent&&(report.pocketBudgetActuals.some(p=>p.currentBalance!==null)||report.sinkingFund.status!=='historical-unavailable'))invalid();
  if(!p.isCurrent&&(report.weeklyUsage.some(w=>w.availability!=='historical-unavailable'||w.allowance!==null||w.remaining!==null||w.usageRatio!==null||w.status!==null)||
    report.sinkingFund.daysRemaining!==null||report.sinkingFund.suggestedAmount!==null||report.sinkingFund.candidates.length!==0))invalid();
  return report;
}

/** UI-neutral generation gate. Never publish an old response/error after navigation or logout. */
export class LatestReportRequest {
  private generation=0;
  invalidate(){this.generation++;}
  async run<T>(load:()=>Promise<T>):Promise<{kind:'ready';value:T}|{kind:'error';error:unknown}|{kind:'stale'}> {
    const generation=++this.generation;
    try{const value=await load();return generation===this.generation?{kind:'ready',value}:{kind:'stale'};}
    catch(error){return generation===this.generation?{kind:'error',error}:{kind:'stale'};}
  }
}
