import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

const mode = import.meta.env.VITE_DATA_MODE ?? 'local';
if (mode !== 'local' && mode !== 'connected') throw new Error('Invalid VITE_DATA_MODE');
// Dynamic boundary prevents even importing/hydrating local stores in server mode.
const entry = mode === 'connected'
  ? import('@/features/connected/ConnectedApp')
  : import('@/app/App');
const root = createRoot(rootEl);
entry.then(({ default: App }) => root.render(<StrictMode><App /></StrictMode>))
  .catch(() => root.render(<p role="alert">Aplikasi gagal dimuat. Silakan muat ulang halaman.</p>));
