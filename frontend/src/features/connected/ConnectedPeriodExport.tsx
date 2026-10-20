import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {ApiError,SessionClient,sessionErrorMessage} from '@/lib/api/sessionClient';
import {getBudgetPeriodByOffset} from '@/lib/budgetPeriod';
import type {ExportPeriod} from '@/lib/api/periodExport';
import {useConnectedReport} from './useConnectedReport';
import {ConnectedReportSummary} from './ConnectedReportSummary';

/** Development integration surface; does not cut over the local Reports page. */
export function ConnectedPeriodExport({client,currentPeriod,onExpired}:{client:SessionClient;currentPeriod:ExportPeriod;onExpired:()=>void}) {
  const [offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const running=useRef(false),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const year=Number(currentPeriod.startDate.slice(0,4)),month=Number(currentPeriod.startDate.slice(5,7));
  const period=getBudgetPeriodByOffset(offset,new Date(year,month-1,26));
  const reportState=useConnectedReport(client,period.startDate,onExpired);
  const move=(amount:number)=>{setOffset(n=>n+amount);setMessage('');setError('');};
  const download=async()=>{
    if(running.current)return;running.current=true;setBusy(true);setMessage('');setError('');
    try {
      const result=await client.exportPeriod(period);
      if(!active.current)return;
      if(result.empty){setMessage('Tidak ada transaksi aktif pada periode ini untuk diekspor.');return;}
      const url=URL.createObjectURL(result.blob),link=document.createElement('a');
      try{link.href=url;link.download=result.filename;document.body.appendChild(link);link.click();}
      finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}
      setMessage(`CSV lengkap periode ${period.label} siap diunduh.`);
    }catch(cause){
      if(!active.current)return;
      if(cause instanceof ApiError&&cause.status===401){onExpired();return;}
      setError(cause instanceof ApiError&&cause.code==='EXPORT_TOO_LARGE'?
        'Data periode ini melampaui kapasitas export. Tidak ada file yang diunduh.':
        `${sessionErrorMessage(cause)} Tidak ada file yang diunduh.`);
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <section aria-label="Export periode server" className="space-y-4 rounded-card border border-border bg-surface p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-headline-md">Laporan</h2>
      <Button size="sm" variant="secondary" aria-label="Export CSV" disabled={reportState.loading||!!reportState.error} loading={busy} onClick={()=>void download()} icon={<span aria-hidden="true" className="material-symbols-rounded text-lg">download</span>}>Export CSV</Button>
    </div>
    <div className="flex w-full items-center justify-between gap-2 rounded-pill border border-border p-2">
      <Button variant="ghost" size="sm" disabled={busy||year+Math.floor((month-1+offset)/12)<=100} aria-label="Periode export sebelumnya" onClick={()=>move(-1)}>‹</Button>
      <div className="min-w-0 text-center text-body-sm"><p className="font-semibold text-primary">{offset===0?'Periode berjalan':'Periode historis'}</p><p>{period.label}</p></div>
      <Button variant="ghost" size="sm" disabled={busy||offset===0} aria-label="Periode export berikutnya" onClick={()=>move(1)}>›</Button>
    </div>
    {reportState.loading?<p role="status" className="text-body-sm">Memuat laporan periode ini…</p>:reportState.error?<div className="space-y-2">
      <p role="alert" className="text-body-sm text-bahaya">{reportState.error} Angka laporan belum ditampilkan.</p>
      <Button size="sm" variant="secondary" onClick={reportState.reload}>Coba lagi laporan</Button>
    </div>:reportState.report&&<ConnectedReportSummary report={reportState.report}/>}
    <p className="text-body-sm text-text-secondary">Pratinjau integrasi server: distribusi, mingguan, dan insight menyusul. Laporan lokal tidak berubah.</p>
    <p className="text-body-sm text-text-secondary">Seluruh transaksi aktif periode ini dari server, termasuk transfer. Tidak dibatasi halaman atau filter riwayat. Transaksi arsip dan yang dihapus tidak disertakan.</p>
    {message&&<p role="status" className="text-body-sm break-words">{message}</p>}
    {error&&<p role="alert" className="text-body-sm text-bahaya break-words">{error}</p>}
  </section>;
}
