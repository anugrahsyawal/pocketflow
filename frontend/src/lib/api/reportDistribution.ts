import type {ServerReport} from './reportRead';
import type {CategoryChartItem,TopPocketSpendingItem} from '../reportCalculations';

/** Presentation adapter only. Preserve the API's amount/label/ID tie ordering. */
export function reportDistribution(report:Pick<ServerReport,'categories'|'paymentPockets'|'totals'>) {
  const categories:CategoryChartItem[]=report.categories.slice(0,5).map(row=>({
    id:row.id??'uncategorized',label:row.label,emoji:row.emoji??undefined,
    amount:row.amount,transactionCount:row.transactionCount,percentage:row.percentage,
  }));
  const rest=report.categories.slice(5);
  if(rest.length){
    const amount=rest.reduce((sum,row)=>sum+row.amount,0);
    categories.push({id:'other',label:'Lainnya',emoji:'📊',amount,
      transactionCount:rest.reduce((sum,row)=>sum+row.transactionCount,0),
      percentage:report.totals.totalExpense>0?amount/report.totals.totalExpense*100:0,
      isCombinedOther:true});
  }
  const topAmount=report.paymentPockets[0]?.amount??0;
  const pockets:TopPocketSpendingItem[]=report.paymentPockets.slice(0,5).map(row=>({
    id:row.id,label:row.label,emoji:row.emoji??undefined,amount:row.amount,
    transactionCount:row.transactionCount,percentageOfTotal:row.percentage/100,
    percentageOfTop:topAmount>0?row.amount/topAmount:0,
  }));
  return {categories,pockets};
}
