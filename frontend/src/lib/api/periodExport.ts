import {ApiError} from './sessionClient';

const header='"transaction_id","type","date","time","amount","pocket","source_pocket","destination_pocket","category","income_source","transfer_type","note","created_at","updated_at"';
export interface ExportPeriod {startDate:string;endDate:string}
export function snapshotExportPeriod(input:ExportPeriod):ExportPeriod {
  const startDate=input?.startDate,endDate=input?.endDate;
  const valid=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
    Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  if(!valid(startDate)||!valid(endDate)||!startDate.endsWith('-26'))throw new ApiError(400,'INVALID_INPUT');
  const end=new Date(startDate+'T00:00:00Z');end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(25);
  if(end.toISOString().slice(0,10)!==endDate)throw new ApiError(400,'INVALID_INPUT');
  return {startDate,endDate};
}

/** Buffer the full attachment before any download; no JSON/page/local fallback. */
export async function fetchPeriodExport(fetcher:typeof fetch,input:ExportPeriod) {
  const period=snapshotExportPeriod(input);
  const filename=`pocketflow-transactions_${period.startDate}_to_${period.endDate}.csv`;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),40_000);
  try {
    const response=await fetcher(`/v1/transactions/export?${new URLSearchParams({...period})}`,{
      method:'GET',credentials:'include',cache:'no-store',headers:{Accept:'text/csv'},signal:controller.signal});
    if(!response.ok) {
      let code='HTTP_ERROR';try{const body=await response.json();if(typeof body?.error?.code==='string')code=body.error.code;}catch{/* Keep HTTP status. */}
      throw new ApiError(response.status,code);
    }
    if(response.status!==200||response.headers.get('content-type')?.toLowerCase()!=='text/csv; charset=utf-8'||
      response.headers.get('content-disposition')!==`attachment; filename="${filename}"`)
      throw new ApiError(502,'INVALID_RESPONSE');
    const bytes=await response.arrayBuffer();
    const raw=new Uint8Array(bytes);
    if(raw.length>16*1024*1024||raw[0]!==239||raw[1]!==187||raw[2]!==191)throw new ApiError(502,'INVALID_RESPONSE');
    const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
    if(text!==header&&!text.startsWith(header+'\r\n'))throw new ApiError(502,'INVALID_RESPONSE');
    return {filename,blob:new Blob([bytes],{type:'text/csv;charset=utf-8;'}),empty:text===header};
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(0,'NETWORK_ERROR');}
  finally{clearTimeout(timeout);}
}
