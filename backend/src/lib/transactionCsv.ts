import { AppError } from './errors.js';

export const EXPORT_MAX_ROWS = 10_000;
export const EXPORT_MAX_BYTES = 16 * 1024 * 1024;
export const CSV_COLUMNS = ['transaction_id','type','date','time','amount','pocket',
  'source_pocket','destination_pocket','category','income_source','transfer_type',
  'note','created_at','updated_at'] as const;

export interface ExportRow {
  id:string; type:string; amount:string; occurredOn:string; occurredAtLocalTime:string;
  pocket:string|null; source:string|null; destination:string|null; category:string|null;
  incomeSource:string|null; transferType:string|null; note:string|null;
  createdAt:Date; updatedAt:Date;
}

function quote(value:string|null):string {
  const text=value??'';
  const safe=/^[=+\-@]/.test(text.trim())?`'${text}`:text;
  return `"${safe.replace(/"/g,'""')}"`;
}

export function transactionCsv(rows:ExportRow[]):string {
  const tooLarge=()=>new AppError('Export exceeds the supported size; no file was generated',422,'EXPORT_TOO_LARGE');
  if(rows.length>EXPORT_MAX_ROWS)throw tooLarge();
  const lines=['\uFEFF'+CSV_COLUMNS.map(quote).join(',')];
  let bytes=Buffer.byteLength(lines[0],'utf8');
  for(const row of rows) {
    // SQL casts BIGINT to text; never round a monetary value through Number.
    if(!/^[1-9]\d*$/.test(row.amount)||BigInt(row.amount)>BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new AppError('An internal server error occurred',500,'INTERNAL_SERVER_ERROR');
    }
    const transfer=row.type==='transfer';
    const line=[row.id,row.type,row.occurredOn,row.occurredAtLocalTime,row.amount,
      transfer?'':row.pocket??'Pocket tidak tersedia',
      transfer?row.source??'Pocket tidak tersedia':'',
      transfer?row.destination??'Pocket tidak tersedia':'',
      row.type==='expense'?row.category??'Tanpa kategori':'',row.incomeSource,row.transferType,
      row.note,row.createdAt.toISOString(),row.updatedAt.toISOString()].map(quote).join(',');
    bytes+=2+Buffer.byteLength(line,'utf8');
    if(bytes>EXPORT_MAX_BYTES)throw tooLarge();
    lines.push(line);
  }
  return lines.join('\r\n');
}
