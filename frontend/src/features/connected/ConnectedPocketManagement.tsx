import type {Dispatch,SetStateAction} from 'react';
import {Button} from '@/components/ui/Button';
import {POCKET_GROUP_LABELS,type SessionClient} from '@/lib/api/sessionClient';
import type {MasterData} from '@/lib/api/masterData';
import {formatRupiah} from '@/lib/currency';
import {BudgetOwnerForm} from './BudgetOwnerForm';
import {CategoryEditForm,LabelEditForm} from './CategoryEditForm';
import {CategoryArchiveForm} from './CategoryArchiveForm';
import {PocketArchiveForm} from './PocketArchiveForm';
import {CategoryCreateForm} from './CategoryCreateForm';
import {PocketClassificationForm} from './PocketClassificationForm';
import {OpeningBalanceForm} from './OpeningBalanceForm';

interface Props {
  ownerId:string;data:MasterData;client:SessionClient;onExpired:()=>void;reload:()=>void;
  editing:string|null;setEditing:Dispatch<SetStateAction<string|null>>;
  creationLocked:boolean;expenseLocked:boolean;lifecycleLocked:boolean;
  setCreationLocked:Dispatch<SetStateAction<boolean>>;
  onRecovery?:(needed:boolean)=>void;
}

/** Presentation boundary only. The parent retains all cross-screen locks and refresh ownership. */
export function ConnectedPocketManagement({ownerId,data,client,onExpired,reload,editing,setEditing,creationLocked,expenseLocked,lifecycleLocked,setCreationLocked,onRecovery}:Props){
  return <section id="server-pocket-list" tabIndex={-1} aria-label="Pocket dan pengaturan" className="space-y-4">
        <fieldset disabled={!!editing||expenseLocked||lifecycleLocked} className="min-w-0 border-0 p-0 m-0">
          <CategoryCreateForm ownerId={ownerId} pockets={data.pockets} client={client} onReload={reload} onExpired={onExpired} onLock={setCreationLocked} onRecovery={onRecovery} />
        </fieldset>
        <fieldset disabled={creationLocked||expenseLocked||lifecycleLocked} className="min-w-0 border-0 p-0 m-0 space-y-4">
        <h2 className="font-display text-headline-md">Pocket dan pengaturan</h2>
        {data.pockets.length === 0 && <p className="rounded-card bg-surface p-5">Belum ada pocket aktif di server.</p>}
        {data.pockets.map(p => {
          const owner = p.budgetOwnerPocketId ? data.pockets.find(other=>other.id===p.budgetOwnerPocketId) : null;
          const isWallet = p.templateKey === 'cash' || p.templateKey === 'nfc-card';
          return <article key={p.id} id={`server-pocket-${p.id}`} tabIndex={-1} className="rounded-card border border-border/60 bg-surface p-5 shadow-card space-y-4">
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
  </section>;
}
