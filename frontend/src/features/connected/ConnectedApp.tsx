import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, SessionClient, ServerUser, sessionErrorMessage } from '@/lib/api/sessionClient';
import { ConnectedPockets } from './ConnectedPockets';

/** Isolated entry: deliberately imports no persisted auth or financial store. */
export default function ConnectedApp() {
  const [client] = useState(() => new SessionClient());
  const [user, setUser] = useState<ServerUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const running = useRef(false);
  const mounted = useRef(true);
  const expire = useCallback(() => {
    client.clear(); setUser(null); setChecked(true); setError('Sesi berakhir. Silakan masuk kembali.');
  },[client]);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof ApiError && cause.status === 401) { setUser(null); setChecked(true); }
      setError(sessionErrorMessage(cause));
    } finally { running.current = false; if (mounted.current) setBusy(false); }
  }, []);

  const check = useCallback(() => run(async () => {
    try {
      const next = await client.me();
      if (mounted.current) { setUser(next); setChecked(true); }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        if (mounted.current) { setUser(null); setChecked(true); }
      } else throw cause;
    }
  }), [client, run]);

  useEffect(() => {
    mounted.current = true;
    void check();
    const focus = () => { void check(); };
    window.addEventListener('focus', focus);
    return () => { mounted.current = false; window.removeEventListener('focus', focus); };
  }, [check]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const next = await client.login(email, password);
      if (mounted.current) { setPassword(''); setUser(next); setChecked(true); }
    });
  };

  return <main className={`min-h-screen min-h-dvh bg-background flex justify-center ${user?'items-start':'items-center px-4 py-10'}`}>
    <div className={user?'w-full min-w-0 max-w-app px-4 pt-5 pb-[calc(112px+env(safe-area-inset-bottom,0px))] space-y-4':'w-full max-w-[400px] space-y-6'}>
      {user?<header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-headline-sm text-text-primary">PocketFlow</h1>
        <span className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">Server · Pratinjau</span>
      </header>:<header className="text-center space-y-3">
        <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-pocket bg-primary text-3xl text-white">◈</div>
        <p className="text-label-caps text-primary">MODE SERVER · PENGEMBANGAN</p>
        <h1 className="font-display text-headline-lg-mobile text-text-primary">PocketFlow</h1>
        <p className="text-body-sm text-text-secondary">Koneksi aman ke backend lokal. Data mode lokal tetap terpisah.</p>
      </header>}
      <section className={user?'rounded-card border border-border/60 bg-surface p-4 shadow-card space-y-3':'rounded-card bg-surface p-6 shadow-card space-y-5'} aria-label="Sesi server" aria-busy={busy}>
        {error && <p role="alert" className="rounded-input bg-bahaya-soft p-3 text-body-sm text-bahaya">{error}</p>}
        {!checked ? <>
          <p role="status" className="text-body-sm text-text-secondary">{busy ? 'Memeriksa sesi…' : 'Status sesi belum dapat diperiksa.'}</p>
          <Button fullWidth onClick={() => void check()} loading={busy}>Coba lagi</Button>
        </> : user ? <details>
          <summary className="min-h-11 cursor-pointer rounded-input py-2 text-body-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            Sesi &amp; akun <span className="font-normal text-text-secondary">· buka untuk mengelola</span>
          </summary>
          <div className="space-y-3 pt-3">
          <h2 className="font-display text-headline-sm break-words">Halo, {user.displayName}</h2>
          <p className="text-body-sm text-text-secondary break-all">{user.email}</p>
          <p className="text-body-sm text-text-secondary">Beranda, pocket, transaksi, riwayat, laporan dan CSV memakai data server. Data mode lokal tetap terpisah; migrasi dan sinkronisasi otomatis belum tersedia.</p>
          <Button fullWidth variant="secondary" disabled={busy} onClick={() => void check()}>Periksa sesi</Button>
          <Button fullWidth loading={busy} onClick={() => void run(async () => {
            await client.logout();
            if (mounted.current) { setUser(null); setPassword(''); }
          })}>Keluar dari server</Button>
          </div>
        </details> : <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" autoComplete="username" required value={email} disabled={busy} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" autoComplete="current-password" required value={password} disabled={busy} onChange={e => setPassword(e.target.value)} />
          <Button type="submit" fullWidth loading={busy}>Masuk ke server</Button>
          <p className="text-body-sm text-text-secondary">Gunakan akun pemilik yang dibuat melalui backend, bukan akun demo lokal.</p>
        </form>}
      </section>
      {user && <fieldset hidden={busy || !!error} disabled={busy || !!error} className="min-w-0 border-0 p-0 m-0">
        <ConnectedPockets key={user.id} ownerId={user.id} client={client} onExpired={expire} />
      </fieldset>}
      <p className="text-center text-xs text-text-secondary">Pratinjau pengembangan · belum untuk produksi. Backend harus tersedia; tidak ada penyimpanan transaksi offline otomatis.</p>
    </div>
  </main>;
}
