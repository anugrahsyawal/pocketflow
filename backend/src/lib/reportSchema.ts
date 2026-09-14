// Complete response inventory from REPORTS_API_CONTRACT.md. No optional fields.
type Schema = Record<string, unknown>;
const object = (properties: Record<string, Schema>): Schema => ({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const array = (items:Schema):Schema => ({type:'array',items});
const nullable = (s:Schema):Schema => ({anyOf:[s,{type:'null'}]});
const text:Schema = {type:'string'}, bool:Schema = {type:'boolean'};
const amount:Schema = {type:'integer',minimum:-Number.MAX_SAFE_INTEGER,maximum:Number.MAX_SAFE_INTEGER};
const positive:Schema = {...amount,minimum:0};
const ratio:Schema = {type:'number',minimum:0};
const uuid:Schema = {type:'string',pattern:'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'};
const date:Schema = {type:'string',format:'date'};
const enumeration = (...values:string[]):Schema => ({type:'string',enum:values});
const availability = enumeration('available','missing-allocation','historical-unavailable');
const status = nullable(enumeration('aman','waspada','bahaya','overbudget','tanpa-alokasi'));
const budget = object({availability,revisedAllocation:nullable(positive),expense:positive,remaining:nullable(amount),usageRatio:nullable(ratio),status});
const metadata = {id:uuid,label:text,emoji:nullable(text),isMetadataMissing:bool,isCurrentlyActive:bool};
const transfer = object({inAmount:positive,outAmount:positive,netAmount:amount,count:positive});
const transferType = enumeration('normal','tarik-tunai','top-up-nfc','reimbursement','saving-allocation','budget-reallocation');
const breakdown = { ...metadata,amount:positive,transactionCount:positive,percentage:ratio };
const weekNumber:Schema = {type:'integer',enum:[1,2,3,4]};
const fraction = (numerator:Schema) => nullable(object({numerator,denominator:{type:'integer',const:4}}));
export const reportResponseSchema = object({
  schemaVersion:{type:'integer',const:1},generatedAt:{type:'string',format:'date-time'},timezone:{type:'string',const:'Asia/Jakarta'},
  period:object({startDate:date,endDate:date,isCurrent:bool}),
  totals:object({totalIncome:positive,totalExpense:positive,netCashFlow:amount,transferVolume:positive,
    transactionCount:positive,incomeCount:positive,expenseCount:positive,transferCount:positive}),
  daily:array(object({date,income:positive,expense:positive,netCashFlow:amount})),budget,
  pocketBudgetActuals:array(object({...metadata,budget,attributedExpenseCount:positive,paymentExpense:positive,paymentExpenseCount:positive,
    currentBalance:nullable(amount),transfers:transfer,reallocations:transfer,
    transferBreakdown:array(object({type:transferType,inAmount:positive,outAmount:positive,count:positive})),
    attributedBudgets:array(object({pocketId:uuid,label:text,emoji:nullable(text),amount:positive}))})),
  categories:array(object({...breakdown,id:nullable(uuid)})), paymentPockets:array(object(breakdown)),
  weeklyUsage:array(object({weekNumber,startDate:date,endDate:date,
    temporalState:enumeration('selesai','berjalan','akan-datang'),expense:positive,availability,
    allowance:fraction(positive),remaining:fraction(amount),usageRatio:nullable(ratio),status})),
  insights:array(object({id:text,rule:enumeration('overbudget-pocket','running-week-warning','category-concentration','net-cash-flow'),
    severity:enumeration('critical','warning','info','positive'),pocketId:nullable(uuid),categoryId:nullable(uuid),weekNumber:nullable(weekNumber),amount:positive,percentage:nullable(ratio)})),
  sinkingFund:object({status:enumeration('not-near-period-end','available','no-eligible-pockets','no-positive-balance','historical-unavailable'),
    daysRemaining:nullable(positive),suggestedAmount:nullable(positive),
    candidates:array(object({pocketId:uuid,label:text,emoji:nullable(text),currentBalance:amount,eligibleAmount:positive,isExcluded:bool}))})
});
