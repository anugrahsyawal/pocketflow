import {useId,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import type {MasterData} from '@/lib/api/masterData';
import type {ServerTransaction} from '@/lib/api/transactionRead';
import {snapshotEditRequest,type TransactionEditChanges} from '@/lib/api/transactionEdit';
import {formatRupiah} from '@/lib/currency';
import {INCOME_SOURCE_LABELS,INCOME_SOURCE_EMOJIS,TRANSFER_TYPE_LABELS,TRANSFER_TYPE_EMOJIS} from '@/data/constants';

const fieldLabels:Record<string,string>={amount:'Nominal',pocketId:'Pocket',fromPocketId:'Pocket asal',toPocketId:'Pocket tujuan',categoryId:'Kategori',incomeSource:'Sumber pemasukan',transferType:'Jenis transfer',occurredOn:'Tanggal',occurredAtLocalTime:'Waktu WIB',note:'Catatan'};
export function EditChangesSummary({changes,data}:{changes:TransactionEditChanges;data:MasterData}){
 const pockets=[...data.pockets,...data.archivedPockets],categories=pockets.flatMap(p=>[...p.categories,...p.archivedCategories]);
 const value=(key:string,v:unknown)=>v===null?'Dikosongkan':key==='amount'?formatRupiah(v as number):
  ['pocketId','fromPocketId','toPocketId'].includes(key)?pockets.find(p=>p.id===v)?.name??String(v):
  key==='categoryId'?categories.find(c=>c.id===v)?.name??String(v):key==='incomeSource'?INCOME_SOURCE_LABELS[String(v)]:
  key==='transferType'?TRANSFER_TYPE_LABELS[String(v)]:String(v);
 return <dl className="space-y-2 break-words text-body-sm">{Object.entries(changes).map(([key,v])=><div key={key}><dt className="text-text-secondary">{fieldLabels[key]}</dt><dd className="font-semibold whitespace-pre-wrap">{value(key,v)}</dd></div>)}</dl>;
}

/** Draft is disposable until confirmation; original revision stays fixed. */
export function TransactionEditForm({transaction:t,ownerId,data,busy,blocked,onCancel,onConfirm}:{transaction:ServerTransaction;ownerId:string;data:MasterData;busy:boolean;blocked:boolean;onCancel:()=>void;onConfirm:(changes:TransactionEditChanges)=>void}){
 const id=useId(),[draft,setDraft]=useState({amount:String(t.amount),pocketId:t.pocketId??t.fromPocketId??'',toPocketId:t.toPocketId??'',categoryId:t.categoryId??'',incomeSource:t.incomeSource??'',transferType:t.transferType??'normal',occurredOn:t.occurredOn,occurredAtLocalTime:t.occurredAtLocalTime,note:t.note??''});
 const [review,setReview]=useState<TransactionEditChanges|null>(null),[error,setError]=useState('');
 const change=(key:keyof typeof draft,value:string)=>{setDraft(d=>({...d,[key]:value,...(key==='pocketId'&&t.type==='expense'?{categoryId:''}:{})}));setError('');};
 const all=[...data.pockets,...data.archivedPockets],selected=all.find(p=>p.id===draft.pocketId);
 const originalPocket=t.pocketId??t.fromPocketId;
 const options=(current:string)=>[...data.pockets,...data.archivedPockets.filter(p=>p.id===current)];
 const selectClass='w-full min-w-0 rounded-input border border-border bg-surface p-3 text-body-sm';
 const chip=(active:boolean)=>`inline-flex flex-[1_1_auto] min-w-fit max-w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-body-sm font-semibold ${active?'border-primary bg-primary-soft text-primary':'border-border bg-background text-text-secondary'}`;
 const prepare=()=>{
  try{
   if(!/^\d+$/.test(draft.amount))throw new Error();
   const changes:TransactionEditChanges={};
   if(Number(draft.amount)!==t.amount)changes.amount=Number(draft.amount);
   for(const key of ['occurredOn','occurredAtLocalTime'] as const)if(draft[key]!==t[key])changes[key]=draft[key];
   if(draft.note!==(t.note??''))changes.note=draft.note||null;
   if(draft.pocketId!==originalPocket){
    if(!data.pockets.some(p=>p.id===draft.pocketId))throw new Error();
    if(t.type==='transfer')changes.fromPocketId=draft.pocketId;else changes.pocketId=draft.pocketId;
   }
   if(t.type==='expense'){
    if(draft.categoryId!==(t.categoryId??'')||draft.pocketId!==t.pocketId){
     if(draft.categoryId&&!selected?.categories.some(c=>c.id===draft.categoryId))throw new Error();
     changes.categoryId=draft.categoryId||null;
    }
   }else if(t.type==='income'){
    if(draft.incomeSource!==(t.incomeSource??''))changes.incomeSource=draft.incomeSource||null;
   }else{
    if(draft.toPocketId===draft.pocketId)throw new Error();
    if(draft.toPocketId!==t.toPocketId){if(!data.pockets.some(p=>p.id===draft.toPocketId))throw new Error();changes.toPocketId=draft.toPocketId;}
    if(draft.transferType!==t.transferType)changes.transferType=draft.transferType;
   }
   if(!Object.keys(changes).length){setError('Belum ada perubahan. Ubah data atau pilih Batal edit.');return;}
   if(!data.pockets.some(p=>p.id===draft.pocketId)||(t.type==='transfer'&&!data.pockets.some(p=>p.id===draft.toPocketId))){
    setError('Pocket yang dipilih sudah diarsipkan atau tidak tersedia. Pilih pocket aktif sebelum menyimpan perubahan.');return;
   }
   if(t.type==='expense'&&draft.categoryId&&!selected?.categories.some(c=>c.id===draft.categoryId)){
    setError('Kategori tersimpan sudah diarsipkan atau tidak tersedia. Pilih kategori aktif atau Tanpa kategori sebelum menyimpan perubahan.');return;
   }
   setReview(snapshotEditRequest({ownerId,transactionId:t.id,transactionType:t.type,clientMutationId:crypto.randomUUID(),expectedRevision:t.revision,changes}).changes);
  }catch{setError('Periksa nominal rupiah bulat lebih dari 0, pocket/kategori, tanggal, waktu dan catatan maksimal 500 karakter.');}
 };
 return <div className="space-y-3 rounded-input border border-border bg-background p-3">
  <h3 className="font-display text-headline-md">Edit {{expense:'pengeluaran',income:'pemasukan',transfer:'transfer'}[t.type]}</h3>
  <p className="text-body-sm text-text-secondary">Transaksi asli: {formatRupiah(t.amount)} · {t.occurredOn} · {t.occurredAtLocalTime} WIB. Jenis transaksi tetap.{t.isArchived?' Transaksi tetap diarsipkan.':''}</p>
  {review?<section aria-label="Konfirmasi edit transaksi" className="space-y-3">
   <h4 className="font-semibold">Periksa perubahan</h4><EditChangesSummary changes={review} data={data}/>
   <p className="text-body-sm">Hanya kolom di atas yang dikirim. Setelah konfirmasi, permintaan disimpan untuk pemulihan dan tidak dapat diubah sampai hasil server diketahui.</p>
   <Button fullWidth className="h-auto min-h-11 py-2" disabled={blocked} loading={busy} onClick={()=>onConfirm(review)}>Konfirmasi simpan perubahan</Button>
   <Button fullWidth variant="ghost" disabled={busy} onClick={()=>setReview(null)}>Kembali ke edit</Button>
  </section>:<form aria-label="Form edit transaksi" className="space-y-3" onSubmit={e=>{e.preventDefault();prepare();}}>
   <fieldset disabled={busy||blocked} className="min-w-0 space-y-3">
    <Input label="Nominal edit" inputMode="numeric" value={draft.amount} onChange={e=>change('amount',e.target.value)} required/>
    <label className="block text-body-sm" htmlFor={`${id}-pocket`}>{t.type==='transfer'?'Pocket asal':'Pocket transaksi'}</label>
    <select id={`${id}-pocket`} className={selectClass} value={draft.pocketId} onChange={e=>change('pocketId',e.target.value)}>
     {!all.some(p=>p.id===originalPocket)&&<option value={originalPocket??''}>Pocket lama tidak tersedia</option>}
     {options(originalPocket??'').map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}{data.archivedPockets.includes(p)?' (diarsipkan)':''}</option>)}
    </select>
    {t.type==='expense'&&<fieldset className="min-w-0 space-y-2"><legend>Kategori (opsional)</legend><div className="flex flex-wrap gap-2">
     <button type="button" className={chip(!draft.categoryId)} aria-pressed={!draft.categoryId} onClick={()=>change('categoryId','')}>Tanpa kategori</button>
     {selected?.categories.map(c=><button type="button" key={c.id} className={chip(draft.categoryId===c.id)} aria-pressed={draft.categoryId===c.id} onClick={()=>change('categoryId',c.id)}>{c.emoji} {c.name}</button>)}
     {draft.categoryId&&!selected?.categories.some(c=>c.id===draft.categoryId)&&<span className="text-body-sm">Kategori lama tidak aktif. Pilih kategori aktif atau Tanpa kategori untuk menyimpan edit.</span>}
    </div></fieldset>}
    {t.type==='income'&&<fieldset className="min-w-0 space-y-2"><legend>Sumber pemasukan</legend><div className="flex flex-wrap gap-2">
     {['',...Object.keys(INCOME_SOURCE_LABELS)].map(key=><button key={key} type="button" className={chip(draft.incomeSource===key)} aria-pressed={draft.incomeSource===key} onClick={()=>change('incomeSource',key)}>{INCOME_SOURCE_EMOJIS[key]} {INCOME_SOURCE_LABELS[key]??'Tanpa sumber'}</button>)}
    </div></fieldset>}
    {t.type==='transfer'&&<>
     <label htmlFor={`${id}-to`} className="block text-body-sm">Pocket tujuan</label><select id={`${id}-to`} className={selectClass} value={draft.toPocketId} onChange={e=>change('toPocketId',e.target.value)}>
      {!all.some(p=>p.id===t.toPocketId)&&<option value={t.toPocketId??''}>Pocket lama tidak tersedia</option>}
      {options(t.toPocketId??'').map(p=><option key={p.id} value={p.id} disabled={p.id===draft.pocketId}>{p.emoji} {p.name}</option>)}
     </select><fieldset className="min-w-0 space-y-2"><legend>Jenis transfer</legend><div className="flex flex-wrap gap-2">{Object.keys(TRANSFER_TYPE_LABELS).map(key=><button key={key} type="button" className={chip(draft.transferType===key)} aria-pressed={draft.transferType===key} onClick={()=>change('transferType',key)}>{TRANSFER_TYPE_EMOJIS[key]} {TRANSFER_TYPE_LABELS[key]}</button>)}</div></fieldset>
     <p className="text-body-sm">Transfer bukan pengeluaran/pemasukan. Pindah alokasi juga mengubah budget periode 26–25 sesuai tanggal transaksi; server memeriksa saldo dan alokasi.</p>
    </>}
    <Input label="Tanggal edit" type="date" value={draft.occurredOn} onChange={e=>change('occurredOn',e.target.value)} required/>
    <Input label="Waktu edit (WIB)" type="time" step="1" value={draft.occurredAtLocalTime} onChange={e=>change('occurredAtLocalTime',e.target.value)} required/>
    <Input label="Catatan edit" value={draft.note} maxLength={500} onChange={e=>change('note',e.target.value)}/>
    {error&&<p role="alert" className="text-bahaya text-body-sm">{error}</p>}
    <p className="text-body-sm text-text-secondary">Saldo dan budget dihitung server, bukan diubah di perangkat. Budget pengeluaran lama dipertahankan kecuali pocket pembayaran berubah.</p>
    <Button fullWidth type="submit">Tinjau perubahan</Button>
   </fieldset>
  </form>}
  <Button fullWidth variant="ghost" disabled={busy} onClick={onCancel}>Batal edit</Button>
 </div>;
}
