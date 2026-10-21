import type {ServerReport} from './reportRead';
import type {ReportInsight} from '../reportCalculations';
import {formatRupiah} from '../currency';

/** Translate server facts only; eligibility, ranking and limits belong to the API. */
export function reportInsights(report:Pick<ServerReport,'insights'|'categories'|'pocketBudgetActuals'>):ReportInsight[] {
  return report.insights.map(fact=>{
    const percentage=fact.percentage===null?'persentase belum tersedia':`${new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(fact.percentage)}%`;
    const amount=formatRupiah(fact.amount);
    let title:string,message:string;
    switch(fact.rule){
      case 'overbudget-pocket':{
        const label=report.pocketBudgetActuals.find(p=>p.id===fact.pocketId)?.label??'Pocket tidak tersedia';
        title='Pemakaian budget mencapai batas';
        message=`Budget ${label} telah terpakai ${percentage}, dengan pengeluaran ${amount}.`;
        break;
      }
      case 'running-week-warning':
        title='Perhatikan pemakaian minggu berjalan';
        message=`${fact.weekNumber===null?'Minggu berjalan':`Minggu ${fact.weekNumber}`} telah memakai ${percentage} target mingguan, dengan pengeluaran ${amount}.`;
        break;
      case 'category-concentration':{
        const label=report.categories.find(c=>c.id===fact.categoryId)?.label??'Tanpa kategori';
        title='Kategori pengeluaran terbesar';
        message=`${label} menyumbang ${percentage} dari seluruh pengeluaran periode terpilih (${amount}).`;
        break;
      }
      case 'net-cash-flow':
        title=fact.severity==='positive'?'Surplus arus kas':'Defisit arus kas';
        message=fact.severity==='positive'?`Pemasukan melebihi pengeluaran sebesar ${amount} pada periode terpilih.`:`Pengeluaran melebihi pemasukan sebesar ${amount} pada periode terpilih.`;
        break;
    }
    return {id:fact.id,severity:fact.severity,title,message};
  });
}
