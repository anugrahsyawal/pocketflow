import {ConnectedPocketManagement} from './ConnectedPocketManagement';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, SessionClient, sessionErrorMessage } from '@/lib/api/sessionClient';
import { loadMasterData, MasterData } from '@/lib/api/masterData';
import { ConnectedSetup } from './ConnectedSetup';
import { ConnectedHistory } from './ConnectedHistory';
import { ConnectedPeriodExport } from './ConnectedPeriodExport';
import { TransactionCreateForm } from './TransactionCreateForm';
import { ConnectedHomeSnapshot } from './ConnectedHomeSnapshot';
import { ConnectedNavigation } from './ConnectedNavigation';

export function ConnectedPockets({ownerId,client,onExpired}:{ownerId:string;client:SessionClient;onExpired:()=>void}) {
  const [data,setData] = useState<MasterData | null>(null);
  const [error,setError] = useState('');
  const [refresh,setRefresh] = useState(0);
  const [editing,setEditing] = useState<string|null>(null);
  const [creationLocked,setCreationLocked] = useState(false);
  const [expenseLocked,setExpenseLocked] = useState(false);
  const [lifecycleLocked,setLifecycleLocked] = useState(false);
  const [resolutionNotice,setResolutionNotice] = useState('');
  const [expenseRequest,setExpenseRequest] = useState(0);
  const [screen,setScreen] = useState('server-home');
  const [entryRecovery,setEntryRecovery]=useState(false);
  const [categoryRecovery,setCategoryRecovery]=useState(false);
  // Recovery owners stay mounted. Locks also reveal their screen, including
  // durable lifecycle recovery discovered after a document reload.
  const visibleScreen=lifecycleLocked?'server-history':expenseLocked?'server-entry':creationLocked||editing?'server-pocket-list':screen;
  const blocked=!!editing||creationLocked||expenseLocked||lifecycleLocked;
  const navigate=(id:string)=>{
    if(blocked)return;
    setScreen(id);
    requestAnimationFrame(()=>{const target=document.getElementById(id);target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});});
  };
  useEffect(()=>{
    const target=document.getElementById(visibleScreen);
    target?.scrollIntoView({block:'start'});
    target?.focus({preventScroll:true});
  },[visibleScreen]);
  useEffect(()=>{
    const followHash=()=>{
      if(blocked)return;
      if(location.hash==='#server-history')setScreen('server-history');
      else if(location.hash.startsWith('#/pockets/'))setScreen('server-home');
    };
    window.addEventListener('hashchange',followHash);
    return()=>window.removeEventListener('hashchange',followHash);
  },[blocked]);
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
  return <section aria-label="Pocket server" className="space-y-4 pb-24">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-headline-md">PocketFlow</h2>
      <Button size="sm" variant="secondary" disabled={!!editing || creationLocked || expenseLocked || lifecycleLocked || (!data?.isSetupCompleted && !error)} onClick={reload}>Muat ulang</Button>
    </div>
    <p className="text-body-sm text-text-secondary">Data dari server · {data?.isSetupCompleted ? 'Pengaturan budget Cash/NFC tersedia' : 'Setup akun'}</p>
    {resolutionNotice&&<p role="status" className="rounded-card bg-primary-soft p-4 text-body-sm whitespace-pre-wrap break-words">{resolutionNotice}</p>}
    {error ? <p role="alert" className="rounded-card bg-bahaya-soft p-4 text-bahaya">{error} Data belum ditampilkan.</p>
      : !data ? <p role="status">Memuat pocket server…</p>
      : !data.isSetupCompleted ? <ConnectedSetup client={client} onExpired={onExpired} onComplete={()=>setRefresh(n=>n+1)} /> : <>
        <ConnectedNavigation blocked={blocked} active={visibleScreen} onNavigate={navigate}/>
        {(entryRecovery||categoryRecovery)&&<aside aria-label="Permintaan perlu diperiksa" className="rounded-card border border-border bg-primary-soft p-4 space-y-2">
          <p className="text-body-sm">Ada pemeriksaan penyimpanan atau permintaan tertunda. Tidak ada pengiriman otomatis.</p>
          {entryRecovery&&<Button variant="secondary" disabled={blocked} onClick={()=>navigate('server-entry')}>Periksa permintaan transaksi</Button>}
          {categoryRecovery&&<Button variant="secondary" disabled={blocked} onClick={()=>navigate('server-pocket-list')}>Periksa permintaan kategori</Button>}
        </aside>}
        <div hidden={visibleScreen!=='server-home'}>
        <ConnectedHomeSnapshot data={data} client={client} onExpired={onExpired} onHistory={()=>navigate('server-history')}/>
        </div>
        <div hidden={visibleScreen!=='server-reports'} className="space-y-4">
        <p className="text-body-sm text-text-secondary">Periode {data.period?.startDate} — {data.period?.endDate}</p>
        {data.period&&<ConnectedPeriodExport ownerId={ownerId} client={client} currentPeriod={data.period} onExpired={onExpired} onExpense={()=>{setScreen('server-entry');setExpenseRequest(n=>n+1);}} expenseBlocked={!data.pockets.length||!!editing||creationLocked||expenseLocked||lifecycleLocked}/>}
        </div>
        <div hidden={visibleScreen!=='server-history'}>
        <ConnectedHistory ownerId={ownerId} client={client} data={data} onExpired={onExpired} blocked={!!editing||creationLocked||expenseLocked} onLock={setLifecycleLocked} onResolved={message=>{setResolutionNotice(message);reload();}}/>
        </div>
        <fieldset hidden={visibleScreen!=='server-entry'} disabled={!!editing||creationLocked||lifecycleLocked} className="min-w-0 border-0 p-0 m-0">
          <TransactionCreateForm onRecovery={setEntryRecovery} expenseRequest={expenseRequest} ownerId={ownerId} pockets={data.pockets} client={client} onReload={()=>{setResolutionNotice('');reload();}} onResolved={status=>{setResolutionNotice(status==='cancelled'?'Permintaan dibatalkan oleh server. Tidak ada transaksi baru dari permintaan ini.':'Transaksi ternyata sudah tersimpan. Transaksi tetap dipertahankan; periksa riwayat sebelum membuat pengganti.');reload();}} onExpired={onExpired} onLock={setExpenseLocked}/>
        </fieldset>
        <div hidden={visibleScreen!=='server-pocket-list'}>
        <ConnectedPocketManagement onRecovery={setCategoryRecovery} ownerId={ownerId} data={data} client={client} onExpired={onExpired} reload={reload} editing={editing} setEditing={setEditing} creationLocked={creationLocked} expenseLocked={expenseLocked} lifecycleLocked={lifecycleLocked} setCreationLocked={setCreationLocked}/>
        </div>
      </>}
  </section>;
}
