import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, POCKET_GROUP_LABELS, SessionClient, sessionErrorMessage } from '@/lib/api/sessionClient';
import { loadMasterData, MasterData } from '@/lib/api/masterData';
import { formatRupiah } from '@/lib/currency';
import { ConnectedSetup } from './ConnectedSetup';
import { BudgetOwnerForm } from './BudgetOwnerForm';
import { CategoryEditForm, LabelEditForm } from './CategoryEditForm';
import { CategoryArchiveForm } from './CategoryArchiveForm';
import { PocketArchiveForm } from './PocketArchiveForm';
import { CategoryCreateForm } from './CategoryCreateForm';
import { PocketClassificationForm } from './PocketClassificationForm';
import { OpeningBalanceForm } from './OpeningBalanceForm';
import { ConnectedHistory } from './ConnectedHistory';
import { TransactionCreateForm } from './TransactionCreateForm';

export function ConnectedPockets({ownerId,client,onExpired}:{ownerId:string;client:SessionClient;onExpired:()=>void}) {
  const [data,setData] = useState<MasterData | null>(null);
  const [error,setError] = useState('');
  const [refresh,setRefresh] = useState(0);
  const [editing,setEditing] = useState<string|null>(null);
  const [creationLocked,setCreationLocked] = useState(false);
  const [expenseLocked,setExpenseLocked] = useState(false);
  const [lifecycleLocked,setLifecycleLocked] = useState(false);
  const [resolutionNotice,setResolutionNotice] = useState('');
  const reload=()=>{setEditing(null);setRefresh(n=>n+1);};
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    void loadMasterData(client).then(value => {if (active) setData(value);}).catch(cause => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) {onExpired();return;}
      setError(sessionErrorMessage(cause));
    });
    return () => { active = false; };
  },[client,onExpired,refresh]);
  return <section aria-label="Pocket server" className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-headline-md">Pocket saya</h2>
      <Button size="sm" variant="secondary" disabled={!!editing || creationLocked || expenseLocked || lifecycleLocked || (!data?.isSetupCompleted && !error)} onClick={reload}>Muat ulang</Button>
    </div>
    <p className="text-body-sm text-text-secondary">Data dari server · {data?.isSetupCompleted ? 'Pengaturan budget Cash/NFC tersedia' : 'Setup akun'}</p>
    {resolutionNotice&&<p role="status" className="rounded-card bg-primary-soft p-4 text-body-sm">{resolutionNotice}</p>}
    {error ? <p role="alert" className="rounded-card bg-bahaya-soft p-4 text-bahaya">{error} Data belum ditampilkan.</p>
      : !data ? <p role="status">Memuat pocket server…</p>
      : !data.isSetupCompleted ? <ConnectedSetup client={client} onExpired={onExpired} onComplete={()=>setRefresh(n=>n+1)} /> : <>
        <p className="text-body-sm text-text-secondary">Periode {data.period?.startDate} — {data.period?.endDate}</p>
        <ConnectedHistory ownerId={ownerId} client={client} data={data} onExpired={onExpired} blocked={!!editing||creationLocked||expenseLocked} onLock={setLifecycleLocked} onResolved={message=>{setResolutionNotice(message);reload();}}/>
        <fieldset disabled={!!editing||creationLocked||lifecycleLocked} className="min-w-0 border-0 p-0 m-0">
          <TransactionCreateForm ownerId={ownerId} pockets={data.pockets} client={client} onReload={()=>{setResolutionNotice('');reload();}} onResolved={status=>{setResolutionNotice(status==='cancelled'?'Permintaan dibatalkan oleh server. Tidak ada transaksi baru dari permintaan ini.':'Transaksi ternyata sudah tersimpan. Transaksi tetap dipertahankan; periksa riwayat sebelum membuat pengganti.');reload();}} onExpired={onExpired} onLock={setExpenseLocked}/>
        </fieldset>
        <fieldset disabled={!!editing||expenseLocked||lifecycleLocked} className="min-w-0 border-0 p-0 m-0">
          <CategoryCreateForm ownerId={ownerId} pockets={data.pockets} client={client} onReload={reload} onExpired={onExpired} onLock={setCreationLocked} />
        </fieldset>
        <fieldset disabled={creationLocked||expenseLocked||lifecycleLocked} className="min-w-0 border-0 p-0 m-0 space-y-4">
        {data.pockets.length === 0 && <p className="rounded-card bg-surface p-5">Belum ada pocket aktif di server.</p>}
        {data.pockets.map(p => {
          const owner = p.budgetOwnerPocketId ? data.pockets.find(other=>other.id===p.budgetOwnerPocketId) : null;
          const isWallet = p.templateKey === 'cash' || p.templateKey === 'nfc-card';
          return <article key={p.id} className="rounded-card border border-border/60 bg-surface p-5 shadow-card space-y-4">
            <div className="flex gap-3 items-start"><span aria-hidden="true" className="text-2xl">{p.emoji}</span>
              <h3 className="font-display text-headline-sm break-words min-w-0">{p.name}</h3></div>
            <dl className="space-y-2 text-body-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Saldo saat ini</dt><dd className="font-bold text-primary">{p.currentBalance === null ? 'Belum tersedia' : formatRupiah(p.currentBalance)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Alokasi periode</dt><dd className="font-semibold">{p.allocation === null ? 'Belum diatur' : formatRupiah(p.allocation)}</dd></div>
              {isWallet && <div><dt className="text-text-secondary">Budget pengeluaran</dt><dd className="break-words">{owner ? owner.name : p.name} <span className="text-text-secondary">{!owner ? '(pocket sendiri)' : ''}</span></dd></div>}
            </dl>
            <p className="text-body-sm text-text-secondary">{POCKET_GROUP_LABELS[p.groupId]} · {p.isSpendable?'Dana belanja':'Bukan dana belanja'}</p>
            {editing===`opening:${p.id}`
              ? <OpeningBalanceForm pocket={p} client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
              : <Button size="sm" variant="ghost" disabled={!!editing} aria-label={`Koreksi saldo awal ${p.name}`} onClick={()=>setEditing(`opening:${p.id}`)}>Koreksi saldo awal</Button>}
            {editing===`classification:${p.id}`
              ? <PocketClassificationForm pocket={p} client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
              : <Button size="sm" variant="ghost" disabled={!!editing} aria-label={`Atur klasifikasi ${p.name}`} onClick={()=>setEditing(`classification:${p.id}`)}>Atur kelompok & dana belanja</Button>}
            {editing===`pocket:${p.id}`
              ? <LabelEditForm entity={p} kind="pocket" save={(id,payload)=>client.editPocketLabel(id,payload)} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
              : <Button size="sm" variant="ghost" disabled={!!editing} aria-label={`Edit pocket ${p.name}`} onClick={()=>setEditing(`pocket:${p.id}`)}>Edit nama & emoji</Button>}
            {isWallet && (editing===p.id
              ? <BudgetOwnerForm pocket={p} pockets={data.pockets} client={client} onExpired={onExpired} onCancel={()=>setEditing(null)} onReload={reload} />
              : <Button variant="secondary" fullWidth disabled={!!editing} onClick={()=>setEditing(p.id)}>Atur budget {p.name}</Button>)}
            {editing===`lifecycle:${p.id}`
              ? <PocketArchiveForm pocket={p} archive pockets={data.pockets} client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
              : <Button size="sm" variant="ghost" disabled={!!editing} aria-label={`Arsipkan pocket ${p.name}`} onClick={()=>setEditing(`lifecycle:${p.id}`)}>Arsipkan pocket</Button>}
            <details className="border-t border-border pt-3">
              <summary className="cursor-pointer text-body-sm font-semibold text-primary">Kategori ({p.categories.length})</summary>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Kategori ${p.name}`}>
                {p.categories.map(c=><li key={c.id} className={`max-w-full ${editing===`category:${c.id}` || editing===`archive:${c.id}`?'w-full':''}`}>
                  {editing===`category:${c.id}`
                    ? <CategoryEditForm category={c} client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
                    : editing===`archive:${c.id}`
                    ? <CategoryArchiveForm category={c} archive client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
                    : <div className="flex flex-wrap items-center gap-1"><button type="button" aria-label={`Edit kategori ${c.name}`} disabled={!!editing} onClick={()=>setEditing(`category:${c.id}`)}
                      className="rounded-input bg-surface-container-low px-3 py-3 text-body-sm break-words text-left max-w-full text-primary disabled:opacity-50 focus-visible:outline-primary">
                      {c.emoji} {c.name} <span className="text-text-secondary">· Edit</span>
                    </button><Button size="sm" variant="ghost" disabled={!!editing} aria-label={`Arsipkan kategori ${c.name}`} onClick={()=>setEditing(`archive:${c.id}`)}>Arsipkan</Button></div>}
                </li>)}
              </ul>
              {!p.categories.length && <p className="text-body-sm text-text-secondary">Belum ada kategori aktif.</p>}
              {p.archivedCategories.length>0 && <section aria-label={`Kategori diarsipkan ${p.name}`} className="mt-4 space-y-2">
                <h4 className="text-body-sm font-semibold text-text-secondary">Diarsipkan ({p.archivedCategories.length})</h4>
                {p.archivedCategories.map(c=><div key={c.id}>
                  {editing===`archive:${c.id}`
                    ? <CategoryArchiveForm category={c} archive={false} client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
                    : <div className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-border p-3">
                      <span className="min-w-0 break-words text-body-sm">{c.emoji} {c.name}</span>
                      <Button size="sm" variant="secondary" disabled={!!editing} aria-label={`Pulihkan kategori ${c.name}`} onClick={()=>setEditing(`archive:${c.id}`)}>Pulihkan</Button>
                    </div>}
                </div>)}
              </section>}
            </details>
          </article>;
        })}
        <section aria-label="Pocket diarsipkan" className="space-y-4 border-t border-border pt-4">
          <h2 className="font-display text-headline-md">Pocket diarsipkan ({data.archivedPockets.length})</h2>
          {!data.archivedPockets.length&&<p className="text-body-sm text-text-secondary">Belum ada pocket diarsipkan.</p>}
          {data.archivedPockets.map(p=><article key={p.id} className="space-y-3 rounded-card border border-border bg-surface p-5">
            <h3 className="font-display text-headline-sm break-words">{p.emoji} {p.name}</h3>
            <p className="text-body-sm text-text-secondary">Diarsipkan · riwayat tetap tersimpan. Pulihkan pocket untuk mengelola kategori kembali.</p>
            <details className="text-body-sm">
              <summary className="cursor-pointer text-primary">Kategori tersimpan ({p.categories.length+p.archivedCategories.length})</summary>
              <ul className="mt-2 space-y-1">
                {p.categories.map(c=><li key={c.id} className="break-words">{c.emoji} {c.name}</li>)}
                {p.archivedCategories.map(c=><li key={c.id} className="break-words">{c.emoji} {c.name} · diarsipkan</li>)}
              </ul>
            </details>
            {editing===`lifecycle:${p.id}`
              ? <PocketArchiveForm pocket={p} archive={false} pockets={data.pockets} client={client} onReload={reload} onExpired={onExpired} onCancel={()=>setEditing(null)} />
              : <Button fullWidth variant="secondary" disabled={!!editing} aria-label={`Pulihkan pocket ${p.name}`} onClick={()=>setEditing(`lifecycle:${p.id}`)}>Pulihkan pocket</Button>}
          </article>)}
        </section>
        </fieldset>
      </>}
  </section>;
}
