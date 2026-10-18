import {useEffect,useId,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {ApiError,SessionClient} from '@/lib/api/sessionClient';
import {parseTransactionAttempt,TransactionAttemptStore,TransactionStorageError,type TransactionAttempt,type TransactionRecoveryRecord} from '@/lib/api/transactionAttempt';
import type {ServerPocket} from '@/lib/api/masterData';
import {formatRupiah} from '@/lib/currency';
import {INCOME_SOURCE_LABELS,INCOME_SOURCE_EMOJIS,TRANSFER_TYPE_LABELS,TRANSFER_TYPE_EMOJIS} from '@/data/constants';
import {BatchExpenseForm} from './BatchExpenseForm';

const transactionNames={expense:'pengeluaran',income:'pemasukan',transfer:'transfer'};

function jakartaNow(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const value=(type:string)=>parts.find(p=>p.type===type)!.value;
  return {date:`${value('year')}-${value('month')}-${value('day')}`,time:`${value('hour')}:${value('minute')}`};
}
export function TransactionCreateForm({ownerId,pockets,client,onReload,onResolved,onExpired,onLock}:{ownerId:string;pockets:ServerPocket[];client:SessionClient;onReload:()=>void;onResolved:(status:'cancelled'|'committed')=>void;onExpired:()=>void;onLock:(locked:boolean)=>void}){
  const [store]=useState(()=>new TransactionAttemptStore()),[now]=useState(jakartaNow),id=useId();
  const [record,setPending]=useState<TransactionRecoveryRecord|null>(null),[ready,setReady]=useState(false),[opened,setOpened]=useState(false);
  const pending=record?.operation==='create'?record:null;
  const batch=record?.operation==='batch'?record:null;
  const lifecycle=record&&record.operation!=='create'&&record.operation!=='batch'?record:null;
  const [pocketId,setPocket]=useState(pockets[0]?.id??''),[categoryId,setCategory]=useState(''),[amount,setAmount]=useState('');
  const [date,setDate]=useState(now.date),[time,setTime]=useState(now.time),[note,setNote]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [confirmStop,setConfirmStop]=useState(false);
  const [batchOpened,setBatchOpened]=useState(false);
  const [kind,setKind]=useState<'expense'|'income'|'transfer'>('expense'),[incomeSource,setIncomeSource]=useState('');
  const [toPocketId,setToPocket]=useState(''),[transferType,setTransferType]=useState('normal');
  const noun=transactionNames[kind];
  const running=useRef(false),active=useRef(true),selected=pockets.find(p=>p.id===pocketId);
  const pendingPocketId=pending&&pending.body.type!=='transfer'?pending.body.pocketId:null;
  const pocketName=(value:string)=>pockets.find(p=>p.id===value)?.name??value;
  const inspect=async()=>{try{const record=await store.read(ownerId);if(active.current){setPending(record);setReady(true);setMessage('');}}
    catch{if(active.current){setReady(false);setMessage('Penyimpanan pemulihan tidak tersedia atau rusak. Pengiriman diblokir; jangan hapus data situs.');}}};
  useEffect(()=>{active.current=true;void inspect();return()=>{active.current=false;};},[ownerId,store]);
  useEffect(()=>{onLock(busy||batchOpened||(opened&&!pending));return()=>onLock(false);},[busy,batchOpened,opened,pending,onLock]);
  const send=async()=>{
    if(running.current||!ready||lifecycle||batch)return;
    let candidate:TransactionAttempt;
    try{
      if(pending)candidate=pending;
      else{
        if(!selected||!/^[0-9]+$/.test(amount)||kind==='expense'&&categoryId&&!selected.categories.some(c=>c.id===categoryId))throw new Error();
        if(kind==='transfer'&&(!pockets.some(p=>p.id===toPocketId)||toPocketId===pocketId)){setMessage('Pilih pocket tujuan yang berbeda dari pocket asal.');return;}
        candidate=parseTransactionAttempt({version:1,ownerId,operation:'create',body:{clientMutationId:crypto.randomUUID(),type:kind,
          amount:Number(amount),occurredOn:date,occurredAtLocalTime:time,
          ...(kind==='transfer'?{fromPocketId:pocketId,toPocketId,transferType}:{pocketId,...(kind==='expense'?(categoryId?{categoryId}:{}):(incomeSource?{incomeSource}:{}))}),...(note?{note}:{})}},ownerId);
        if(kind!=='income'&&selected.currentBalance!==null&&candidate.body.amount>selected.currentBalance){setMessage('Nominal melebihi saldo pocket yang ditampilkan. Periksa nominal atau muat data terbaru.');return;}
      }
    }catch{setMessage('Periksa pocket, kategori, nominal rupiah bulat lebih dari 0, tanggal, waktu dan catatan maksimal 500 karakter.');return;}
    running.current=true;setBusy(true);setMessage('');let acknowledged=false;
    try{
      const prepared=await store.prepare(candidate);if(!active.current)return;setPending(prepared.record);
      if(prepared.record.operation!=='create'){setOpened(false);setMessage('Ada tindakan riwayat tertunda. Transaksi baru diblokir sampai pemulihan selesai.');return;}
      if(!prepared.created&&(!pending||JSON.stringify(prepared.record)!==JSON.stringify(pending))){setMessage('Ada permintaan tertunda dari tab lain. Periksa detail sebelum melanjutkan.');return;}
      await client.createTransaction(prepared.record);acknowledged=true;
      await store.acknowledge(prepared.record);
      if(active.current){setPending(null);setOpened(false);onReload();}
    }catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof TransactionStorageError){setReady(false);setMessage(acknowledged?'Transaksi tersimpan, tetapi catatan pemulihan belum dapat dibersihkan. Periksa penyimpanan; jangan buat permintaan baru.':'Penyimpanan pemulihan gagal. Pengiriman diblokir sampai penyimpanan dapat diperiksa.');}
      else if(error instanceof ApiError&&[400,409,422].includes(error.status))setMessage(`Server menolak permintaan (${error.code}). Catatan tetap disimpan. Periksa data atau hentikan permintaan dengan konfirmasi server; jangan mengubah saldo awal untuk meloloskan transaksi.`);
      else setMessage('Hasil belum pasti. Permintaan tersimpan; lanjutkan dengan ID yang sama setelah koneksi pulih. Jangan buat transaksi pengganti.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  const stop=async()=>{
    if(running.current||!ready||!pending||!confirmStop)return;
    running.current=true;setBusy(true);setMessage('');
    try{
      const status=await client.resolveTransactionAttempt(pending);
      await store.acknowledge(pending);
      if(active.current)onResolved(status);
    }catch(error){
      if(!active.current)return;
      if(error instanceof ApiError&&error.status===401){onExpired();return;}
      if(error instanceof TransactionStorageError){setReady(false);setMessage('Hasil server sudah diketahui, tetapi catatan pemulihan belum dapat dibersihkan. Periksa penyimpanan; jangan hapus data situs.');}
      else setMessage('Penghentian belum terkonfirmasi atau permintaan berbeda dengan catatan server. Catatan tetap disimpan; coba konfirmasi lagi setelah koneksi pulih.');
    }finally{running.current=false;if(active.current)setBusy(false);}
  };
  return <section aria-label="Tambah transaksi server" className="space-y-3 rounded-card border border-border bg-surface p-5">
    <h2 className="font-display text-headline-md">{record?'Transaksi tertunda':opened?`Tambah ${noun}`:'Tambah transaksi'}</h2>
    {message&&<p role="alert" className="text-body-sm text-bahaya break-words">{message}</p>}
    {!ready?<Button disabled={busy} variant="secondary" onClick={()=>void inspect()}>Periksa pemulihan transaksi</Button>:batch?<>
      <p role="alert" className="text-body-sm">Ada batch {batch.body.items.length} pengeluaran tertunda. Selesaikan pemulihannya pada Riwayat transaksi; jangan buat transaksi pengganti.</p>
    </>:lifecycle?<>
      <p role="alert" className="text-body-sm">Ada permintaan {lifecycle.operation==='edit'?'edit':lifecycle.operation==='delete'?'hapus permanen':lifecycle.operation==='archive'?'arsip':'pulihkan'} tertunda. Transaksi baru diblokir. Selesaikan pemulihan pada bagian Riwayat transaksi; jangan hapus data situs.</p>
      <p className="text-body-sm break-words">ID transaksi: {lifecycle.transactionId} · Revisi: {lifecycle.body.expectedRevision}</p>
      <Button variant="secondary" onClick={()=>void inspect()}>Periksa pemulihan transaksi</Button>
    </>:pending?<>
      <p className="font-semibold">{{expense:'Pengeluaran',income:'Pemasukan',transfer:'Transfer'}[pending.body.type]} · {formatRupiah(pending.body.amount)}</p>
      <p className="text-body-sm break-words">Pocket: {pending.body.type==='transfer'?`${pocketName(pending.body.fromPocketId)} → ${pocketName(pending.body.toPocketId)}`:pockets.find(p=>p.id===pendingPocketId)?.name??pendingPocketId}</p>
      <p className="text-body-sm">{pending.body.occurredOn} · {pending.body.occurredAtLocalTime} WIB</p>
      {pending.body.type==='expense'&&<p className="text-body-sm break-words">Kategori: {pending.body.categoryId??'Tanpa kategori'}</p>}
      {pending.body.type==='income'&&<p className="text-body-sm">Sumber: {pending.body.incomeSource?INCOME_SOURCE_LABELS[pending.body.incomeSource]:'Tanpa sumber'}</p>}
      {pending.body.type==='transfer'&&<p className="text-body-sm">Jenis: {TRANSFER_TYPE_LABELS[pending.body.transferType]}</p>}
      {pending.body.note&&<p className="whitespace-pre-wrap break-words text-body-sm">{pending.body.note}</p>}
      <p className="text-body-sm text-text-secondary">Isi permintaan dikunci dan tetap tersimpan setelah reload/logout. Melanjutkan memakai ID yang sama, bukan transaksi baru.</p>
      <Button fullWidth loading={busy} className="h-auto min-h-11 py-2" onClick={()=>void send()}>Lanjutkan {transactionNames[pending.body.type]} yang sama</Button>
      <Button fullWidth variant="secondary" disabled={busy} onClick={onReload}>Muat data transaksi server</Button>
      {!confirmStop?<Button fullWidth variant="ghost" disabled={busy} onClick={()=>setConfirmStop(true)}>Hentikan permintaan ini</Button>:<div className="space-y-3 rounded-input border border-border p-3">
        <p className="text-body-sm">Hentikan permintaan? Jika sudah tersimpan, transaksi tetap dipertahankan dan ditampilkan. Jika belum, server mencegah permintaan ini diproses kemudian. Ini bukan hapus transaksi.</p>
        <Button fullWidth variant="secondary" loading={busy} className="h-auto min-h-11 py-2" onClick={()=>void stop()}>Konfirmasi penghentian</Button>
        <Button fullWidth variant="ghost" disabled={busy} onClick={()=>setConfirmStop(false)}>Kembali</Button>
      </div>}
    </>:batchOpened?<BatchExpenseForm ownerId={ownerId} pockets={pockets} client={client} onCancel={()=>setBatchOpened(false)} onFinished={()=>{setBatchOpened(false);onReload();}} onExpired={onExpired}/>:opened?<form aria-label={`Form ${noun} server`} className="space-y-3" onSubmit={e=>{e.preventDefault();void send();}}>
      <label htmlFor={id} className="block text-body-sm">{kind==='transfer'?'Pocket asal':kind==='income'?'Pocket penerima':'Pocket pembayaran'}</label>
      <select id={id} value={pocketId} disabled={busy} onChange={e=>{setPocket(e.target.value);setCategory('');setMessage('');}} className="w-full min-w-0 rounded-input border border-border bg-surface p-3">
        {pockets.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
      </select>
      <p className="text-body-sm text-text-secondary">Saldo saat ini: {selected?.currentBalance==null?'Belum tersedia':formatRupiah(selected.currentBalance)}</p>
      {kind==='transfer'&&<>
        <label htmlFor={`${id}-destination`} className="block text-body-sm">Pocket tujuan</label>
        <select id={`${id}-destination`} value={toPocketId} disabled={busy} onChange={e=>{setToPocket(e.target.value);setMessage('');}} className="w-full min-w-0 rounded-input border border-border bg-surface p-3">
          <option value="">Pilih pocket tujuan</option>{pockets.map(p=><option key={p.id} value={p.id} disabled={p.id===pocketId}>{p.emoji} {p.name}</option>)}
        </select>
        <fieldset disabled={busy} className="min-w-0 space-y-2"><legend className="text-body-sm">Jenis transfer</legend>
          <div className="flex w-full flex-wrap gap-2">{Object.keys(TRANSFER_TYPE_LABELS).map(type=><button key={type} type="button" aria-pressed={transferType===type} onClick={()=>setTransferType(type)}
            className={`inline-flex flex-[1_1_auto] min-w-fit max-w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-body-sm font-semibold ${transferType===type?'border-primary bg-primary-soft text-primary':'border-border bg-background text-text-secondary'}`}>
            <span aria-hidden="true">{TRANSFER_TYPE_EMOJIS[type]}</span>{TRANSFER_TYPE_LABELS[type]}</button>)}</div>
        </fieldset>
        <p className="rounded-input bg-primary-soft p-3 text-body-sm">{transferType==='budget-reallocation'?'Pindah alokasi memindahkan saldo sekaligus budget kedua pocket pada periode 26–25 yang memuat tanggal transaksi. Server menolak jika sisa alokasi asal lebih kecil daripada pengeluaran yang sudah tercatat.':'Transfer memindahkan saldo saja, tanpa mengubah alokasi budget. Top-up NFC dan tarik tunai bukan pengeluaran atau pemasukan.'}</p>
      </>}
      <Input label={`Nominal ${noun} (rupiah)`} inputMode="numeric" value={amount} required disabled={busy} onChange={e=>{setAmount(e.target.value);setMessage('');}}/>
      {kind==='expense'?<><label htmlFor={`${id}-category`} className="block text-body-sm">Kategori pengeluaran</label>
      <select id={`${id}-category`} value={categoryId} disabled={busy} onChange={e=>setCategory(e.target.value)} className="w-full min-w-0 rounded-input border border-border bg-surface p-3">
        <option value="">Tanpa kategori</option>{selected?.categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      </>:kind==='income'?<fieldset disabled={busy} className="min-w-0 space-y-2">
        <legend className="text-body-sm">Sumber pemasukan (opsional)</legend>
        <div className="flex w-full flex-wrap gap-2">{['',...Object.keys(INCOME_SOURCE_LABELS)].map(source=><button key={source} type="button" aria-pressed={incomeSource===source} onClick={()=>setIncomeSource(source)}
          className={`inline-flex flex-[1_1_auto] min-w-fit max-w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-body-sm font-semibold ${incomeSource===source?'border-aman bg-aman-soft text-aman':'border-border bg-background text-text-secondary'}`}>
          <span aria-hidden="true">{INCOME_SOURCE_EMOJIS[source]??'📝'}</span>{INCOME_SOURCE_LABELS[source]??'Tanpa sumber'}</button>)}</div>
      </fieldset>:null}
      <Input label={`Tanggal ${noun} (WIB)`} type="date" value={date} required disabled={busy} onChange={e=>setDate(e.target.value)}/>
      <Input label={`Waktu ${noun} (WIB)`} type="time" value={time} required disabled={busy} onChange={e=>setTime(e.target.value)}/>
      <Input label={`Catatan ${noun}`} value={note} maxLength={500} disabled={busy} onChange={e=>setNote(e.target.value)}/>
      <p className="text-body-sm text-text-secondary">{kind==='transfer'?'Transfer tidak menambah total uang atau arus kas bersih.':kind==='income'?'Pemasukan menambah saldo pocket penerima, bukan alokasi budget.':'Budget ditentukan server dari pengaturan pocket, termasuk Cash/NFC.'} Detail permintaan disimpan di perangkat sampai hasil terverifikasi; tidak ada pengiriman otomatis.</p>
      <p className="text-body-sm text-text-secondary">Mode pengembangan: gunakan data uji. Permintaan tertunda hanya dapat dihentikan setelah dikonfirmasi server.</p>
      <Button fullWidth type="submit" loading={busy}>Simpan {noun} server</Button>
      <Button fullWidth type="button" variant="ghost" disabled={busy} onClick={()=>{setOpened(false);setAmount('');setNote('');setMessage('');}}>Batal</Button>
    </form>:<div className="space-y-2">{(['expense','income','transfer'] as const).map(type=><Button key={type} fullWidth variant={type==='expense'?'primary':'secondary'} disabled={pockets.length<(type==='transfer'?2:1)} onClick={()=>{setKind(type);setCategory('');setIncomeSource('');setToPocket('');setTransferType('normal');setOpened(true);}}>Tambah {transactionNames[type]} server</Button>)}{pockets.length<2&&<p className="text-body-sm text-text-secondary">Transfer membutuhkan minimal dua pocket aktif.</p>}</div>}
    {ready&&!record&&!opened&&!batchOpened&&<Button fullWidth variant="secondary" disabled={!pockets.length} className="h-auto min-h-11 py-2" onClick={()=>setBatchOpened(true)}>Tambah beberapa pengeluaran</Button>}
  </section>;
}
